# Baraa Abu Musameh — AI Engineer Portfolio

Bilingual (Arabic/English) portfolio with a built-in admin CMS.

- **Frontend:** React 19, Vite 6, Tailwind CSS 4 (single-page app, admin dashboard lazy-loaded).
- **Backend:** Express 4 + TypeScript (`server.ts`, `server/`).
- **Storage:** atomic JSON file (`.data/db.json`) as the primary store; optional PostgreSQL mirror; optional Redis for shared sessions and rate limits.
- **AI (optional):** OpenRouter / Gemini for the assistant, project advisor, lead scoring, blog helper and RAG embeddings. Without keys every feature falls back to clearly labelled, data-driven answers.

## Quick start

```bash
npm install
cp .env.example .env        # fill in at least ADMIN_PASSWORD
npm run dev                 # http://127.0.0.1:3000 — admin at /admin
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Vite middleware + API on one port, binds to `HOST`, default `127.0.0.1`) |
| `npm test` | Integration + security suite (155 checks) against an isolated temp database |
| `npm run test:unit` | Unit, render and AI/RAG mock tests (`node:test`, 34) |
| `npm run test:e2e` | Browser E2E with Playwright/Chromium: public site + all 18 admin tabs (127 checks), fully isolated |
| `npm run test:all` | All three |
| `npm run lint` | `tsc --noEmit` (strict) + ESLint (typescript-eslint recommended + security rules) |
| `npm run build` | Production bundle: `dist/` (SPA) + `dist/server.cjs` |
| `npm start` | Run the production build |

### Test isolation (important)

`npm test` / `npm run test:unit` preload `scripts/test-guard.cjs`, which:

- refuses to start if real connection strings or provider keys are present in the environment;
- blocks every non-loopback network connection and DNS lookup (SMTP, Telegram, AI providers, PostgreSQL, Redis);
- forces `NODE_ENV=test`, so `.env` is **not** loaded.

The server refuses to run tests unless `DATA_DIR` points to a temporary directory, and the suite fails if the project's `.data` directory changes during a run. Tests use a random admin password, never the real one.

## Configuration

All variables are documented in [`.env.example`](.env.example). The important ones:

| Variable | Notes |
|---|---|
| `ADMIN_PASSWORD` | Required (≥ 12 chars in production). Changing it **logs out every admin session**. |
| `ADMIN_SESSION_SECRET` | Recommended. Salts the session fingerprint; changing it also logs everyone out. |
| `CORS_ORIGIN` | Required in production (comma-separated, `*` rejected). |
| `SESSION_COOKIE_SECURE` | `true` once the site is served over HTTPS (the admin cookie then always carries `Secure`). |
| `TRUST_PROXY` | Behind a reverse proxy only: hop count (`1`), `true`, or proxy addresses. |
| `HOST` | `127.0.0.1` by default. Docker sets `0.0.0.0` inside the container. |
| `DATA_DIR` | Location of `db.json` (default `./.data`). |
| `DATABASE_URL`, `PG_SSL_MODE`, `PG_SYNC_MODE` | Optional PostgreSQL; see [DEPLOYMENT.md](DEPLOYMENT.md). |
| `REDIS_URL` | Optional; shared sessions and rate limits across instances. |
| `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | Optional AI providers. |
| `EMAIL_PROVIDER`, `SMTP_*`, `TELEGRAM_*` | Optional owner notifications. |

## Admin panel

`/admin`, password = `ADMIN_PASSWORD`. Sessions are server-side, slide for 24 h, expire after 7 days at most, are bound to the current credentials, and can all be revoked with the **All Devices** button (`POST /api/auth/logout-all`).

The browser holds the session only in an `HttpOnly`, `SameSite=Strict` cookie (scripts cannot read it). Every admin write also needs the session's CSRF token in the `X-CSRF-Token` header; the UI receives it from the login / auth-check response and keeps it in memory only. Scripts may instead log in with `{"password": "…", "client": "bearer"}` and send `Authorization: Bearer <token>` (no CSRF token needed, browsers never attach that header on their own).

Manage: profile, projects, services, skills, blog (drafts stay private), experience, education, certificates, courses, testimonials (publish flag), methodology/principles/hero nodes, forms (contact + project intake), knowledge base (RAG documents, re-index), leads (status, priority, private notes), messages, and site settings (SEO, CTA, maintenance mode, AI/analytics/notification switches).

## Behaviour worth knowing

- **Visitor confirmation emails are off by default** (`enable_visitor_confirmation`). When enabled they use fixed wording and are limited to one per address per day, so the public forms cannot be used to send mail to third parties.
- **Public forms** are limited to 5 submissions per IP per 10 minutes (`FORM_RATE_LIMIT`).
- **Leads** are stored immediately; AI scoring runs in the background and is visible only to the admin (`scored_by`: `pending`, `ai_model`, `fallback`, `skipped`).
- **Knowledge re-index** keeps the embeddings of unchanged chunks and only sends new/edited chunks to the (paid) embedding provider.
- **Maintenance mode** returns 503 to visitors; `/admin`, its assets and authenticated admin requests keep working.
- A **corrupt `db.json` stops the server** (a copy is saved as `db.corrupt-*.json`) instead of silently replacing data with seed content.

## More documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — production, Docker, PostgreSQL modes, network exposure.
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md) — what to back up, how to verify and restore.
- [PROJECT_COMPLETION_STATUS.md](PROJECT_COMPLETION_STATUS.md) — work log and known issues.
- [FINAL_RELEASE_READINESS.md](FINAL_RELEASE_READINESS.md), [OWNER_ACTIONS_REQUIRED.md](OWNER_ACTIONS_REQUIRED.md), [SECURITY_STATUS.md](SECURITY_STATUS.md), [AI_RAG_STATUS.md](AI_RAG_STATUS.md), [ADMIN_TEST_MATRIX.md](ADMIN_TEST_MATRIX.md).
