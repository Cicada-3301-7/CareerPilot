const User = require("../models/User");
const Application = require("../models/Application");
const asyncHandler = require("../utils/asyncHandler");

const STATUS_VALUES = Application.schema.path("status").enumValues;

const stats = asyncHandler(async (_req, res) => {
  const [totalUsers, totalApplications, statusCounts] = await Promise.all([
    User.countDocuments(),
    Application.countDocuments(),
    Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  // Zero-fill so every status appears even when no application has it.
  const applicationsByStatus = Object.fromEntries(STATUS_VALUES.map((s) => [s, 0]));
  for (const { _id, count } of statusCounts) {
    if (_id in applicationsByStatus) {
      applicationsByStatus[_id] = count;
    }
  }

  res.status(200).json({ totalUsers, totalApplications, applicationsByStatus });
});

module.exports = { stats };
