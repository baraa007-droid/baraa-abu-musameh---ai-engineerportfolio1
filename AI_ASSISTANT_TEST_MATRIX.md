# AI Assistant Test Matrix

| Feature | Test Method | Expected Result | Actual Result | Status | Evidence |
|---|---|---|---|---|---|
| Chat endpoint validation and limits | Integration/security HTTP suite | Invalid/oversized input rejected safely | Passed in 221/221 suite | PASS | `npm.cmd test` |
| Arabic/English language detection | 50-case local evaluation | Language classification follows request language | 100% classification in no-provider run | PASS | `scripts/eval_bilingual_ai.ts` |
| Real LLM Arabic/English answers | Live provider request | Grounded, natural answer | No live provider request authorized | BLOCKED | Requires configured/approved provider call |
| Conversation history cap | Unit/integration tests | Only bounded recent history reaches provider | Last six messages and per-message caps verified | PASS | `tests/unit/ai.test.ts`, integration suite |
| Provider cascade | Mock 503/timeout/failure tests | Provider failure cascades once with same request context or produces labeled fallback | Passed; safe error logs contain no provider response body | PASS | `tests/unit/ai.test.ts`, `scripts/test_ai_providers_regression.ts` |
| Model-id fallback | Mock rejected model | Retry default once, then suppress bad id temporarily | Passed | PASS | `tests/unit/ai.test.ts` |
| Prompt-injection refusal | Security probes and unit cases | No system prompt, credential, or admin disclosure | Passed; zero keys leaked | PASS | `npm.cmd test`, unit security cases |
| Visitor data fencing | Unit test | Untrusted lead text is fenced; contact data excluded | Passed | PASS | `tests/unit/ai.test.ts` |
| Tool allow-list | Mock tool-call tests | Only portfolio lookup/brief tools execute | Passed; one bounded follow-up | PASS | `tests/unit/ai.test.ts` |
| Direct custom knowledge retrieval | Isolated create/query/delete script | Retrieved fact is used and disappears after deletion | Passed after fallback-priority fix | PASS | `scripts/test_rag_unique_fact.ts` |
| Stored-vector ranking | Mock embedding unit tests | Relevant vector ranks first | Passed | PASS | `tests/unit/ai.test.ts` |
| Real embeddings in current snapshot | Read-only data inspection | Existing chunks have usable vectors | 126 chunks, 0 embeddings | BLOCKED | Requires explicit Gemini indexing |
| Semantic search | Unit/integration/regression tests | Safe matching and no unrelated result leakage | Passed | PASS | AI unit + integration suite |
| 50-scenario bilingual content evaluation | No-provider deterministic fallback | Grounded response for every strict case | 50/50 strict cases; 50/50 concurrent calls | PASS (deterministic only) | `scripts/eval_bilingual_ai.ts`; not a live LLM test |
| Concurrent assistant calls | 50 parallel fallback requests | No crashes or cross-request state leakage | 50/50 succeeded in 383 ms in evaluation run | PASS | Local evaluation output |
| Chat analytics privacy | Code audit + regression suite | No free-form prompt stored verbatim | Length + SHA-256 only after fix | PASS | `server.ts` |
| Admin blog assistant | Authorization and failure tests | Admin-only; no canned success on provider failure | Passed; 503 on unavailable provider | PASS | Integration/unit/E2E |
| Project advisor fallback | Malformed provider output test | Labeled data-derived template, no invented price | Passed | PASS | `tests/unit/ai.test.ts` |
| Lead qualification fallback | Mock/failure tests | Bounded, honest score with unknown budget/timeline | Passed | PASS | `tests/unit/ai.test.ts`, integration |
| API key client exposure | Build/security inspection | Keys absent from browser bundle | No client exposure found | PASS | Source/config/build audit |
| Live OpenRouter/Gemini availability | Authorized live request | Provider returns valid response under current credentials | Not executed | BLOCKED | Requires owner-approved live call |
| Vercel Preview AI path | Remote Preview request | Routing, cookies, DB, Redis, and provider work live | No remote deployment performed | BLOCKED | Requires owner deployment |

| Generic provider greeting on factual portfolio question | Unit regression with mocked provider response | A non-answering greeting must not be exposed as the answer | Replaced by grounded fallback from retrieved portfolio data | PASS | `tests/unit/ai.test.ts` |
| Provider error classification | Unit/provider regression with simulated 429, 503, timeout, and network failures | Safe category/status only; no provider body or secret leakage | Passed | PASS | `tests/unit/ai.test.ts`, `scripts/test_ai_providers_regression.ts` |

## Live provider failover update — 2026-11-17

The local `.env` now selects Gemini first and `openrouter/free` as the OpenRouter fallback router. The provider regression suite passed 15/15 and the latest unit suite passed 45/45 with zero outbound requests. Real provider calls remain unresolved: Gemini previously returned `request failed`, and OpenRouter previously returned a generic non-answer before the local quality guard was added. No additional live request was made during the repair.
