const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const AuthToken = require("../src/models/AuthToken");
const memoryDriver = require("../src/services/email/drivers/memory.driver");
const {
  uniqueIp,
  register,
  login,
  me,
  SUBJECTS,
  findEmail,
  waitFor,
  waitForEmail,
  waitForRegistrationEmails,
  tokenFromEmail,
} = require("./helpers/auth.helpers");

const VALID_USER = {
  name: "Reset User",
  email: "reset@test.local",
  password: "originalpass1",
};
const NEW_PASSWORD = "brandnewpass1";

const GENERIC_MESSAGE = {
  message: "If an account exists for that email, password reset instructions have been sent.",
};

const registerUser = async (overrides = {}) => {
  const res = await register({ ...VALID_USER, ...overrides });
  expect(res.status).toBe(201);
  await waitForRegistrationEmails(res.body.user.email);
  return res;
};

const forgotPassword = (body, ip = uniqueIp()) =>
  request(app).post("/api/auth/forgot-password").set("X-Forwarded-For", ip).send(body);

const resetPassword = (body) =>
  request(app)
    .post("/api/auth/reset-password")
    .set("X-Forwarded-For", uniqueIp())
    .send(body);

// Requests a reset and returns the raw token from the emailed link. Clears the
// outbox first so findEmail can never match an older reset email.
const requestResetToken = async () => {
  memoryDriver._clear();
  const res = await forgotPassword({ email: VALID_USER.email });
  expect(res.status).toBe(200);
  return tokenFromEmail(await waitForEmail(VALID_USER.email, SUBJECTS.passwordReset));
};

describe("POST /api/auth/forgot-password", () => {
  test("sends a reset email for an existing account", async () => {
    await registerUser();

    const res = await forgotPassword({ email: VALID_USER.email });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(GENERIC_MESSAGE);

    const email = await waitForEmail(VALID_USER.email, SUBJECTS.passwordReset);
    expect(email.text).toMatch(/\/reset-password\?token=[A-Za-z0-9_-]+/);
    expect(email.text).toContain("30 minutes");
  });

  test("returns the same response for an unknown email and sends nothing", async () => {
    const res = await forgotPassword({ email: "nobody@test.local" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(GENERIC_MESSAGE);
    expect(memoryDriver._outbox).toHaveLength(0);
  });

  test("returns the same response for a suspended account and sends nothing", async () => {
    await registerUser();
    await User.updateOne({ email: VALID_USER.email }, { $set: { status: "suspended" } });
    memoryDriver._clear();

    const res = await forgotPassword({ email: VALID_USER.email });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(GENERIC_MESSAGE);
    expect(memoryDriver._outbox).toHaveLength(0);
  });

  test("known and unknown emails produce byte-identical responses", async () => {
    await registerUser();

    const known = await forgotPassword({ email: VALID_USER.email });
    const unknown = await forgotPassword({ email: "ghost@test.local" });

    expect(known.status).toBe(unknown.status);
    expect(known.body).toEqual(unknown.body);
  });

  test("rejects a malformed email address", async () => {
    const res = await forgotPassword({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Please enter a valid email address" });
  });

  test("still returns success when email delivery fails, and logs context", async () => {
    const { body } = await registerUser();
    const sendSpy = jest
      .spyOn(memoryDriver, "send")
      .mockRejectedValue(new Error("provider down"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await forgotPassword({ email: VALID_USER.email });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(GENERIC_MESSAGE);

      const line = await waitFor(() =>
        errorSpy.mock.calls.map((c) => String(c[0])).find((l) => l.includes("password reset"))
      );
      expect(line).toContain(`user=${body.user._id}`);
      expect(line).toContain(`to=${VALID_USER.email}`);
      expect(line).toContain("provider down");
    } finally {
      sendSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  test("rate limits after 5 requests from one IP", async () => {
    const ip = "10.99.3.1";
    for (let i = 0; i < 5; i += 1) {
      const res = await forgotPassword({ email: "nobody@test.local" }, ip);
      expect(res.status).toBe(200);
    }
    const blocked = await forgotPassword({ email: "nobody@test.local" }, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Too many attempts. Please try again later." });
  });
});

describe("POST /api/auth/reset-password", () => {
  test("resets the password, revokes sessions and sends the changed email", async () => {
    const registered = await registerUser();
    const oldJwt = registered.body.token;
    const before = await User.findOne({ email: VALID_USER.email });

    const token = await requestResetToken();
    const res = await resetPassword({ token, password: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Password reset successfully. Please log in with your new password.",
    });

    // Password Changed email goes out in the background.
    await waitForEmail(VALID_USER.email, SUBJECTS.passwordChanged);

    // Every pre-reset session is revoked via the tokenVersion bump.
    const after = await User.findOne({ email: VALID_USER.email });
    expect(after.tokenVersion).toBe(before.tokenVersion + 1);
    const stale = await me(oldJwt);
    expect(stale.status).toBe(401);

    // Old password rejected, new password accepted; hash (never plaintext) stored.
    expect((await login({ email: VALID_USER.email, password: VALID_USER.password })).status).toBe(401);
    expect((await login({ email: VALID_USER.email, password: NEW_PASSWORD })).status).toBe(200);
    expect(after.password).not.toBe(NEW_PASSWORD);
    expect(after.password).toMatch(/^\$2/);
  });

  test("rejects an unknown token", async () => {
    const res = await resetPassword({ token: "not-a-real-token", password: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid or expired reset link" });
  });

  test("rejects a missing token or password", async () => {
    expect((await resetPassword({ password: NEW_PASSWORD })).body).toEqual({
      error: "Reset token is required",
    });
    expect((await resetPassword({ token: "x" })).body).toEqual({
      error: "Password is required",
    });
  });

  test("applies the registration password rules", async () => {
    await registerUser();
    const token = await requestResetToken();

    const res = await resetPassword({ token, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Password must be at least 8 characters" });
  });

  test("rejects an expired token; the old password keeps working", async () => {
    await registerUser();
    const token = await requestResetToken();
    await AuthToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await resetPassword({ token, password: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect((await login({ email: VALID_USER.email, password: VALID_USER.password })).status).toBe(200);
  });

  test("rejects a reused token; the first reset sticks", async () => {
    await registerUser();
    const token = await requestResetToken();

    expect((await resetPassword({ token, password: NEW_PASSWORD })).status).toBe(200);

    const replay = await resetPassword({ token, password: "attackerpass1" });
    expect(replay.status).toBe(400);
    expect(replay.body).toEqual({ error: "Invalid or expired reset link" });

    expect((await login({ email: VALID_USER.email, password: NEW_PASSWORD })).status).toBe(200);
    expect((await login({ email: VALID_USER.email, password: "attackerpass1" })).status).toBe(401);
  });

  test("rejects a token of the wrong type", async () => {
    await registerUser();
    const verificationToken = tokenFromEmail(
      findEmail(VALID_USER.email, SUBJECTS.verification)
    );

    const res = await resetPassword({ token: verificationToken, password: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect((await login({ email: VALID_USER.email, password: VALID_USER.password })).status).toBe(200);
  });

  test("a new forgot-password request invalidates the previous reset link", async () => {
    await registerUser();
    const firstToken = await requestResetToken();
    const secondToken = await requestResetToken();
    expect(secondToken).not.toBe(firstToken);

    expect((await resetPassword({ token: firstToken, password: NEW_PASSWORD })).status).toBe(400);
    expect((await resetPassword({ token: secondToken, password: NEW_PASSWORD })).status).toBe(200);
  });
});
