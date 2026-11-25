# Admin CMS Acceptance Verification

Date: 2026-11-18

## Decision

**READY FOR PREVIEW TESTING WITH EXTERNAL CONFIGURATION REQUIRED**.

The CMS is functionally verified against isolated local runtime data. Preview deployment still requires external PostgreSQL-canonical persistence, Redis multi-instance verification, and an approved durable object-storage solution if binary uploads are required.

## Verification matrix

| Section | Admin UI | CRUD | Public Sync | Persistence | Status |
|---|---|---|---|---|---|
| Projects | Full editor: content, tech, features, metrics, links, gallery, publish, featured, order | Create/edit/delete verified by E2E | Publish/hide verified by `test_cms_public_sync.ts` | Local isolated store PASS; PostgreSQL cross-instance not run | VERIFIED LOCALLY |
| Services | Full editor including price, currency, timeline, visibility, order | Create/edit/delete verified by E2E | Price/currency and active toggle verified | Local isolated store PASS; PostgreSQL cross-instance not run | VERIFIED LOCALLY |
| Certifications | Dates, issuer, credential URL, description, badge URL, publish/order | Create/edit/delete verified by E2E | Isolated certificate update verified | External credential URLs not live-verified | VERIFIED LOCALLY |
| Skills / experience / education | Editors expose content, ordering and publication where supported | CRUD/update flows verified by E2E | Public filtering verified by integration/E2E | PostgreSQL canonical path not run | VERIFIED LOCALLY |
| Profile | Identity, bio, contact, metrics, availability, avatar, social/resume URLs | Update verified by E2E | Headline, bio and metrics verified by isolated sync | Avatar is inline data; no object storage | VERIFIED LOCALLY |
| Numerical statistics | Profile metric fields are editable and displayed | Update verified | Profile metric sync verified | No provenance or per-metric visibility | PARTIALLY IMPLEMENTED |
| Blog / articles | Content, tags, cover URL, SEO, draft/published | CRUD and publish verified by E2E | Draft filtering and publish visibility verified | No durable binary media workflow | VERIFIED LOCALLY |
| Site settings | Site, SEO, CTA, maintenance, feature switches, notifications, AI model | Update and failure handling verified | Public settings behavior verified locally | No section-level visibility editor | PARTIALLY IMPLEMENTED |
| Media | Avatar crop and URL fields | Avatar update verified | Avatar is returned publicly | No durable upload/replacement/delete storage; URLs are metadata | PARTIALLY IMPLEMENTED |
| AI / knowledge | Knowledge CRUD and reindex status controls | Local document CRUD verified | Public filtering is tested; embeddings/reindex intentionally not run | Live vector persistence not verified | IMPLEMENTED — LIVE TESTING REQUIRED |
| PostgreSQL CMS persistence | API contracts exist | Not mutated in this phase | Not verified on Neon | Requires canonical production path and migration approval | IMPLEMENTED — LIVE TESTING REQUIRED |
| Redis sessions / limits | Security controls exist | Prior connectivity passed | Multi-instance CMS behavior not run here | Requires live multi-instance test | IMPLEMENTED — LIVE TESTING REQUIRED |

## Actual fixes in this acceptance pass

- Added service currency editing and rendered it in public service/AI views.
- Added editable profile social and resume URL controls.
- Made the Home hero use editable profile headline, bio, availability, and latency instead of fixed business claims when values exist.
- Fixed profile save blocking caused by the legacy `resume_url="#"` placeholder in a native URL input.
- Added and passed an isolated public synchronization test covering project publish/hide, service price/currency, profile metrics, and certificate updates.

## Evidence

- Unit: `npm.cmd run test:unit` — 49/49 PASS.
- Integration/security: `npm.cmd test` — 221/221 PASS.
- E2E: `npm.cmd run test:e2e` — 172/172 PASS.
- Build: `npm.cmd run build` — PASS.
- Lint: 0 errors, 120 warnings.
- CMS sync: `node --require ./scripts/test-guard.cjs --import tsx scripts/test_cms_public_sync.ts` — PASS.
- Source `.data/db.json` was not modified; SHA-256 remained `562d95a43cc345271c1c02828544141e6e3c84485d379a355159dff024cd560`.

## Remaining gaps and hardcoded values

- `src/components/hero/HeroArchitectureVisual.tsx` contains static fallback architecture nodes and technical metrics when no admin nodes exist; this is a technical fallback and still includes business-like claims.
- `src/components/layout/Footer.tsx` and `src/components/layout/GlobalCTA.tsx` contain generic UI fallback copy; settings can override much of it, but there is no complete section-copy editor.
- `src/components/ai/FloatingAIAssistant.tsx` contains a fixed introductory claim about verified knowledge; it should be reviewed before public content approval.
- `settings.social_links` supports additional networks such as Kaggle/Hugging Face in the data model, but the current UI does not expose dedicated controls for every network.
- There is no section-level visibility control for every homepage section.
- Project/blog/service images are URL fields, and avatar images are stored as inline base64 data. Durable uploads require approved object storage; Vercel local filesystem cannot be treated as durable.
- The source snapshot still contains legacy/test/fictional-looking records. It was intentionally preserved. Cleanup, merge, Candidate activation, migration, and reindex require explicit content approval.
- Public/RAG filtering excludes unpublished/inactive records during reads/rebuilds, but existing knowledge chunks do not change until an approved reindex and embedding process runs.

## External verification still required

1. Configure and verify PostgreSQL as the canonical Preview store without using the JSON fallback.
2. Verify Redis-backed sessions and shared rate limiting across multiple function instances.
3. Choose/configure durable object storage if media uploads must be managed from the CMS.
4. Perform a real Vercel Preview test for login, CMS writes, refresh, public visibility, and AI/RAG behavior.
5. Approve content cleanup before reindexing or generating embeddings.

No migration, reindex, embedding generation, live AI request, deployment, or production data mutation was performed.
