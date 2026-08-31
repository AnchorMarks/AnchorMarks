/**
 * Regression tests for the static /addbookmark page.
 *
 * The page is plain HTML + an inline script served from apps/server/public,
 * so it is not covered by the React tests. It previously read the response of
 * `GET /api/folders` as a bare array, but that endpoint returns
 * `{ folders: [...] }`. The resulting TypeError left the folder <select> empty.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { buildFolderOptionsHTML } from "@/shared/folders-utils-browser";

const PAGE_PATH = path.resolve(
  __dirname,
  "../../../server/public/addbookmark/index.html",
);

const FOLDERS = [
  { id: "f-projects", name: "Projects", parent_id: null },
  { id: "f-personal", name: "Personal", parent_id: null },
  { id: "f-nested", name: "Nested", parent_id: "f-projects" },
];

function inlineScript(): string {
  const html = fs.readFileSync(PAGE_PATH, "utf-8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return scripts[scripts.length - 1][1];
}

function mountPage(): void {
  document.body.innerHTML = `
    <div class="pill" id="auth-pill"></div>
    <form id="bookmark-form">
      <input id="title" name="title" />
      <input id="url" name="url" />
      <select id="folder" name="folder">
        <option value="">— No folder (top level) —</option>
      </select>
      <input id="tags" name="tags" />
      <textarea id="notes" name="notes"></textarea>
      <button type="button" id="cancel-btn"></button>
      <button type="submit" id="save-btn"></button>
    </form>
    <div id="status"></div>
  `;
}

function mockFetch(foldersBody: unknown) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ csrfToken: "test-csrf" }),
      } as Response);
    }
    if (url.includes("/api/folders")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(foldersBody),
      } as Response);
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

/** Run the page script and let its async init() settle. */
async function runPage(): Promise<void> {
  // eslint-disable-next-line no-new-func
  new Function(inlineScript())();
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function optionLabels(): string[] {
  const select = document.getElementById("folder") as HTMLSelectElement;
  return Array.from(select.options).map((o) =>
    o.textContent!.replace(/\u00a0/g, " ").trim(),
  );
}

describe("addbookmark page", () => {
  beforeEach(() => {
    mountPage();
    delete (window as any).anchormarks;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("populates the folder dropdown from the { folders: [...] } envelope", async () => {
    vi.stubGlobal("fetch", mockFetch({ folders: FOLDERS }));

    await runPage();

    expect(optionLabels()).toEqual([
      "— No folder (top level) —",
      "Personal",
      "Projects",
      "Nested",
    ]);
  });

  it("populates the dropdown when the shared builder is present", async () => {
    (window as any).anchormarks = { buildFolderOptionsHTML };
    vi.stubGlobal("fetch", mockFetch({ folders: FOLDERS }));

    await runPage();

    expect(optionLabels()).toEqual([
      "— No folder (top level) —",
      "Personal",
      "Projects",
      "Nested",
    ]);
  });

  it("still populates if the endpoint ever returns a bare array", async () => {
    vi.stubGlobal("fetch", mockFetch(FOLDERS));

    await runPage();

    expect(optionLabels()).toContain("Projects");
    expect(optionLabels()).toContain("Nested");
  });

  it("falls back to the local builder when the shared builder throws", async () => {
    (window as any).anchormarks = {
      buildFolderOptionsHTML: () => {
        throw new Error("boom");
      },
    };
    vi.stubGlobal("fetch", mockFetch({ folders: FOLDERS }));

    await runPage();

    // The bug was that a failing shared builder left the select empty.
    expect(optionLabels()).toEqual([
      "— No folder (top level) —",
      "Personal",
      "Projects",
      "Nested",
    ]);
  });

  it("preselects the folder given in the folder_id query param", async () => {
    const { location } = window;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...location, search: "?folder_id=f-nested" },
    });
    vi.stubGlobal("fetch", mockFetch({ folders: FOLDERS }));

    await runPage();

    const select = document.getElementById("folder") as HTMLSelectElement;
    expect(select.value).toBe("f-nested");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: location,
    });
  });
});
