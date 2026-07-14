const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const signToken = (userId) =>
  jwt.sign({ userId }, env.jwtSecret, { expiresIn: "7d" });

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError("An account with that email already exists", 409);
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);

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

  const token = signToken(user._id);
  return res.status(200).json({ token, user: safeUser(user) });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return res.status(200).json({ user: safeUser(user) });
});

module.exports = { register, login, me };
