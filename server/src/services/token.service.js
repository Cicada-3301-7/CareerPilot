const crypto = require("crypto");
const AuthToken = require("../models/AuthToken");
const env = require("../config/env");

// Issuance and consumption of the single-use tokens behind emailed links.
// The raw token (256 bits of CSPRNG entropy) is returned to the caller for the
// link and never stored; only its SHA-256 hash reaches the database. SHA-256 —
// not bcrypt — is correct here: bcrypt defends low-entropy passwords, while a
// 256-bit random value cannot be brute-forced and a plain hash keeps the
// unique-index lookup O(1).

const tokenTtlMs = (type) => {
  switch (type) {
    case "verify_email":
      return env.verifyTokenTtlHours * 60 * 60 * 1000;
    case "password_reset":
      return env.resetTokenTtlMinutes * 60 * 1000;
    default:
      // Programmer error, not an operational failure.
      throw new Error(`Unknown auth token type: ${type}`);
  }
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Returns { token, expiresAt } — `token` is the raw value for the emailed
// link. Any outstanding unused token of the same type is invalidated first, so
// exactly one link per (user, type) works at a time.
const issueToken = async (userId, type) => {
  const expiresAt = new Date(Date.now() + tokenTtlMs(type));
  await AuthToken.deleteMany({ userId, type, usedAt: null });

  const token = crypto.randomBytes(32).toString("base64url");
  await AuthToken.create({ userId, type, tokenHash: hashToken(token), expiresAt });

  return { token, expiresAt };
};

// Atomically marks the matching token as used and returns its document, or
// null when the token is unknown, expired, already used, or the wrong type.
// The single findOneAndUpdate leaves no read-then-write window, so a replayed
// link can never win a race against the first use.
const consumeToken = async (token, type) => {
  if (typeof token !== "string" || token.length === 0) return null;

  return AuthToken.findOneAndUpdate(
    {
      tokenHash: hashToken(token),
      type,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
};

module.exports = { issueToken, consumeToken };
