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

// Uploads buffer whole files in memory, so they get their own throttle.
// Skipped under test so cap/concurrency tests can't trip it.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: TOO_MANY_ATTEMPTS,
  skip: () => process.env.NODE_ENV === "test",
});

module.exports = { registerLimiter, loginLimiter, uploadLimiter };
