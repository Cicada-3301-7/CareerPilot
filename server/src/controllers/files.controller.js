const crypto = require("crypto");
const Application = require("../models/Application");
const ApplicationFile = require("../models/ApplicationFile");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const storage = require("../services/storage");
const { assertContentMatchesExtension } = require("../middleware/upload");
const env = require("../config/env");

// Ownership gate shared by every handler. 404 (not 403) so another user's
// application ids can't be probed — matches the existing applications
// controller semantics.
const assertOwnedApplication = async (id, userId) => {
  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    throw new AppError("Application not found", 404);
  }
  return application;
};

// Dual-filtered lookup: fileId AND applicationId AND userId must all agree,
// so neither another user's file nor a cross-application fileId resolves.
const findOwnedFile = (req) =>
  ApplicationFile.findOne({
    _id: req.params.fileId,
    applicationId: req.params.id,
    userId: req.userId,
    isDeleted: false,
  }).select("+storageKey");

const upload = asyncHandler(async (req, res) => {
  await assertOwnedApplication(req.params.id, req.userId);

  if (!req.file) {
    throw new AppError("A file is required", 400);
  }
  if (req.file.size === 0) {
    throw new AppError("File is empty", 400);
  }

  // Per-application cap counts live documents only. A concurrent-upload race
  // can briefly overshoot by one; acceptable at this scale.
  const liveCount = await ApplicationFile.countDocuments({
    applicationId: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });
  if (liveCount >= env.maxFilesPerApplication) {
    throw new AppError(
      `This application already has the maximum of ${env.maxFilesPerApplication} documents`,
      400
    );
  }

  // Magic-byte check; returns the validated extension for the storage key.
  const ext = await assertContentMatchesExtension(req.file);

  // Key is fully server-generated — the original filename never touches it.
  const storageKey = `${req.userId}/${req.params.id}/${crypto.randomUUID()}.${ext}`;

  await storage.put({
    key: storageKey,
    body: req.file.buffer,
    contentType: req.file.mimetype,
  });

  let file;
  try {
    file = await ApplicationFile.create({
      userId: req.userId,
      applicationId: req.params.id,
      uploadedBy: req.userId,
      docType: req.body.docType,
      originalName: req.file.originalname,
      storageKey,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    // Metadata write failed after the object was stored — clean up so the
    // bucket never accumulates records the DB doesn't know about.
    await storage.remove([storageKey]);
    throw error;
  }

  res.status(201).json(file);
});

const list = asyncHandler(async (req, res) => {
  await assertOwnedApplication(req.params.id, req.userId);

  const files = await ApplicationFile.find({
    applicationId: req.params.id,
    userId: req.userId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  res.status(200).json(files);
});

const download = asyncHandler(async (req, res, next) => {
  const file = await findOwnedFile(req);
  if (!file) {
    throw new AppError("File not found", 404);
  }

  const stream = await storage.getStream(file.storageKey);

  // attachment (never inline) so hostile content can't render in the browser;
  // res.attachment() RFC 5987-encodes the user-supplied filename safely.
  res.attachment(file.originalName);
  res.type(file.mimeType);
  res.setHeader("Content-Length", file.size);
  stream.on("error", next);
  stream.pipe(res);
});

const remove = asyncHandler(async (req, res) => {
  const file = await findOwnedFile(req);
  if (!file) {
    throw new AppError("File not found", 404);
  }

  // Storage first (best-effort by driver contract — never throws), then flip
  // the soft-delete flags so no live DB record ever points at a missing object.
  await storage.remove([file.storageKey]);
  await ApplicationFile.updateOne(
    { _id: file._id },
    { isDeleted: true, deletedAt: new Date() }
  );

  res.status(200).json({ message: "Document deleted" });
});

module.exports = { upload, list, download, remove };
