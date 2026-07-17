const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const Application = require("../src/models/Application");

const VALID_USER = {
  name: "Test User",
  email: "user@test.local",
  password: "longenough1",
};

// Rate limiting is keyed by req.ip and trust proxy is enabled, so a unique
// X-Forwarded-For per call keeps tests out of each other's rate-limit buckets.
let ipCounter = 0;
const uniqueIp = () => {
  ipCounter += 1;
  return `10.9.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const register = (overrides = {}) =>
  request(app)
    .post("/api/auth/register")
    .set("X-Forwarded-For", uniqueIp())
    .send({ ...VALID_USER, ...overrides });

const getStats = (token) => {
  const req = request(app).get("/api/admin/stats");
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
};

// Registers an account and promotes it to admin directly in the database
// (mirroring scripts/promote-admin.js — there is no API path to admin).
const registerAdmin = async (overrides = {}) => {
  const res = await register({ email: "admin@test.local", ...overrides });
  await User.updateOne({ email: res.body.user.email }, { $set: { role: "admin" } });
  return res.body;
};

describe("role assignment at registration", () => {
  test("newly registered users get role 'user' in the database and response", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("user");

    const stored = await User.findOne({ email: VALID_USER.email });
    expect(stored.role).toBe("user");
  });

  test("a role field in the registration payload is rejected, not silently ignored", async () => {
    const res = await register({ role: "admin" });
    expect(res.status).toBe(400);

    const stored = await User.findOne({ email: VALID_USER.email });
    expect(stored).toBeNull();
  });

  test.each([
    ["isAdmin", true],
    ["permissions", ["admin"]],
    ["tokenVersion", 99],
  ])("unexpected privilege field '%s' is rejected", async (field, value) => {
    const res = await register({ [field]: value });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe("GET /api/admin/stats authorization", () => {
  test("rejects requests without a token", async () => {
    const res = await getStats();
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });

  test("rejects a malformed token", async () => {
    const res = await getStats("not-a-real-token");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid token" });
  });

  test("returns 403 for an authenticated normal user", async () => {
    const { token } = (await register()).body;
    const res = await getStats(token);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "You do not have permission to perform this action" });
  });

  test("returns 200 for an admin", async () => {
    const { token } = await registerAdmin();
    const res = await getStats(token);
    expect(res.status).toBe(200);
  });

  test("denies a token whose user has since been deleted", async () => {
    const { token, user } = await registerAdmin();
    await User.deleteOne({ _id: user._id });

    const res = await getStats(token);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });

  test("role is read from the DB: demoting an admin revokes access for existing tokens", async () => {
    const { token, user } = await registerAdmin();
    expect((await getStats(token)).status).toBe(200);

    await User.updateOne({ _id: user._id }, { $set: { role: "user" } });

    const res = await getStats(token);
    expect(res.status).toBe(403);
  });

  test("promoting a user grants access to an already-issued token", async () => {
    const { body } = await register();
    expect((await getStats(body.token)).status).toBe(403);

    await User.updateOne({ _id: body.user._id }, { $set: { role: "admin" } });

    expect((await getStats(body.token)).status).toBe(200);
  });
});

describe("GET /api/admin/stats payload", () => {
  test("reports totals and zero-filled per-status counts", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;

    await Application.create([
      { userId: member.user._id, company: "A", role: "Dev", status: "Applied" },
      { userId: member.user._id, company: "B", role: "Dev", status: "Interview" },
      { userId: admin.user._id, company: "C", role: "Dev", status: "Applied" },
    ]);

    const res = await getStats(admin.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalUsers: 2,
      totalApplications: 3,
      applicationsByStatus: {
        Applied: 2,
        OA: 0,
        Interview: 1,
        Offer: 0,
        Rejected: 0,
      },
    });
  });

  test("never exposes password or tokenVersion anywhere in the response", async () => {
    const { token } = await registerAdmin();
    const res = await getStats(token);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/password/i);
    expect(raw).not.toMatch(/tokenVersion/i);
  });
});

describe("role exposure in auth responses", () => {
  test("login and /me include the role and still hide password/tokenVersion", async () => {
    await registerAdmin({ email: VALID_USER.email });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", uniqueIp())
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe("admin");

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.role).toBe("admin");
    expect(meRes.body.user).not.toHaveProperty("password");
    expect(meRes.body.user).not.toHaveProperty("tokenVersion");
  });

  test("the JWT payload never contains the role", async () => {
    const { token } = await registerAdmin();
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "tokenVersion", "userId"]);
  });

  test("users created before the role field existed are treated as 'user'", async () => {
    const { body } = await register();
    // Simulate a pre-Phase-9 document with no role field at all.
    await User.updateOne({ _id: body.user._id }, { $unset: { role: "" } });

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.role).toBe("user");

    expect((await getStats(body.token)).status).toBe(403);
  });
});
