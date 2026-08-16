// tests for bookmarks controller
const request = require("supertest");
const path = require("path");
const fs = require("fs");

// Setup isolated test DB
const TEST_DB_PATH = path.join(__dirname, "anchormarks-test-bookmarks.db");
process.env.NODE_ENV = "test";
process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = "test-secret-key";
process.env.CORS_ORIGIN = "http://localhost";

const app = require("../app");

let agent;
let csrfToken;
let bookmarkId;

beforeAll(async () => {
  agent = request.agent(app);
  const unique = Date.now();
  const user = {
    email: `bmtest${unique}@example.com`,
    password: "password123",
  };
  const register = await agent.post("/api/auth/register").send(user);
  expect(register.status).toBe(200);
  csrfToken = register.body.csrfToken;
});

afterAll(() => {
  if (app.db) app.db.close();
  [TEST_DB_PATH, `${TEST_DB_PATH}-shm`, `${TEST_DB_PATH}-wal`].forEach(
    (file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    },
  );
});

describe("Bookmarks Controller", () => {
  it("creates a bookmark", async () => {
    const res = await agent
      .post("/api/bookmarks")
      .set("X-CSRF-Token", csrfToken)
      .send({ url: "https://example.com", title: "Example" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    bookmarkId = res.body.id;
  });

  it("lists bookmarks and includes created one", async () => {
    const res = await agent
      .get("/api/bookmarks")
      .set("X-CSRF-Token", csrfToken);
    expect(res.status).toBe(200);
    const found = res.body.find((b) => b.id === bookmarkId);
    expect(found).toBeTruthy();
    expect(found.title).toBe("Example");
  });

  it("updates a bookmark", async () => {
    const res = await agent
      .put(`/api/bookmarks/${bookmarkId}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ title: "Updated Title", tags: "test" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
  });

  it("does not allow another user to modify bookmark tags", async () => {
    const otherAgent = request.agent(app);
    const register = await otherAgent
      .post("/api/auth/register")
      .send({
        email: `other-bmtest${Date.now()}@example.com`,
        password: "password123",
      });
    expect(register.status).toBe(200);

    const res = await otherAgent
      .put(`/api/bookmarks/${bookmarkId}`)
      .set("X-CSRF-Token", register.body.csrfToken)
      .send({ tags: "attacker-controlled" });
    expect(res.status).toBe(404);

    const list = await agent.get("/api/bookmarks");
    const bookmark = list.body.find((item) => item.id === bookmarkId);
    expect(bookmark.tags).toContain("test");
    expect(bookmark.tags).not.toContain("attacker-controlled");
  });

  it("does not allow assigning another user's folder", async () => {
    const otherAgent = request.agent(app);
    const register = await otherAgent
      .post("/api/auth/register")
      .send({
        email: `other-folder-test${Date.now()}@example.com`,
        password: "password123",
      });
    expect(register.status).toBe(200);

    const folder = await otherAgent
      .post("/api/folders")
      .set("X-CSRF-Token", register.body.csrfToken)
      .send({ name: "Private folder", color: "#6366f1" });
    expect(folder.status).toBe(200);

    const create = await agent
      .post("/api/bookmarks")
      .set("X-CSRF-Token", csrfToken)
      .send({ url: "https://example.org/foreign-folder", folder_id: folder.body.id });
    expect(create.status).toBe(400);

    const update = await agent
      .put(`/api/bookmarks/${bookmarkId}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ folder_id: folder.body.id });
    expect(update.status).toBe(400);
  });

  it("deletes a bookmark", async () => {
    const res = await agent
      .delete(`/api/bookmarks/${bookmarkId}`)
      .set("X-CSRF-Token", csrfToken);
    expect(res.status).toBe(200);
  });
});
