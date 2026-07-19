// These must be set before anything requires src/config/env.js (which is
// loaded transitively by requiring src/app.js). dotenv never overrides
// pre-set variables, so this also insulates tests from the real server/.env.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  "careerpilot-test-secret-0123456789abcdef0123456789abcdef01234567";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/careerpilot-test-unused";
process.env.STORAGE_DRIVER = "memory";
process.env.EMAIL_DRIVER = "memory";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../src/models/User");
const Application = require("../src/models/Application");
const ApplicationFile = require("../src/models/ApplicationFile");
const AuthToken = require("../src/models/AuthToken");
const storage = require("../src/services/storage");
const emailDriver = require("../src/services/email/drivers");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Tests must never reach a real database.
  if (!["127.0.0.1", "localhost"].includes(mongoose.connection.host)) {
    throw new Error(
      `Tests must run against a local in-memory MongoDB, got: ${mongoose.connection.host}`
    );
  }

  // Build indexes (e.g. the unique email index) before any test relies on them.
  await User.init();
  await Application.init();
  await ApplicationFile.init();
  await AuthToken.init();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  storage._clear();
  emailDriver._clear();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
