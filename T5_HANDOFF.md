# T5 Handoff — from T4 (Report intake UI) to T5 (Responder actions and dashboards)

Read `AGENT_IMPLEMENTATION_CONTEXT.md` first (canonical; sections 1, 3, 16 matter most). This file is a short orientation, not a replacement.

## State after T4 (implemented in a patch; counts as complete once the owner applies, verifies and merges it)
- T1 security, T2 canonical schema and T3 hybrid AI + App Check are complete and untouched.
- Citizen `/home` now has: one-tap SOS (unchanged payload, no AI), Quick Start (unchanged payload), a full report form (`components/citizen/report-form.tsx`) with a Leaflet picker and an optional AI suggestion panel, and truthful sync feedback.
- **No rules, indexes, schema, API routes, auth, Firebase config or env vars changed in T4.** Reports are still created by the browser through Firestore (`setDoc`), with `/api/reports` as the fallback. Every report is `processedBy: "manual"`, `confidenceScore: null`.

## How reporting works now (do not break)
- `submitReport()` in `lib/firebase/firestore.ts` returns `{ reportId, settled }` immediately; `createReport()` is unchanged and still awaits the backend. Both share `prepareReport()` / `postReportToServer()`.
- `lib/utils/submit-flow.ts` (`startSubmission`) never rejects; the server fallback only runs after the direct write was REJECTED; retry reuses the same `reportId` (no duplicates).
- Sync truth comes from Firestore snapshot metadata (`subscribeToUserRequests` now listens with `includeMetadataChanges` and passes `{fromCache, hasPendingWrites}` as an optional 2nd callback argument). `mapReportToCitizenRequest(report, meta?)` uses it. Pure wording/logic lives in `lib/utils/report-sync.ts`.
- `lib/firebase/submission-tracker.ts` is SESSION-ONLY. It is not persistent failure recovery (see context 16.5).

## Relevant files for T5
- Responder side (untouched by T4): `components/dashboard/*`, `components/rescue/*` (`LiveMap`, `FieldMap` are CSS mocks), `lib/firebase/firestore.ts` (responder listeners still contain `any` casts and mock fallbacks; they do NOT use metadata changes), `app/api/reports/[id]/route.ts` (server-side actions), `lib/types/report.ts` (mappers), `lib/constants/report.ts` (`ESCALATION_POLICY`, state machine).
- Reusable from T4 if useful: `lib/utils/location-math.ts`; `components/citizen/leaflet-map.tsx` (citizen picker; for read-only responder maps prefer a separate small component, same loading pattern: `next/dynamic` with `ssr:false`, `import "leaflet/dist/leaflet.css"` inside the dynamic chunk, `divIcon` pins, OSM attribution, no prefetch/bulk tile download).

## Recommended T5 starting points
1. Remove mock `INCIDENTS` fallbacks and simulated operational data from the dashboards; show real empty/error states.
2. Surface server-rejected actions (dialogs currently close as "success" even on rejection).
3. Add `limit(100)` and duplicate/filter handling to responder queues.
4. Consider replacing the responder map mocks with Leaflet (owner-approved dependency already present; no `react-leaflet`).
5. Keep server-side role checks (T1) intact; do not weaken them.

## Remaining limitations you inherit
- Failed submissions are tracked in memory only; a write rejected by the server after a reload is invisible to the app.
- First-ever use offline is impossible (anonymous sign-in needs one online visit); the PWA app shell is T8.
- OSM tiles need a connection and follow OSM's tile usage policy; if a CSP is added later, allow `tile.openstreetmap.org`.
- SOS category is still `medical`/`critical` (owner decision D4); changing it needs approval.
- Open owner items: Option B provenance (needs a rules change; not needed so far), eventual removal of admin-only `/ai-check`, test-account password rotation, deployment state of rules/indexes/App Check was never inspected by an agent.
- ESLint baseline is now 22 errors / 10 warnings (all pre-existing, in responder code and `messaging.ts`); do not exceed it. Tests: 112 (`tests/ai`, `tests/security`, `tests/schema`, `tests/citizen`).

## Working rules (from the context file)
Plan first and wait for approval; one consolidated patch per iteration (LF diff, verified with `git apply --check --ignore-whitespace` on a fresh CRLF copy); update `AGENT_IMPLEMENTATION_CONTEXT.md` in every patch; Spark/free tier only; no deploys or Console changes; never claim checks you did not run.
