# Deployment Guide

## 1. Before any deployment

1. Take a backup (see [BACKUP_RESTORE.md](BACKUP_RESTORE.md)).
2. Run the checks locally:
   ```bash
   npm ci
   npm run lint        # strict TypeScript + ESLint (0 errors expected)
   npm run test:all    # unit + integration, fully isolated (no network, temp database)
   npm run build
   ```
3. Review `.env` against `.env.example`. Production refuses to start without `ADMIN_PASSWORD` (≥ 12 chars) and a non-wildcard `CORS_ORIGIN`.

## 2. Plain Node (single instance)

```bash
NODE_ENV=production HOST=127.0.0.1 PORT=3000 npm start
```

- Put a reverse proxy (Caddy, Nginx) with HTTPS in front and set `TRUST_PROXY=1` (one proxy hop; `true` trusts every hop) so rate limits see real client IPs, HSTS is sent and the admin cookie is marked `Secure`. Then also set `SESSION_COOKIE_SECURE=true` so the cookie is never sent over plain HTTP. (Before 2026-11-05 a hop count was passed to Express as text and read as the IP `0.0.0.1`, i.e. the proxy was silently not trusted; fixed and covered by a unit test and the dry run.)
- `db.json` lives in `DATA_DIR` (default `./.data`). Back that directory up.
- Health endpoints: `GET /live` (process up), `GET /ready` (dependencies), `GET /health` (details).
- Shutdown (`SIGTERM`/`SIGINT`) waits for in-flight requests, writes pending analytics, then closes PostgreSQL/Redis (forced exit after 10 s).

## 3. Docker Compose

`docker-compose.yml` runs `postgres`, `redis`, `app-a` (host port 3001) and `app-b` (host port 3002).

### Required variables (compose refuses to start without them)

