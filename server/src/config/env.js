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
  EMAIL_DRIVER,
  RESEND_API_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM,
  EMAIL_REPLY_TO,
  VERIFY_TOKEN_TTL_HOURS,
  RESET_TOKEN_TTL_MINUTES,
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

// Email driver selection. Mirrors the storage driver pattern, but defaults to
// "console" (messages printed to the terminal) everywhere except tests, so an
// existing deployment without email configuration keeps booting — production
// operators opt in explicitly with EMAIL_DRIVER=resend or smtp.
const emailDriver = EMAIL_DRIVER || (nodeEnv === "test" ? "memory" : "console");

if (!["resend", "smtp", "console", "memory"].includes(emailDriver)) {
  console.error(
    `Unknown EMAIL_DRIVER "${emailDriver}". Use "resend", "smtp", "console", or "memory".`
  );
  process.exit(1);
}

if (emailDriver === "resend" && !RESEND_API_KEY) {
  console.error("EMAIL_DRIVER=resend requires RESEND_API_KEY. Add it to server/.env.");
  process.exit(1);
}

if (emailDriver === "smtp" && !SMTP_HOST) {
  console.error("EMAIL_DRIVER=smtp requires SMTP_HOST. Add it to server/.env.");
  process.exit(1);
}

if (["resend", "smtp"].includes(emailDriver) && !EMAIL_FROM) {
  console.error(
    `EMAIL_DRIVER=${emailDriver} requires EMAIL_FROM (e.g. "CareerPilot <no-reply@yourdomain.com>"). Add it to server/.env.`
  );
  process.exit(1);
}

if (nodeEnv === "production" && emailDriver === "console") {
  console.warn(
    "Warning: EMAIL_DRIVER=console in production. Emails are only printed to logs — set EMAIL_DRIVER=resend or smtp."
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
  emailDriver,
  // Default sender only matters for the console/memory drivers — the real
  // drivers require an explicit EMAIL_FROM (validated above).
  emailFrom: EMAIL_FROM || "CareerPilot <no-reply@careerpilot.local>",
  emailReplyTo: EMAIL_REPLY_TO,
  resendApiKey: RESEND_API_KEY,
  smtp: {
    host: SMTP_HOST,
    port: parsePositiveInt(SMTP_PORT, 587, "SMTP_PORT"),
    user: SMTP_USER,
    pass: SMTP_PASS,
    secure: SMTP_SECURE === "true",
  },
  verifyTokenTtlHours: parsePositiveInt(VERIFY_TOKEN_TTL_HOURS, 24, "VERIFY_TOKEN_TTL_HOURS"),
  resetTokenTtlMinutes: parsePositiveInt(RESET_TOKEN_TTL_MINUTES, 30, "RESET_TOKEN_TTL_MINUTES"),
};
