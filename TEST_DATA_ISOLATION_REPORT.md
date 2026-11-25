# Test Data Isolation Report

## Findings

Historical pollution came from scripts that created CRUD records while using the real `.data` path. In particular, `scripts/test_json_persistence.ts` directly targeted `.data/db.json`.

The main current suites already use isolated temporary directories:

- `scripts/run_tests.ts` creates `portfolio-test-*` under the OS temp directory and hashes the project `.data` before/after.
- `scripts/e2e_isolated.ts` creates `portfolio-e2e-*`, clears external credentials, blocks outbound network, and verifies the project `.data` hash is unchanged.
- Unit setup rejects the project `.data` directory under `NODE_ENV=test`.

## Local repair

`scripts/test_json_persistence.ts` now sets a temporary `DATA_DIR`, dynamically imports the database after isolation is configured, refuses the project `.data` path, and removes only its temporary directory.

## Verification evidence

- Isolated JSON persistence check: PASS; create/read/delete occurred only in a temporary directory.
- Integration/security suite: PASS, 221/221.
- E2E suite: PASS, 172/172.
- E2E network guard: 0 outbound attempts.
- E2E project `.data` hash check: unchanged.
- Original source hash after candidate generation and test runs: `562d95a43cc345271c1c02828544141e6e3c84485d379a355159dff024cd560`.
- Backup hash: matches source.

## Remaining protection

`scripts/migrate_json_to_postgres.ts` remains an explicitly controlled migration tool. It was not executed. Future migrations must use the candidate path explicitly, run dry-run validation first, and require explicit destination confirmation and mutation flags.

