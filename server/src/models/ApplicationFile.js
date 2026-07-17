const mongoose = require("mongoose");

// Metadata for one uploaded document. The bytes live behind the storage
// driver (S3/R2 in production); MongoDB only ever holds metadata.
const applicationFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    // Who performed the upload. Today always the owner, but kept separate from
    // userId so future RBAC flows (e.g. an admin attaching a document) don't
    // need a schema change.
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    docType: {
      type: String,
      enum: ["resume", "cover_letter", "offer_letter", "other"],
      required: [true, "Document type is required"],
    },
    // Display-only. Never used to build storage paths — keys are always
    // server-generated (userId/applicationId/uuid.ext).
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    // select: false + the toJSON transform below keep the key internal: it
    // never leaves the API, and queries must opt in with .select("+storageKey").
    storageKey: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    // Soft delete: deletes flip these flags (the stored object itself is
    // removed), so no live record ever dangles and an audit trail remains.
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.storageKey;
        return ret;
      },
    },
  }
);

// Covers the per-application list (dual-filtered, newest first) and the
// live-file count used for the per-application cap.
applicationFileSchema.index({ userId: 1, applicationId: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("ApplicationFile", applicationFileSchema);
