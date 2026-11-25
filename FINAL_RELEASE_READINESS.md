# Final Release Readiness

**Verdict: the code is a verified release candidate, but the deployment is NOT production-ready until the owner completes the critical actions in [OWNER_ACTIONS_REQUIRED.md](OWNER_ACTIONS_REQUIRED.md)** — above all rotating the compromised `ADMIN_PASSWORD`, closing LAN exposure and redeploying (the live containers still run the August code). No known critical or high defect remains in the code itself. Full evidence: [FINAL_VERIFIED_PROJECT_STATUS.md](FINAL_VERIFIED_PROJECT_STATUS.md).

## Validation pipeline (final run on the final code, 2026-11-05)
| Step | Command | Result |
|---|---|---|
| TypeScript strict | `npx tsc --noEmit` | **0 errors** |
| ESLint | `npx eslint server src server.ts tests` | **0 errors**, 120 warnings (106 `no-explicit-any`, 14 unused variables; 0 React Hooks warnings) |
| Unit + render + AI mocks | `npm run test:unit` | **40 passed, 0 failed, 0 skipped** |
| Integration / security / API (incl. cookie + CSRF suite) | `npm test` | **221 passed, 0 failed, 0 skipped** |
| Browser E2E (Playwright) | `npm run test:e2e` | **172 passed, 0 failed, 0 skipped** |
| Production build | `npm run build` | OK — main JS 462 kB (gzip 136 kB), `dist/server.cjs` 292 kB |
| Production smoke | built bundle, `NODE_ENV=production`, temp data, `.env` blanked, network blocked | **11/11**: `/` 200 + CSP, main + lazy chunks, deep link, JSON 404, private settings hidden, cookie flags, CSRF 403/200, `SESSION_COOKIE_SECURE` warning, 0 outbound attempts |
| Deployment dry run | `bash scripts/dryrun/run-dryrun.sh` (own compose project, test passwords, removed afterwards) | **39/39** — incl. production cookie/CSRF over shared Redis, HTTPS behind a proxy, credential rotation with Redis-persisted sessions; live containers and volumes unchanged |
| Dependency audit | `npm audit` / `npm audit --omit=dev` | 8 moderate (dev lint tooling only), 0 high, 0 critical / **production tree: 0** |
| Isolation | every suite | outbound network attempts 0; `.data` hashes identical to the pre-change record |

## Release checklist
- [x] All automated suites green on the final code.
- [x] Cookie authentication + per-session CSRF verified in-process (60 checks), in the browser (11 checks), in the production bundle and in production containers.
- [x] All 18 admin tabs exercised in a browser, desktop and 390 px (see [ADMIN_TEST_MATRIX.md](ADMIN_TEST_MATRIX.md)).
- [x] Public pages, forms, CTA, prefill, content filtering, error states, mobile overflow checked in a browser.
- [x] Backups verified; backup/restore/rollback rehearsed on test data (BACKUP_RESTORE.md).
- [ ] **Owner:** rotate `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (restart all instances together).
- [ ] **Owner:** `BIND_ADDRESS=127.0.0.1` or firewall (G0).
- [ ] **Owner:** set `POSTGRES_PASSWORD`/`REDIS_PASSWORD`; migrate container JSON to volumes; choose `PG_SYNC_MODE`; then redeploy.
- [ ] **Owner:** HTTPS reverse proxy + `TRUST_PROXY=1` + `SESSION_COOKIE_SECURE=true`.
- [ ] **Owner:** confirm or clear `ai_model`; optional real embeddings (paid).

## How to run the full pipeline
```bash
npm ci
npx tsc --noEmit && npx eslint server src server.ts tests
npm run test:all          # unit + integration + browser E2E, all isolated
npm run build
bash scripts/dryrun/run-dryrun.sh   # needs Docker; never touches the live stack
```
