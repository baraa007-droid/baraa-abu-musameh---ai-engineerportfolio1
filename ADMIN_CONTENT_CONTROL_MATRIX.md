# Admin Content Control Matrix

This matrix describes the CMS controls currently implemented locally. It does not authorize migration, activation, reindexing, or deletion of source data.

| Area | Admin controls | Public visibility/control | RAG impact | Current limitation |
|---|---|---|---|---|
| Profile | Edit identity, bio, contact, focus areas, availability, metrics, avatar, GitHub/LinkedIn/X/resume URLs | Public profile fields are served by the public API | Included in profile-derived knowledge when indexing runs | Metrics are editable values, but have no provenance or per-metric visibility switch |
| Projects | Create/edit/delete; descriptions, technologies, features, results, category, URLs, SEO, gallery, featured, published, order | Unpublished records are excluded from public list/detail routes | Only published projects are indexed by the reindex path | Images are URLs/inline data, not durable object-storage uploads |
| Services | Create/edit/delete; descriptions, price, currency, timeline, features, technologies, deliverables, process, FAQ, active, order | Inactive services are excluded from public routes; price/currency verified in public sync test | Only active services are included in public/RAG paths | No external media upload integration |
| Skills | Create/edit/delete; category, proficiency, years, featured, order | Served publicly; `featured` is emphasis, not visibility | Skills can be used by the knowledge builder | No explicit hidden flag |
| Experience | Replace/edit/delete list; role, company, dates, achievements, technologies, published, order | Unpublished entries are excluded from public routes | Only published experience is indexed | No field-level privacy policy beyond published flag |
| Education & certificates | Add/edit/delete; publication/order; certificate description, credential URL, badge URL | Unpublished entries are excluded from public routes | Published records can be indexed | URLs are validated, but external credentials are not verified here |
| Blog | Existing CRUD, draft/published state, Markdown, tags, SEO, cover URL | Drafts are excluded from public blog routes | Published posts are knowledge candidates | No object-storage media workflow |
| Settings | Site basics, SEO, CTA, maintenance, feature flags, notification switches | Public settings omit private notification routing | Not a general knowledge source | No section-level visibility editor; some visual copy remains component-owned |
| Methodology/principles/hero nodes | CRUD, enabled state, order/content as supported by their tabs | Enabled records are public | Can be indexed when supported by the knowledge builder | No universal section visibility model |
| Forms | Form configuration and active state | Active form determines public availability | Not normally indexed | Provider delivery still requires external configuration |
| Leads/messages/analytics | Admin-only review, status, notes, delete where supported | Never public | Must never enter public RAG | Durable cross-instance persistence requires production database setup |
| AI/RAG knowledge | Knowledge document CRUD and admin reindex endpoint | Admin-only management | Reindex now excludes unpublished projects/experience/education and inactive services | Embeddings require configured provider; no reindex was run in this phase |
| Media | Avatar inline image; project/blog image URL fields | Public only through referenced content | Media itself is not embedded | No S3/R2/Vercel Blob integration; local filesystem is not durable on Vercel |
| Metrics | Profile metrics and project result strings are editable | Public wherever the parent record is public | Can become model context | No verified-source/provenance field; do not publish unverified claims |

## Storage qualification

The local CMS and all automated tests use an isolated JSON store. The repository also contains an optional PostgreSQL mirror/synchronization implementation, but this phase did not migrate data or prove every CMS write against PostgreSQL across Vercel instances. Therefore the CMS is functionally implemented locally, not yet proven as a PostgreSQL-canonical production CMS.
