# Production Readiness Report

Date: 2026-11-17

## Final assessment

**READY WITH EXTERNAL CONFIGURATION REQUIRED** for a Vercel deployment. The application code, build, validation, authentication controls, and isolated API test suite are in good shape. Production persistence is not safe with `.data/db.json` on Vercel; PostgreSQL (and Redis for multi-instance sessions/rate limits) must be configured before accepting real data.

## Architecture

- React 19 + Vite 6 + Tailwind CSS 4 single-page frontend.
- Express 4 + TypeScript API, with Vercel adapter at `api/index.ts` and the existing Node/Docker entrypoint preserved in `server.ts`.
- Atomic JSON storage for local development and Docker; optional PostgreSQL synchronization and Redis-backed sessions/rate limits.
- Optional OpenRouter/Gemini AI, SMTP/email, Telegram, and analytics integrations.
- Client-side navigation with route-aware SEO metadata and lazy-loaded admin modules.

## Discovery findings

- No `.git` directory is present in this workspace, so commit history and previously committed-secret history could not be audited.
- The local `.env` contains non-empty credentials. It is protected by `.gitignore`; values were not printed or copied into these reports. Rotate them if the file was ever shared or committed elsewhere.
- The original application started a persistent HTTP listener unconditionally and served built assets through `express.static()`, which is not the Vercel static-asset model.
- Local JSON writes are not durable or shared across Vercel function instances.
- The existing security and API test coverage is substantial and was preserved.

## Changes made

- Added `api/index.ts` as a Vercel Node Function entrypoint.
- Exported the Express app and prevented `app.listen()` from running when `VERCEL=1`; the normal Node/Docker lifecycle remains unchanged.
- Mounted the Express error handler for both the regular server and the Vercel adapter.
- Added `vercel.json` for the Vite build output, API routing, and SPA fallback.
- Documented Node compatibility in `package.json` (`>=22.0.0 <25.0.0`).
- Added a Windows/Node 24 test-bootstrap compatibility shim in `scripts/test-guard.cjs`; it only affects test startup and avoids a `tsx`/`os.userInfo()` ENOMEM failure in this restricted runner.

## Security findings

Verified by tests: HttpOnly/SameSite/CSRF session protection, session rotation and revocation, admin authorization, URL validation, input limits, honeypot handling, rate limits, AI prompt-injection/secret-scrubbing checks, maintenance-mode access rules, and security headers.

Required operator actions: set strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`; use HTTPS with `SESSION_COOKIE_SECURE=true`; set a non-wildcard `CORS_ORIGIN`; rotate any credentials that may have been exposed outside the ignored local `.env`.

`npm audit --omit=dev --audit-level=high`: PASS, no production high-severity findings. Full `npm ci` reported 10 moderate findings in the complete dependency tree; review with `npm audit` before a public release, especially dev-only packages.

## Performance observations

- Frontend routes are code-split; the largest initial JS chunk is about 462 kB raw / 136 kB gzip, and the admin chunk is about 212 kB raw / 35 kB gzip.
- No speculative dependency or visual redesign was introduced.
- AI calls have bounded fallback behavior; production provider latency and quotas remain environment-dependent.

## Verification results

- `npm ci --ignore-scripts`: PASS (417 packages installed; full tree reported 10 moderate audit findings).
- `npm run lint`: PASS; strict TypeScript and ESLint exit 0, with 120 non-blocking warnings.
- `npm run build`: PASS; Vite production bundle and Node bundle generated.
- `npm run test:unit`: PASS, 40/40.
- `npm test`: PASS, 221/221; outbound network attempts 0 and project `.data` unchanged.
- `npm run test:e2e`: BLOCKED by a 240-second timeout. The run reached many public and admin journeys, but did not emit its final result file/summary; it is not claimed as a pass.
- `npm audit --omit=dev --audit-level=high`: PASS, 0 high-severity production findings.
- Official Vercel CLI build: NOT RUN; CLI is not installed and no deployment was performed.

## Remaining limitations and blockers

1. Configure an external PostgreSQL database and verify its schema/migration behavior in a safe non-production environment.
2. Configure Redis when more than one function instance must share admin sessions and rate limits.
3. Do not rely on `.data/db.json` for Vercel persistence.
4. Run a bounded/fixed E2E suite or isolate the hanging journey before declaring browser coverage complete.
5. Configure and separately verify AI, SMTP, Telegram, and any other optional integrations; they were intentionally unavailable to the isolated tests.
6. Review the 10 moderate full-tree audit findings and complete credential rotation/history review outside this workspace.

## Environment variable summary

| Variable | Purpose | Required | Vercel environment | Where to obtain it |
|---|---|---:|---|---|
| `ADMIN_PASSWORD` | Admin login | Yes | Production + Preview | Generate and store as a Vercel secret |
| `ADMIN_SESSION_SECRET` | Session fingerprint salt | Yes recommended | Production + Preview | Generate a random 32-byte secret |
| `CORS_ORIGIN` | Allowed browser origin(s) | Yes | Production + Preview | Vercel deployment URL/custom domain |
| `DATABASE_URL` | Durable PostgreSQL connection | Yes for production data | Production + Preview | PostgreSQL provider |
| `PG_SSL_MODE` | PostgreSQL TLS policy | Yes for remote DB | Production + Preview | Use `verify-full` when provider CA supports it |
| `REDIS_URL` | Shared sessions/rate limits | Recommended for multi-instance | Production + Preview | Redis provider |
| `APP_URL` | Canonical app URL | Yes | Production + Preview | Vercel URL/custom domain |
| `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | Optional AI providers | Optional | Server-only | Provider dashboards |
| `EMAIL_PROVIDER`, `SMTP_*` | Optional notifications | Optional | Server-only | SMTP provider/App Password |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional Telegram notifications | Optional | Server-only | Telegram bot configuration |

