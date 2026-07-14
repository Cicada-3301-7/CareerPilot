const env = require("./src/config/env");
const connectDB = require("./src/config/db");
const app = require("./src/app");

const startServer = async () => {
  try {
    await connectDB(env.mongoUri);
    console.log("Connected to MongoDB");

    app.listen(env.port, () => {
      console.log(`CareerPilot API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();
