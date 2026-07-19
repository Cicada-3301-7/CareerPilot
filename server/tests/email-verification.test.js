const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const AuthToken = require("../src/models/AuthToken");
const memoryDriver = require("../src/services/email/drivers/memory.driver");
const { issueToken } = require("../src/services/token.service");

const VALID_USER = {
  name: "Verify User",
  email: "verify@test.local",
  password: "longenough1",
};

// Rate limiting is keyed by req.ip and trust proxy is enabled, so a unique
// X-Forwarded-For per call keeps tests out of each other's rate-limit buckets.
let ipCounter = 0;
const uniqueIp = () => {
  ipCounter += 1;
  return `10.2.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const register = (overrides = {}) =>
  request(app)
    .post("/api/auth/register")
    .set("X-Forwarded-For", uniqueIp())
    .send({ ...VALID_USER, ...overrides });

const verifyEmail = (body) =>
  request(app)
    .post("/api/auth/verify-email")
    .set("X-Forwarded-For", uniqueIp())
    .send(body);

const resendVerification = (jwt) => {
  const req = request(app)
    .post("/api/auth/resend-verification")
    .set("X-Forwarded-For", uniqueIp());
  return jwt ? req.set("Authorization", `Bearer ${jwt}`).send({}) : req.send({});
};

// The raw token only exists inside the emailed link.
const tokenFromEmail = (message) => message.text.match(/token=([A-Za-z0-9_-]+)/)[1];

const verificationEmailFor = (email) =>
  memoryDriver._outbox.find(
    (m) => m.to === email && m.subject === "Verify your CareerPilot email address"
  );

describe("registration emails", () => {
  test("sends a welcome and a verification email on register", async () => {
    const res = await register();
    expect(res.status).toBe(201);

    const toUser = memoryDriver._outbox.filter((m) => m.to === VALID_USER.email);
    expect(toUser.map((m) => m.subject).sort()).toEqual([
      "Verify your CareerPilot email address",
      "Welcome to CareerPilot",
    ]);

    const verification = verificationEmailFor(VALID_USER.email);
    expect(verification.text).toMatch(/\/verify-email\?token=[A-Za-z0-9_-]+/);
    expect(verification.html).toContain("/verify-email?token=");
  });

  test("registration succeeds even when email delivery fails", async () => {
    const sendSpy = jest
      .spyOn(memoryDriver, "send")
      .mockRejectedValue(new Error("provider down"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await register();
      expect(res.status).toBe(201);
      expect(typeof res.body.token).toBe("string");

      const user = await User.findOne({ email: VALID_USER.email });
      expect(user).not.toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to send welcome email:",
        "provider down"
      );
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to send verification email:",
        "provider down"
      );
    } finally {
      sendSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  test("a new user starts unverified", async () => {
    await register();
    const user = await User.findOne({ email: VALID_USER.email });
    expect(user.emailVerified).toBe(false);
    expect(user.emailVerifiedAt).toBeNull();
  });

  test("registration response shape is unchanged", async () => {
    const res = await register();
    expect(Object.keys(res.body.user).sort()).toEqual([
      "_id",
      "createdAt",
      "email",
      "name",
      "role",
    ]);
  });
});

describe("POST /api/auth/verify-email", () => {
  test("verifies the account with a valid token", async () => {
    await register();
    const token = tokenFromEmail(verificationEmailFor(VALID_USER.email));

    const res = await verifyEmail({ token });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Email verified successfully" });

    const user = await User.findOne({ email: VALID_USER.email });
    expect(user.emailVerified).toBe(true);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
  });

  test("rejects an unknown token", async () => {
    const res = await verifyEmail({ token: "definitely-not-a-real-token" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid or expired verification link" });
  });

  test("rejects a missing token", async () => {
    const res = await verifyEmail({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Verification token is required" });
  });

  test("rejects an expired token and leaves the user unverified", async () => {
    await register();
    const token = tokenFromEmail(verificationEmailFor(VALID_USER.email));
    await AuthToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await verifyEmail({ token });
    expect(res.status).toBe(400);

    const user = await User.findOne({ email: VALID_USER.email });
    expect(user.emailVerified).toBe(false);
  });

  test("rejects a reused token", async () => {
    await register();
    const token = tokenFromEmail(verificationEmailFor(VALID_USER.email));

    expect((await verifyEmail({ token })).status).toBe(200);
    const replay = await verifyEmail({ token });
    expect(replay.status).toBe(400);
    expect(replay.body).toEqual({ error: "Invalid or expired verification link" });
  });

  test("rejects a token of the wrong type", async () => {
    await register();
    const user = await User.findOne({ email: VALID_USER.email });
    const { token } = await issueToken(user._id, "password_reset");

    const res = await verifyEmail({ token });
    expect(res.status).toBe(400);

    const fresh = await User.findOne({ email: VALID_USER.email });
    expect(fresh.emailVerified).toBe(false);
  });
});

describe("POST /api/auth/resend-verification", () => {
  test("requires authentication", async () => {
    const res = await resendVerification();
    expect(res.status).toBe(401);
  });

  test("sends a fresh verification email", async () => {
    const { body } = await register();
    memoryDriver._clear();

    const res = await resendVerification(body.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Verification email sent" });

    expect(memoryDriver._outbox).toHaveLength(1);
    expect(memoryDriver._outbox[0].subject).toBe("Verify your CareerPilot email address");
  });

  test("invalidates the previous token; only the newest link works", async () => {
    const { body } = await register();
    const oldToken = tokenFromEmail(verificationEmailFor(VALID_USER.email));
    memoryDriver._clear();

    await resendVerification(body.token);
    const newToken = tokenFromEmail(verificationEmailFor(VALID_USER.email));

    expect(newToken).not.toBe(oldToken);
    expect((await verifyEmail({ token: oldToken })).status).toBe(400);
    expect((await verifyEmail({ token: newToken })).status).toBe(200);
  });

  test("reports an already verified account without sending email", async () => {
    const { body } = await register();
    const token = tokenFromEmail(verificationEmailFor(VALID_USER.email));
    await verifyEmail({ token });
    memoryDriver._clear();

    const res = await resendVerification(body.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Email is already verified" });
    expect(memoryDriver._outbox).toHaveLength(0);
  });

  test("rejects unexpected body fields", async () => {
    const { body } = await register();
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .set("X-Forwarded-For", uniqueIp())
      .set("Authorization", `Bearer ${body.token}`)
      .send({ email: "attacker@test.local" });
    expect(res.status).toBe(400);
  });
});
