const User = require("../models/User");
const Application = require("../models/Application");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const STATUS_VALUES = Application.schema.path("status").enumValues;

// Positive projection: password and tokenVersion can never leak, even if the
// schema grows new sensitive fields.
const SAFE_USER_FIELDS = "name email role status createdAt updatedAt";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Zero-fill so every status appears even when no application has it.
const zeroFilledStatusCounts = (statusCounts) => {
  const byStatus = Object.fromEntries(STATUS_VALUES.map((s) => [s, 0]));
  for (const { _id, count } of statusCounts) {
    if (_id in byStatus) {
      byStatus[_id] = count;
    }
  }
  return byStatus;
};

// Pre-Phase-9/10 documents may lack role/status entirely, so "user" and
// "active" must match by exclusion — DB filters don't apply schema defaults.
const roleFilter = (role) => (role === "admin" ? "admin" : { $ne: "admin" });
const statusFilter = (status) => (status === "suspended" ? "suspended" : { $ne: "suspended" });

const stats = asyncHandler(async (_req, res) => {
  const [totalUsers, totalApplications, statusCounts] = await Promise.all([
    User.countDocuments(),
    Application.countDocuments(),
    Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  res.status(200).json({
    totalUsers,
    totalApplications,
    applicationsByStatus: zeroFilledStatusCounts(statusCounts),
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const { search, role, status, sort, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (search && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }
  if (role) filter.role = roleFilter(role);
  if (status) filter.status = statusFilter(status);

  let sortStage = { createdAt: -1 }; // default: newest first
  if (sort === "oldest")        sortStage = { createdAt: 1 };
  else if (sort === "name_az")  sortStage = { name: 1 };
  else if (sort === "name_za")  sortStage = { name: -1 };
  else if (sort === "email_az") sortStage = { email: 1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(SAFE_USER_FIELDS)
      .sort(sortStage)
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    data: users,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(SAFE_USER_FIELDS);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const [total, statusCounts] = await Promise.all([
    Application.countDocuments({ userId: user._id }),
    Application.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  res.status(200).json({
    user,
    applications: { total, byStatus: zeroFilledStatusCounts(statusCounts) },
  });
});

// Requires at least one other non-suspended admin besides `targetId`.
// Sequential API use can never trip this (the acting admin always survives
// their own request), but it guards concurrent edge cases and future callers.
const assertOtherActiveAdminExists = async (targetId, message) => {
  const otherActiveAdmins = await User.countDocuments({
    role: "admin",
    status: { $ne: "suspended" },
    _id: { $ne: targetId },
  });
  if (otherActiveAdmins === 0) {
    throw new AppError(message, 400);
  }
};

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === String(req.user.id)) {
    throw new AppError("You cannot change your own role", 400);
  }

  const target = await User.findById(id).select("role status");
  if (!target) {
    throw new AppError("User not found", 404);
  }

  if (target.role === "admin" && role === "user") {
    await assertOtherActiveAdminExists(target._id, "Cannot remove the last active admin");
  }

  await User.updateOne({ _id: target._id }, { $set: { role } });
  const user = await User.findById(target._id).select(SAFE_USER_FIELDS);
  res.status(200).json({ user });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (id === String(req.user.id)) {
    throw new AppError("You cannot change your own account status", 400);
  }

  const target = await User.findById(id).select("role status");
  if (!target) {
    throw new AppError("User not found", 404);
  }

  if (status === "suspended" && target.role === "admin") {
    await assertOtherActiveAdminExists(target._id, "Cannot suspend the last active admin");
  }

  await User.updateOne({ _id: target._id }, { $set: { status } });
  const user = await User.findById(target._id).select(SAFE_USER_FIELDS);
  res.status(200).json({ user });
});

module.exports = { stats, listUsers, getUser, updateUserRole, updateUserStatus };
