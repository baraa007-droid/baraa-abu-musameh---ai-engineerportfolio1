# Portfolio Data Cleanup Plan

This is a proposal only. No action in this document has been applied.

## Approval matrix

| Record ID / group | Name | Problem | Proposed Action | Risk | Approval Required |
|---|---|---|---|---|---|
| `proj-1`..`proj-5` | Five authored case studies | Coherent portfolio records, but authorship was not externally verified in this audit | KEEP; owner confirms titles, claims, links, dates, and metrics | Incorrect public claim if not confirmed | Yes |
| 12 listed Gallery IDs | Gallery Test Project | Exact duplicate title/slug and explicit test description | PROPOSED REMOVE after owner confirmation | Removing a record later found to be real | Yes |
| 10 listed Automated Test IDs | Automated Test Project | Explicit automated-test description and duplicate title | PROPOSED REMOVE after owner confirmation | Same as above | Yes |
| 14 listed Enterprise RAG IDs | Enterprise RAG Custom Package | Exact repeated service title; likely CRUD test residue | PROPOSED MERGE or REMOVE; preserve one only if owner confirms it is a real service | Could remove pricing/content the owner wants | Yes |
| 12 listed SEO IDs | SEO Optimized Service | Exact repeated slug/title and explicit SEO test description | PROPOSED REMOVE | Could remove a legitimate SEO offering if misclassified | Yes |
| `srv-1787560641424` | One-character placeholder | Unusable title/description | PROPOSED REMOVE or REVIEW | Could be an intentional Arabic-named service, although current content is not meaningful | Yes |
| `know-1` | Profile & Core Expertise | Includes public contact email and claims/metrics | KEEP after owner verifies claims; consider excluding contact fields from generic RAG | Contact disclosure or unsupported claim risk | Yes |
| `know-2` | Services Catalog & Pricing Guide | May duplicate service records and include stale pricing | REVIEW and regenerate after service cleanup | Stale prices or duplicate answers | Yes |
| `know-3` | Projects & Engineering Portfolio | May duplicate project records and include stale project facts | REVIEW and regenerate after project cleanup | Stale or conflicting facts | Yes |
| All custom knowledge documents | Administrator-authored documents | Content is trusted for indexing when marked indexed | REVIEW each document before future indexing | Private or unsupported content entering public RAG | Yes |

## Proposed groups

### KEEP

- `proj-1` through `proj-5`, pending owner verification.
- `srv-1` through `srv-6`, pending owner verification.
- The three knowledge document identities, pending content review.
- Skills, experience, blog, and education records unless a separate content review finds errors.

### REVIEW

- All five authored projects for factual accuracy, public URLs, metrics, and dates.
- All six authored services for prices, timelines, availability, and duplicate claims.
- The three knowledge documents for consistency with the final project/service records.
- Profile claims, especially project count, satisfaction metrics, and experience duration.
- Testimonials and public contact details for intentional publication.

### PROPOSED REMOVE / MERGE

- Remove the 22 explicit test projects after approval.
- Remove the 12 SEO test services after approval.
- Remove or merge the 14 repeated Enterprise RAG records after approval.
- Remove or replace `srv-1787560641424` after approval.

## Expected RAG impact

If only the 22 project test records and 27 suspicious service/placeholder records are removed, and all other records remain unchanged, the generated chunk count is expected to fall from 126 to approximately **77**:

- 126 current chunks
- minus 22 project chunks
- minus 27 service chunks
- equals 77 projected chunks

This is a projection, not an executed result. It assumes no knowledge document or other public record is changed.

## Safe execution and rollback plan for a future approved cleanup

1. Stop application writes and record the current file hash and counts.
2. Copy `.data/db.json` to a timestamped, access-controlled backup outside the application data path.
3. Export the proposed IDs and their complete records into a review artifact.
4. Apply only the approved ID-specific changes; never delete by title alone.
5. Run schema validation, slug/reference checks, and a diff against the backup.
6. Rebuild chunks only after approval; do not generate embeddings automatically.
7. Verify public pages, admin CRUD, RAG retrieval, and the projected counts.
8. Roll back by restoring the verified backup if any data, relationship, or test regression appears.

No backup, deletion, merge, migration, or reindex was performed during this audit.

