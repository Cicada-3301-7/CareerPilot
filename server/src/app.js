const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const applicationRoutes = require("./routes/applications.routes");
const authRoutes = require("./routes/auth.routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());
if (!isTest) {
  app.use(morgan(isProduction ? "combined" : "dev"));
}
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "CareerPilot API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
