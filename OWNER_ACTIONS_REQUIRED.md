# Owner Actions Required

These were **not** done because they change real credentials, real data, real network exposure, live containers, or are irreversible/outward-facing. Ordered by priority. (Updated 2026-11-05.)

**Execution plan with exact commands, verification, stop conditions and rollback: [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md).** New finding on 2026-11-05: the pushed GitHub history also contains the live **`POSTGRES_PASSWORD` and `REDIS_PASSWORD`** (old `docker-compose.yml`), and both ports are open to the LAN — rotate them together with #1.

| # | Action | Why | How | Risk if skipped |
|---|---|---|---|---|
| 1 | Rotate `ADMIN_PASSWORD` (≥ 12 chars) | Exposed in pushed git history, container env, `.env` copies, transcripts | DEPLOYMENT.md §6 "Credential rotation procedure": new value in `.env`, then restart **all** instances at the same time. Every existing session (cookie, Bearer, Redis-persisted) is rejected and deleted automatically — verified in the dry run. | Anyone with the old password can administer the site. **Critical** |
| 2 | Rotate `ADMIN_SESSION_SECRET` | Partially printed during the audit | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` → `.env`; same restart as #1 | Low today, but it salts session fingerprints |
| 3 | Close LAN exposure | 3001/3002/5432/6379 reachable from other devices | `BIND_ADDRESS=127.0.0.1` in `.env` (applies on next compose up) or `C:\Users\Ahed\Downloads\phase01-review\g0-firewall-containment.ps1 -Mode Apply` elevated (`-Mode Rollback` to undo) | Database/Redis/admin reachable on the local network. **High** |
| 4 | Secure the GitHub repository | History contains the password | Make private and/or rewrite history (e.g. `git filter-repo`), then rotate (#1) | Password stays public |
| 5 | Redeploy the new code | The live containers still run the **August code** (token in `localStorage`, no CSRF, no session fingerprint, …). None of the fixes protect the running site yet | After #5a–#7: `docker compose up -d --build` per DEPLOYMENT.md. Admins sign in again once (old sessions are rejected by design) | All fixed vulnerabilities remain exploitable on the live site. **High** |
| 5a | Set `POSTGRES_PASSWORD`, `REDIS_PASSWORD` in `.env` | Compose refuses to start without them | Values must match the existing PG/Redis volumes' passwords | `docker compose up` fails (by design) |
| 6 | Migrate container JSON to volumes **before any rebuild** | Each app container keeps its own `db.json` in its writable layer | DEPLOYMENT.md §3 "Migrating to persistent volumes" (rehearsed in the dry run) | Rebuild deletes messages/leads stored in the containers |
| 7 | Choose `PG_SYNC_MODE` (`load` vs `mirror`) | Two containers share PG but have different JSON | DEPLOYMENT.md §4 (both modes rehearsed in the dry run) | Startup may replace JSON content with PG content (a snapshot is kept) |
| 8 | HTTPS for the public site | Without HTTPS the admin cookie cannot be `Secure` and HSTS is not sent | Reverse proxy (Caddy/Nginx) with TLS → `TRUST_PROXY=1` and `SESSION_COOKIE_SECURE=true` in `.env` (passed through compose) | Session cookie and password travel in clear text on the network |
| 9 | Confirm `ai_model` | Now **wired**: the stored `gemini-3.7-flash` is tried first whenever Gemini is used (falls back to `gemini-2.5-flash` if rejected) | Settings → AI: enter the intended id or clear it to use the defaults | Possibly one failed Gemini call every 10 min, or an unintended model |
| 10 | ACL hardening of `.env`/`.data` | Broad Modify rights incl. unknown SIDs | `icacls <path> /save acl.txt /t` → `icacls <path> /inheritance:r /grant:r "%USERNAME%:F" "SYSTEM:F" "Administrators:F"` → rollback `icacls <parent> /restore acl.txt` | Other local accounts/tools can read secrets |
| 11 | Review duplicate/test records in real data | 11 duplicate project slugs, 24 duplicate service slugs, suspected old test records | Delete in the admin only what you confirm | Duplicates shadow each other's URLs |
| 12 | Approve real embeddings | Costs provider quota | Admin → RAG Knowledge → Rebuild Vector Index (only missing vectors are sent) | Retrieval stays keyword-only |
| 13 | Approve a PG restore test on the real dump | Creates a scratch database next to production | BACKUP_RESTORE.md "PostgreSQL — test into a scratch database first" (procedure proven in the dry run on test data) | Restore of the real dump not proven |
| 14 | Inspect 3 anonymous Docker volumes before any prune | Unknown contents | `docker volume inspect` / mount read-only | Possible data loss if pruned |
| 15 | Prune Docker build cache (after #1) | Old layers may contain the old `.env` | `docker builder prune` | Old secrets persist in cache |
| 16 | Replace demo content | Placeholder phone, `example.com` links, stock testimonials, inconsistent numbers (original audit §6) | Edit in the admin | The AI assistant presents them to visitors as verified facts |
| 17 | Push to GitHub / public deployment | Not done without approval | DEPLOYMENT.md | — |

Scripts outside this repo that read `body.token` from `POST /api/auth/login` must now send `{"password": "…", "client": "bearer"}`.
