const { Readable } = require("stream");
const AppError = require("../../utils/AppError");

// In-memory driver for the test suite: exercises the exact controller code
// paths (streams included) without any disk or network dependency.
const store = new Map();

const put = async ({ key, body, contentType }) => {
  store.set(key, { body, contentType });
};

const getStream = async (key) => {
  const entry = store.get(key);
  if (!entry) {
    throw new AppError("File not found", 404);
  }
  return Readable.from(entry.body);
};

const remove = async (keys) => {
  keys.forEach((key) => store.delete(key));
};

// Test hooks (prefixed to signal they are not part of the driver interface).
const _clear = () => store.clear();

module.exports = { put, getStream, remove, _store: store, _clear };
