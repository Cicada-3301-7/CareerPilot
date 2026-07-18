const request = require("supertest");
const app = require("../src/app");
const ApplicationFile = require("../src/models/ApplicationFile");
const storage = require("../src/services/storage");

// Rate limiting is keyed by req.ip and trust proxy is enabled, so a unique
// X-Forwarded-For per register keeps the auth limiter out of these tests.
let ipCounter = 0;
const uniqueIp = () => {
  ipCounter += 1;
  return `10.3.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const registerUser = async (email) => {
  const res = await request(app)
    .post("/api/auth/register")
    .set("X-Forwarded-For", uniqueIp())
    .send({ name: "File Tester", email, password: "longenough1" });
  return { token: res.body.token, id: res.body.user._id };
};

const createApplication = async (token) => {
  const res = await request(app)
    .post("/api/applications")
    .set("Authorization", `Bearer ${token}`)
    .send({ company: "Phase14 Corp", role: "Engineer" });
  return res.body._id;
};

// ── Fixture buffers (real magic bytes so the sniffer accepts them) ──────────
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n");
const PDF_ALT = Buffer.from("%PDF-1.4\nalternate content for duplicate-name test\n%%EOF\n");
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00, 0x00, 0x00, 0x0d]),
  Buffer.from("IHDR"),
  Buffer.alloc(17),
]);
const ZIP = Buffer.concat([Buffer.from("PK\x03\x04"), Buffer.alloc(60)]);
const HTML = Buffer.from("<html><body><script>alert(1)</script></body></html>");

const uploadFile = (token, applicationId, overrides = {}) => {
  const {
    buffer = PDF,
    filename = "resume.pdf",
    contentType = "application/pdf",
    docType = "resume",
    extraFields = {},
  } = overrides;

  let req = request(app)
    .post(`/api/applications/${applicationId}/files`)
    .set("Authorization", `Bearer ${token}`);
  if (docType !== null) req = req.field("docType", docType);
  Object.entries(extraFields).forEach(([key, value]) => {
    req = req.field(key, value);
  });
  return req.attach("file", buffer, { filename, contentType });
};

const listFiles = (token, applicationId) =>
  request(app)
    .get(`/api/applications/${applicationId}/files`)
    .set("Authorization", `Bearer ${token}`);

// Binary-safe download (superagent would otherwise try to parse the body).
const downloadFile = (token, applicationId, fileId) =>
  request(app)
    .get(`/api/applications/${applicationId}/files/${fileId}/download`)
    .set("Authorization", `Bearer ${token}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });

const deleteFile = (token, applicationId, fileId) =>
  request(app)
    .delete(`/api/applications/${applicationId}/files/${fileId}`)
    .set("Authorization", `Bearer ${token}`);

let userA;
let userB;
let appA;

beforeEach(async () => {
  userA = await registerUser("filea@test.local");
  userB = await registerUser("fileb@test.local");
  appA = await createApplication(userA.token);
});

describe("authentication gate", () => {
  test.each([
    ["get", "/api/applications/000000000000000000000000/files"],
    ["post", "/api/applications/000000000000000000000000/files"],
    ["get", "/api/applications/000000000000000000000000/files/000000000000000000000000/download"],
    ["delete", "/api/applications/000000000000000000000000/files/000000000000000000000000"],
  ])("%s %s without a token is rejected", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });
});