Never expose these values through `VITE_*` variables or client code.

## Follow-up remediation (2026-11-17)

- Root cause of the Playwright stall was corrected in `scripts/e2e_isolated.ts`: Vite `networkidle` waits were removed, repeated dashboard reloads were replaced with tab reset, modal cleanup was made deterministic, and the expiry test now clears the browser cookie jar before creating its short-lived session.
- `npm run test:e2e` now completes with **172 passed, 0 failed** in 193.9 seconds; outbound network attempts were 0 and `.data` was unchanged.
- Vercel production configuration now requires `DATABASE_URL`, `REDIS_URL`, and `PG_SYNC_MODE=load`. If PostgreSQL initialization fails, API traffic receives `503 Database is not ready` instead of silently using `.data/db.json`. Redis session and rate-limit operations also fail closed instead of falling back to process memory on Vercel.
- The PostgreSQL implementation is a startup synchronization/cache design, not a complete per-request PostgreSQL repository: several reads still use in-memory state and local JSON, and `loadFromPostgres()` does not hydrate every table. Therefore PostgreSQL is **not certified as fully durable for all production operations** yet; this remains a deployment blocker for production data.
- The full audit still reports 10 moderate dev-tool dependency findings, centered on `minimatch` in the ESLint/TypeScript-ESLint chain; `npm audit --omit=dev --audit-level=high` reports 0 production high-severity findings. npm reports no compatible automatic fix, so no unsafe major upgrade was applied.
- Vercel CLI was not installed and no remote Preview was created. Local HTTP integration tests pass, but live Vercel routing and managed PostgreSQL/Redis remain externally unverified.

## Database operation matrix

| Entity | Current storage | Read path | Write path | Update/delete path | PostgreSQL ready? | Required action |
|---|---|---|---|---|---|---|
| Profile, projects, services, skills, blog, settings | `DatabaseSchema` memory + JSON cache; canonical `portfolio_state` in PG | `db.get*` after Vercel request refresh | `db` mutation + `saveData` queue | CRUD methods + canonical snapshot | Yes with configured PG; real service unverified | Run staging persistence test |
| Experience, education, certificates, courses, testimonials | Memory + JSON cache; included in canonical snapshot | `db.get*` | list update methods now call `saveData` | list replacement/CRUD | Yes through canonical snapshot | Verify after restart in staging |
| Contact messages and project leads | Memory + JSON cache; canonical snapshot; legacy tables retained | `db.getMessages/getLeads` after refresh | create/update/delete + snapshot | CRUD methods | Yes through canonical snapshot | Verify API CRUD and cold start |
| Knowledge documents/chunks and embeddings | Memory + JSON cache; canonical snapshot | `db.getKnowledge*` after refresh | create/delete/reindex + snapshot | delete/reindex | Yes through canonical snapshot | Verify embedding payload size/quotas |
| AI conversations/messages | Memory + JSON cache; canonical snapshot | `db` getters | snapshot on state save | No separate API CRUD | Yes through canonical snapshot | Confirm retention policy |
| Analytics events and AI insights | Memory + JSON cache; canonical snapshot | `db.getEvents/getInsights` | event/insight save paths | retention/deletion in memory logic | Yes through canonical snapshot | Verify volume and retention |
| Forms, methodology, principles, architecture nodes | Memory + JSON cache; canonical snapshot | `db.get*` after refresh | update methods + snapshot | supported form updates; protected deletes | Yes through canonical snapshot | Verify admin edits across instances |
| Admin sessions | Redis, memory only for local/test fallback | Redis `getAdminSession` | Redis `SETEX` | Redis delete/scan logout | Yes when Redis is ready | `REDIS_URL` mandatory on Vercel |
| Rate limits | Redis, memory only for local/test fallback | Redis counters | Redis `INCR` + TTL | TTL expiry | Yes when Redis is ready | Validate with two instances |
| Uploaded/generated files | No server-side persistent upload store; data URLs/URLs in records | JSON/PG state fields | metadata/state only | record CRUD | Metadata yes; binary persistence not implemented | Use external object storage before binary uploads |

`PG_SYNC_MODE=load` now loads the canonical full state, and Vercel refreshes that state before each API request. Writes are queued and awaited before JSON responses are sent. A real multi-instance PostgreSQL test is still required; it was not possible because Docker access was denied and no disposable credentials were supplied.

Latest regression after the database changes: `npm run build` PASS, `npm run lint` PASS (0 errors), `npm run test:unit` PASS (40/40), `npm test` PASS (221/221), and `npm run test:e2e` PASS (172/172).

Concurrency hardening added after the previous report: Vercel API requests are serialized within a function process, PostgreSQL updates use revision-based compare-and-swap, stale writers produce HTTP 409, and state is refreshed before each API request. The real two-client probe remains blocked without disposable PostgreSQL/Redis.

External safety check update: Neon PostgreSQL connected successfully over SSL and was confirmed empty (0 user tables/rows). Upstash Redis was not tested because its local test variable is missing the required `redis://` or `rediss://` scheme. No mutation was run.
# AI audit update — 2026-11-17

The independent AI/RAG audit is documented in `AI_ASSISTANT_FULL_AUDIT.md` and `AI_ASSISTANT_TEST_MATRIX.md`. Provider-unavailable fallback defects were fixed: directly retrieved custom knowledge now takes precedence over broad project heuristics, and bilingual intent routing covers the previously failing service, e-commerce, and NeuroDoc cases. AI/search analytics no longer store visitor query text; only length and a SHA-256 fingerprint are retained. The no-provider content evaluation is now 50/50, while the current local snapshot has 126 chunks and 0 embeddings. Live LLM answer quality and real embedding generation remain externally configured verification items.
