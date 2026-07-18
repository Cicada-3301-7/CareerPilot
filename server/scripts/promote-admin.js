/**
 * Promote an existing account to admin. This is the only supported way to
 * create an admin — there is deliberately no API path for it.
 *
 * Usage (from server/):
 *   node scripts/promote-admin.js <email>
 *
 * Requires MONGODB_URI in server/.env (same as the API server).
 */
const mongoose = require("mongoose");
const env = require("../src/config/env");
const User = require("../src/models/User");

const main = async () => {
  const email = (process.argv[2] || "").toLowerCase().trim();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error("Usage: node scripts/promote-admin.js <email>");
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(env.mongoUri);
  try {
    const user = await User.findOne({ email }).select("email role");

    if (!user) {
      // Promotion never creates accounts; the user must register first.
      console.error(`No account found for ${email}. Register the account first, then promote it.`);
      process.exitCode = 1;
      return;
    }

    if (user.role === "admin") {
      console.log(`${user.email} is already an admin. No changes made.`);
      return;
    }

    await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });
    console.log(`${user.email} has been promoted to admin.`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error("Promotion failed:", err.message);
  process.exit(1);
});
