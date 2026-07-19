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

// Verification tokens are unguessable, but keep link probing slow anyway.
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: TOO_MANY_ATTEMPTS,
});

// Every resend delivers a real email, so this is the strictest limiter of the
// auth group.
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: TOO_MANY_ATTEMPTS,
});

// Strictest of the auth group: every request can trigger a real email to an
// arbitrary address, so this is the classic mail-bomb / probing target.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: TOO_MANY_ATTEMPTS,
});

// Tokens are unguessable; this only keeps brute probing slow.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: TOO_MANY_ATTEMPTS,
});

module.exports = {
  registerLimiter,
  loginLimiter,
  uploadLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
};
