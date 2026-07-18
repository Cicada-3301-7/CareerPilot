const express = require("express");
const applicationsController = require("../controllers/applications.controller");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const filesRoutes = require("./files.routes");
const {
  createApplicationSchema,
  updateApplicationSchema,
  listQuerySchema,
} = require("../validators/applications.validators");

const router = express.Router();

// All application routes require a valid JWT
router.use(authenticate);

router.get("/", validate(listQuerySchema, "query"), applicationsController.list);
router.post("/", validate(createApplicationSchema), applicationsController.create);
router.patch("/:id", validate(updateApplicationSchema), applicationsController.update);
router.delete("/:id", applicationsController.remove);

// Nested document routes (inherit authenticate from above)
router.use("/:id/files", filesRoutes);

module.exports = router;
