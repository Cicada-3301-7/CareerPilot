const Application = require("../models/Application");
const ApplicationFile = require("../models/ApplicationFile");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const storage = require("../services/storage");

const list = asyncHandler(async (req, res) => {
  const { search, status, workMode, dateRange, sort } = req.query;

  // Base filter — always scoped to the authenticated user
  const filter = { userId: req.userId };

  // ── Search ────────────────────────────────────────────────────────────────
  if (search && search.trim()) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { company: regex },
      { role: regex },
      { location: regex },
      { notes: regex },
    ];
  }

  // ── Status filter ─────────────────────────────────────────────────────────
  if (status) {
    filter.status = status;
  }

  // ── Work Mode filter ──────────────────────────────────────────────────────
  // Matches the structured workMode field or the legacy location heuristic
  // (pre-Phase-9 documents only carry work mode inside the location text).
  if (workMode) {
    const wmRegex = new RegExp(`\\b${workMode}\\b`, "i");
    filter.$and = [{ $or: [{ workMode }, { location: wmRegex }] }];
  }

  // ── Date Applied filter ───────────────────────────────────────────────────
  if (dateRange) {
    const now = new Date();
    let from;
    if (dateRange === "Today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === "Last 7 Days") {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "Last 30 Days") {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    if (from) {
      filter.createdAt = { $gte: from };
    }
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  let sortStage = { createdAt: -1 }; // default: newest first
  if (sort === "oldest")        sortStage = { createdAt: 1 };
  else if (sort === "company_az") sortStage = { company: 1 };
  else if (sort === "company_za") sortStage = { company: -1 };
  else if (sort === "role_az")    sortStage = { role: 1 };
  else if (sort === "status")     sortStage = { status: 1, createdAt: -1 };
  else if (sort === "deadline")   sortStage = { deadline: 1, createdAt: -1 };

  // ── Pagination (opt-in) ───────────────────────────────────────────────────
  // Without valid page/limit params the response stays the legacy plain array.
  const { page, limit } = req.query;
  if (page === undefined && limit === undefined) {
    const applications = await Application.find(filter).sort(sortStage);
    return res.status(200).json(applications);
  }

  const pageNum = page ?? 1;
  const pageSize = limit ?? 20;
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .sort(sortStage)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    Application.countDocuments(filter),
  ]);

  res.status(200).json({
    data: applications,
    page: pageNum,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
});

const create = asyncHandler(async (req, res) => {
  const application = await Application.create({
    ...req.body,
    userId: req.userId,
  });
  res.status(201).json(application);
});

const update = asyncHandler(async (req, res) => {
  // Filter by both _id and userId to prevent accessing another user's data
  const application = await Application.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  return res.status(200).json(application);
});

const remove = asyncHandler(async (req, res) => {
  // Filter by both _id and userId to prevent deleting another user's data
  const application = await Application.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  // Cascade the application's documents: storage objects first (best-effort —
  // the driver logs and never throws), then flip the soft-delete flags so no
  // live DB record is ever left pointing at a missing object.
  const files = await ApplicationFile.find({
    applicationId: application._id,
    isDeleted: false,
  }).select("+storageKey");
  if (files.length > 0) {
    await storage.remove(files.map((file) => file.storageKey));
    await ApplicationFile.updateMany(
      { applicationId: application._id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() }
    );
  }

  return res.status(200).json({ message: "Application deleted" });
});

module.exports = { list, create, update, remove };