describe("POST /api/applications/:id/files", () => {
  test("uploads a document and returns its metadata without the storage key", async () => {
    const res = await uploadFile(userA.token, appA);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(userA.id);
    expect(res.body.uploadedBy).toBe(userA.id);
    expect(res.body.applicationId).toBe(appA);
    expect(res.body.docType).toBe("resume");
    expect(res.body.originalName).toBe("resume.pdf");
    expect(res.body.mimeType).toBe("application/pdf");
    expect(res.body.size).toBe(PDF.length);
    expect(res.body.isDeleted).toBe(false);
    expect(res.body.uploadedAt).toBeDefined();
    expect(res.body.storageKey).toBeUndefined();
  });

  test("stores the object under a server-generated key scoped to user and application", async () => {
    await uploadFile(userA.token, appA, { filename: "../../etc/passwd.pdf" });
    expect(storage._store.size).toBe(1);
    const key = [...storage._store.keys()][0];
    expect(key.startsWith(`${userA.id}/${appA}/`)).toBe(true);
    expect(key.endsWith(".pdf")).toBe(true);
    expect(key).not.toContain("passwd");
    expect(key).not.toContain("..");
  });

  test("accepts every allowed docType and file format", async () => {
    const png = await uploadFile(userA.token, appA, {
      buffer: PNG, filename: "shot.png", contentType: "image/png", docType: "other",
    });
    expect(png.status).toBe(201);

    const docx = await uploadFile(userA.token, appA, {
      buffer: ZIP,
      filename: "cover.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docType: "cover_letter",
    });
    expect(docx.status).toBe(201);
    expect(docx.body.docType).toBe("cover_letter");
  });

  test("rejects a missing file", async () => {
    const res = await request(app)
      .post(`/api/applications/${appA}/files`)
      .set("Authorization", `Bearer ${userA.token}`)
      .field("docType", "resume");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "A file is required" });
  });

  test("rejects a zero-byte file", async () => {
    const res = await uploadFile(userA.token, appA, { buffer: Buffer.alloc(0) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "File is empty" });
    expect(storage._store.size).toBe(0);
  });

  test("rejects a missing docType", async () => {
    const res = await uploadFile(userA.token, appA, { docType: null });
    expect(res.status).toBe(400);
  });

  test("rejects an invalid docType", async () => {
    const res = await uploadFile(userA.token, appA, { docType: "Resume" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Document type must be resume, cover_letter, offer_letter, or other",
    });
  });

  test("rejects unexpected multipart fields (strict schema)", async () => {
    const res = await uploadFile(userA.token, appA, {
      extraFields: { storageKey: "evil/key.pdf" },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Unrecognized key: "storageKey"' });
  });

  test("rejects a disallowed extension", async () => {
    const res = await uploadFile(userA.token, appA, {
      filename: "malware.exe", contentType: "application/octet-stream",
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "File type not allowed. Upload a PDF, DOC, DOCX, PNG or JPG file.",
    });
  });

  test("rejects an SVG even with an image MIME type", async () => {
    const res = await uploadFile(userA.token, appA, {
      filename: "logo.svg", contentType: "image/svg+xml",
    });
    expect(res.status).toBe(400);
  });

  test("rejects a MIME type that does not match the extension", async () => {
    const res = await uploadFile(userA.token, appA, { contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "File type does not match its extension" });
  });

  test("rejects an unsupported file disguised as a PDF (magic bytes)", async () => {
    const res = await uploadFile(userA.token, appA, { buffer: HTML });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "File content does not match its extension" });
    expect(storage._store.size).toBe(0);
  });

  test("rejects a file over the size limit", async () => {
    const oversize = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await uploadFile(userA.token, appA, { buffer: oversize });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "File exceeds the 5 MB limit" });
  });

  test("rejects an invalid application id param", async () => {
    const res = await uploadFile(userA.token, "not-an-id");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid application id" });
  });

  test("returns 404 for a nonexistent application", async () => {
    const res = await uploadFile(userA.token, "000000000000000000000000");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Application not found" });
  });

  test("returns 404 when uploading to another user's application", async () => {
    const res = await uploadFile(userB.token, appA);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Application not found" });
    expect(storage._store.size).toBe(0);
  });

  test("allows duplicate filenames as distinct documents", async () => {
    const first = await uploadFile(userA.token, appA, { buffer: PDF });
    const second = await uploadFile(userA.token, appA, { buffer: PDF_ALT });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body._id).not.toBe(second.body._id);
    expect(storage._store.size).toBe(2);

    const dl = await downloadFile(userA.token, appA, second.body._id);
    expect(Buffer.compare(dl.body, PDF_ALT)).toBe(0);
  });

  test("handles concurrent uploads (sanity)", async () => {
    const results = await Promise.all([
      uploadFile(userA.token, appA, { filename: "one.pdf" }),
      uploadFile(userA.token, appA, { filename: "two.pdf" }),
      uploadFile(userA.token, appA, { filename: "three.pdf" }),
    ]);
    results.forEach((res) => expect(res.status).toBe(201));

    const list = await listFiles(userA.token, appA);
    expect(list.body).toHaveLength(3);
    expect(storage._store.size).toBe(3);
  });

  test("enforces the per-application document cap", async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await uploadFile(userA.token, appA, { filename: `doc-${i}.pdf` });
      expect(res.status).toBe(201);
    }

    const eleventh = await uploadFile(userA.token, appA, { filename: "doc-11.pdf" });
    expect(eleventh.status).toBe(400);
    expect(eleventh.body).toEqual({
      error: "This application already has the maximum of 10 documents",
    });

    // The cap is per application, not per user.
    const appA2 = await createApplication(userA.token);
    const other = await uploadFile(userA.token, appA2);
    expect(other.status).toBe(201);

    // Deleting frees a slot (the cap counts live documents only).
    const list = await listFiles(userA.token, appA);
    await deleteFile(userA.token, appA, list.body[0]._id);
    const refill = await uploadFile(userA.token, appA, { filename: "refill.pdf" });
    expect(refill.status).toBe(201);
  });
});

