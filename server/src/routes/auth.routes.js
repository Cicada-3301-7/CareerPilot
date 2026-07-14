const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const { registerLimiter, loginLimiter } = require("../middleware/rateLimiter");
const { registerSchema, loginSchema } = require("../validators/auth.validators");

const router = express.Router();

router.post("/register", registerLimiter, validate(registerSchema), authController.register);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);

module.exports = router;
