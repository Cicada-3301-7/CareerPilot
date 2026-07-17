const express = require("express");
const adminController = require("../controllers/admin.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/authorize");
const validate = require("../middleware/validate");
const {
  listUsersQuerySchema,
  updateRoleSchema,
  updateStatusSchema,
  objectIdParamSchema,
} = require("../validators/admin.validators");

const router = express.Router();

// Every admin route requires a valid JWT and the admin role (read from the
// database on each request, so demotion takes effect immediately).
router.use(authenticate, requireRole("admin"));

router.get("/stats", adminController.stats);

router.get("/users", validate(listUsersQuerySchema, "query"), adminController.listUsers);
router.get("/users/:id", validate(objectIdParamSchema, "params"), adminController.getUser);
router.patch(
  "/users/:id/role",
  validate(objectIdParamSchema, "params"),
  validate(updateRoleSchema),
  adminController.updateUserRole
);
router.patch(
  "/users/:id/status",
  validate(objectIdParamSchema, "params"),
  validate(updateStatusSchema),
  adminController.updateUserStatus
);

module.exports = router;
