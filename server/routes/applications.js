const express = require("express");
const Application = require("../models/Application");

const router = express.Router();

const errorResponse = (res, error, fallbackMessage) => {
  const isClientError =
    error.name === "ValidationError" || error.name === "CastError";

  return res.status(isClientError ? 400 : 500).json({
    error: isClientError ? error.message : fallbackMessage,
  });
};

router.get("/", async (_req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    res.status(200).json(applications);
  } catch (error) {
    errorResponse(res, error, "Failed to fetch applications");
  }
});

router.post("/", async (req, res) => {
  try {
    const application = await Application.create(req.body);
    res.status(201).json(application);
  } catch (error) {
    errorResponse(res, error, "Failed to create application");
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
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

router.delete("/:id", async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    return res.status(200).json({ message: "Application deleted" });
  } catch (error) {
    return errorResponse(res, error, "Failed to delete application");
  }
});

module.exports = router;

