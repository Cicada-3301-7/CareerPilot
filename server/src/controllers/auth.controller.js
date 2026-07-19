const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { consumeToken } = require("../services/token.service");
const { sendWelcomeEmail, sendVerificationEmail } = require("../services/email/auth.emails");

const signToken = (user) =>
  jwt.sign(
    { userId: user._id, tokenVersion: user.tokenVersion ?? 0 },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "user",
  createdAt: user.createdAt,
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError("An account with that email already exists", 409);
  }

  const user = await User.create({ name, email, password });

  // Email failures must never fail registration — the account already exists,
  // and the user can resend verification later. Awaited (not fire-and-forget)
  // so behavior is deterministic; .catch keeps failures out of the response.
  await sendWelcomeEmail(user).catch((err) =>
    console.error("Failed to send welcome email:", err.message)
  );
  await sendVerificationEmail(user).catch((err) =>
    console.error("Failed to send verification email:", err.message)
  );

  const token = signToken(user);

  return res.status(201).json({ token, user: safeUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const match = await user.comparePassword(password);
  if (!match) {
    throw new AppError("Invalid email or password", 401);
  }

  // Only after password verification, so account status is never revealed
  // to someone who doesn't hold the credentials.
  if (user.status === "suspended") {
    throw new AppError("Account suspended", 403);
  }

  const token = signToken(user);
  return res.status(200).json({ token, user: safeUser(user) });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return res.status(200).json({ user: safeUser(user) });
});

const logoutAll = asyncHandler(async (req, res) => {
  // Invalidates every previously issued token for this user; tokens signed
  // after the next login carry the incremented version.
  await User.findByIdAndUpdate(req.userId, { $inc: { tokenVersion: 1 } });
  return res.status(200).json({ message: "Logged out of all sessions" });
});

const verifyEmail = asyncHandler(async (req, res) => {
  // consumeToken enforces type, expiry and single-use atomically; every
  // failure mode collapses into null so the error can't leak which one it was.
  const authToken = await consumeToken(req.body.token, "verify_email");
  if (!authToken) {
    throw new AppError("Invalid or expired verification link", 400);
  }

  // The { $ne: true } guard keeps the original emailVerifiedAt if the account
  // is somehow already verified (a second link issued before the first was
  // used); the endpoint stays idempotent either way.
  await User.updateOne(
    { _id: authToken.userId, emailVerified: { $ne: true } },
    { $set: { emailVerified: true, emailVerifiedAt: new Date() } }
  );

  return res.status(200).json({ message: "Email verified successfully" });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.emailVerified) {
    return res.status(200).json({ message: "Email is already verified" });
  }

  // Same policy as registration: a provider outage should read as "try again
  // shortly", never as a server error.
  await sendVerificationEmail(user).catch((err) =>
    console.error("Failed to send verification email:", err.message)
  );

  return res.status(200).json({ message: "Verification email sent" });
});

module.exports = { register, login, me, logoutAll, verifyEmail, resendVerification };
