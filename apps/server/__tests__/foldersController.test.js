// tests for folders controller
const request = require("supertest");
const path = require("path");
const fs = require("fs");

const TEST_DB_PATH = path.join(__dirname, "anchormarks-test-folders.db");
process.env.NODE_ENV = "test";
process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = "test-secret-key-folders";
process.env.CORS_ORIGIN = "http://localhost";

const app = require("../app");

let agent;
let csrfToken;
let folderId;

beforeAll(async () => {
  agent = request.agent(app);
  const unique = Date.now();
  const user = {
    email: `foldertest${unique}@example.com`,
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

describe("Folders Controller", () => {
  it("creates a folder", async () => {
    const res = await agent
      .post("/api/folders")
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Test Folder", color: "#ff0000" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe("Test Folder");
    folderId = res.body.id;
  });

  it("lists folders", async () => {
    const res = await agent.get("/api/folders").set("X-CSRF-Token", csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.folders).toBeTruthy();
    expect(Array.isArray(res.body.folders)).toBe(true);
    const found = res.body.folders.find((f) => f.id === folderId);
    expect(found).toBeTruthy();
  });

  it("updates a folder", async () => {
    const res = await agent
      .put(`/api/folders/${folderId}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Updated Folder", color: "#00ff00" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Folder");
  });

  it("deletes a folder", async () => {
    const res = await agent
      .delete(`/api/folders/${folderId}`)
      .set("X-CSRF-Token", csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("bookmark_count in folder API responses", () => {
  let countFolderId;

  beforeAll(async () => {
    // Create a folder and add a bookmark to it
    const folderRes = await agent
      .post("/api/folders")
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Count Test Folder" });
    expect(folderRes.status).toBe(200);
    countFolderId = folderRes.body.id;

    const bookmarkRes = await agent
      .post("/api/bookmarks")
      .set("X-CSRF-Token", csrfToken)
      .send({
        url: "https://example.com/count-test",
        title: "Count Test Bookmark",
        folder_id: countFolderId,
      });
    expect(bookmarkRes.status).toBe(200);
  });

  it("GET /folders includes correct bookmark_count", async () => {
    const res = await agent.get("/api/folders");
    expect(res.status).toBe(200);
    const folder = res.body.folders.find((f) => f.id === countFolderId);
    expect(folder).toBeTruthy();
    expect(folder.bookmark_count).toBe(1);
  });

  it("PUT /folders/:id response preserves bookmark_count", async () => {
    const res = await agent
      .put(`/api/folders/${countFolderId}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Renamed Count Folder", color: "#ff0000" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed Count Folder");
    // bookmark_count must not be zeroed out by the update
    expect(res.body.bookmark_count).toBe(1);
  });

  it("PATCH /folders/:id/parent response preserves bookmark_count", async () => {
    const parentRes = await agent
      .post("/api/folders")
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Parent Folder" });
    expect(parentRes.status).toBe(200);

    const res = await agent
      .patch(`/api/folders/${countFolderId}/parent`)
      .set("X-CSRF-Token", csrfToken)
      .send({ parent_id: parentRes.body.id });
    expect(res.status).toBe(200);
    // bookmark_count must survive a parent change
    expect(res.body.bookmark_count).toBe(1);
  });
});
