const express = require("express");
const adminController = require("../controllers/admin.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/authorize");

const router = express.Router();

// Every admin route requires a valid JWT and the admin role (read from the
// database on each request, so demotion takes effect immediately).
router.use(authenticate, requireRole("admin"));

router.get("/stats", adminController.stats);

module.exports = router;
