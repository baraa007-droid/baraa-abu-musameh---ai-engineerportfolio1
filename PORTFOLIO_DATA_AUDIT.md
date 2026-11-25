# Portfolio Data Audit

Date: 2026-11-17

## Scope and safety

This is a read-only audit of `.data/db.json`, the database access layer, and the RAG indexing path. No record was deleted, edited, merged, migrated, or reindexed. No AI provider, database, or embedding service was contacted.

## Data inventory

| Section | Records | RAG inclusion |
|---|---:|---|
| profile | 1 object | Yes |
| projects | 27 | Yes |
| services | 33 | Yes when `active !== false` |
| skills | 20 | Yes, grouped into 4 chunks |
| blog | 4 | Yes when published |
| experience | 2 | Yes |
| education | 52 | Yes |
| certificates | 3 | No direct chunk |
| courses | 53 | No direct chunk |
| testimonials | 3 | No direct chunk |
| messages | 113 | No |
| leads | 123 | No |
| knowledge | 3 documents | Yes when indexed |
| chunks | 126 | Retrieval source |
| conversations | 0 | No |
| ai_messages | 0 | No |
| events | 827 | No |
| insights | 2 | No |
| settings | 47 keys | No direct chunk |
| forms | 2 | No |
| methodology_steps | 18 | No direct chunk |
| principles | 18 | No direct chunk |
| architecture_nodes | 18 | No direct chunk |

The 23 top-level sections are preserved exactly as found. Operational sections such as messages, leads, events, and insights are not included in the RAG index.

## Projects

Five records appear to be the authored portfolio set, based on coherent case-study content, technologies, architecture, results, and stable IDs:

| ID | Title | Assessment |
|---|---|---|
| `proj-1` | NeuroDoc: Enterprise Multimodal RAG Assistant | KEEP, subject to owner confirmation |
| `proj-2` | OmniStore: Autonomous AI-Driven E-Commerce Platform | KEEP, subject to owner confirmation |
| `proj-3` | VisionPulse: Real-Time Edge Computer Vision & Analytics | KEEP, subject to owner confirmation |
| `proj-4` | CloudFlow: Intelligent Agent Workflow Orchestrator | KEEP, subject to owner confirmation |
| `proj-5` | SaaSMetrics Pro: Predictive Subscription Platform | KEEP, subject to owner confirmation |

Twenty-two records are high-confidence test or placeholder records. They have repeated titles/slugs and test descriptions:

| Group | Count | IDs | Reason |
|---|---:|---|---|
| Gallery Test Project | 12 | `proj-1790537625931`, `proj-1790536959993`, `proj-1790512669070`, `proj-1790511595170`, `proj-1790510564521`, `proj-1790498775448`, `proj-1790497891927`, `proj-1790494060816`, `proj-1790492507971`, `proj-1789327892844`, `proj-1789327532355`, `proj-1789326958506` | Exact repeated title and slug; description is `Test project with gallery` |
| Automated Test Project | 10 | `proj-1788170913858`, `proj-1787859760159`, `proj-1787859362690`, `proj-1787859126486`, `proj-1787858403584`, `proj-1787645671455`, `proj-1787644362108`, `proj-1787556804905`, `proj-1787555410158`, `proj-1787415098125` | Test title/slug and description says it was built during an automated test run |

## Services

Six records appear to be the authored service catalog:

`srv-1` AI Solutions & Custom Agents, `srv-2` Full-Stack Web Applications, `srv-3` Modern E-Commerce Platforms, `srv-4` Business Websites & Landing Pages, `srv-5` Intelligent Workflow Automation, and `srv-6` Blogs & Content Platforms.

Suspicious service records:

| Group | Count | IDs | Reason |
|---|---:|---|---|
| Enterprise RAG Custom Package | 14 | `srv-1788176909463`, `srv-1789326531667`, `srv-1789326954788`, `srv-1789327529567`, `srv-1789327887257`, `srv-1790492504215`, `srv-1790494057489`, `srv-1790497889531`, `srv-1790498772854`, `srv-1790510561767`, `srv-1790511591610`, `srv-1790512666603`, `srv-1790536952495`, `srv-1790537621157` | Same title and repeated generated IDs; likely repeated test CRUD records; requires owner confirmation before removal |
| SEO Optimized Service | 12 | `srv-1789326960426`, `srv-1789327534040`, `srv-1789327895637`, `srv-1790492512576`, `srv-1790494062716`, `srv-1790497893360`, `srv-1790498776894`, `srv-1790510566109`, `srv-1790511596586`, `srv-1790512670479`, `srv-1790536963249`, `srv-1790537628491` | Exact repeated title/slug and description says `Testing SEO fields on service.` |
| Unclear placeholder | 1 | `srv-1787560641424` | Title and description are one-character/placeholder values; high-confidence review candidate |

## Knowledge documents and chunks

The three indexed documents are:

- `know-1`: Baraa Abu Musameh — Profile & Core Expertise
- `know-2`: Services Catalog & Pricing Guide
- `know-3`: Projects & Engineering Portfolio

The current 126 chunks are composed of: profile 1, services 33, projects 27, skills 4, blog 4, experience 2, education 52, and custom knowledge 3. No stored embeddings are present.

The indexing code in `server/db.ts` includes every active service and every project without a test-data or publication filter. Consequently, all 22 suspicious projects and all 27 suspicious services can enter RAG. The existing chunks also include the public profile email; messages, leads, events, insights, conversations, and AI message history are not indexed.

## Gemini request construction

The actual SDK path in `server/ai.ts` is structurally valid:

- User messages are mapped to Gemini `role: "user"`.
- Assistant history is mapped to Gemini `role: "model"`.
- The current user message is appended after history.
- The system instruction is passed through `config.systemInstruction`.
- The question is not removed by local preprocessing.

The controlled Gemini REST request also contained the question in `contents[0].parts[0].text` and returned HTTP 200. Therefore the “question was not present” response is not explained by a confirmed local empty-message or role-mapping defect. The more likely explanation is model response quality/context interpretation, but this remains an inference rather than a proven provider diagnosis. No additional live request was made.

## Security observations

The RAG builder does not include private operational collections or credentials. The profile chunk intentionally contains a public contact email. The profile object also contains a phone field, but the current profile chunk does not include that phone field. Custom knowledge documents are administrator-controlled and should be reviewed before indexing because the indexer trusts their contents when `status === "indexed"`.

## Read-only conclusion

The local snapshot is not clean enough for reliable public RAG. The five authored projects and six authored services are distinguishable from high-confidence test data, but the proposed cleanup requires owner approval and a backup before any mutation.

