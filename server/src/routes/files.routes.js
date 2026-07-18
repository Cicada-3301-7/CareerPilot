const express = require("express");
const filesController = require("../controllers/files.controller");
const validate = require("../middleware/validate");
const { uploadLimiter } = require("../middleware/rateLimiter");
const { uploadSingle } = require("../middleware/upload");
const {
  uploadFileSchema,
  applicationIdParamSchema,
  fileParamsSchema,
} = require("../validators/files.validators");

// mergeParams so :id from the parent /api/applications router is visible.
// authenticate is inherited from the parent router's router.use().
const router = express.Router({ mergeParams: true });

// Chain order matters: limiter before multer (don't buffer bodies for
// throttled clients), params before multer (reject garbage ids before
// accepting megabytes), multer before body validation (multer is what
// populates req.body with the multipart text fields).
router.post(
  "/",
  uploadLimiter,
  validate(applicationIdParamSchema, "params"),
  uploadSingle("file"),
  validate(uploadFileSchema),
  filesController.upload
);
router.get("/", validate(applicationIdParamSchema, "params"), filesController.list);
router.get("/:fileId/download", validate(fileParamsSchema, "params"), filesController.download);
router.delete("/:fileId", validate(fileParamsSchema, "params"), filesController.remove);

module.exports = router;