`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `ADMIN_PASSWORD`. Also set `ADMIN_SESSION_SECRET` and `CORS_ORIGIN`.

> The current `.env` does **not** contain `POSTGRES_PASSWORD` or `REDIS_PASSWORD`. Earlier versions of the compose file silently fell back to an empty Redis password; that is no longer possible.

### Network exposure

Published ports bind to `${BIND_ADDRESS:-0.0.0.0}`. Set `BIND_ADDRESS=127.0.0.1` in `.env` to keep 3001/3002/5432/6379 off the local network (recommended; the default was left unchanged so that nothing changes without the owner's decision). The Windows firewall alternative is `g0-firewall-containment.ps1` (see PROJECT_COMPLETION_STATUS.md).

### ⚠ Data persistence — read before rebuilding

Without a volume, each app container keeps its `db.json` **inside the container**. `docker compose up --build`, `down`, or an image update **recreates the container and its JSON data is gone** (messages, leads, settings edited in that instance). `app-a` and `app-b` also have **different** JSON files.

#### Migrating to persistent volumes (one-time, before the next rebuild)

```bash
# 1. Copy the live data out of each running container (read-only for the container)
mkdir -p migration
docker cp baraa-portfolio-app-a:/app/.data/db.json migration/app-a.db.json
docker cp baraa-portfolio-app-b:/app/.data/db.json migration/app-b.db.json
sha256sum migration/*.json            # record the hashes

# 2. Decide which file is authoritative (they differ) — or merge them by hand.

# 3. Create the volumes and copy the chosen file in (container runs as uid 1000 = node)
docker volume create baraa-abu-musameh---ai-engineerportfolio_app_a_data
docker run --rm -v baraa-abu-musameh---ai-engineerportfolio_app_a_data:/data -v "$PWD/migration:/src:ro" alpine \
  sh -c 'cp /src/app-a.db.json /data/db.json && chown -R 1000:1000 /data'
# repeat for app_b_data

# 4. Start with the volume override
docker compose -f docker-compose.yml -f docker-compose.volumes.yml up -d --build

# 5. Verify: the files inside the volumes hash to the values recorded in step 1
```

(The volume name prefix is the compose project name; check with `docker volume ls`.)

### Image

Verified on 2026-11-04 with a throwaway container (own volume, 127.0.0.1 only, removed afterwards): the image builds, runs as uid 1000 (`node`), contains no `.env`, and `db.json` written through the API survives a container restart when `/app/.data` is a volume.

The runtime image runs as the unprivileged `node` user; only `/app/.data` is writable. `.dockerignore` excludes every `.env*` file except `.env.example`, `.git` and `.data`.

## 4. PostgreSQL

| `PG_SYNC_MODE` | Behaviour |
|---|---|
| `load` (default, unchanged behaviour) | On startup, content tables in PostgreSQL (profile, projects, services, skills, blog, settings) **replace** the JSON copy. A snapshot `db.pre-pg-load-*.json` is written first (last 5 kept). Mutations are mirrored to PG. Messages and leads are **not** loaded back from PG. |
| `mirror` | `db.json` is authoritative; PG only receives writes (seeded when empty). Recommended for a single instance with a persistent `DATA_DIR`. |
| `off` | `DATABASE_URL` is ignored. |

> Choosing between `load` and `mirror` is an owner decision for the Docker setup: two app containers share one PostgreSQL but each has its own `db.json`.

TLS: `PG_SSL_MODE=disable | no-verify | verify-full`. Local/docker hosts default to `disable`; remote hosts default to `no-verify` (encrypted, certificate not checked — backwards compatible). Use `verify-full` for remote databases whose CA is trusted by Node.

## 5. Redis

Optional. With `REDIS_URL`, admin sessions (including their CSRF tokens) and rate limits are shared between instances (required for app-a/app-b behind one load balancer). Without it both fall back to process memory.

## 6. Admin authentication after this release

- The admin UI uses an `HttpOnly`, `SameSite=Strict`, `Path=/api` session cookie plus a per-session CSRF token (`X-CSRF-Token`). Nothing is stored in `localStorage`; tokens left there by older versions are deleted on the next visit.
- **Existing sessions end on deployment:** sessions issued by the version running today have no credential fingerprint (and no CSRF token), so they are rejected — sign in again once after deploying.
- Scripts that used `body.token` from `POST /api/auth/login` must now send `{"password": "…", "client": "bearer"}` to receive it.
- Over plain `http://` (today's LAN setup) the cookie works without `Secure`, and the server logs a startup warning. With HTTPS: `TRUST_PROXY=1` + `SESSION_COOKIE_SECURE=true` (both are passed through `docker-compose.yml`).

### Credential rotation procedure
1. Generate a new password (≥ 12 chars) and a new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Put both into `.env` (and any other environment the containers read).
3. Restart **every** instance at the same time (`docker compose up -d app-a app-b`). An instance still running with the old values would keep accepting sessions issued under them.
4. Result (verified in the dry run, step 10): every existing session — Bearer or cookie, even those stored in Redis — is rejected and deleted on first use; the old password no longer logs in.
5. Then make the GitHub history private/rewritten and prune the Docker build cache (OWNER_ACTIONS_REQUIRED.md #4, #14).

## 7. Post-deployment security checklist

- [ ] Rotate `ADMIN_PASSWORD` (it exists in old git history and in earlier logs) — this logs out all sessions automatically.
- [ ] Rotate `ADMIN_SESSION_SECRET`.
- [ ] `BIND_ADDRESS=127.0.0.1` or firewall rule for 3001/3002/5432/6379.
- [ ] HTTPS reverse proxy + `TRUST_PROXY=1` + `SESSION_COOKIE_SECURE=true`.
- [ ] `EMAIL_PROVIDER`/SMTP App Password configured if notifications are wanted; leave `enable_visitor_confirmation` off unless needed.
- [ ] After login, use **Settings** to confirm `maintenance_mode` is what you expect (the operator seed file ships with it **on**).
