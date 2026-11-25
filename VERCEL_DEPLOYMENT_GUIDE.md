# Vercel Deployment Guide

## Recommended project settings

- Framework preset: **Vite**
- Root directory: repository root
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: `>=22.0.0 <25.0.0` from `package.json`; select Node 22.x in Vercel if the dashboard offers an explicit version.
- Do not deploy `.env`; enter secrets in Vercel Project Settings.

`api/index.ts` exposes the Express API as a Vercel Node Function. `vercel.json` routes `/api/*` to that function and sends client-side routes to `dist/index.html`.

## Required external services

Before production, configure a managed PostgreSQL database and set `DATABASE_URL`. The JSON store is suitable for local/Docker use only because Vercel function instances do not provide durable shared local storage. Use `PG_SYNC_MODE=mirror` or the documented `load` mode only after reviewing the data ownership decision in `DEPLOYMENT.md`.

Set `REDIS_URL` for shared admin sessions and rate limits when multiple function instances may serve traffic. Without it, state is process-local.

## Environment variables

Required: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `CORS_ORIGIN`, `APP_URL`, `DATABASE_URL`, and an appropriate `PG_SSL_MODE` for the remote database.

Optional: `REDIS_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GEMINI_API_KEY`, `EMBEDDING_MODEL`, notification variables, and feature switches documented in `.env.example`.

Use separate Preview and Production values. Keep all credentials server-only; there are no required public `VITE_*` secrets.

## Deployment steps

1. Run `npm ci`, `npm run lint`, `npm run test:unit`, `npm test`, and `npm run build` locally.
2. Create/import the Vercel project from the repository root.
3. Add the environment variables above for Preview and Production.
4. Deploy a Preview. Verify `/`, `/about`, `/projects`, `/services`, `/blog`, `/contact`, `/start-project`, `/live`, and `/ready`.
5. Submit a non-sensitive test contact/lead in Preview and verify it in the admin UI and PostgreSQL-backed data.
6. Verify `/admin/login`, CSRF-protected writes, logout, and session behavior in Preview.
7. Confirm that AI/notification integrations are either intentionally disabled or successfully verified with their own credentials.
8. Promote to Production only after the Preview checks and database backup/restore plan are approved.

No deployment is performed by this audit.

## Post-deployment checks

- Confirm security headers and HTTPS cookie flags.
- Confirm no `.data/db.json` is treated as authoritative production storage.
- Check Vercel Function logs for API errors, timeouts, and database connection failures.
- Verify a public form submission, admin read, admin write, logout, and a second request after a cold start.
- Confirm maintenance mode and health endpoints behave as intended.

## Rollback

Use Vercel's previous deployment rollback only after confirming database compatibility. Application rollback does not roll back database rows; take backups and review schema/data changes separately.

## Known project-specific problems

- `server.ts` remains the Docker/Node entrypoint; Vercel uses `api/index.ts`.
- Local JSON persistence is not a production option on Vercel.
- Redis is needed for consistent sessions and rate limits across concurrent instances.
- The optional AI and notification providers were not live-tested in this isolated environment.
- The existing browser E2E runner timed out before its final summary and must be stabilized before claiming full browser regression coverage.

Vercel's current Express guidance confirms that Express can run as a single Node Function, but `express.static()` does not serve static assets there; Vercel serves the `public/**` directory and the configured build output. Function limits and Hobby duration limits still apply. See the official [Express on Vercel documentation](https://vercel.com/docs/frameworks/backend/express).

## Follow-up deployment requirements

The application now deliberately fails production configuration validation when Vercel is missing `DATABASE_URL`, `REDIS_URL`, or `PG_SYNC_MODE=load`. Redis is mandatory on Vercel because admin sessions and rate limits must be shared across function instances. PostgreSQL is mandatory for durable content, but the current synchronization layer still requires a staging validation and is not a complete database-only repository for every table.

Do not promote a Preview to Production until a disposable/staging PostgreSQL and Redis instance has passed the manual checklist in `VERCEL_FINAL_LAUNCH_CHECKLIST.md`.

## Database initialization and migration

The schema is initialized automatically by the application with transactional `CREATE TABLE IF NOT EXISTS` migrations, including the canonical `portfolio_state` table. To inspect/migrate an existing local JSON dataset without changing it:

```text
npm run db:migrate
```

This is a dry run by default. It detects a non-empty/conflicting PostgreSQL canonical row and refuses to overwrite it. For an empty staging database only, after taking an approved backup:

```text
MIGRATION_CONFIRM=1 npm run db:migrate -- --apply
```

On PowerShell:

```powershell
$env:MIGRATION_CONFIRM='1'; npm.cmd run db:migrate -- --apply
```

The command preserves `db.json` and creates a timestamped `db.pre-pg-migration-*.json` backup beside it. Never run `--apply` against Production without an approved backup and change window.

## Concurrency behavior

Each Vercel API request refreshes the canonical snapshot. Writes use a PostgreSQL revision compare-and-swap; if another instance committed first, the stale request receives HTTP 409 and must be retried from a fresh read. Requests are serialized inside one function instance to protect the shared in-memory working object. This behavior still requires verification with two real application instances and disposable services.
# AI deployment verification update — 2026-11-17

The AI path is server-side and compatible with the Express Function adapter. Configure only server-side `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY`; never expose either through a `VITE_` variable. The current data snapshot has no stored embeddings, so run the authenticated Knowledge reindex operation after choosing Gemini if vector retrieval is required. The configured default embedding model is `gemini-embedding-2`; only missing vectors are sent, and vector values are validated before storage. AI requests are bounded by provider timeouts and should be smoke-tested in Preview in both Arabic and English. No remote Preview was deployed by this audit.
