# Portfolio Data Review

The review is based on the unmodified `.data/db.json` snapshot.

| Area | Current | Candidate | Decision |
|---|---:|---:|---|
| Projects | 27 | 1 | Fictional project cards excluded; one locally verified project retained |
| Services | 33 | 6 | 12 SEO duplicates excluded; 14 RAG package records and one placeholder remain review-only |
| Knowledge documents | 3 | 0 | All require content and ownership review before indexing |
| Knowledge chunks | 126 | 0 | Candidate intentionally has no stale chunks; projected post-review count is documented separately |
| Stored embeddings | 0 | 0 | No embedding generation performed |

## Review-only groups

- `Enterprise RAG Custom Package`: 14 repeated records; not automatically classified as fake.
- `srv-1787560641424`: one-character placeholder-like service; owner decision required.
- `know-1`, `know-2`, `know-3`: review for claims, pricing, contact fields, and duplicate content before reindexing.

The full ID lists and reasons are in [PORTFOLIO_DATA_AUDIT.md](C:\baraa-abu-musameh---ai-engineerportfolio\PORTFOLIO_DATA_AUDIT.md).
