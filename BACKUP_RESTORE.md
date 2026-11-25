# Backup & Restore

## What holds data

| Location | Contents | Notes |
|---|---|---|
| `.data/db.json` (host, `npm run dev`/`npm start`) | Everything: content, settings, messages, leads, knowledge, analytics | Primary store. |
| `/app/.data/db.json` in **each** app container | Same, per container | Lost when the container is recreated unless volumes are used (see DEPLOYMENT.md). app-a and app-b differ. |
| PostgreSQL (`postgres_data` volume) | Mirror of content + messages/leads written while PG was connected | Some records exist only here. |
| Redis | Admin sessions (with their CSRF tokens) and rate-limit counters only | No backup needed; losing it only signs admins out. |
| `.env` | Secrets | Back up separately and encrypted; never next to shareable backups. |
| `.data/db.seed.json` | Operator seed used only when `db.json` is missing | Contains real records and `maintenance_mode: true`. |

## Taking a backup

### Host JSON
```bash
ts=$(date -u +%Y%m%dT%H%M%SZ); dest=~/Project-Backups/manual-$ts; mkdir -p "$dest"
cp .data/db.json "$dest/db.json"
node -e "JSON.parse(require('fs').readFileSync('$dest/db.json','utf8'))" && echo "JSON ok"
sha256sum .data/db.json "$dest/db.json"     # both hashes must match
```

### Container JSON (read-only for the container)
```bash
docker cp baraa-portfolio-app-a:/app/.data/db.json "$dest/app-a.db.json"
docker cp baraa-portfolio-app-b:/app/.data/db.json "$dest/app-b.db.json"
docker exec baraa-portfolio-app-a sha256sum /app/.data/db.json   # compare with the copy
```

### PostgreSQL (custom-format dump)
```bash
docker exec baraa-portfolio-postgres pg_dump -U postgres -d portfolio_db -Fc -f /tmp/portfolio.dump
docker exec baraa-portfolio-postgres pg_restore --list /tmp/portfolio.dump | grep -c "TABLE DATA"
docker cp baraa-portfolio-postgres:/tmp/portfolio.dump "$dest/portfolio.dump"
docker exec baraa-portfolio-postgres rm -f /tmp/portfolio.dump
```
`pg_restore --list` only proves the archive is readable; it is **not** a restore test.

The approved Windows script that does all of the above with manifests and before/after checks is `C:\Users\Ahed\Downloads\phase01-review\phase01-backup.ps1` (SHA-256 `0fb12ae2…4a722`). It writes `SHA256SUMS.txt` with CRLF line endings; on Git Bash verify with:
```bash
tr -d '\r' < SHA256SUMS.txt | sha256sum -c -
```

## Existing backups (verified 2026-11-05)

| Path | What | Verified |
|---|---|---|
| `C:\Users\Ahed\Project-Backups\phase0.1-20261104T125959Z` | Both container JSON files, PG dump (16 tables), Recycle-Bin copies of older project versions, manifests | STATUS `SUCCESS`, 347/347 checksums OK; on 2026-11-05 the live container `db.json` files still hash **identical** to the copies in this backup |
| `C:\Users\Ahed\Project-Backups\pre-change-20261104T1320Z\project-src-and-data.tar` | Source + host `.data` + `.env` **before** the changes | SHA256SUMS, extraction test of `db.json`; host `.data` still identical to `data-hashes-before-changes.txt` |
| `C:\Users\Ahed\Project-Backups\pre-change-20261104T1320Z\changes.git` | Local git history of every change (2026-11-04 and 2026-11-05), one commit per batch; not pushed anywhere | `git log` lists 21 commits (baseline → G6) |
| October backup (see phase 0.1 manifests) | Full project copy | Identical to the project as of 2026-11-04 13:18Z (13,123 files) |

The backup → restore → rollback cycle (pg_dump, restore into a scratch database, container JSON copy-out, JSON rollback) is rehearsed on **test data** by `bash scripts/dryrun/run-dryrun.sh` (steps 6–7).

## Restoring

Always take a fresh backup of the current state first; restore into a copy before touching production.

### Host JSON
```bash
# stop the server first
cp .data/db.json .data/db.before-restore.json
cp /path/to/backup/db.json .data/db.json
node -e "JSON.parse(require('fs').readFileSync('.data/db.json','utf8'))" && npm start
```
If the server refuses to start with "Database file is unreadable", the file is corrupt: the server has already saved `db.corrupt-*.json` and left `db.json` untouched — restore a good copy as above.

### PostgreSQL — test into a scratch database first
```bash
docker exec baraa-portfolio-postgres createdb -U postgres restore_test
docker cp portfolio.dump baraa-portfolio-postgres:/tmp/portfolio.dump
docker exec baraa-portfolio-postgres pg_restore -U postgres -d restore_test --no-owner /tmp/portfolio.dump
docker exec baraa-portfolio-postgres psql -U postgres -d restore_test -c "select count(*) from portfolio_messages"
# only after checking the counts: restore into portfolio_db during a maintenance window
```

### Code rollback
All changes (2026-11-04 and 2026-11-05) are recorded commit-by-commit outside the project:
```bash
export GIT_DIR="C:/Users/Ahed/Project-Backups/pre-change-20261104T1320Z/changes.git"
git log --oneline                # list the batches
git diff <commit>~1 <commit>     # inspect one batch
git checkout <commit> -- <file>  # restore one file to that batch's version
unset GIT_DIR
```
To return everything to the pre-change state, extract `project-src-and-data.tar` into an **empty** folder and copy the needed files back (do not extract over the live `.data`).
