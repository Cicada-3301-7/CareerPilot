const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  registerLimiter,
  loginLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
} = require("../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
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

module.exports = router;
