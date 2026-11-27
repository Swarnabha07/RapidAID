# T6 Handoff — from T5 (Responder actions and dashboards) to T6 (Process, dedupe, escalation)

Read `AGENT_IMPLEMENTATION_CONTEXT.md` first (canonical; sections 1, 3, 17 and 20 matter most). This file is a short orientation, not a replacement.

## State after T5 (implemented in a patch; counts as complete once the owner applies, verifies and merges it)
- T1 security, T2 canonical schema and T3 hybrid AI + App Check are complete and untouched. T4 (report intake) is unchanged by T5.
- **No rules, indexes, schema, API routes, auth, Firebase config, dependencies or env vars changed in T5.**
- Both responder dashboards use real Firestore data only: honest loading / empty / error / saved-data states, `limit(100)` with a truncation notice, no mock fallback, no unbounded fallback query.
- Responder actions (acknowledge, assign with a free-text unit name, escalate with a required reason and a target urgency not below the current one, resolve) go only through `PATCH /api/reports/[id]`. A rejection keeps the dialog open with a meaningful message; only a 2xx closes it; the UI updates from the live snapshot (no optimistic patches).
- One shared read-only Leaflet map (`components/responder/*`) replaces both CSS mock maps.
- Labels are truthful; stats, activity and watch panels are derived from loaded reports.

## What T5 deliberately did NOT do (T6 owns it)
- **No deduplication of any kind.** Every loaded report is visible; SOS reports are never merged or hidden. `isDuplicateOf` is only displayed (rescue context link). `tests/responder/no-mock-data.test.ts` fails if duplicate-hiding code appears in responder UI; update that guard deliberately when T6 adds reviewed dedupe.
- No automatic escalation, no acknowledgement timers, no processing route. The watch panels show real elapsed time and the `ESCALATION_POLICY` thresholds as informational only ("automatic escalation is not active yet").
- No AI summaries (deferred, context 20.5).

## Reusable pieces for T6
- `lib/utils/responder-view.ts`: `summarizeQueue`, `oldestAwaiting`, `elapsedLabel`, `policyThresholdLabel`, `queueReducer`.
- `awaitingAcknowledgement` on both UI shapes = `status === "received"` (the policy's "unacknowledged"); `createdAtMs`, `escalated`, `escalatedAtMs`, `escalationLevel` are exposed.
- `lib/utils/report-action-payloads.ts` and the tests that feed payloads to `planReportAction` show how to keep UI and server contracts in sync.
- Server state machine (`lib/server/report-security.ts`): acknowledge only from `received`; assign from `received`/`in_progress`/`dispatched`; escalate raises urgency only and increments `escalationLevel`; resolve needs a note.

## Recommended T6 starting points
1. Server-only process/dedupe route as specified in context section 14 (same category, <=30 min, <=0.5 km; `processedAt` guard; transaction; atomic `peopleAffected` increment; audit trail; **SOS never auto-merged**; human review for uncertain duplicates). Decide the queue UX for confirmed duplicates only after the server side exists, and keep SOS always visible.
2. Escalation route + auditable `escalationLog` (`type: "auto"`, actor `system_timeout`); then wire a real Escalation Watch into the existing panels (they already render elapsed time and thresholds).
3. Spark-compatible scheduling only (no Cloud Functions, no paid scheduler); decide with the owner how a trigger runs without one.

## Remaining limitations you inherit
- `limit(100)` follows urgency order, so resolved high-urgency reports can occupy slots; a status-aware index would fix it but needs an owner-deployed index change (not done).
- No roster/availability/notifications; unit names are free text. Nav items, header search and notifications are visibly disabled.
- Firestore's persistent cache is not cleared on sign-out; OSM tiles need a connection and reveal approximate viewed areas to OSM (zoom capped at 17; if a CSP is added later, allow `tile.openstreetmap.org`).
- A missing index shows an error on the dashboards by design.
- SOS category is still `medical`/`critical` (owner decision D4); changing it needs approval.
- Open owner items: Option B provenance (rules change; not needed so far), eventual removal of admin-only `/ai-check`, test-account password rotation, deployment state of rules/indexes/App Check was never inspected by an agent.
- Baselines: ESLint is now 10 errors / 10 warnings (all pre-existing; do not exceed it). Tests: 153 (`tests/ai`, `security`, `schema`, `citizen`, `responder`).

## Working rules (from the context file)
Plan first and wait for approval; one consolidated patch per iteration (LF diff, verified with `git apply --check --ignore-whitespace` on a fresh CRLF copy); update `AGENT_IMPLEMENTATION_CONTEXT.md` in every patch; Spark/free tier only; no deploys or Console changes; never claim checks you did not run.
