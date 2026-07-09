const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const dns = require("node:dns");

const applicationRoutes = require("./routes/applications");
const authRoutes = require("./routes/auth");

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "CareerPilot API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);

const startServer = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to server/.env.");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set. Add it to server/.env.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    app.listen(port, () => {
      console.log(`CareerPilot API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();
