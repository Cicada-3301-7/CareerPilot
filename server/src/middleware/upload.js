const multer = require("multer");
// file-type is pinned to 16.5.4 — the last CommonJS release (>=17 is ESM-only
// and would throw ERR_REQUIRE_ESM in this codebase).
const FileType = require("file-type");
const AppError = require("../utils/AppError");
const env = require("../config/env");

// Single source of truth for what may be uploaded. Three checks must agree:
// the file extension, the client-reported MIME type, and the sniffed magic
// bytes. SVG/HTML are deliberately never allowed (script execution vectors).
//
// Sniffing notes: .docx is a zip container, so file-type may report either the
// docx MIME or plain application/zip; legacy .doc is a Compound File Binary
// (application/x-cfb). That coarseness is acceptable because downloads are
// always served with Content-Disposition: attachment.
const ALLOWED_TYPES = {
  pdf: {
    mimes: ["application/pdf"],
    sniffed: ["application/pdf"],
  },
  doc: {
    mimes: ["application/msword"],
    sniffed: ["application/x-cfb"],
  },
  docx: {
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    sniffed: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
    ],
  },
  png: {
    mimes: ["image/png"],
    sniffed: ["image/png"],
  },
  jpg: {
    mimes: ["image/jpeg"],
    sniffed: ["image/jpeg"],
  },
  jpeg: {
    mimes: ["image/jpeg"],
    sniffed: ["image/jpeg"],
  },
};

const ALLOWED_LIST = "PDF, DOC, DOCX, PNG or JPG";

const extensionOf = (filename) => {
  const match = /\.([^.]+)$/.exec(filename || "");
  return match ? match[1].toLowerCase() : "";
};

// Runs before the file is buffered: cheap extension + client-MIME screening.
// Magic bytes are checked later (assertContentMatchesExtension) because the
// buffer doesn't exist yet at fileFilter time.
const fileFilter = (req, file, cb) => {
  const ext = extensionOf(file.originalname);
  const allowed = ALLOWED_TYPES[ext];
  if (!allowed) {
    return cb(new AppError(`File type not allowed. Upload a ${ALLOWED_LIST} file.`, 400));
  }
  if (!allowed.mimes.includes(file.mimetype)) {
    return cb(new AppError("File type does not match its extension", 400));
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSize, files: 1 },
  fileFilter,
});

const MAX_FILE_SIZE_MB = Math.round((env.maxFileSize / (1024 * 1024)) * 10) / 10;

// Wraps multer so its errors join the AppError → errorHandler pipeline and
// errorHandler itself needs no multer awareness.
const uploadSingle = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit`, 413));
      }
      return next(new AppError("Invalid upload", 400));
    }
    return next(err); // AppError from fileFilter flows through untouched
  });

// Magic-byte check: the buffer's actual content must agree with the claimed
// extension. Returns the validated lowercase extension (used to build the
// storage key). Throws 400 on any mismatch — e.g. an HTML page renamed .pdf.
const assertContentMatchesExtension = async (file) => {
  const ext = extensionOf(file.originalname);
  const allowed = ALLOWED_TYPES[ext];
  if (!allowed) {
    throw new AppError(`File type not allowed. Upload a ${ALLOWED_LIST} file.`, 400);
  }
  const detected = await FileType.fromBuffer(file.buffer);
  if (!detected || !allowed.sniffed.includes(detected.mime)) {
    throw new AppError("File content does not match its extension", 400);
  }
  return ext;
};

module.exports = { uploadSingle, assertContentMatchesExtension, ALLOWED_TYPES };
