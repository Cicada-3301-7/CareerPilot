const request = require("supertest");
const app = require("../../src/app");
const memoryDriver = require("../../src/services/email/drivers/memory.driver");

// Shared builders for the authentication suites (auth, email-verification,
// password-reset). Fixture users stay per-file; only mechanics live here.

// Rate limiting is keyed by req.ip and trust proxy is enabled, so a unique
// X-Forwarded-For per call keeps tests out of each other's rate-limit buckets.
let ipCounter = 0;
const uniqueIp = () => {
  ipCounter += 1;
  return `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const register = (user, ip = uniqueIp()) =>
  request(app).post("/api/auth/register").set("X-Forwarded-For", ip).send(user);

const login = (credentials, ip = uniqueIp()) =>
  request(app).post("/api/auth/login").set("X-Forwarded-For", ip).send(credentials);

const me = (token) =>
  request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

const SUBJECTS = {
  welcome: "Welcome to CareerPilot",
  verification: "Verify your CareerPilot email address",
  passwordReset: "Reset your CareerPilot password",
  passwordChanged: "Your CareerPilot password was changed",
};

const findEmail = (to, subject) =>
  memoryDriver._outbox.find((m) => m.to === to && m.subject === subject);

// Auth emails are sent fire-and-forget after the HTTP response, so tests wait
// for them to land instead of asserting on the outbox immediately.
const waitFor = async (fn, { timeoutMs = 2000, intervalMs = 10 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() > deadline) {
      throw new Error("waitFor: condition not met within timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

const waitForEmail = (to, subject) => waitFor(() => findEmail(to, subject));

// Waits until registration's two background sends have landed, so a test can
// clear the outbox (or end) without a late email leaking into the next test.
const waitForRegistrationEmails = (to) =>
  waitFor(() => findEmail(to, SUBJECTS.welcome) && findEmail(to, SUBJECTS.verification));

// The raw token only ever exists inside the emailed link.
const tokenFromEmail = (message) => message.text.match(/token=([A-Za-z0-9_-]+)/)[1];

module.exports = {
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
};
