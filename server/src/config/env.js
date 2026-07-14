const dotenv = require("dotenv");
dotenv.config();

const { MONGODB_URI, JWT_SECRET, PORT, NODE_ENV } = process.env;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to server/.env.");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add it to server/.env.");
  process.exit(1);
}

module.exports = {
  mongoUri: MONGODB_URI,
  jwtSecret: JWT_SECRET,
  port: PORT || 5000,
  nodeEnv: NODE_ENV || "development",
};
