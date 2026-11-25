# Admin Test Matrix

_Source: `npm run test:e2e` (Playwright/Chromium, isolated temp database, random admin password, every non-local request blocked) — **172/172 checks passed** on 2026-11-05 — plus `npm test` (API/security, 221/221) and `npm run test:unit` (40/40). Final run logs: see [FINAL_VERIFIED_PROJECT_STATUS.md](FINAL_VERIFIED_PROJECT_STATUS.md)._

Legend: **UI** = done by clicking in a real browser and verified through the API · **API** = integration suite only · **SSR** = server-side render test only · — = not applicable · ✗ = not tested.

All UI actions run on the **cookie session + CSRF token** (the browser never sends a Bearer token; verified by inspecting the request headers).

| # | Tab | Opens (no error, no console error) | Create | Update | Delete (test record) | Publish / Enable toggle | Validation | API-error handling | Desktop | Mobile 390px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Overview | UI | — | — | — | — | — | API (partial loads reported) | UI | UI |
| 2 | Inbound Leads | UI | — (public form) | UI: status, private notes | UI | — | API (enums, notes ≤ 5000, whitelist) | shared handler | UI | UI |
| 3 | Messages | UI | — (public form) | UI: status | UI | — | API (status enum, 404) | shared handler | UI | UI |
| 4 | Projects | UI | UI | UI | UI | UI `featured` | API (URL protocols, gallery, unique/Arabic slugs) | **UI: network failure and CSRF failure keep the form + input, nothing saved** | UI | UI |
| 5 | Services | UI | UI | UI | UI | UI `active` (+ disappears from public API) | API | shared handler | UI | UI |
| 6 | Blog | UI | UI | UI | UI | UI `published` (+ appears in public API) | API (AI action enum, lengths) | AI 503 message (API) | UI | UI |
| 7 | Skills | UI | UI | UI | UI | — | ✗ | shared handler | UI | UI |
| 8 | Methodology | UI | UI | UI | UI | UI `enabled` | API (array required) | shared handler | UI | UI |
| 9 | Principles | UI | UI | UI | UI | UI `enabled` | API (array required) | shared handler | UI | UI |
| 10 | Hero Nodes | UI | UI | UI | UI | UI `enabled` | duplicate id rejected in UI | shared handler | UI | UI |
| 11 | Experience | UI | UI | UI | UI | — | ✗ | shared handler | UI | UI |
| 12 | Education & Certs | UI | UI (education + **certificates**) | UI (both) | UI (both) | UI `published` (education) | ✗ | list updated only after success | UI | UI |
| 13 | Courses | UI | UI | UI | UI | UI `published` | API | list updated only after success | UI | UI |
| 14 | Testimonials | UI | UI | UI | UI | UI `published` | API (avatar/URL fields) | shared handler | UI | UI |
| 15 | Profile | UI | — | UI (save) + **avatar upload** (cropped, stored as `data:image/webp`) | — | — | API (URL fields, data:image avatar) | success only after HTTP 200 | UI | UI |
| 16 | RAG Knowledge | UI | UI (doc → 2 chunks) | — | UI | — | API | honest re-index status (UI) | UI | UI |
| 17 | Forms | UI | — (system forms) | UI (enable/disable, partial update) | — | UI | API (field schema, system fields locked) | shared handler | UI | UI |
| 18 | Settings | UI | — | UI (save) | — | ✗ (individual switches not clicked) | API (whitelist, URLs, `ai_model`) | **UI: forced HTTP 500 shows an error, no "Saved!"** | UI | UI |

## Authentication and CSRF in the browser
| Check | Result |
|---|---|
| Unauthenticated `/admin` → login; wrong password rejected; correct password opens the dashboard | UI ✓ |
| Session cookie `HttpOnly`, `SameSite=Strict`, `Path=/api`, invisible to `document.cookie` | UI ✓ |
| No session token or CSRF token in `localStorage` / `sessionStorage` | UI ✓ |
| Every UI write sends `X-CSRF-Token` (43-char random) and no `Authorization` header | UI ✓ |
| Page reload: session survives, same CSRF token fetched again, writes still succeed | UI ✓ |
| Stale CSRF token: server 403 → UI refreshes the token once → retry 200, user stays signed in | UI ✓ |
| Missing CSRF token on every attempt: 403, error "CSRF token missing or invalid", form and input kept, user stays signed in, nothing saved | UI ✓ |
| Idle session expiry: next action gets 401 and the UI returns to the login page | UI ✓ |
| Session revoked from another device (logout-all): next action returns to login | UI ✓ |
| **Sign Out**: server session ended (old cookie → 401) and cookie removed | UI ✓ |
| **All Devices** (new button): every session revoked, another device's session → 401 | UI ✓ |

The same rules are pinned at API level for **every** admin route (36 write + 4 read routes, enumerated from `server.ts`) by `scripts/auth_csrf_suite.ts` — see SECURITY_STATUS.md.

## Not covered (honest gaps)
- Individual switches inside **Settings** (only "Save All Settings" is driven through the UI; the keys are validated by the API suite).
- Field-level validation messages in Skills, Experience and Education (server validation is tested through the API where it exists).
- Empty states with zero records for most tabs (the E2E database always contains seed data).
- Real AI output in the Blog assistant / Knowledge re-index (no paid provider calls; the no-provider paths are tested).
