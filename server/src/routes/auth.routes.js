const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  registerLimiter,
  loginLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require("../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validators");

const router = express.Router();

router.post("/register", registerLimiter, validate(registerSchema), authController.register);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);
router.post("/logout-all", authenticate, authController.logoutAll);
// Public: the user clicking the emailed link may not be signed in.
router.post(
  "/verify-email",
  verifyEmailLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail
);
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  authenticate,
  validate(resendVerificationSchema),
  authController.resendVerification
);
// Public by nature: both are reached from an email link, signed out.
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  resetPasswordLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

module.exports = router;
