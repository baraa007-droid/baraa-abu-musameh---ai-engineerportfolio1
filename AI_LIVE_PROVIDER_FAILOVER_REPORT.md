# AI Live Provider & Automatic Failover Verification

## Scope

This verification covers the local provider configuration and the automatic failover path. No live Gemini or OpenRouter request was sent during this audit because API keys alone do not prove that the selected project/account is on a no-charge quota. Provider billing and quota status are account-specific.

## Local configuration

| Setting | Value | Meaning |
|---|---|---|
| `AI_PRIMARY_PROVIDER` | `gemini` | Gemini is attempted first; the setting remains configurable. |
| `OPENROUTER_MODEL` | `openrouter/free` | OpenRouter fallback router, avoiding a hard dependency on the same Gemini model. |
| Gemini model | `gemini-2.5-flash` | Provider default used when no admin model override applies. |
| API keys | Configured locally | Read server-side only; values are not recorded here. |

## Verified locally

- Provider selection is configurable and resolves Gemini as primary with OpenRouter as secondary in the current local environment.
- A primary 503, 429, timeout, or connection-style failure can cascade to the secondary provider without a browser refresh.
- The same messages, system instruction, tools, and request context are passed to the secondary attempt.
- The cascade is bounded to one primary attempt and one secondary attempt; there is no infinite retry loop.
- If both providers fail, the existing grounded, labelled fallback path remains available.
- OpenRouter HTTP response bodies are no longer placed in thrown errors or failover logs. Logs contain only safe categories such as HTTP status, timeout, or network error.
- API keys remain server-side and are not included in client payloads.
- Local regression: 15/15 provider regression checks passed; latest unit suite: 45/45 passed; network guard recorded 0 outbound attempts.

## Local repair update — 2026-11-17

- A generic provider greeting is no longer accepted as a successful answer for a factual portfolio question. The application now uses the existing grounded fallback response, preserving retrieved portfolio facts and marking the response as degraded.
- Provider failures are classified locally into safe categories without recording provider response bodies or secrets.
- OpenRouter model metadata uses the provider-returned model when available, otherwise the configured router label.
- No additional live AI request was made during this repair. Unit regression is 45/45 and provider regression is 15/15.
- The local `DATABASE_URL` remains invalid/stale based on the earlier non-mutating startup check. The dedicated persistence-test URL remains separate and was not copied into application or production configuration. No migration or database write was performed.

## Configuration diagnostics — 2026-11-17

