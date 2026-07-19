const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    // Incremented to invalidate all previously issued tokens for this user.
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // Authorization role. Never client-assignable; promotion happens only via
    // scripts/promote-admin.js. The DB record is the source of truth — the
    // role is deliberately not embedded in JWTs.
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Email ownership confirmation. Purely informational for now — login is
    // never blocked on it. Pre-existing documents lack this field, so queries
    // must use { emailVerified: { $ne: true } } for "unverified" — DB filters
    // do not apply schema defaults, only hydration does.
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    // Reversible account lifecycle. Pre-existing documents lack this field,
    // so queries must treat "active" as { $ne: "suspended" } — DB filters do
    // not apply schema defaults, only hydration does.
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Serves the admin role/status filters and the last-active-admin count.
userSchema.index({ role: 1, status: 1 });

// Hash the password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare a candidate password against the stored hash
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
