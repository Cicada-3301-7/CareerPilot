const express = require("express");
const cors = require("cors");

const applicationRoutes = require("../routes/applications");
const authRoutes = require("./routes/auth.routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "CareerPilot API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
