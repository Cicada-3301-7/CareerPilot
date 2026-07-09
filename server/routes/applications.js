const express = require("express");
const Application = require("../models/Application");
const authenticate = require("../middleware/auth");

const router = express.Router();

// All application routes require a valid JWT
router.use(authenticate);

// ─── helpers ────────────────────────────────────────────────────────────────

const errorResponse = (res, error, fallbackMessage) => {
  const isClientError =
    error.name === "ValidationError" || error.name === "CastError";

  return res.status(isClientError ? 400 : 500).json({
    error: isClientError ? error.message : fallbackMessage,
  });
};

// ─── GET /api/applications ───────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(applications);
  } catch (error) {
    errorResponse(res, error, "Failed to fetch applications");
  }
});

// ─── POST /api/applications ──────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const application = await Application.create({
      ...req.body,
      userId: req.userId,
    });
    res.status(201).json(application);
  } catch (error) {
    errorResponse(res, error, "Failed to create application");
  }
});

// ─── PATCH /api/applications/:id ────────────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    // Filter by both _id and userId to prevent accessing another user's data
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    return res.status(200).json(application);
  } catch (error) {
    return errorResponse(res, error, "Failed to update application");
  }
});

// ─── DELETE /api/applications/:id ───────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    // Filter by both _id and userId to prevent deleting another user's data
    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    return res.status(200).json({ message: "Application deleted" });
  } catch (error) {
    return errorResponse(res, error, "Failed to delete application");
  }
});

module.exports = router;
