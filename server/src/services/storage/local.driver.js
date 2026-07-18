const fs = require("fs");
const path = require("path");
const AppError = require("../../utils/AppError");
const env = require("../../config/env");

// Local-disk driver for development only — the production host's disk is
// ephemeral, so real deployments use the s3 driver.
const baseDir = path.resolve(env.localStorageDir);

// Keys are always server-generated, but resolve + prefix-check anyway so a
// hostile key could never escape the uploads directory (defense-in-depth).
const resolveKey = (key) => {
  const fullPath = path.resolve(baseDir, key);
  if (!fullPath.startsWith(baseDir + path.sep)) {
    throw new AppError("File not found", 404);
  }
  return fullPath;
};

const put = async ({ key, body }) => {
  const fullPath = resolveKey(key);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, body);
};

const getStream = async (key) => {
  const fullPath = resolveKey(key);
  try {
    await fs.promises.access(fullPath);
  } catch {
    throw new AppError("File not found", 404);
  }
  return fs.createReadStream(fullPath);
};

const remove = async (keys) => {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await fs.promises.rm(resolveKey(key), { force: true });
      } catch (error) {
        console.error(`Failed to remove stored file "${key}":`, error.message);
      }
    })
  );
};

module.exports = { put, getStream, remove };
