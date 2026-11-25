# AI / RAG Status

_All statements below were verified with local tests and mock providers (`tests/unit/ai.test.ts`, 14 AI-focused tests; `npm test`). No paid or real AI request was made, ever, during this work._

## Independent audit update — 2026-11-17

The complete AI audit is in `AI_ASSISTANT_FULL_AUDIT.md`. The direct custom-knowledge fallback grounding defect and the remaining bilingual fallback intent defects were fixed and covered by unit regressions. AI/search analytics now store only query length and a SHA-256 fingerprint. Current local data still has 126 chunks and 0 embeddings; real provider answer quality and vector-index generation remain unverified until an authorized live provider operation is performed.

## Current production data
- **126 knowledge chunks, 0 with embeddings** (`.data/db.json`, read-only check). Retrieval on the real data is therefore **keyword-only** today; the admin Knowledge tab and `GET /api/knowledge` report `retrievalMode: keyword`. Vector search has been verified only with mock embeddings — it is **not** claimed to work on the real data until real embeddings exist.
- 3 custom knowledge documents.
- `settings.ai_model` = `"gemini-3.7-flash"` (see "Model setting" below).

## What is implemented and tested
| Area | Status | Evidence |
|---|---|---|
| Knowledge document CRUD | add → paragraph chunking → listed → delete | E2E (UI) + integration |
| Chunking | Profile, services (active only), projects, skills, published blog posts, experience, education, custom docs (one chunk per paragraph) | unit/E2E |
| Embedding persistence | Unchanged chunks keep their vectors across re-index (content hash); edited chunks lose theirs | unit `reindex keeps embeddings…` |
| Incremental embedding | Re-index sends only chunks without vectors, one background pass at a time, stops after 3 provider failures, saves every 10 | code + integration (no-provider path) |
| Vector similarity / ranking | Hybrid score `0.75·cosine + 0.25·keyword` on one scale; query embedded only if stored vectors exist | unit (mock vectors) |
| Semantic search | Uses stored item vectors; `vectorMatch` true only when they were used; inactive services excluded; no unrelated "matches" | unit + integration |
| Arabic/English normalization | Alef forms, taa marbuta, alef maqsura, Persian yeh/keheh, hamza carriers, diacritics, tatweel | unit |
| Chat input/history | message ≤ 4000 chars; history ≤ 50 items, last 6 kept, each ≤ 2000 chars, roles whitelisted | integration |
| Tool calling | **Two-step**: tool results are sent back to the model once for the final answer (bounded to one extra call; on failure the direct tool output is used). Tools: `searchProjects`, `searchServices` (active only), `getProfile` (stored data), `generateProjectBrief` (no invented budget) | unit `tool calling is two-step…` |
| Model configuration (`ai_model`) | **Wired.** Settings validate the id format (`provider/name` for OpenRouter, `gemini-…` for Gemini; empty = defaults). A value is applied only to the provider it belongs to; if that provider rejects the model, the call is retried once with the default model and the id is skipped for 10 minutes | unit `ai_model: …` + integration S27 |
| Provider fallback | OpenRouter ↔ Gemini cascade; when both fail the answer is built from stored data and flagged `degraded: true` with a visible note | unit + integration |
| Timeouts | Gemini calls aborted via `AbortSignal` (8 s chat/JSON, 10 s embeddings); OpenRouter `AbortSignal.timeout` | unit `withAbortTimeout` |
| Token/cost control | 15 AI req/min/IP, input caps, query embedding skipped without vectors, paid embedding only on explicit admin action | code + tests |
| Prompt-injection boundaries | Visitor text fenced as JSON data; contact details not sent to the model; **intent-based** security and unknown-fact gates (replaced keyword lists that blocked legitimate how-to questions); output redaction | unit (2 gate tests, 10 cases) + integration |
| Blog assistant | Server action whitelist; 503 instead of canned text; admin-only (cookie + CSRF) | unit + integration + E2E |
| Project advisor | Output validated; fallback built from published services, labelled `fallback_template` | unit + integration |
| Lead qualification | Background, clamped scores, honest rule-based fallback (states unknown budget/timeline) | unit + integration |
| Feature switches | `ai_enabled` (server 503 + UI hidden), `enable_ai_assistant`, `enable_project_planner`, `lead_auto_qualification` | integration + code |

## Model setting — what happens on deployment
- Gemini is the primary provider in `.env` (`AI_PRIMARY_PROVIDER=gemini`), and OpenRouter is the secondary provider through `OPENROUTER_MODEL=openrouter/free`. The order remains configurable.
- When Gemini is used (fallback, or as primary), Gemini first tries `gemini-3.7-flash`. If Google rejects that id, the call is repeated with the default `gemini-2.5-flash` and the id is skipped for 10 minutes — one failed call at most every 10 minutes, no outage.
- **Owner decision:** confirm the intended model id, or clear the field in Settings → AI to use the defaults.

## Not done / owner decisions
- **Generating real embeddings** costs provider quota. Once approved: set `GEMINI_API_KEY`, open **Admin → RAG Knowledge → Rebuild Vector Index**, watch the "Dense Vector Embeddings" counter (only missing vectors are sent; 126 chunks ≈ 126 embedding calls).
- Retrieval quality and real model output on the real data have not been measured (no paid calls allowed).

## Live provider failover update

The local provider cascade was verified with simulated 503/429/timeout-style failures and bounded to one primary plus one secondary attempt. Provider response bodies are not logged. Live Gemini/OpenRouter requests were not executed because free-tier/billing status is account-specific and no chargeable request was authorized. See `AI_LIVE_PROVIDER_FAILOVER_REPORT.md`.
