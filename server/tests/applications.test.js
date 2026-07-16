const request = require("supertest");
const app = require("../src/app");
const Application = require("../src/models/Application");

// Rate limiting is keyed by req.ip and trust proxy is enabled, so a unique
// X-Forwarded-For per register keeps the auth limiter out of these tests.
let ipCounter = 0;
const uniqueIp = () => {
  ipCounter += 1;
  return `10.2.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const registerUser = async (email) => {
  const res = await request(app)
    .post("/api/auth/register")
    .set("X-Forwarded-For", uniqueIp())
    .send({ name: "App Tester", email, password: "longenough1" });
  return { token: res.body.token, id: res.body.user._id };
};

const createApplication = (token, fields) =>
  request(app)
    .post("/api/applications")
    .set("Authorization", `Bearer ${token}`)
    .send({ company: "Phase6 Corp", role: "Engineer", ...fields });

const listApplications = (token, query = {}) =>
  request(app)
    .get("/api/applications")
    .set("Authorization", `Bearer ${token}`)
    .query(query);

let userA;
let userB;

beforeEach(async () => {
  userA = await registerUser("a@test.local");
  userB = await registerUser("b@test.local");
});

describe("authentication gate", () => {
  test.each([
    ["get", "/api/applications"],
    ["post", "/api/applications"],
    ["patch", "/api/applications/000000000000000000000000"],
    ["delete", "/api/applications/000000000000000000000000"],
  ])("%s %s without a token is rejected", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });
});

describe("POST /api/applications", () => {
  test("creates a minimal application owned by the caller with default status", async () => {
    const res = await createApplication(userA.token);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(userA.id);
    expect(res.body.status).toBe("Applied");
    expect(res.body.company).toBe("Phase6 Corp");
  });

  test("rejects a missing company", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ role: "Engineer" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Company is required" });
  });

  test("rejects unexpected keys (strict schema)", async () => {
    const res = await createApplication(userA.token, { userId: userB.id });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Unrecognized key: "userId"' });
  });

  test("rejects an invalid priority value", async () => {
    const res = await createApplication(userA.token, { priority: "Urgent" });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });
});

describe("GET /api/applications", () => {
  test("returns only the caller's applications", async () => {
    await createApplication(userA.token, { company: "Alpha" });
    await createApplication(userA.token, { company: "Beta" });

    const listA = await listApplications(userA.token);
    expect(listA.status).toBe(200);
    expect(listA.body).toHaveLength(2);

    const listB = await listApplications(userB.token);
    expect(listB.status).toBe(200);
    expect(listB.body).toHaveLength(0);
  });

  test("search is case-insensitive across company/role/location/notes", async () => {
    await createApplication(userA.token, { company: "Google", notes: "referral pending" });
    await createApplication(userA.token, { company: "Amazon" });

    const byCompany = await listApplications(userA.token, { search: "gOOgle" });
    expect(byCompany.body).toHaveLength(1);
    expect(byCompany.body[0].company).toBe("Google");

    const byNotes = await listApplications(userA.token, { search: "REFERRAL" });
    expect(byNotes.body).toHaveLength(1);
  });

  test("search escapes regex special characters", async () => {
    await createApplication(userA.token, { company: "C++ Systems" });
    await createApplication(userA.token, { company: "CSystems" });

    const res = await listApplications(userA.token, { search: "C++" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].company).toBe("C++ Systems");
  });

  test("filters by status", async () => {
    await createApplication(userA.token, { status: "Interview" });
    await createApplication(userA.token, { status: "Applied" });

    const res = await listApplications(userA.token, { status: "Interview" });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("Interview");
  });

  test("an invalid status filter degrades to no filter (Phase 4 contract)", async () => {
    await createApplication(userA.token, { status: "Interview" });
    await createApplication(userA.token, { status: "Applied" });

    const res = await listApplications(userA.token, { status: "Saved" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("filters by work mode inferred from location", async () => {
    await createApplication(userA.token, { location: "Remote" });
    await createApplication(userA.token, { location: "Onsite — NYC" });

    const res = await listApplications(userA.token, { workMode: "Remote" });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].location).toBe("Remote");
  });

  test("dateRange=Today includes freshly created applications", async () => {
    await createApplication(userA.token);
    const res = await listApplications(userA.token, { dateRange: "Today" });
    expect(res.body).toHaveLength(1);
  });

  test("default sort is newest first", async () => {
    await createApplication(userA.token, { company: "First" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await createApplication(userA.token, { company: "Second" });

    const res = await listApplications(userA.token);
    expect(res.body.map((a) => a.company)).toEqual(["Second", "First"]);
  });

  test("sort=company_az orders alphabetically", async () => {
    await createApplication(userA.token, { company: "Zeta" });
    await createApplication(userA.token, { company: "Alpha" });

    const res = await listApplications(userA.token, { sort: "company_az" });
    expect(res.body.map((a) => a.company)).toEqual(["Alpha", "Zeta"]);
  });
});

describe("PATCH /api/applications/:id", () => {
  test("updates status only (the frontend's optimistic-update payload)", async () => {
    const created = await createApplication(userA.token);
    const res = await request(app)
      .patch(`/api/applications/${created.body._id}`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ status: "Interview" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Interview");
  });

  test("mass-assignment regression: a userId in the body is rejected and ownership is unchanged", async () => {
    const created = await createApplication(userA.token);
    const res = await request(app)
      .patch(`/api/applications/${created.body._id}`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ userId: userB.id });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Unrecognized key: "userId"' });

    const stored = await Application.findById(created.body._id);
    expect(stored.userId.toString()).toBe(userA.id);
  });

  test("cannot update another user's application (404)", async () => {
    const created = await createApplication(userA.token);
    const res = await request(app)
      .patch(`/api/applications/${created.body._id}`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ status: "Offer" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Application not found" });
  });

  test("returns 404 for a nonexistent id", async () => {
    const res = await request(app)
      .patch("/api/applications/000000000000000000000000")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ status: "Offer" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Application not found" });
  });

  test("returns 400 for a malformed id", async () => {
    const res = await request(app)
      .patch("/api/applications/not-an-id")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ status: "Offer" });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });
});

describe("DELETE /api/applications/:id", () => {
  test("cannot delete another user's application (404)", async () => {
    const created = await createApplication(userA.token);
    const res = await request(app)
      .delete(`/api/applications/${created.body._id}`)
      .set("Authorization", `Bearer ${userB.token}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Application not found" });
  });

  test("deletes the caller's own application", async () => {
    const created = await createApplication(userA.token);
    const res = await request(app)
      .delete(`/api/applications/${created.body._id}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Application deleted" });

    const list = await listApplications(userA.token);
    expect(list.body).toHaveLength(0);
  });
});

describe("error pipeline", () => {
  test("unmatched routes return the JSON 404 contract", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  test("malformed JSON bodies return a JSON 400, never HTML", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe("string");
  });
});
