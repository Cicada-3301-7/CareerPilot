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
    const { search, status, workMode, dateRange, sort } = req.query;

    // Base filter — always scoped to the authenticated user
    const filter = { userId: req.userId };

    // ── Search ────────────────────────────────────────────────────────────────
    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { company: regex },
        { role: regex },
        { location: regex },
        { notes: regex },
      ];
    }

    // ── Status filter ─────────────────────────────────────────────────────────
    const VALID_STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected", "Saved"];
    if (status && status !== "All" && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }

    // ── Work Mode filter (derived from location field) ────────────────────────
    if (workMode && workMode !== "All") {
      const wmRegex = new RegExp(`\\b${workMode}\\b`, "i");
      filter.location = wmRegex;
    }

    // ── Date Applied filter ───────────────────────────────────────────────────
    if (dateRange && dateRange !== "All Time") {
      const now = new Date();
      let from;
      if (dateRange === "Today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === "Last 7 Days") {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "Last 30 Days") {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (from) {
        filter.createdAt = { $gte: from };
      }
    }

    // ── Sort ──────────────────────────────────────────────────────────────────
    let sortStage = { createdAt: -1 }; // default: newest first
    if (sort === "oldest")        sortStage = { createdAt: 1 };
    else if (sort === "company_az") sortStage = { company: 1 };
    else if (sort === "company_za") sortStage = { company: -1 };
    else if (sort === "role_az")    sortStage = { role: 1 };
    else if (sort === "status")     sortStage = { status: 1, createdAt: -1 };
    else if (sort === "deadline")   sortStage = { deadline: 1, createdAt: -1 };

    const applications = await Application.find(filter).sort(sortStage);
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
