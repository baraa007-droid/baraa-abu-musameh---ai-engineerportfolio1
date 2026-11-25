# Vercel Final Launch Checklist

Date: 2026-11-17

## A. Completed automatically

- [x] Production Vite build passes: `npm run build`.
- [x] TypeScript and ESLint complete with exit code 0; 0 errors and 120 existing warnings.
- [x] Unit tests pass: 40/40.
- [x] Integration/security suite passes: 221/221.
- [x] Browser E2E suite completes: 172/172, 0 failures, 0 outbound network attempts.
- [x] E2E timeout root cause repaired: no `networkidle` wait on the Vite SPA, no repeated full dashboard reload, deterministic modal cleanup, and isolated expiry-session setup.
- [x] Production dependency audit has 0 high-severity runtime findings.
- [x] Vercel runtime now refuses unsafe missing database/cache configuration instead of silently serving local JSON or memory state.
- [x] No deployment, remote push, production database mutation, or credential rotation was performed.
- [x] All `DatabaseSchema` fields are represented in the canonical `portfolio_state` PostgreSQL snapshot path.
- [x] Safe migration tool added: dry-run by default, conflict detection, explicit confirmation, and preserved JSON backup.
- [x] Concurrent Vercel writes use PostgreSQL revision compare-and-swap; stale writes return HTTP 409 instead of overwriting newer data silently.

## B. External configuration required

Configure these in Vercel Preview and Production, server-side only:

| Variable | Required | Purpose |
|---|---:|---|
| `ADMIN_PASSWORD` | Yes | Admin login; at least 12 characters |
| `ADMIN_SESSION_SECRET` | Yes | Session credential fingerprint |
| `APP_URL` | Yes | Preview or production canonical URL |
| `CORS_ORIGIN` | Yes | Exact browser origin; never `*` |
| `DATABASE_URL` | Yes | Managed PostgreSQL connection |
| `PG_SYNC_MODE` | Yes | Must be `load` on Vercel |
| `PG_SSL_MODE` | Yes for remote DB | Prefer `verify-full` when supported |
| `REDIS_URL` | Yes | Shared admin sessions and rate limits |
| `SESSION_COOKIE_SECURE` | Yes | Set `true` for HTTPS |
| `OPENROUTER_API_KEY` / `GEMINI_API_KEY` | Optional | AI provider functionality |
| `EMAIL_PROVIDER` and `SMTP_*` | Optional | Email notifications |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Optional | Telegram notifications |

The current PostgreSQL layer still synchronizes application state and is not a complete database-only repository for every entity. Treat a disposable/staging database validation as mandatory before production data is accepted.

## C. Remaining blockers

- **Blocking for production data:** PostgreSQL and Redis have not been tested against authorized disposable/staging services in this environment.
- **Blocking for full production certification:** real PostgreSQL/Redis multi-instance verification has not run. The application uses a refreshed in-memory request snapshot backed by the canonical PostgreSQL row; staging must validate concurrent writes and cold starts.
- **Required concurrency probe:** run `npm run test:persistence` with dedicated disposable service variables; never use production URLs.
- **External check result:** Neon safety check passed with an empty database; Upstash test is blocked until `PERSISTENCE_TEST_REDIS_URL` is corrected to a `redis://` or `rediss://` connection URL.
- **Non-blocking:** 10 moderate dev-only dependency findings remain in the ESLint/TypeScript-ESLint toolchain; npm reports no compatible automatic fix. Runtime audit has 0 high findings.
- **Unverified:** live Vercel routing, provider quotas, email delivery, Telegram delivery, and AI provider credentials.
- **Binary file storage limitation:** uploaded/generated binary files are not stored in an external object store; only URL/data metadata is persisted. Add object storage before enabling durable binary uploads.

## D. Manual Preview verification

1. Create a Vercel project at the repository root with Vite, `npm ci`, `npm run build`, and output directory `dist`; use Node 22.x.
2. Add the variables in section B to the Preview environment. Use separate Preview database/Redis instances or isolated namespaces; do not point tests at production data.
3. Deploy a Preview and record its URL. Confirm `GET /`, `/about`, `/projects`, `/services`, `/blog`, `/contact`, and `/start-project` return the SPA and refresh correctly.
4. Confirm `GET /live` returns 200. Confirm `GET /ready` reports ready only when PostgreSQL initialization succeeds; a missing/unavailable database must not return application JSON data.
5. Submit one clearly marked test contact and one test project-intake lead. Verify the API returns success, then sign into `/admin/login` and verify both records are visible.
6. Edit one project and one settings value from the admin UI. Verify the write returns success, refresh the page, and verify the values persist after a new Preview request/cold start.
7. Open a second private browser session. Confirm the first admin session remains valid across requests and that logout/all-devices revocation works.
8. Confirm a missing/stale CSRF token is rejected with 403 and does not modify data.
9. Verify public routes do not expose admin data, response headers include the expected security headers, and no client bundle contains server-only secrets.
10. Check Vercel Function logs for database/Redis connection errors, timeout warnings, unhandled rejections, or fallback-to-memory messages. Do not promote if any appear.
11. If email, AI, or Telegram is enabled, test one non-sensitive transaction in Preview and verify provider-side delivery/usage. Otherwise leave those features intentionally disabled.
12. Take a database backup/snapshot and record the rollback plan before any production promotion. Vercel rollback does not roll back database rows.
