const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
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
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);

