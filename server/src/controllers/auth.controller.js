const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

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

module.exports = { register, login, me, logoutAll };