- `dotenv` loads both variables from `.env` in development and does not override an already-exported process variable. A safe presence-only check confirmed both names are present in the file and no process-level override was active.
- The dedicated Neon URL passed `SELECT 1` and the repository persistence safety check confirmed no user tables or rows. The current application `DATABASE_URL` failed its read-only probe with a DNS-class connection error. It was not replaced automatically because the test credential must remain explicitly separated from application/production configuration.
- DNS resolution, TCP/443, and a no-key HTTPS request to the Gemini API host succeeded. The no-key request returned HTTP 404, which confirms transport reachability only; no inference request was sent. The previous `request failed` therefore cannot be distinguished locally between SDK/account/provider causes without a new authorized API diagnostic request.
- `@google/genai` 2.18.0 and the `models.generateContent` request shape compile and pass local mock/provider regression tests. Official documentation lists `gemini-2.5-flash` as a supported model, while noting access limitations for some projects: [model documentation](https://ai.google.dev/gemini-api/docs/models?hl=en), [GenerateContent API](https://ai.google.dev/api/generate-content?hl=en).

## Controlled live verification — 2026-11-17 (latest authorization)

- Model-list checks succeeded without generation: Gemini listed `gemini-2.5-flash` and `gemini-2.5-flash-lite` with `generateContent`; OpenRouter returned HTTP 200 and reported zero pricing for `openrouter/free`. Official pricing/rate limits remain account-dependent: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits?hl=en), [OpenRouter free models](https://openrouter.ai/collections/free-models).
- Gemini: exactly 1 generation attempt, 8,083 ms, no usable model response. The application recorded an unknown provider failure and returned the grounded fallback. No live failover call occurred.
- OpenRouter: exactly 1 generation attempt, 2,458 ms, transport succeeded. The provider-reported model was `nvidia/nemotron-3.5-super-vl:free`. The provider answer was not accepted as a useful grounded answer, so the application returned the grounded fallback with 6 keyword-retrieved chunks and `degraded=true`.
- The controlled script used `maxTokens=100`, disabled tools for this probe to prevent a second synthesis request, and isolated the process from PostgreSQL with `DATABASE_URL=''`/`PG_SYNC_MODE=off`; no Neon write, migration, reindex, or embedding call occurred.
- Total live generation requests in this authorization: 2 (one Gemini, one OpenRouter). No paid model was selected or used. Mock failover regression remained 15/15 with zero outbound calls.

## Reliability repair — 2026-11-17

- Replaced the random `openrouter/free` default with an explicit zero-cost chain: `baidu/ernie-5.5-flash-preview:free`, then `inclusionai/ling-3.2-flash:free`. Both were present in the authenticated OpenRouter model metadata response with text output and zero prompt/completion pricing at verification time. Their OpenRouter pages document chat-completions support and free pricing: [ERNIE](https://openrouter.ai/baidu/ernie-5.5-flash-preview%3Afree), [Ling](https://openrouter.ai/inclusionai/ling-3.2-flash%3Afree).
- OpenRouter rejects paid or non-explicit-free model IDs before any network request. Model IDs are configurable through `OPENROUTER_FREE_MODELS` but invalid/non-free entries are discarded.
- The chat chain is now bounded to Gemini → explicit free model 1 → explicit free model 2 → grounded fallback when Gemini is primary. If OpenRouter is explicitly configured as primary, the order is free model 1 → free model 2 → Gemini → grounded fallback.
- The chain preserves the same messages, system instruction, and retrieved RAG context; it performs at most one normal attempt per provider, with existing model-rejection fallback behavior only for provider-specific configured-model handling.
- Local regression after the repair: Unit 47/47, provider regression 15/15, integration/security 221/221, E2E 172/172, build PASS, lint PASS with 0 errors and 120 warnings.
- No new live generation request was made during this repair. The two earlier authorized live attempts remain the only live generations recorded for this task.

## Controlled live verification — 2026-11-17

Two provider attempts were authorized and executed, one per provider. The Gemini attempt reached the provider path but failed before returning a model response. The OpenRouter attempt returned successfully.

### Gemini attempt

- Question: `ما الخدمات التي يقدمها صاحب هذا الموقع في مجال الذكاء الاصطناعي وتطوير البرمجيات؟`
- Result: **FAIL — no response returned** (`request failed`); no model name or answer quality could be evaluated.
- The request was isolated with OpenRouter disabled, so it did not trigger a second live provider call.

### OpenRouter attempt

- Question: `What AI engineering and software development services are offered in this portfolio?`
- Result: **PASS — provider response received**.
- Model: `openrouter/free`
- Latency: 4514 ms
- Provider calls: 1
- RAG: keyword fallback, 6 chunks retrieved
- Response: `Hello! How can I assist you with your project scoping or answer questions about Baraa's services and portfolio?`
- Quality assessment: **FAIL for content completeness**. The response was a generic greeting and did not answer the services question. It did not invent unsupported portfolio facts.

The second run disabled `DATABASE_URL` and set `PG_SYNC_MODE=off` for process isolation, preventing any database connection during the AI-only test. No migration or database write was executed.

## Live verification status

| Check | Result | Reason |
|---|---|---|
| Gemini live chat | FAIL | The authorized request reached the provider path but returned no usable response. Exact provider error details were intentionally not logged. |
| OpenRouter live chat | PASS (transport), FAIL (quality) | `openrouter/free` returned once in 4514 ms, but produced a generic non-answer. |
| Real provider-to-provider failover | NOT TESTED LIVE | Live failover was intentionally not triggered to stay within the two-request limit. |
| Arabic/English deterministic fallback | PASS | Existing local deterministic evaluation remains 50/50. |
| Real LLM answer quality | BLOCKED | No live model response was evaluated. |

Google documents that Gemini quotas are project/model dependent and that billing status determines available access: [billing](https://ai.google.dev/gemini-api/docs/billing?hl=en) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits?hl=en). OpenRouter documents that free models use `:free` variants or the free router and are rate limited: [free models](https://openrouter.ai/collections/free-models) and [pricing](https://openrouter.ai/pricing).

## Safe next step

Confirm the Gemini project free-tier quota and OpenRouter free-plan limits in their dashboards, then authorize one short English and one short Arabic smoke request per provider. Keep output tokens low, use synthetic/public portfolio questions, and stop if either provider reports billing, credits, or quota exhaustion. After that, run the existing controlled live-provider script and record only statuses, provider/model labels, latency, and redacted error categories.
## Final controlled live provider validation — 2026-11-17

Exactly three isolated live generation requests were authorized and executed: one direct Gemini REST request, one ERNIE request, and one Ling request. Automatic live failover was disabled for these checks. No migrations, embedding generation, database writes, deployments, or paid models were used.

| Provider/model | Result | Latency | Evidence |
|---|---:|---:|---|
| Gemini `gemini-2.5-flash` via direct REST | FAIL | 336 ms | HTTP 404; model discovery had listed the model and `generateContent`, but generation still returned 404. The exact account/model-access cause remains unresolved; no second Gemini request was made. |
| OpenRouter `baidu/ernie-5.5-flash-preview:free` | FAIL quality | 3,377 ms | HTTP 200, but the final message content was empty. This is not a usable answer. |
| OpenRouter `inclusionai/ling-3.2-flash:free` | PASS for relevance/grounding, partial output | 8,635 ms | HTTP 200. It answered the English services question using supplied public portfolio context, but the response was truncated by the controlled 250-token cap. |

The ERNIE result exposed a local defect: an HTTP 200 with empty final content had previously been accepted as success. `OpenRouterProvider` now rejects empty final content, allowing the bounded chain to continue to the next provider or grounded fallback. A unit regression test covers this behavior.

Latest local regression after the repair: unit 48/48, provider regression 15/15, integration/security 221/221, E2E 172/172, production build PASS, TypeScript PASS, and lint PASS with 0 errors and 120 warnings.

The live requests used manually supplied public context rather than executing the full website RAG path; no embeddings were generated. Therefore the Ling result is direct-provider evidence with grounded prompt context, not proof of semantic-vector retrieval in production.
## Follow-up live validation — 2026-11-17

Exactly three additional live generations were authorized: one Gemini request and two isolated Ling requests. Automatic live failover was disabled.

- Gemini `gemini-3.5-flash-lite`: HTTP 200, 5,913 ms, `STOP`, 32 output tokens. The model returned a refusal-like clarification saying the question was not present, although the request contained it. Transport passed; answer quality failed.
- Ling Arabic: HTTP 200, 3,674 ms, `stop`, 207 output tokens, 0 reasoning tokens. The response was complete but answered partly in English and included project records from the local test snapshot, so Arabic quality and production grounding failed for this sample.
- Ling English: HTTP 200, 2,110 ms, `stop`, 46 output tokens, 0 reasoning tokens. It directly described the available project records; the answer was complete and consistent with the supplied snapshot, but that snapshot currently contains test project records and therefore is not evidence of final portfolio content quality.

The local configuration now uses `GEMINI_MODEL` (default `gemini-3.5-flash-lite`) and Ling as the only explicit OpenRouter free model. Ling requests send `reasoning: { enabled: false }` and default to 600 output tokens. Responses with `finish_reason=length` are rejected and sent to the bounded fallback path instead of being shown as complete.

Local verification after these changes: unit 49/49, provider regression 15/15, integration/security 221/221, TypeScript PASS, build PASS, and ESLint PASS with 0 errors and 120 warnings. No migration, reindex, embedding generation, deployment, or production data operation was performed.
