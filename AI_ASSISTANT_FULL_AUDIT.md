# AI Assistant Full Audit

Date: 2026-11-17

## Executive conclusion

The AI feature is implemented end to end and is safe to exercise locally. The deterministic fallback, retrieval engine, tool dispatch, input limits, prompt-injection gates, provider cascade, and admin authorization were verified without outbound network calls. A real LLM response-quality assessment and production embedding generation were **not** performed because no live provider call was authorized in this audit. Therefore this report does not claim production-grade answer quality or live-provider availability.

## Architecture and request lifecycle

1. `FloatingAIAssistant.tsx` sends the visitor message, up to six recent history items, and an optional session id to `POST /api/ai/chat`.
2. `server.ts` validates the message, applies the distributed AI rate limiter, records privacy-preserving analytics metadata, and calls `chatWithBaraaAI`.
3. `server/ai.ts` applies security and unknown-fact gates, retrieves relevant knowledge chunks, builds a bilingual system instruction, and calls the configured provider abstraction.
4. The provider abstraction supports OpenRouter and Gemini. `CompositeAIProvider` tries the configured primary and secondary providers and retries a rejected configured model once with the provider default.
5. Tool calls are restricted to portfolio lookups (`searchProjects`, `searchServices`, `getProfile`, `generateProjectBrief`) and are followed by one bounded synthesis call.
6. If providers fail, the response is generated from stored portfolio data and is marked `degraded: true`; it is not presented as a successful model response.

## Providers and models

