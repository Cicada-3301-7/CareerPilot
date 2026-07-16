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

// Warn (never exit) so an already-deployed shorter secret keeps working.
if (JWT_SECRET.length < 32) {
  console.warn(
    "Warning: JWT_SECRET is shorter than 32 characters. Use a long, random secret in production."
  );
}

module.exports = {
  mongoUri: MONGODB_URI,
  jwtSecret: JWT_SECRET,
  port: PORT || 5000,
  nodeEnv: NODE_ENV || "development",
};
