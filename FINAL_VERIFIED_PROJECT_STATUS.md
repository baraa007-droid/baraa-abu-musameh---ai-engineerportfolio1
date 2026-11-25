# Final Verified Project Status

_2026-11-05 · Baraa Abu Musameh — AI Engineer Portfolio · consolidated report of the final engineering mission (batches G1–G6), resumed after a usage-limit interruption. Every result below comes from a run on the **final code**; logs are archived in `C:\Users\Ahed\Project-Backups\pre-change-20261104T1320Z\final-validation-20261105\`._

## Verdict

| | Status |
|---|---|
| **Code** | **Verified release candidate.** No known critical/high defect. TypeScript strict 0 errors, ESLint 0 errors, 40 + 221 + 172 automated checks green, production bundle and production containers verified. |
| **Deployment** | **Not production-ready yet.** The live containers still run the August code, the admin password is compromised, and four ports are reachable from the LAN. These need the owner (section 8). |
| **Real data** | Untouched: host `.data` and both live container databases are byte-identical to the backups taken before the work started (section 9). |

---

## 1. Changes made in the final mission

The mission ran in batches; each batch is one commit in the external change log `changes.git` (nothing pushed).

| Batch | What changed | Bugs found and fixed |
|---|---|---|
| **G1** | Admin session moved from a `localStorage` Bearer token to an `HttpOnly`, `SameSite=Strict` cookie; honeypot on public forms; 100 kB public body limit; system form fields locked; intent-based security/unknown-fact gates replace keyword lists; `ai_model` wired (validated, per-provider, default fallback); two-step tool calling; startup waits for the PostgreSQL sync; one write per mutation; vite loaded only in development; rate-limit map sweeper; dead code and broken scripts removed; `package.json` tidied | Gate regex had lost its `\b` word boundaries (became backspace characters) |
| **G2** | Browser tests for every remaining admin gap: certificates CRUD, avatar upload, 8 toggles, network failure while saving, all 18 tabs at 390 px | Course publish toggle did nothing; Courses/Education toggles and deletes updated the list before the server answered; honeypot field widened RTL pages |
| **G3** | Deployment dry run on a throwaway Docker stack (24 checks at the time) | Two script defects (SQL quoting, readiness field names) — not product defects |
| **G4** *(resumed here)* | React Hooks lint rules; 5 effects fixed or justified; `catch` variables typed `unknown` (38 blocks) via `errorText`/`errorStatus`; ESLint warnings 160 → 121 | **The usage limit interrupted an automatic conversion halfway: 45 TypeScript errors, and one import had been inserted into seed text inside `db.ts`.** Completed precisely (only the lines TypeScript reported), seed text restored byte-for-byte |
| **G5** | **Per-session CSRF token** replacing the static header; session rotation on login; browser login no longer returns the session token; `SESSION_COOKIE_SECURE`; **All Devices** button; cookie/CSRF test suite covering every admin route; 15 new dry-run checks | **`TRUST_PROXY=1` was read by Express as the IP `0.0.0.1`** (proxy silently untrusted → wrong client IPs, no HSTS, no `Secure` cookie) — fixed + unit test; production compose did not pass `TRUST_PROXY`/`SESSION_COOKIE_SECURE` — fixed; "general 60/min" rate limit in the docs was never applied since Phase 1 — unused code removed, docs corrected; CSRF failures used to return 401 (UI would sign the user out) — now 403 |
| **G6** | All handoff documents updated; this report | — |

### State found at resume (verified, not assumed)
- Last checkpoint `32b1555` (G3). 24 files modified after it, uncommitted (G4 work in progress).
- Of the reported results of the interrupted mission, these had execution logs: unit 38/38, integration 166/166, E2E 161/161, dry run 24/24. All were re-run on the final code; final numbers in section 2.
- None of the handoff documents had been updated by the interrupted mission (they still described the `localStorage` token and "no CSRF").

---

## 2. Final test results

| Check | Command | Result |
|---|---|---|
| TypeScript strict | `npx tsc --noEmit` | **0 errors** |
| ESLint | `npx eslint server src server.ts tests` | **0 errors**, 120 warnings: 106 `no-explicit-any` (untyped API payloads), 14 unused variables; **0 React Hooks** |
| Unit / render / AI mocks | `npm run test:unit` | **40 / 40** passed, 0 skipped |
| Integration / security / API | `npm test` | **221 / 221** passed (includes the 60-check cookie + CSRF suite) |
| Browser E2E (Playwright, Chromium) | `npm run test:e2e` | **172 / 172** passed |
| Production build | `npm run build` | OK — main JS 462 kB (gzip 136 kB), lazy page chunks, `dist/server.cjs` 292 kB |
| Production smoke | built bundle, `NODE_ENV=production`, temp data, every `.env` key blanked, network guard | **11 / 11** |
| Deployment dry run | `bash scripts/dryrun/run-dryrun.sh` | **39 / 39**; containers, volumes and image removed afterwards |
| Dependency audit | `npm audit`, `npm audit --omit=dev` | 0 critical, 0 high, 8 moderate (all in ESLint/typescript-eslint dev tooling); **production tree: 0** |
| Isolation | every suite | 0 outbound network attempts; test runs never touched the project `.data` |

No test was skipped, weakened or made to pass by bypassing a security check. Failures met on the way (all fixed): the 45 TypeScript errors above; one snapshot comparison that flagged process telemetry (uptime/memory) rather than data; the smoke test could not read the network guard after a forced kill on Windows (the guard now publishes its count while running — 0).

---

## 3. Browser E2E coverage (172 checks)

| Area | Checks | Content |
|---|---|---|
| Public site | 27 | 10 pages render; seeded content visible; project images; inactive services and drafts hidden (list and URL); "Start Similar Project" prefill; selects start empty; contact form stored; failed submission shows an error; API outage does not blank the page; title + meta |
| Public site at 390 px | 10 | no horizontal overflow on any page |
| Admin tabs open (desktop) | 36 | all 18 tabs: no error boundary, no console error, no overflow |
| Admin actions | 66 | create/update/delete in Projects, Services, Blog, Skills, Testimonials, Experience, Education, **Certificates**, Courses, Methodology, Principles, Hero Nodes; Leads (status, notes, delete); Messages (status, delete); Knowledge (add → 2 chunks, list, delete, honest re-index); Forms enable/disable; Profile save + **avatar upload**; Settings save + forced failure; **11 toggles** (featured, active, published, enabled) with public-API effect; network failure while saving keeps the form |
| Admin tabs at 390 px | 18 | every tab renders without overflow or errors |
| Authentication + CSRF | 15 | redirect to login, wrong/right password, revoked session, cookie flags invisible to scripts, nothing in storage, CSRF header on every write and no Bearer header, reload keeps session + token, stale token refreshed once (403 → 200), missing token rejected with input kept and user still signed in, nothing saved, idle expiry → login, **Sign Out** ends the server session, **All Devices** revokes other devices |

Remaining gaps: individual Settings switches are not clicked (keys are API-tested); field-level validation messages in Skills/Experience/Education; zero-record empty states; real AI output (no paid calls). Matrix per tab: [ADMIN_TEST_MATRIX.md](ADMIN_TEST_MATRIX.md).

---

## 4. Authentication and CSRF

### Design (final)
- **Browser:** session token only in an `HttpOnly`, `SameSite=Strict`, `Path=/api` cookie (7-day `Max-Age`). The login response carries no session token. `Secure` is added for HTTPS requests, and always with `SESSION_COOKIE_SECURE=true`.
- **CSRF:** synchronizer token — 256 bits, created at login, stored inside the server-side session (Redis or memory), returned only in the JSON of `POST /api/auth/login` and `GET /api/auth/check`, kept in memory by the UI, sent as `X-CSRF-Token`, compared in constant time. Required for every cookie-authenticated `POST/PUT/DELETE/PATCH` (including `logout` and `logout-all`). Missing / wrong / other-session token → **403 `CSRF_INVALID`**; the UI refreshes the token once, otherwise shows the error and stays signed in.
- **Scripts:** `{"client":"bearer"}` at login → `Authorization: Bearer` (browsers never add this header on their own, so no CSRF token is needed).
- **Sessions:** 24 h sliding, 7-day absolute, bound to an scrypt fingerprint of `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`; new session on every login (the previous one presented by the browser is revoked).

### Verification of every requested item
Integration IDs refer to `scripts/auth_csrf_suite.ts` (A–J) and `scripts/run_tests.ts` (S…); "dry run" = production containers with shared Redis.

| Requirement | Evidence |
|---|---|
| Login | A1–A11; E2E login; production smoke; dry run [8] |
| Logout | F1–F4 (requires token; clears cookie; cookie rejected afterwards; idempotent); E2E **Sign Out** (old cookie → 401); dry run: logout on app-a ends the session on app-b |
| Logout all devices | F5–F7 (requires token; Bearer and cookie sessions on other devices → 401); S13; E2E **All Devices** button |
| Session expiration | G1 sliding extension, G2 idle expiry (reads + auth check → 401), G3 7-day absolute limit (session deleted); E2E idle expiry → login page |
| Session revocation | F6–F7, S13, I1–I6; E2E revoked session → login |
| CSRF token generation | A7 (43-char, 256-bit), A11 (unique per session), unit test (randomness/format), A8 (not in a cookie) |
| CSRF token validation | B8; C10 (29 different admin write operations succeed with cookie + token) |
| Rejection of missing/invalid tokens | B1 missing, B2 wrong, B3 other session, B4 old static header, B5 empty, B6 cross-site form POST, B7 nothing changed; **C4–C6: all 36 admin write routes** reject each case; F1/F5 logout/logout-all; E2E 403 with input kept; dry run 403 |
| SameSite | A3; E2E cookie attributes; smoke; dry run |
| HttpOnly | A2; E2E (`document.cookie` does not contain it); smoke; dry run |
| Secure in production | A5 (plain HTTP: not set, forged `X-Forwarded-Proto` ignored); J1 (`SESSION_COOKIE_SECURE=true`); smoke (production warning); dry run [9]: `TRUST_PROXY=1` + HTTPS → `Secure` + HSTS, plain request → not `Secure`, `SESSION_COOKIE_SECURE=true` → always `Secure` |
| Unauthorized API access | C2/C3 (36 write routes: anonymous and forged Bearer → 401), C7 (4 read routes → 401), H0–H1 (tampered, truncated, oversized, wrong-name cookie, token in query string, `Bearer undefined`, Basic auth, password as token → 401), B10 (CSRF token is not a session token), S28 (login brute force → 429) |
| Cross-origin requests | D1 foreign preflight → 403 without CORS headers; D2 configured origin may send `X-CSRF-Token`; D3 foreign origin cannot read `/api/auth/check`; D4 cross-origin cookie write → 403; dry run preflight → 403 |
| Session rotation after login | E1 new token + new CSRF token; E2 the browser's previous session → 401; E3 new session works |
| Changing `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` | I1–I6 in-process (old sessions rejected and deleted; old password refused; reverting does not resurrect them); **dry run [10]: after restarting both instances with a new password, Bearer and cookie sessions still stored in Redis (6 keys) → 401; old password refused; new password works on both; rotating only the secret also rejects sessions** |
| All sensitive admin operations on cookies | C10 (29 operations: CRUD on projects/services/skills/blog/testimonials, 7 list endpoints, profile, forms, message/lead status, knowledge add/delete, blog assistant); every E2E admin action runs on the cookie session |
| No legacy mechanism bypasses the new protection | C1: route inventory from `server.ts` — only the 8 intended public write routes lack `requireAdmin` (a new unprotected route fails the suite); B4/C6: the old static header is refused on every route; A6: no session token to the browser; E2E: no `Authorization` header from the UI, no token in storage (legacy `baraa_admin_token` removed) |

---

## 5. AI / RAG

- **Real data:** 126 knowledge chunks, **0 embeddings** → retrieval is keyword-only and the UI says so. Vector search is verified with mock embeddings only and is not claimed to work on real data.
- **Implemented and tested with mocks (no paid call ever made):** vector similarity + hybrid ranking, embedding persistence across re-index, incremental embedding, two-step tool calling (`getProfile` answers from stored data), provider fallback with a labelled data-driven answer, model configuration, Arabic/English normalization, chat history validation, lead qualification (fenced input, clamped scores, honest fallback), blog assistant (503, never canned text), project advisor (labelled template fallback), intent-based safety gates, timeouts that really abort.
- **`ai_model`** is wired: the stored `gemini-3.7-flash` is tried first whenever Gemini is used and falls back to `gemini-2.5-flash` if rejected (skipped for 10 minutes); OpenRouter (the primary provider) is unaffected. Needs the owner to confirm or clear it.
Details: [AI_RAG_STATUS.md](AI_RAG_STATUS.md).

---

## 6. Docker and databases

| Item | Status |
|---|---|
| Image | Builds; runs as uid 1000; no `.env` inside; graceful shutdown |
| Compose (`docker-compose.yml`) | Mandatory DB/Redis/admin passwords; passes `ADMIN_SESSION_SECRET`, `PG_SYNC_MODE`, `TRUST_PROXY`, `SESSION_COOKIE_SECURE`; `BIND_ADDRESS` variable; opt-in `docker-compose.volumes.yml` |
| Dry run (39 checks) | Isolated project; PG/Redis not published; Redis rejects unauthenticated commands; sessions shared across instances; JSON survives restart (volume); PG mirror; `PG_SYNC_MODE=load` (snapshot before overwrite) and `mirror`; `pg_dump` → restore into a scratch DB with equal row counts; JSON backup copy-out and rollback; cookie/CSRF over shared Redis; HTTPS behind a proxy; credential rotation with Redis-persisted sessions; production config validation (short password, wildcard CORS refused); corrupt `db.json` refused and preserved |
| PostgreSQL | `PG_SYNC_MODE` default `load` unchanged; JSON remains the primary store; no real migration executed; TLS `no-verify` default for remote hosts (owner: `verify-full`) |
| Live stack | Not rebuilt, not reconfigured, no data written. Containers still run the August image and keep data in their writable layers (app-a and app-b differ) |

---

## 7. Remaining risks

| # | Risk | Severity | Owner action |
|---|---|---|---|
| 1 | `ADMIN_PASSWORD` compromised (git history, container env, copies, transcripts) | **Critical** | #1, #4 |
| 2 | Live site runs the August code — none of the fixes protect it yet | **High** | #5 |
| 3 | Ports 3001/3002/5432/6379 reachable from the LAN | **High** | #3 |
| 4 | Plain HTTP: cookie cannot be `Secure`, password crosses the network in clear | High once exposed beyond the LAN | #8 |
| 5 | `ADMIN_SESSION_SECRET` partially exposed | Medium | #2 |
| 6 | Container data not on volumes (lost on rebuild) and divergent between app-a/app-b | Medium (data loss on rebuild) | #6, #7 |
| 7 | `.env`/`.data` ACLs too broad | Medium | #10 |
| 8 | PG TLS `no-verify` for remote hosts | Low (local today) | `PG_SSL_MODE=verify-full` |
| 9 | No global limit on public reads | Low | limit at the reverse proxy |
| 10 | Demo content presented by the AI as facts; duplicate test records | Credibility | #11, #16 |
| 11 | 120 lint warnings (types) | Maintainability | optional |

---

## 8. Owner actions (need your approval)

Ordered list with exact procedures: [OWNER_ACTIONS_REQUIRED.md](OWNER_ACTIONS_REQUIRED.md). The critical path:
1. Rotate `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`; restart all instances together (DEPLOYMENT.md §6).
2. `BIND_ADDRESS=127.0.0.1` or the G0 firewall script.
3. Secure the GitHub repository (private / history rewrite), then prune the Docker build cache.
4. Set `POSTGRES_PASSWORD`/`REDIS_PASSWORD`, migrate container JSON to volumes, choose `PG_SYNC_MODE` → **redeploy**; admins sign in once more.
5. HTTPS reverse proxy + `TRUST_PROXY=1` + `SESSION_COOKIE_SECURE=true`.
6. Confirm or clear `ai_model`; decide on paid embeddings; clean duplicate/demo content.

Not done without approval (as instructed): real data changes, real password changes, firewall, live container recreation, real migration, git push, production deployment, paid AI calls.

---

## 9. Data before / after

| What | Before (reference) | After (2026-11-05, after all runs) | Result |
|---|---|---|---|
| Host `.data/db.json` | `562d95a43cc34527…` (pre-change record) | `562d95a43cc34527…` | identical |
| Host `.data/db.seed.json` | `31bb33f8e7a9d947…` | `31bb33f8e7a9d947…` | identical |
| Host `.data/audit_results.json` | `9946e3eb2efa3656…` | `9946e3eb2efa3656…` | identical |
| Live app-a `/app/.data/db.json` | `5a3766f49a3cf7f3…` (Phase 0.1 backup) | `5a3766f49a3cf7f3…` (read-only `sha256sum` via `docker exec`) | identical |
| Live app-b `/app/.data/db.json` | `bae3113299d37e5a…` (Phase 0.1 backup) | `bae3113299d37e5a…` | identical |
| Live containers | ids `911aa48c118b`, `85d706422466`, `967da91288cd`, `1f47c5fdb789`, created 2026-08-25 | same ids, restart count 0; same set before and after both dry runs | unchanged by this work |
| Docker volumes | 8 | 8, same names, before and after both dry runs | unchanged |

Note: the machine rebooted at about 07:54 UTC on 2026-11-05 and Docker restarted the live containers at 08:06 UTC (same containers, data hashes unchanged). This happened before any command of this session. The live PostgreSQL and Redis were not queried in this session.

---

## 10. Production readiness

- **Ready:** the code, the tests, the container image, the deployment procedure (rehearsed), backup/restore/rollback (rehearsed on test data), the documentation.
- **Not ready until the owner acts:** credential rotation, LAN exposure, repository history, volume migration + redeploy, HTTPS.
- **After those actions** the deployment checklist in [FINAL_RELEASE_READINESS.md](FINAL_RELEASE_READINESS.md) is complete; no further code work is required for release.

---

## Appendix A — The 37 findings of the original audit

| # | Finding | Status | Evidence / remainder |
|---|---|---|---|
| 1 | Tests wrote to real data and sent real notifications | **Fixed & Tested** | temp `DATA_DIR`, network guard, `.data` hash check in every suite. Existing test records in real data: **Owner Action** (#11) |
| 2 | Drafts / unpublished testimonials public | **Fixed & Tested** | S1–S4, E2E draft list + URL |
| 3 | Email relay through the auto-reply | **Fixed & Tested** | unit (opt-in, fixed text, 1/day), S14 (5 per 10 min), S24 honeypot |
| 4 | `POST /api/events` unlimited | **Fixed & Tested** | validation, 120/min, S25 (100 kB), batched writes |
| 5 | Chat history unvalidated | **Fixed & Tested** | integration |
| 6 | Corrupt `db.json` replaced by seed | **Fixed & Tested** | unit + dry run [12] |
| 7 | Token in `localStorage`, no CSP | **Fixed & Tested** | cookie + per-session CSRF (section 4); CSP in production smoke |
| 8 | Vulnerable packages | **Fixed & Tested** | 0 high/critical; 8 moderate dev-only remain (only fix offered is a downgrade) |
| 9 | Maintenance HTML injection, settings URLs/keys, PG TLS, lead-score injection | **Fixed & Tested**; PG TLS **Owner Action** | S12, settings whitelist tests, unit (fenced, clamped scores); `PG_SSL_MODE` exists, remote default `no-verify` |
| 10 | Knowledge document add broken | **Fixed & Tested** | E2E add/list/delete |
| 11 | Forms management broken; system fields could be disabled | **Fixed & Tested** | E2E enable/disable, S26 |
| 12 | Blog AI buttons broken, fake "sample" text | **Fixed & Tested** (mock providers) | action mapping, 503 instead of canned text; real output untested (no paid calls) |
| 13 | Project images / testimonial role not shown | **Fixed & Tested** | E2E card image from gallery; testimonials CRUD |
| 14 | About hid past experience | **Fixed & Tested** | E2E "About shows seeded content" (past role) |
| 15 | Inactive services public | **Fixed & Tested** | E2E + integration |
| 16 | Maintenance mode locked the admin out | **Fixed & Tested** | S12 (assets and admin bypass) |
| 17 | Prefill ignored; selects pre-chosen; invented budget | **Fixed & Tested** | E2E prefill + empty selects; fallback scoring test S15 |
| 18 | "Saved" on failure; no `res.ok`; stale lead/message selection; notes hidden | **Fixed & Tested** | E2E (settings 500, network failure, CSRF failure, lead notes) |
| 19 | White screen (search 429, no error boundary, advisor field) | **Fixed but Not Fully Tested** | per-route error boundary + E2E API outage; the 429 search path was not driven in the browser |
| 20 | Unknown `/api` returned HTML 200 | **Fixed & Tested** | integration + smoke |
| 21 | Settings without effect | **Fixed & Tested** | `ai_enabled` etc. (integration), `ai_model` (S27 + unit), social links/Calendly rendered, `EMAIL_PROVIDER` honoured |
| 22 | Embeddings wiped on every edit; fake `vectorMatch` | **Fixed & Tested** | unit; real embeddings: **Owner Action** (paid) |
| 23 | Fallback answer full of invented facts | **Fixed & Tested** | data-driven, `degraded` flag (unit + integration) |
| 24 | Keyword block lists | **Fixed & Tested** | intent-based gates, 10 cases |
| 25 | Single-shot tool calling, `getProfile` missing | **Fixed & Tested** | unit (two-step, getProfile) |
| 26 | Up to ~26 s latency, timeouts not aborting | **Fixed & Tested** | `withAbortTimeout` unit, background lead scoring |
| 27 | Arabic normalization no-op | **Fixed & Tested** | unit |
| 28 | Whole-file synchronous writes per event | **Fixed but Not Fully Tested** | batched analytics + one write per mutation; persistence verified (dry run), no dedicated batching test |
| 29 | PostgreSQL half-implemented | **Partially Fixed** + **Owner Action** | `PG_SYNC_MODE`, snapshot, startup waits for sync (dry run); single-source-of-truth decision open |
| 30 | docker-compose issues | **Fixed & Tested** (dry run); applying to live: **Owner Action** | non-root, passwords mandatory, secrets passed, `BIND_ADDRESS`, opt-in volumes; `docker/init.sql` still unused (harmless) |
| 31 | Server misc (vite in prod, host, shutdown, map growth, trust proxy, error handler) | **Fixed & Tested** | dev-only vite, host binding, graceful shutdown (dry run), sweeper, error handler, **`TRUST_PROXY` hop count fixed in G5**; parallel page loads kept (by design) |
| 32 | Tooling gave false confidence | **Fixed & Tested** | strict TS, real ESLint + hooks rules, fake linter removed |
| 33 | Broken scripts | **Fixed** | removed |
| 34 | Dead code | **Fixed** | removed (incl. unused limiter in G5); `callWithRetry` kept — used by a regression script |
| 35 | `package.json` issues | **Fixed** | name, duplicates, `@types`, `bun.lock` |
| 36 | No version history | **Fixed** (local) + **Owner Action** | external `changes.git` (21 commits, not pushed); repository security is the owner's |
| 37 | README did not match the code | **Fixed** | rewritten; updated again for cookie + CSRF |
| §6 | Demo content (phone, `example.com`, stock testimonials, inconsistent numbers) | **Owner Action** | #16 |

Summary of the 37: **29 Fixed & Tested**, 5 Fixed (cleanup items, verified on disk), 2 Fixed but Not Fully Tested, 1 Partially Fixed, **0 Still Open**; owner actions attached to 1, 9, 22, 29, 30, 36 and §6.

---

## Appendix B — Backups, rollback and how to continue

**Backups**
- `C:\Users\Ahed\Project-Backups\phase0.1-20261104T125959Z` — container JSON, PG dump, manifests (STATUS SUCCESS).
- `C:\Users\Ahed\Project-Backups\pre-change-20261104T1320Z\project-src-and-data.tar` — source + `.data` + `.env` before any change.
- `C:\Users\Ahed\Project-Backups\pre-change-20261104T1320Z\changes.git` — one commit per batch, baseline `b404357` → `G6`.
- `C:\Users\Ahed\Project-Backups\pre-change-20261104T1320Z\final-validation-20261105\` — logs of the final runs.

**Rollback**
```bash
export GIT_DIR="C:/Users/Ahed/Project-Backups/pre-change-20261104T1320Z/changes.git"
git log --oneline                 # batches
git diff <commit>~1 <commit>      # inspect one batch
git checkout <commit> -- <file>   # restore one file
unset GIT_DIR
```
Full return to the pre-change state: extract the tar into an empty folder and copy back what is needed (never over the live `.data`). Deployment rollback: BACKUP_RESTORE.md (rehearsed in dry-run steps 6–7).

**How another engineer or agent continues**
1. Read, in order: this file → OWNER_ACTIONS_REQUIRED.md → SECURITY_STATUS.md → DEPLOYMENT.md → ADMIN_TEST_MATRIX.md.
2. Record each change in `changes.git` (set `GIT_DIR` as above; never push from it).
3. Before and after any change run: `npx tsc --noEmit && npx eslint server src server.ts tests`, `npm run test:all`, `npm run build`; for Docker/database changes also `bash scripts/dryrun/run-dryrun.sh`.
4. Hard rules kept throughout this project: tests only through the isolated runners (temp data, network guard); never run the scripts that talk to real services (`scripts/test_*real*`, `eval_*`, `run_forensic_eval.ts`, …) without intent; no changes to real data, secrets, firewall or live containers without the owner; no paid AI calls.
5. A new state-changing route must use `requireAdmin` or be added deliberately to `PUBLIC_UNSAFE` in `scripts/auth_csrf_suite.ts` — the suite fails otherwise.