describe("GET /api/applications/:id/files", () => {
  test("lists the application's documents newest-first", async () => {
    const first = await uploadFile(userA.token, appA, { filename: "first.pdf" });
    const second = await uploadFile(userA.token, appA, {
      filename: "second.png", buffer: PNG, contentType: "image/png", docType: "other",
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const res = await listFiles(userA.token, appA);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const names = res.body.map((f) => f.originalName);
    expect(names).toEqual(expect.arrayContaining(["first.pdf", "second.png"]));
    expect(new Date(res.body[0].createdAt) >= new Date(res.body[1].createdAt)).toBe(true);
    res.body.forEach((f) => expect(f.storageKey).toBeUndefined());
  });

  test("returns an empty array for an application without documents", async () => {
    const res = await listFiles(userA.token, appA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns 404 for another user's application", async () => {
    await uploadFile(userA.token, appA);
    const res = await listFiles(userB.token, appA);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Application not found" });
  });
});

describe("GET /api/applications/:id/files/:fileId/download", () => {
  test("streams the original bytes with attachment headers", async () => {
    const uploaded = await uploadFile(userA.token, appA, { filename: "my resume.pdf" });
    const res = await downloadFile(userA.token, appA, uploaded.body._id);

    expect(res.status).toBe(200);
    expect(Buffer.compare(res.body, PDF)).toBe(0);
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain("my resume.pdf");
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(Number(res.headers["content-length"])).toBe(PDF.length);
  });

  test("returns 404 for another user's file", async () => {
    const uploaded = await uploadFile(userA.token, appA);
    const res = await downloadFile(userB.token, appA, uploaded.body._id);
    expect(res.status).toBe(404);
  });

  test("returns 404 for a fileId that belongs to a different application", async () => {
    const uploaded = await uploadFile(userA.token, appA);
    const appA2 = await createApplication(userA.token);
    const res = await downloadFile(userA.token, appA2, uploaded.body._id);
    expect(res.status).toBe(404);
  });

  test("returns 404 for a well-formed but nonexistent fileId", async () => {
    const res = await downloadFile(userA.token, appA, "000000000000000000000000");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a malformed fileId", async () => {
    const res = await request(app)
      .get(`/api/applications/${appA}/files/nope/download`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid file id" });
  });
});

describe("DELETE /api/applications/:id/files/:fileId", () => {
  test("soft-deletes the document and removes the stored object", async () => {
    const uploaded = await uploadFile(userA.token, appA);
    const res = await deleteFile(userA.token, appA, uploaded.body._id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Document deleted" });
    expect(storage._store.size).toBe(0);

    // Metadata survives as an audit record, flagged deleted.
    const record = await ApplicationFile.findById(uploaded.body._id);
    expect(record.isDeleted).toBe(true);
    expect(record.deletedAt).toBeInstanceOf(Date);

    // Gone from the API surface.
    const list = await listFiles(userA.token, appA);
    expect(list.body).toEqual([]);
    const dl = await downloadFile(userA.token, appA, uploaded.body._id);
    expect(dl.status).toBe(404);
  });

  test("returns 404 when deleting another user's file", async () => {
    const uploaded = await uploadFile(userA.token, appA);
    const res = await deleteFile(userB.token, appA, uploaded.body._id);
    expect(res.status).toBe(404);
    expect(storage._store.size).toBe(1);
  });

  test("returns 404 on a second delete of the same file", async () => {
    const uploaded = await uploadFile(userA.token, appA);
    await deleteFile(userA.token, appA, uploaded.body._id);
    const res = await deleteFile(userA.token, appA, uploaded.body._id);
    expect(res.status).toBe(404);
  });
});

describe("cascade on application delete", () => {
  test("deleting an application removes its documents and stored objects only", async () => {
    const appA2 = await createApplication(userA.token);
    await uploadFile(userA.token, appA, { filename: "one.pdf" });
    await uploadFile(userA.token, appA, { filename: "two.pdf" });
    const kept = await uploadFile(userA.token, appA2, { filename: "keep.pdf" });
    expect(storage._store.size).toBe(3);

    const res = await request(app)
      .delete(`/api/applications/${appA}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(res.status).toBe(200);

    // The deleted application's objects are gone; the other's survives.
    expect(storage._store.size).toBe(1);
    const cascaded = await ApplicationFile.find({ applicationId: appA });
    expect(cascaded).toHaveLength(2);
    cascaded.forEach((file) => {
      expect(file.isDeleted).toBe(true);
      expect(file.deletedAt).toBeInstanceOf(Date);
    });

    const dl = await downloadFile(userA.token, appA2, kept.body._id);
    expect(dl.status).toBe(200);
    expect(Buffer.compare(dl.body, PDF)).toBe(0);
  });
});
