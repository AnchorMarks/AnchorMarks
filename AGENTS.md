# AGENTS.md

## 1) Quick Start

AnchorMarks is a self-hosted bookmark manager: Node.js/Express + SQLite backend, React 19 + Vite frontend.

- **Setup**: `npm install` (Node ≥20 per `package.json`).
- **Dev**: `make start-local` starts backend on `:3000` and Vite HMR on `:5173`.
- **Help**: `make help`.
- **Reference**: [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md), in-app help at `apps/server/public/help.html`.

---

## 2) Architecture Essentials

### Backend (`apps/server`)

- **Entry**: `index.js` → `app.js`.
- **DB**: `models/database.js` (better-sqlite3, WAL enabled). **No ORM**; use **parameterized SQL only**.
- **Migrations**: Automatic on startup — inline column additions plus any `models/migrations/*.js` files. No manual migration runner.
- **Pattern**: `routes/` → `controllers/` → `models/`; helpers in `helpers/`, utils in `utils/`.
- **Auth**: httpOnly JWT cookie + CSRF token on state-changing routes.

### Frontend (`apps/client`)

- **Entry**: `src/main.tsx` → `src/App.tsx`. React 19 + TypeScript + Vite.
- **API**: `src/services/api.ts`. React context auth bridge with a legacy vanilla state module still present for test compatibility.
- **Aliases**: `@`, `@features`, `@services`, `@utils`, `@assets`, `@layouts`, `@components`, `@contexts`, `@hooks`.
- **Build**: `make build-frontend` produces `apps/client/dist`; it also bundles `src/shared/folders-utils-browser.ts` into `apps/server/public/js/folders-utils.js`.
- **Dev proxy**: Vite proxies `/api`, `/favicons`, `/thumbnails`, `/help.html`, and `/icon*.png` to the backend.

---

## 3) Commands & Gotchas

- **Tests**: `make test` runs on the host (`test-local`) and can fail if better-sqlite3 native bindings are incompatible. Prefer Docker when in doubt:
  - `make test-docker` — all tests in container.
  - `make test-docker-backend` / `make test-docker-frontend` — single package.
- **Backend tests** run sequentially (`fileParallelism: false` in `vitest.config.ts`) because they share a SQLite database.
- **Lint/format**: `make lint-code` (fix) or `make lint-check` (verify). The ESLint config (`tooling/eslint.config.cjs`) only matches `.js`; Prettier handles TypeScript. Update the config if you want TS/TSX lint rules.
- **Build**: there is no `make build`; use `make build-frontend`.
- **E2E**: `make test-e2e` spins up Docker services and installs Playwright browsers. Slow; not included in `make test`.
- **Production**: `make start-prod` refuses to start unless `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CORS_ORIGIN` are set.

---

## 4) Security & Data Rules (Mandatory)

1. **Auth**: httpOnly JWT cookie (no localStorage).
2. **CSRF**: Token required on all state-changing requests.
3. **Isolation**: **Every DB query must scope by `user_id`.**
4. **Validation**: Sanitize user input and use SSRF protections for external URLs.
5. **SQL**: Never build SQL with string concatenation.
6. **API Format**: Always return `{ success: true, data: [...] }` or `{ error: "reason" }`.

---

## 5) Frontend State Rule

After any mutation:

1. Reload data from server.
2. Re-render UI.

**Do not assume local state equals DB state.**

---

## 6) Submission Checklist

1. **Tests**: `make test` or `make test-docker`. Add/update tests in `apps/server/__tests__/` or `apps/client/src/**/*.test.ts(x)`.
2. **Lint**: `make lint`.
3. **Docs**: Update `apps/server/public/help.html` for UI changes.
4. **Log**: Update `docs/CHANGELOG.md`.
5. **Git**: Use feature branches (`feature/...`, `bugfix/...`).

Refer to [CONTRIBUTING.md](CONTRIBUTING.md) for PR requirements.
