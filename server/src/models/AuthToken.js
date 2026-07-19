const mongoose = require("mongoose");

// Single-use, short-lived tokens backing emailed links (email verification,
// password reset). Only the SHA-256 hash of a token is ever stored — the raw
// value exists solely in the emailed link — so a database leak exposes nothing
// usable. Issued and consumed exclusively through services/token.service.js.
const authTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // select: false keeps the hash out of accidental serialization; queries
    // filter on it directly, nothing ever needs to read it back.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    type: {
      type: String,
      enum: ["verify_email", "password_reset"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Set exactly once by the atomic consume in token.service.js; consumed
    // documents linger until the TTL sweep purges them, which is what makes a
    // replayed link fail.
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Serves "invalidate previous tokens of this type" on reissue.
authTokenSchema.index({ userId: 1, type: 1 });

// TTL: Mongo purges expired documents automatically (sweep runs ~every 60 s).
// Hygiene only — consumption always checks expiresAt itself, so correctness
// never depends on the sweep having run.
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AuthToken", authTokenSchema);
