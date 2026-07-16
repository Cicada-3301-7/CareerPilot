const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/User");

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
  return `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const register = (overrides = {}, ip = uniqueIp()) =>
  request(app)
    .post("/api/auth/register")
    .set("X-Forwarded-For", ip)
    .send({ ...VALID_USER, ...overrides });

const login = (credentials, ip = uniqueIp()) =>
  request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", ip)
    .send(credentials);

describe("POST /api/auth/register", () => {
  test("rejects missing fields", async () => {
    const res = await register({ name: undefined, email: undefined, password: undefined });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Name, email, and password are required" });
  });

  test("rejects an invalid email format", async () => {
    const res = await register({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Please enter a valid email address" });
  });

  test("rejects a password shorter than 8 characters", async () => {
    const res = await register({ password: "short" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Password must be at least 8 characters" });
  });

  test("creates a user and returns a token with the safe user shape", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(Object.keys(res.body.user).sort()).toEqual(["_id", "createdAt", "email", "name"]);
    expect(res.body.user.name).toBe(VALID_USER.name);
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user).not.toHaveProperty("password");
  });

  test("lowercases the stored email", async () => {
    const res = await register({ email: "MixedCase@Test.Local" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("mixedcase@test.local");
  });

  test("stores a bcrypt hash, never the plaintext password", async () => {
    await register();
    const user = await User.findOne({ email: VALID_USER.email });
    expect(user.password).not.toBe(VALID_USER.password);
    expect(user.password).toMatch(/^\$2/);
  });

  test("rejects a duplicate email with 409", async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "An account with that email already exists" });
  });
});

describe("POST /api/auth/login", () => {
  test("rejects missing fields", async () => {
    const res = await login({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Email and password are required" });
  });

  test("rejects an unknown email", async () => {
    const res = await login({ email: "nobody@test.local", password: "longenough1" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });

  test("rejects a wrong password with the same message as an unknown email", async () => {
    await register();
    const res = await login({ email: VALID_USER.email, password: "wrongwrong" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });

  test("returns a token and the safe user shape on success", async () => {
    await register();
    const res = await login({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(Object.keys(res.body.user).sort()).toEqual(["_id", "createdAt", "email", "name"]);
    expect(res.body.user).not.toHaveProperty("password");
  });

  test("matches emails case-insensitively", async () => {
    await register();
    const res = await login({ email: "USER@TEST.LOCAL", password: VALID_USER.password });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/auth/me", () => {
  test("returns the safe user for a valid token", async () => {
    const registered = await register();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registered.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(registered.body.user._id);
    expect(Object.keys(res.body.user).sort()).toEqual(["_id", "createdAt", "email", "name"]);
  });

  test("rejects a missing Authorization header", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });

  test("rejects a tampered token", async () => {
    const registered = await register();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registered.body.token}tampered`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid token" });
  });

  test("rejects an expired token", async () => {
    const registered = await register();
    const expired = jwt.sign(
      { userId: registered.body.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Session expired, please log in again" });
  });

  test("returns 404 for a valid token whose user no longer exists", async () => {
    const registered = await register();
    await User.deleteOne({ _id: registered.body.user._id });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registered.body.token}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });
});

describe("GET /healthz", () => {
  test("returns ok with the database state, no auth required", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "connected" });
  });
});

describe("POST /api/auth/logout-all (token revocation)", () => {
  const me = (token) =>
    request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  const logoutAll = (token) =>
    request(app).post("/api/auth/logout-all").set("Authorization", `Bearer ${token}`);

  test("requires authentication", async () => {
    const res = await request(app).post("/api/auth/logout-all");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });

  test("revokes previously issued tokens; a fresh login works again", async () => {
    const registered = await register();
    const oldToken = registered.body.token;

    const res = await logoutAll(oldToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Logged out of all sessions" });

    const rejected = await me(oldToken);
    expect(rejected.status).toBe(401);
    expect(rejected.body).toEqual({ error: "Session expired, please log in again" });

    const relogin = await login({ email: VALID_USER.email, password: VALID_USER.password });
    expect(relogin.status).toBe(200);
    const accepted = await me(relogin.body.token);
    expect(accepted.status).toBe(200);
  });

  test("repeated logout-all cycles reject all stale tokens, newest still works", async () => {
    const registered = await register();
    const tokenA = registered.body.token;

    expect((await logoutAll(tokenA)).status).toBe(200);

    const loginB = await login({ email: VALID_USER.email, password: VALID_USER.password });
    const tokenB = loginB.body.token;
    expect((await me(tokenB)).status).toBe(200);

    expect((await logoutAll(tokenB)).status).toBe(200);

    expect((await me(tokenA)).status).toBe(401);
    expect((await me(tokenB)).status).toBe(401);

    const loginC = await login({ email: VALID_USER.email, password: VALID_USER.password });
    const newest = await me(loginC.body.token);
    expect(newest.status).toBe(200);
    expect(newest.body.user.email).toBe(VALID_USER.email);
  });

  test("legacy tokens signed without a tokenVersion remain valid (grace)", async () => {
    const registered = await register();
    const legacy = jwt.sign(
      { userId: registered.body.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const res = await me(legacy);
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(registered.body.user._id);
  });

  test("no auth response ever exposes tokenVersion", async () => {
    const registered = await register();
    expect(registered.body.user).not.toHaveProperty("tokenVersion");
    const loggedIn = await login({ email: VALID_USER.email, password: VALID_USER.password });
    expect(loggedIn.body.user).not.toHaveProperty("tokenVersion");
    const meRes = await me(loggedIn.body.token);
    expect(meRes.body.user).not.toHaveProperty("tokenVersion");
  });
});

describe("rate limiting", () => {
  test("register: the 11th request from one IP is rejected with 429", async () => {
    const ip = "10.99.0.1";
    // Short-password payloads keep the limiter counting without creating users.
    for (let i = 0; i < 10; i += 1) {
      const res = await register({ password: "short" }, ip);
      expect(res.status).toBe(400);
    }
    const blocked = await register({ password: "short" }, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Too many attempts. Please try again later." });
    expect(await User.countDocuments()).toBe(0);
  });

  test("login: the 11th request from one IP is rejected with 429", async () => {
    const ip = "10.99.0.2";
    for (let i = 0; i < 10; i += 1) {
      const res = await login({ email: "nobody@test.local", password: "wrongwrong" }, ip);
      expect(res.status).toBe(401);
    }
    const blocked = await login({ email: "nobody@test.local", password: "wrongwrong" }, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Too many attempts. Please try again later." });
  });
});
