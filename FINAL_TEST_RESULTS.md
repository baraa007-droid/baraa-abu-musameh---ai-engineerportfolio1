# Final Test Results

Date: 2026-11-17

| Test | Result | Evidence | Notes |
|---|---|---|---|
| Reproducible install | PASS | `npm ci --ignore-scripts` completed; 417 packages installed | Full tree reports 10 moderate findings |
| Type checking | PASS | `npm run lint` exit 0 | `tsc --noEmit` passed |
| ESLint | PASS | `npm run lint` exit 0 | 120 warnings, 0 errors |
| Production build | PASS | `npm run build` exit 0 | Vite + `dist/server.cjs` generated |
| Unit tests | PASS | `npm run test:unit`; 40 passed, 0 failed | Network guard: 0 attempts |
| Integration/security suite | PASS | `npm test`; 221 passed, 0 failed | Isolated temp DB; project `.data` unchanged |
| Public/API workflows | PASS | Integration suite plus E2E logs | Core HTTP CRUD/auth/rate-limit/AI fallback paths verified |
| Browser E2E | BLOCKED | `npm run test:e2e` timed out after 240 seconds | Many journeys ran, but no final summary/result file was emitted |
| Dependency audit (production) | PASS | `npm audit --omit=dev --audit-level=high` | 0 high-severity findings |
| Full dependency audit | NOT RUN | `npm ci` audit reported 10 moderate findings | Requires review of full tree/dev dependencies |
| Vercel CLI build | NOT RUN | `VERCEL_CLI_NOT_INSTALLED` | No deployment or external infrastructure access was used |
| PostgreSQL production integration | BLOCKED | No authorized production DB test performed | Must verify with a disposable/staging DB |
| Redis production integration | BLOCKED | No authorized live Redis test performed | Required for shared state across instances |
| AI provider live integration | BLOCKED | Test guard removed provider credentials/network | Optional; fallback behavior is covered |
| Email/Telegram live integration | BLOCKED | Test guard blocks external delivery | Optional; mocked/unit behavior covered |

## Commands executed

```text
npm ci --ignore-scripts
npm run lint
npm run build
npm run test:unit
npm test
npm run test:e2e
npm audit --omit=dev --audit-level=high
npm ls --depth=0
```

## Follow-up verification

The earlier E2E timeout was reproduced and fixed. The final rerun was:

```text
npm run test:e2e
E2E Summary: 172 PASSED, 0 FAILED
duration: 193.9 seconds
outbound network attempts: 0
project .data unchanged
```

The earlier E2E row above is historical; its current result is **PASS**. The full dependency audit remains **BLOCKED/NOT CLEAR** for 10 moderate dev-only findings, and managed PostgreSQL/Redis plus a live Vercel Preview remain **BLOCKED** because no external credentials or deployment were authorized.

| Follow-up check | Result | Evidence | Notes |
|---|---|---|---|
| E2E browser suite | PASS | `npm run test:e2e`; 172 passed, 0 failed | Completed in 193.9s; no outbound network |
| Vercel production fail-fast guard | PASS | Vercel config now requires DB + Redis and rejects unsafe sync mode | Live function not deployed |
| PostgreSQL live integration | BLOCKED | No disposable/staging DB credentials available | No production DB touched |
| Redis live integration | BLOCKED | No disposable/staging Redis credentials available | No external service touched |
| Vercel CLI local build | NOT RUN | CLI not installed | Use `vercel dev`/`vercel build` after authorized installation |

| Canonical PostgreSQL schema build | PASS (code path) | `npm run build`, `tsc --noEmit` | Real database execution unavailable |
| JSON migration safety tool | PASS (static/build validation) | `scripts/migrate_json_to_postgres.ts` compiled by TypeScript/build | Dry-run against a real DB not executed |
| Docker disposable PG/Redis | BLOCKED | Docker engine access denied by environment | No external or production database touched |

Latest post-migration regression rerun: `npm run test:e2e` completed with `E2E Summary: 172 PASSED, 0 FAILED` (process duration 243.3 seconds), with 0 outbound network attempts and no project `.data` changes.

`npm run test:all`: PASS — unit 40/40, integration 221/221, E2E 172/172. `npm run test:persistence`: BLOCKED as designed because explicit disposable PostgreSQL/Redis variables were not provided.

Latest external verification: Neon PostgreSQL connection/SSL/read-only safety check **PASS**; database contained 0 user tables and 0 rows. Upstash Redis verification **BLOCKED before connection** because `PERSISTENCE_TEST_REDIS_URL` is not a valid `redis://` or `rediss://` URL. No database or Redis mutation was executed.
# AI audit regression update — 2026-11-17

| Test | Result | Evidence | Notes |
|---|---|---|---|
| AI unit tests | PASS | 14 AI-focused tests inside 41/41 unit tests | Includes direct custom-knowledge fallback regression |
| RAG unique-fact isolation | PASS | `scripts/test_rag_unique_fact.ts` | Temporary data directory; cleanup verified |
| Bilingual deterministic evaluation | PASS (deterministic only) | 50/50 strict cases; 50/50 concurrent calls | No network/provider calls; not a live LLM quality claim |
| Integration/security regression | PASS | 221/221 | Zero outbound network attempts under test guard |
| Full E2E | PASS | 172/172 | Test-only auth limiter prevents harness self-rate-limit |
| Full `test:all` | PASS | Command exited 0 | Unit + integration/security + E2E |
| Production build | PASS | `npm.cmd run build` | Vite + server bundle succeeded |
| TypeScript/lint | PASS with warnings | `npm.cmd run lint` | 0 errors, 120 warnings |
| Live LLM provider | BLOCKED | Not executed | Requires explicit authorized live call |
| Real embedding quality | BLOCKED | Current snapshot: 126 chunks, 0 embeddings | Requires explicit provider indexing |
| Vercel Preview | BLOCKED | Not deployed | Requires owner-controlled Vercel deployment |
