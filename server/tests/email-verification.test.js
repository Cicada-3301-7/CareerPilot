const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const AuthToken = require("../src/models/AuthToken");
const memoryDriver = require("../src/services/email/drivers/memory.driver");
const { issueToken } = require("../src/services/token.service");
const {
  uniqueIp,
  register,
  SUBJECTS,
  findEmail,
  waitFor,
  waitForEmail,
  waitForRegistrationEmails,
  tokenFromEmail,
} = require("./helpers/auth.helpers");

const VALID_USER = {
  name: "Verify User",
  email: "verify@test.local",
  password: "longenough1",
};

// Registers and waits for both background emails to land, so later steps (and
// the afterEach outbox wipe) can never race a straggling send.
const registerUser = async (overrides = {}) => {
  const res = await register({ ...VALID_USER, ...overrides });
  expect(res.status).toBe(201);
  await waitForRegistrationEmails(res.body.user.email);
  return res;
};

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

describe("registration emails", () => {
  test("sends a welcome and a verification email on register", async () => {
    await registerUser();

    const toUser = memoryDriver._outbox.filter((m) => m.to === VALID_USER.email);
    expect(toUser.map((m) => m.subject).sort()).toEqual([
      SUBJECTS.verification,
      SUBJECTS.welcome,
    ]);

    const verification = findEmail(VALID_USER.email, SUBJECTS.verification);
    expect(verification.text).toMatch(/\/verify-email\?token=[A-Za-z0-9_-]+/);
    expect(verification.html).toContain("/verify-email?token=");
  });

  test("registration succeeds even when email delivery fails", async () => {
    const sendSpy = jest
      .spyOn(memoryDriver, "send")
      .mockRejectedValue(new Error("provider down"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await register(VALID_USER);
      expect(res.status).toBe(201);
      expect(typeof res.body.token).toBe("string");

      const user = await User.findOne({ email: VALID_USER.email });
      expect(user).not.toBeNull();

      // Failures are logged in the background with full context.
      await waitFor(
        () =>
          errorSpy.mock.calls.some((c) => String(c[0]).includes("welcome")) &&
          errorSpy.mock.calls.some((c) => String(c[0]).includes("verification"))
      );
      const logged = errorSpy.mock.calls.map((c) => String(c[0]));
      const welcomeLine = logged.find((l) => l.includes("welcome"));
      expect(welcomeLine).toContain(`user=${user._id}`);
      expect(welcomeLine).toContain(`to=${VALID_USER.email}`);
      expect(welcomeLine).toContain("provider down");
    } finally {
      sendSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  test("a new user starts unverified", async () => {
    await registerUser();
    const user = await User.findOne({ email: VALID_USER.email });
    expect(user.emailVerified).toBe(false);
    expect(user.emailVerifiedAt).toBeNull();
  });

  test("registration response shape is unchanged", async () => {
    const res = await registerUser();
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
    await registerUser();
    const token = tokenFromEmail(findEmail(VALID_USER.email, SUBJECTS.verification));

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
    await registerUser();
    const token = tokenFromEmail(findEmail(VALID_USER.email, SUBJECTS.verification));
    await AuthToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await verifyEmail({ token });
    expect(res.status).toBe(400);

    const user = await User.findOne({ email: VALID_USER.email });
    expect(user.emailVerified).toBe(false);
  });

  test("rejects a reused token", async () => {
    await registerUser();
    const token = tokenFromEmail(findEmail(VALID_USER.email, SUBJECTS.verification));

    expect((await verifyEmail({ token })).status).toBe(200);
    const replay = await verifyEmail({ token });
    expect(replay.status).toBe(400);
    expect(replay.body).toEqual({ error: "Invalid or expired verification link" });
  });

  test("rejects a token of the wrong type", async () => {
    await registerUser();
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
    const { body } = await registerUser();
    memoryDriver._clear();

    const res = await resendVerification(body.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Verification email sent" });

    await waitForEmail(VALID_USER.email, SUBJECTS.verification);
    expect(memoryDriver._outbox).toHaveLength(1);
  });

  test("invalidates the previous token; only the newest link works", async () => {
    const { body } = await registerUser();
    const oldToken = tokenFromEmail(findEmail(VALID_USER.email, SUBJECTS.verification));
    memoryDriver._clear();

    await resendVerification(body.token);
    const newToken = tokenFromEmail(
      await waitForEmail(VALID_USER.email, SUBJECTS.verification)
    );

    expect(newToken).not.toBe(oldToken);
    expect((await verifyEmail({ token: oldToken })).status).toBe(400);
    expect((await verifyEmail({ token: newToken })).status).toBe(200);
  });

  test("reports an already verified account without sending email", async () => {
    const { body } = await registerUser();
    const token = tokenFromEmail(findEmail(VALID_USER.email, SUBJECTS.verification));
    await verifyEmail({ token });
    memoryDriver._clear();

    const res = await resendVerification(body.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Email is already verified" });
    expect(memoryDriver._outbox).toHaveLength(0);
  });

  test("rejects unexpected body fields", async () => {
    const { body } = await registerUser();
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .set("X-Forwarded-For", uniqueIp())
      .set("Authorization", `Bearer ${body.token}`)
      .send({ email: "attacker@test.local" });
    expect(res.status).toBe(400);
  });
});
