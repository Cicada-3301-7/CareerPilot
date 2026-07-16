const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, "Company is required"],
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    jobLink: {
      type: String,
      trim: true,
      default: "",
    },
    workMode: {
      type: String,
      enum: ["Remote", "Hybrid", "Onsite"],
    },
    status: {
      type: String,
      enum: ["Applied", "OA", "Interview", "Offer", "Rejected"],
      default: "Applied",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    deadline: {
      type: Date,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Every query is user-scoped; these cover the list endpoint's filter+sort shapes.
applicationSchema.index({ userId: 1, createdAt: -1 }); // default sort, dateRange filter
applicationSchema.index({ userId: 1, status: 1, createdAt: -1 }); // status filter + status sort
applicationSchema.index({ userId: 1, deadline: 1, createdAt: -1 }); // deadline sort

module.exports = mongoose.model("Application", applicationSchema);
