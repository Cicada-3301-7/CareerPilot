const env = require("../../config/env");

// Storage driver abstraction. Every driver implements the same interface so
// controllers never know (or care) which backend holds the bytes:
//   put({ key, body, contentType })  → resolves when stored
//   getStream(key)                   → Readable; AppError(404) if missing
//   remove(keys)                     → best-effort batch delete; never throws
//
// Only file *metadata* lives in MongoDB — the objects themselves live behind
// this interface (S3/R2 in production, local disk in dev, memory in tests).
const DRIVERS = {
  s3: "./s3.driver",
  local: "./local.driver",
  memory: "./memory.driver",
};

// env.js already validates the driver name; this guard is a safety net for
// programmatic misuse.
const driverPath = DRIVERS[env.storageDriver];
if (!driverPath) {
  throw new Error(`Unknown storage driver: ${env.storageDriver}`);
}

module.exports = require(driverPath);
