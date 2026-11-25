# Admin CMS Test Results

## Verification matrix

| Test | Result | Evidence | Notes |
|---|---|---|---|
| TypeScript + ESLint | PASS | `npm.cmd run lint` | No errors; warnings are not build blockers in this run |
| Unit tests | PASS | `npm.cmd run test:unit` → 49 passed, 0 failed | Includes AI fallback, security, rendering, storage, and DB safety tests |
| Integration/security suite | PASS | `npm.cmd test` → 221 passed, 0 failed | Outbound network guard passed; project `.data` unchanged |
| Full E2E suite | PASS | `npm.cmd run test:e2e` → 172 passed, 0 failed | Includes admin CRUD, publication toggles, failure recovery, mobile checks, auth/CSRF |
| Isolated Admin → public synchronization | PASS | `node --require ./scripts/test-guard.cjs --import tsx scripts/test_cms_public_sync.ts` | Project publish/hide, service price/currency, profile metrics, and certificate update verified with temporary `DATA_DIR`; source `.data` untouched |
| Production build | PASS | `npm.cmd run build` | Vite and bundled Express server completed successfully |
| Project/service CRUD | PASS | E2E CRUD phase | Create/update/delete verified in isolated test data |
| Skills/experience/certificates CRUD | PASS | E2E CRUD phase | Skills and experience fixes were retested in the clean 172-test run |
| Public visibility filtering | PASS | E2E toggles + integration coverage | Inactive/unpublished records are not returned on public paths |
| AI fallback content safety | PASS | Unit tests + integration/security tests | Excluded fictional fallback claims are not fabricated |
| Real PostgreSQL CMS writes | IMPLEMENTED — LIVE TESTING REQUIRED | Not run in this CMS phase | No migration or external database mutation authorized; local JSON path was the isolated durable store |
| Real Redis session/rate-limit multi-instance test | BLOCKED | Not run in this CMS phase | Previous connectivity checks do not prove full CMS deployment behavior |
| Real embedding/reindex verification | NOT RUN | Deliberately not executed | Requires approved content and provider configuration |
| Vercel Preview deployment | NOT RUN | No remote deployment authorized | Requires manual project/environment configuration |

## Latest regression evidence

- `npm.cmd run test:unit`: PASS, 49/49.
- `npm.cmd test`: PASS, 221/221; outbound network guard reported 0 attempts and `.data` unchanged.
- `npm.cmd run test:e2e`: PASS, 172/172; outbound network guard reported 0 attempts and `.data` unchanged.
- `npm.cmd run build`: PASS.
- `npm.cmd run lint`: PASS with 0 errors and 120 warnings.
- `.data/db.json` SHA-256 remained `562d95a43cc345271c1c02828544141e6e3c84485d379a355159dff024cd560`.

The first E2E rerun exposed a real profile-save defect: legacy `resume_url="#"` failed native URL validation and prevented the PUT request. The profile form now treats that placeholder as empty; the clean rerun passed 172/172.

## Regression note

The first post-change E2E run found three defects (skills form validation and hidden experience visibility, plus a test expectation tied to excluded fictional content). They were repaired or corrected to the approved data model. The clean rerun completed with 172/172 passing.

## Safety constraints honored

- No production deployment or Git push.
- No migration, database schema mutation, reindex, or embedding generation.
- No modification or deletion of `.data/db.json`.
- No live AI provider requests.
