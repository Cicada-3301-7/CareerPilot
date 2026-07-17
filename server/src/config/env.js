const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const {
  MONGODB_URI,
  JWT_SECRET,
  PORT,
  NODE_ENV,
  STORAGE_DRIVER,
  LOCAL_STORAGE_DIR,
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_ENDPOINT,
  S3_FORCE_PATH_STYLE,
  MAX_FILE_SIZE,
  MAX_FILES_PER_APPLICATION,
} = process.env;

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

const nodeEnv = NODE_ENV || "development";

// Storage driver selection. Production defaults to s3 because the host's disk
// is ephemeral (Render wipes it on every deploy); local disk is only a dev
// convenience, and tests set STORAGE_DRIVER=memory.
const storageDriver = STORAGE_DRIVER || (nodeEnv === "production" ? "s3" : "local");

if (!["s3", "local", "memory"].includes(storageDriver)) {
  console.error(`Unknown STORAGE_DRIVER "${storageDriver}". Use "s3", "local", or "memory".`);
  process.exit(1);
}

if (
  storageDriver === "s3" &&
  (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY)
) {
  console.error(
    "STORAGE_DRIVER=s3 requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY. Add them to server/.env."
  );
  process.exit(1);
}

if (nodeEnv === "production" && storageDriver === "local") {
  console.warn(
    "Warning: STORAGE_DRIVER=local in production. Uploaded documents will be lost on every redeploy — use s3."
  );
}

// Upload limits are env-tunable so operators never have to touch code.
const parsePositiveInt = (raw, fallback, name) => {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`${name} must be a positive integer, got "${raw}".`);
    process.exit(1);
  }
  return value;
};

module.exports = {
  mongoUri: MONGODB_URI,
  jwtSecret: JWT_SECRET,
  port: PORT || 5000,
  nodeEnv,
  storageDriver,
  localStorageDir: LOCAL_STORAGE_DIR || path.join(__dirname, "..", "..", "uploads"),
  s3: {
    bucket: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    endpoint: S3_ENDPOINT,
    forcePathStyle: S3_FORCE_PATH_STYLE === "true",
  },
  maxFileSize: parsePositiveInt(MAX_FILE_SIZE, 5 * 1024 * 1024, "MAX_FILE_SIZE"),
  maxFilesPerApplication: parsePositiveInt(MAX_FILES_PER_APPLICATION, 10, "MAX_FILES_PER_APPLICATION"),
};
