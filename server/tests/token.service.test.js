const crypto = require("crypto");
const mongoose = require("mongoose");
const AuthToken = require("../src/models/AuthToken");
const { issueToken, consumeToken } = require("../src/services/token.service");

const userId = () => new mongoose.Types.ObjectId();

describe("token service", () => {
  it("issues a raw token and stores only its SHA-256 hash", async () => {
    const owner = userId();
    const { token, expiresAt } = await issueToken(owner, "verify_email");

    expect(token).toEqual(expect.any(String));
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const doc = await AuthToken.findOne({ userId: owner }).select("+tokenHash");
    expect(doc.type).toBe("verify_email");
    expect(doc.usedAt).toBeNull();
    expect(doc.tokenHash).not.toBe(token);
    expect(doc.tokenHash).toBe(crypto.createHash("sha256").update(token).digest("hex"));
  });

  it("consumes a valid token exactly once", async () => {
    const owner = userId();
    const { token } = await issueToken(owner, "password_reset");

    const first = await consumeToken(token, "password_reset");
    expect(first).not.toBeNull();
    expect(first.userId.toString()).toBe(owner.toString());
    expect(first.usedAt).toBeInstanceOf(Date);

    // Replay: the same link must never work twice.
    const second = await consumeToken(token, "password_reset");
    expect(second).toBeNull();
  });

  it("rejects a token presented as the wrong type", async () => {
    const owner = userId();
    const { token } = await issueToken(owner, "verify_email");

    expect(await consumeToken(token, "password_reset")).toBeNull();
    // The failed attempt must not have burned the token.
    expect(await consumeToken(token, "verify_email")).not.toBeNull();
  });

  it("rejects an expired token", async () => {
    const owner = userId();
    const { token } = await issueToken(owner, "password_reset");
    await AuthToken.updateOne(
      { userId: owner },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    expect(await consumeToken(token, "password_reset")).toBeNull();
  });

  it("invalidates the previous unused token when a new one is issued", async () => {
    const owner = userId();
    const { token: oldToken } = await issueToken(owner, "verify_email");
    const { token: newToken } = await issueToken(owner, "verify_email");

    expect(await consumeToken(oldToken, "verify_email")).toBeNull();
    expect(await consumeToken(newToken, "verify_email")).not.toBeNull();
  });

  it("keeps token types independent across reissues", async () => {
    const owner = userId();
    const { token: verify } = await issueToken(owner, "verify_email");
    await issueToken(owner, "password_reset");

    // Issuing a reset token must not invalidate the verification token.
    expect(await consumeToken(verify, "verify_email")).not.toBeNull();
  });

  it("returns null for unknown or malformed tokens", async () => {
    expect(await consumeToken("not-a-real-token", "verify_email")).toBeNull();
    expect(await consumeToken("", "verify_email")).toBeNull();
    expect(await consumeToken(undefined, "verify_email")).toBeNull();
  });

  it("rejects an unknown token type at issuance", async () => {
    await expect(issueToken(userId(), "magic_link")).rejects.toThrow(
      "Unknown auth token type: magic_link"
    );
  });
});