- OpenRouter: OpenAI-compatible `/api/v1/chat/completions`; current local fallback router `openrouter/free`; configured through `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
- Gemini: `@google/genai`; default chat model `gemini-2.5-flash`; configured through `GEMINI_API_KEY`.
- Current local order: Gemini primary, OpenRouter secondary. `AI_PRIMARY_PROVIDER` remains configurable.
- Embeddings: Gemini `gemini-embedding-2` by default, controlled by `EMBEDDING_MODEL`.
- The stored `settings.ai_model` is provider-aware. A Gemini model id is not sent to OpenRouter, and a rejected configured id is temporarily skipped after one fallback attempt.
- No live LLM or live embedding request was made during this audit.

## RAG status

Knowledge is rebuilt from profile, services, projects, skills, published blog posts, experience, education, and custom knowledge documents. Chunks are stored in the application `DatabaseSchema`; unchanged chunk content retains its embedding during reindexing, while edited content loses its old vector. Retrieval is a hybrid score (`0.75 * cosine similarity + 0.25 * keyword relevance`) when stored vectors exist, otherwise normalized bilingual keyword retrieval is used. This is not a full BM25 implementation despite older comments using that label.

The current local data snapshot contains 126 chunks and 0 stored embeddings, so the real snapshot uses keyword fallback until an administrator explicitly runs vector indexing with a configured Gemini key. The isolated unique-fact test proved that a custom document is chunked, retrieved, used in the fallback answer, deleted, and absent after deletion. A defect was fixed where a directly retrieved custom-knowledge chunk could be hidden by a broad project heuristic when providers were unavailable.

Retrieved text is now explicitly fenced as untrusted reference data in the model instruction; instructions embedded in retrieved content must not be followed.

## Security findings and repairs

- Fixed analytics privacy exposure: AI chat and semantic-search analytics no longer retain visitor text or query previews. They store only character length and a SHA-256 fingerprint.
- Verified server-side AI authorization, input caps, rate limiting, prompt-injection gates, unknown personal-fact gates, output scrubbing, admin-only blog assistant access, and tool allow-listing.
- Verified that contact data is excluded from lead-qualification model input and visitor text is fenced as data.
- No API key or session secret was emitted by local security probes; test-guard recorded zero outbound network attempts.
- No confirmed critical or high-risk AI vulnerability remains from the local audit. Live provider/account controls still require operational verification.

## Functional evaluation evidence

- Unit AI suite: 14 AI-focused tests passed inside the 42-test unit suite, including vector ranking, tool calling, provider fallback, security gates, model fallback, custom knowledge fallback, and input fencing.
- RAG unique-fact regression: creation/indexing PASS; retrieval PASS; fallback answer grounding PASS after repair; cleanup PASS.
- Local bilingual evaluation: 50 scenarios executed without provider calls; **50/50 strict content assertions passed** after repairing three fallback intent defects. Language detection was 100%, security/anti-hallucination checks passed, and 50/50 concurrent fallback calls succeeded. This is deterministic fallback coverage, not evidence of live LLM quality.
- The original 27 failures were grouped as: broad intent misclassification, missing language-specific response branches, insufficient project-detail rendering, and overly narrow Arabic morphology matching. No failed case required changing expected facts; the stored portfolio data was sufficient.
- Application integration/security: 221/221 passed.
- Full E2E: 172/172 passed after making the E2E harness use an explicit test-only auth limit; production default remains 20 login attempts/minute.
- `npm.cmd run test:all`: PASS.
- Production build: PASS.
- TypeScript/lint: PASS with 0 errors and 120 existing warnings.

## Live provider failover update — 2026-11-17

- Added bounded failover regression coverage for primary provider outages and safe error classification. The secondary receives the same request context and is attempted once; there is no infinite retry loop.
- Provider error logs now record only safe categories/statuses. OpenRouter response bodies are consumed but not included in exceptions or logs.
- Secret redaction regression now covers Gemini key-shaped values, OpenRouter keys, and Bearer tokens.
- Local configuration is now Gemini-first with `OPENROUTER_MODEL=openrouter/free` as the independent fallback router. See `AI_LIVE_PROVIDER_FAILOVER_REPORT.md`.
- Live Gemini/OpenRouter calls remain BLOCKED because account-specific free-tier/billing status was not established and no chargeable request was authorized.

## Controlled live request update — 2026-11-17

One authorized request per provider was attempted. Gemini returned no usable response (`request failed`) and was isolated so it did not cascade into another live request. OpenRouter `openrouter/free` returned in 4514 ms with six keyword-retrieved chunks, but answered with a generic greeting rather than the requested services. Transport succeeded; answer quality did not. Live provider failover was not triggered to remain within the two-request limit. Details are in `AI_LIVE_PROVIDER_FAILOVER_REPORT.md`.

## Local repair update — 2026-11-17

- Fixed the quality gap where any non-empty provider text was treated as a valid answer. A generic greeting returned for a factual services/portfolio question is now replaced with the existing grounded fallback built from retrieved portfolio knowledge; no unsupported facts are added and the response is marked degraded.
- Added safe provider error categorization and preserved bounded one-primary/one-secondary failover behavior. No additional live provider request was made during this repair.
- The local application `DATABASE_URL` is present but stale/invalid according to the previous read-only connection attempt. The separate Neon persistence-test URL remains isolated; it was not copied, and no migration or database mutation was performed.
- Latest local evidence: unit 45/45, provider regression 15/15, integration/security 221/221, E2E 172/172, production build PASS, lint PASS with 0 errors and 120 warnings.

## Provider reliability repair — 2026-11-17

- Explicit free OpenRouter model configuration replaced the random free router: ERNIE-5.5-Flash-Preview first and Ling 3.2 Flash second. The authenticated metadata response showed both as text-output models with zero prompt/completion pricing at audit time.
- The provider chain is bounded and ordered: Gemini → OpenRouter free model 1 → OpenRouter free model 2 → grounded fallback. Paid/non-free OpenRouter IDs are rejected before network access.
- The same conversation messages, system instruction, and RAG context are passed to each provider attempt. All-provider failure returns a labelled degraded fallback without exposing provider error bodies.
- Latest regression evidence: Unit 47/47, provider regression 15/15, integration/security 221/221, E2E 172/172, build PASS, lint PASS with 0 errors and 120 warnings.

## Vercel compatibility

The AI request path is synchronous and bounded by provider timeouts, uses PostgreSQL/Redis-backed shared state in production, and has no requirement for a persistent worker. Embedding generation is intentionally an explicit admin operation and should not be used as an unbounded request-time job. Local Express/Vercel adapter validation was previously PASS, but a real Vercel Preview was not deployed in this audit.

Vercel's current Express guidance and Function limitations still apply: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express) and [Function limits](https://vercel.com/docs/functions/limitations). On Hobby, an AI request must complete within the configured function duration and provider timeouts should remain bounded.

## Remaining verification

- Live OpenRouter/Gemini chat responses, Arabic/English answer quality, hallucination rate, and provider fallback under real quota/timeout conditions.
- Production embedding generation and vector retrieval quality with the actual portfolio snapshot.
- Live Preview routing and cookies.
- External SMTP and Telegram delivery.
- Redis session/rate-limit behavior across independently deployed Vercel instances.

## Files changed in this audit

- `server/ai.ts`: direct knowledge takes precedence in fallback answers; retrieved context is fenced as untrusted data; bilingual intent routing now covers e-commerce, NeuroDoc details, freelance pricing, education/certificates, and unknown Arabic personal-fact traps; invalid embedding vectors are rejected.
- `server.ts`: analytics stores query length/hash only; auth rate limit is configurable with production default unchanged.
- `scripts/e2e_isolated.ts`: test-only auth limit prevents the long suite from rate-limiting itself.
- `tests/unit/ai.test.ts`: regressions for direct custom-knowledge grounding and the repaired service/project/e-commerce intent routes; 42 unit tests now pass.
- `scripts/diagnose_ai_content_failures.ts`: reproducible no-provider diagnostic for representative content cases.
