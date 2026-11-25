# Clean Preview Dataset Plan

Status: prepared but inactive. No migration, activation, deletion, or database mutation was performed.

## Candidate files

- Source: `.data/db.json`
- Backup: `.data/backups/db-2026-11-17T21-08-10-968Z.json`
- Candidate: `.data/preview-candidate/db.json`
- Review manifest: `.data/preview-candidate/REVIEW_MANIFEST.json`

The backup SHA-256 matches the source SHA-256: `562d95a43cc345271c1c02828544141e6e3c84485d379a355159dff024cd5600`.

## Candidate classification

- Superseded by the real-project review: Candidate now retains only `proj-real-ai-portfolio` (1 locally verified project).
- Retained: `srv-1` through `srv-6` (6 services).
- Excluded from public candidate: 12 Gallery Test Project records and 10 Automated Test Project records.
- Excluded from public candidate: 12 SEO Optimized Service records.
- Review-only: 14 Enterprise RAG Custom Package records, the one-character placeholder service, and all three knowledge documents.
- The former fictional project cards and their related published testimonials are excluded from Candidate; see `REAL_PROJECTS_REPLACEMENT_REPORT.md`.
- Candidate knowledge/chunks: empty until approved data review and a deliberate reindex.
- Historical private operational arrays are empty in the candidate; the original source retains them unchanged in the backup.

## Activation gates

1. Owner confirms the one verified project and six services.
2. Owner decides the fate of the review-only services and knowledge documents.
3. A fresh backup and dry-run validation are performed.
4. Approved candidate is reindexed and checked for duplicate IDs, slugs, and public/private field boundaries.
5. Preview PostgreSQL destination is explicitly confirmed before any migration.

See [PORTFOLIO_DATA_CLEANUP_PLAN.md](C:\baraa-abu-musameh---ai-engineerportfolio\PORTFOLIO_DATA_CLEANUP_PLAN.md) for the record-level proposal.
