const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Application = require("../src/models/Application");
const adminController = require("../src/controllers/admin.controller");

// Rate limiting is keyed by req.ip and trust proxy is enabled, so a unique
// X-Forwarded-For per call keeps tests out of each other's rate-limit buckets.
let ipCounter = 0;
const uniqueIp = () => {
  ipCounter += 1;
  return `10.8.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const PASSWORD = "longenough1";

const register = (overrides = {}) =>
  request(app)
    .post("/api/auth/register")
    .set("X-Forwarded-For", uniqueIp())
    .send({ name: "Member", email: "member@test.local", password: PASSWORD, ...overrides });

const login = (email, password = PASSWORD) =>
  request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", uniqueIp())
    .send({ email, password });

// Registers an account and promotes it to admin directly in the database
// (mirroring scripts/promote-admin.js — there is no API path to admin).
const registerAdmin = async (overrides = {}) => {
  const res = await register({ name: "Admin", email: "admin@test.local", ...overrides });
  await User.updateOne({ _id: res.body.user._id }, { $set: { role: "admin" } });
  return res.body;
};

const authed = (method, url, token) =>
  request(app)[method](url).set("Authorization", `Bearer ${token}`);

const someId = () => new mongoose.Types.ObjectId().toString();

describe("admin user endpoints access control", () => {
  const endpoints = [
    ["get", () => "/api/admin/users"],
    ["get", () => `/api/admin/users/${someId()}`],
    ["patch", () => `/api/admin/users/${someId()}/role`],
    ["patch", () => `/api/admin/users/${someId()}/status`],
  ];

  test.each(endpoints)("%s %s rejects requests without a token", async (method, url) => {
    const res = await request(app)[method](url());
    expect(res.status).toBe(401);
  });

  test.each(endpoints)("%s %s returns 403 for a normal user", async (method, url) => {
    const { token } = (await register()).body;
    const res = await authed(method, url(), token);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "You do not have permission to perform this action" });
  });
});

describe("GET /api/admin/users", () => {
  test("returns a paginated envelope of safe user objects", async () => {
    const admin = await registerAdmin();
    await register();

    const res = await authed("get", "/api/admin/users", admin.token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 });
    expect(res.body.data).toHaveLength(2);
    for (const user of res.body.data) {
      expect(Object.keys(user).sort()).toEqual([
        "_id", "createdAt", "email", "name", "role", "status", "updatedAt",
      ]);
    }
  });

  test("paginates with page/limit and reports totals", async () => {
    const admin = await registerAdmin();
    await register({ email: "b@test.local" });
    await register({ email: "c@test.local" });

    const res = await authed("get", "/api/admin/users?limit=2&page=2", admin.token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  test("an out-of-range limit falls back to the default instead of erroring", async () => {
    const admin = await registerAdmin();
    const res = await authed("get", "/api/admin/users?limit=500", admin.token);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(20);
  });

  test("searches name and email case-insensitively", async () => {
    const admin = await registerAdmin();
    await register({ name: "Alice Johnson", email: "alice@test.local" });
    await register({ name: "Bob Stone", email: "bob@example.com" });

    const byName = await authed("get", "/api/admin/users?search=aLiCe", admin.token);
    expect(byName.body.total).toBe(1);
    expect(byName.body.data[0].email).toBe("alice@test.local");

    const byEmail = await authed("get", "/api/admin/users?search=example.com", admin.token);
    expect(byEmail.body.total).toBe(1);
    expect(byEmail.body.data[0].name).toBe("Bob Stone");
  });

  test("treats regex metacharacters in search literally", async () => {
    const admin = await registerAdmin();
    await register({ name: "Alice", email: "alice@test.local" });

    const res = await authed("get", "/api/admin/users?search=.%2A", admin.token); // ".*"
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  test("filters by role, matching legacy documents without a role field as 'user'", async () => {
    const admin = await registerAdmin();
    const legacy = (await register({ email: "legacy@test.local" })).body;
    await User.updateOne({ _id: legacy.user._id }, { $unset: { role: "" } });

    const admins = await authed("get", "/api/admin/users?role=admin", admin.token);
    expect(admins.body.total).toBe(1);
    expect(admins.body.data[0].email).toBe("admin@test.local");

    const users = await authed("get", "/api/admin/users?role=user", admin.token);
    expect(users.body.total).toBe(1);
    expect(users.body.data[0].email).toBe("legacy@test.local");
  });

  test("filters by status, matching legacy documents without a status field as 'active'", async () => {
    const admin = await registerAdmin();
    const legacy = (await register({ email: "legacy@test.local" })).body;
    await User.updateOne({ _id: legacy.user._id }, { $unset: { status: "" } });
    const suspended = (await register({ email: "suspended@test.local" })).body;
    await User.updateOne({ _id: suspended.user._id }, { $set: { status: "suspended" } });

    const active = await authed("get", "/api/admin/users?status=active", admin.token);
    expect(active.body.total).toBe(2);
    expect(active.body.data.map((u) => u.email).sort()).toEqual([
      "admin@test.local", "legacy@test.local",
    ]);

    const susp = await authed("get", "/api/admin/users?status=suspended", admin.token);
    expect(susp.body.total).toBe(1);
    expect(susp.body.data[0].email).toBe("suspended@test.local");
  });

  test("supports the whitelisted sorts and ignores unknown sort values", async () => {
    const admin = await registerAdmin({ name: "Zed" });
    await register({ name: "Amy", email: "amy@test.local" });

    const az = await authed("get", "/api/admin/users?sort=name_az", admin.token);
    expect(az.body.data.map((u) => u.name)).toEqual(["Amy", "Zed"]);

    const za = await authed("get", "/api/admin/users?sort=name_za", admin.token);
    expect(za.body.data.map((u) => u.name)).toEqual(["Zed", "Amy"]);

    const bogus = await authed("get", "/api/admin/users?sort=__proto__", admin.token);
    expect(bogus.status).toBe(200);
  });

  test("never exposes password or tokenVersion", async () => {
    const admin = await registerAdmin();
    await register();
    const res = await authed("get", "/api/admin/users", admin.token);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/password/i);
    expect(raw).not.toMatch(/tokenVersion/i);
  });
});

describe("GET /api/admin/users/:id", () => {
  test("returns the safe user with zero-filled application aggregates", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;
    await Application.create([
      { userId: member.user._id, company: "A", role: "Dev", status: "Applied" },
      { userId: member.user._id, company: "B", role: "Dev", status: "Offer" },
      { userId: admin.user._id, company: "C", role: "Dev", status: "Applied" },
    ]);

    const res = await authed("get", `/api/admin/users/${member.user._id}`, admin.token);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("member@test.local");
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body.user).not.toHaveProperty("tokenVersion");
    expect(res.body.applications).toEqual({
      total: 2,
      byStatus: { Applied: 1, OA: 0, Interview: 0, Offer: 1, Rejected: 0 },
    });
  });

  test("hydrates legacy documents with default role and status", async () => {
    const admin = await registerAdmin();
    const legacy = (await register()).body;
    await User.updateOne({ _id: legacy.user._id }, { $unset: { role: "", status: "" } });

    const res = await authed("get", `/api/admin/users/${legacy.user._id}`, admin.token);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.status).toBe("active");
  });

  test("returns 404 for an unknown id and 400 for a malformed id", async () => {
    const admin = await registerAdmin();

    const missing = await authed("get", `/api/admin/users/${someId()}`, admin.token);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "User not found" });

    const malformed = await authed("get", "/api/admin/users/not-an-id", admin.token);
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: "Invalid user id" });
  });
});

describe("PATCH /api/admin/users/:id/role", () => {
  test("promotes a user, and their existing token gains admin access immediately", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;
    expect((await authed("get", "/api/admin/stats", member.token)).status).toBe(403);

    const res = await authed("patch", `/api/admin/users/${member.user._id}/role`, admin.token)
      .send({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
    expect((await User.findById(member.user._id)).role).toBe("admin");

    expect((await authed("get", "/api/admin/stats", member.token)).status).toBe(200);
  });

  test("demotes an admin, and their existing token loses admin access immediately", async () => {
    const adminA = await registerAdmin();
    const adminB = await registerAdmin({ email: "admin-b@test.local" });
    // Tokens are issued at registration, before the DB promotion, so re-login
    // is unnecessary — role is read from the DB on every request.

    const res = await authed("patch", `/api/admin/users/${adminB.user._id}/role`, adminA.token)
      .send({ role: "user" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("user");

    expect((await authed("get", "/api/admin/stats", adminB.token)).status).toBe(403);
    // The acting admin always survives their own request — never zero admins.
    expect((await authed("get", "/api/admin/stats", adminA.token)).status).toBe(200);
  });

  test("rejects invalid roles and extra body fields", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;
    const url = `/api/admin/users/${member.user._id}/role`;

    const invalid = await authed("patch", url, admin.token).send({ role: "superadmin" });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: "Role must be 'user' or 'admin'" });

    const extra = await authed("patch", url, admin.token).send({ role: "admin", tokenVersion: 9 });
    expect(extra.status).toBe(400);
    expect((await User.findById(member.user._id)).role).toBe("user");
  });

  test("rejects changing your own role", async () => {
    const admin = await registerAdmin();
    const res = await authed("patch", `/api/admin/users/${admin.user._id}/role`, admin.token)
      .send({ role: "user" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "You cannot change your own role" });
    expect((await User.findById(admin.user._id)).role).toBe("admin");
  });

  test("returns 404 for an unknown target", async () => {
    const admin = await registerAdmin();
    const res = await authed("patch", `/api/admin/users/${someId()}/role`, admin.token)
      .send({ role: "user" });
    expect(res.status).toBe(404);
  });

  test("defense-in-depth: blocks demotion that would leave zero active admins", async () => {
    // Unreachable through the API in sequential use (the acting admin always
    // survives their own request), so simulate the concurrent race where the
    // actor's own admin record disappeared after authorization.
    const soleAdmin = await registerAdmin();
    const req = {
      params: { id: soleAdmin.user._id },
      body: { role: "user" },
      user: { id: someId(), role: "admin" },
    };
    // asyncHandler doesn't return its promise, so await next() being invoked.
    const error = await new Promise((resolve) => adminController.updateUserRole(req, {}, resolve));
    expect(error).toMatchObject({ statusCode: 400, message: "Cannot remove the last active admin" });
    expect((await User.findById(soleAdmin.user._id)).role).toBe("admin");
  });
});

describe("PATCH /api/admin/users/:id/status", () => {
  test("suspension blocks the target's existing token everywhere, immediately", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;
    expect((await authed("get", "/api/auth/me", member.token)).status).toBe(200);

    const res = await authed("patch", `/api/admin/users/${member.user._id}/status`, admin.token)
      .send({ status: "suspended" });
    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe("suspended");

    const me = await authed("get", "/api/auth/me", member.token);
    expect(me.status).toBe(403);
    expect(me.body).toEqual({ error: "Account suspended" });
    expect((await authed("get", "/api/applications", member.token)).status).toBe(403);
  });

  test("a suspended user cannot log in with correct credentials, but wrong passwords still get the generic message", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;
    await authed("patch", `/api/admin/users/${member.user._id}/status`, admin.token)
      .send({ status: "suspended" });

    const wrongPassword = await login("member@test.local", "not-the-password");
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: "Invalid email or password" });

    const rightPassword = await login("member@test.local");
    expect(rightPassword.status).toBe(403);
    expect(rightPassword.body).toEqual({ error: "Account suspended" });
  });

  test("reactivation restores access for the pre-suspension token", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;
    const url = `/api/admin/users/${member.user._id}/status`;

    await authed("patch", url, admin.token).send({ status: "suspended" });
    expect((await authed("get", "/api/auth/me", member.token)).status).toBe(403);

    const res = await authed("patch", url, admin.token).send({ status: "active" });
    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe("active");
    expect((await authed("get", "/api/auth/me", member.token)).status).toBe(200);
  });

  test("a suspended admin immediately loses admin access", async () => {
    const adminA = await registerAdmin();
    const adminB = await registerAdmin({ email: "admin-b@test.local" });
    expect((await authed("get", "/api/admin/stats", adminB.token)).status).toBe(200);

    await authed("patch", `/api/admin/users/${adminB.user._id}/status`, adminA.token)
      .send({ status: "suspended" });

    const res = await authed("get", "/api/admin/stats", adminB.token);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Account suspended" });
  });

  test("rejects self-suspension", async () => {
    const admin = await registerAdmin();
    const res = await authed("patch", `/api/admin/users/${admin.user._id}/status`, admin.token)
      .send({ status: "suspended" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "You cannot change your own account status" });
  });

  test("rejects invalid statuses and extra body fields", async () => {
    const admin = await registerAdmin();
    const member = (await register()).body;
    const url = `/api/admin/users/${member.user._id}/status`;

    const invalid = await authed("patch", url, admin.token).send({ status: "banned" });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: "Status must be 'active' or 'suspended'" });

    const extra = await authed("patch", url, admin.token).send({ status: "suspended", role: "admin" });
    expect(extra.status).toBe(400);
    const stored = await User.findById(member.user._id);
    expect(stored.status).toBe("active");
    expect(stored.role).toBe("user");
  });

  test("defense-in-depth: blocks suspending the last active admin", async () => {
    // Same simulated race as the role-change guard test.
    const soleAdmin = await registerAdmin();
    const req = {
      params: { id: soleAdmin.user._id },
      body: { status: "suspended" },
      user: { id: someId(), role: "admin" },
    };
    // asyncHandler doesn't return its promise, so await next() being invoked.
    const error = await new Promise((resolve) => adminController.updateUserStatus(req, {}, resolve));
    expect(error).toMatchObject({ statusCode: 400, message: "Cannot suspend the last active admin" });
    expect((await User.findById(soleAdmin.user._id)).status).toBe("active");
  });

  test("new registrations default to active status", async () => {
    const { body } = await register();
    const stored = await User.findById(body.user._id);
    expect(stored.status).toBe("active");
  });
});
