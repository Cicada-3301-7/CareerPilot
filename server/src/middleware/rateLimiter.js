const rateLimit = require("express-rate-limit");

const TOO_MANY_ATTEMPTS = { error: "Too many attempts. Please try again later." };

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: TOO_MANY_ATTEMPTS,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: TOO_MANY_ATTEMPTS,
});

module.exports = { registerLimiter, loginLimiter };
