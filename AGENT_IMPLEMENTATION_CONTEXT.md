# RapidAID — Agent Implementation Context

> Self-contained handover for any future Claude / Codex agent. Read it fully before doing anything.
> Update it after EVERY implementation iteration: keep earlier decisions, correct anything that became outdated, append progress.
> Last updated: **2026-11-24, with the T2 (canonical schema) implementation patch. T1 is completed and merged. T3 (AI integration) is the next phase.**

## 0. Handover status at a glance

| Phase | Status |
|---|---|
| T1 — Security lockdown | **Completed.** Merged into `main` (`bf723f2`). Owner-confirmed Vercel Preview test and Firestore rules emulator run (see section 7). |
| T2 — Canonical schema | **Implemented in a patch produced 2026-11-24.** It counts as COMPLETED only after the owner has applied it, run the verification in section 11, and merged it. **A fresh agent must verify the real repository state; do not assume T2 is applied because this file describes it.** |
| T3 — AI integration | **Next phase. Planning only first; owner approval of the plan is required before any code.** Section 15 is the T3 handover. |
| T4 onwards | Pending |

- Baseline for the T2 patch: GitHub `main` at commit **`f998cd7`** (`fix: connect emergency help buttons to anonymous authentication`).
- **Anonymous emergency access exists** (added after the first handover): see section 9. Preserve it.
- **Firestore rules were deployed by the owner through the Firebase Console** after T1 (the repo copy of the rules was unchanged from T1 up to `f998cd7`). The agent cannot read the deployed rules; whether the deployed rules equal the repo rules is **owner-asserted, not verified**. **T2 changes the rules and indexes; they must be redeployed by the owner (section 13).**
- **Test accounts are retained** (owner decision, section 5). Do **not** delete them or rotate their passwords unless the owner explicitly approves.
- **AI is NOT implemented.** `lib/firebase/ai.ts` is an unused module (section 15.2). No report in the system has ever been processed by AI.

## 1. Global rules for every future agent (prominent — follow all of them)

1. The owner is a beginner-friendly **Windows PowerShell** user: give exact PowerShell commands and briefly explain important consequences in plain language.
2. **Inspect the current repository and relevant files before proposing or implementing anything.** Do not assume this document is perfectly current; if the repo disagrees, trust the repo and say so.
3. **One iteration at a time, one consolidated patch per iteration.**
4. **Plan first, code second:** give a concise implementation plan and **wait for explicit owner approval** before coding.
5. After approval, return a **unified diff patch only**. Never edit the owner's repository directly.
6. **Include the updated `AGENT_IMPLEMENTATION_CONTEXT.md` in every implementation patch** (re-created as a coherent whole, not just appended).
7. **Never** commit, push, deploy, change Firebase project settings, alter accounts, or run destructive commands.
8. Preserve the existing architecture and UI unless the approved scope requires a change. No redesign.
9. No unnecessary dependencies and no package upgrades. (`@firebase/rules-unit-testing` is an existing devDependency, added by the owner in `39dfc47`; do not add others.)
10. **Firebase Spark (free) plan only.** No Blaze upgrade, no Cloud Functions, no paid scheduler, no paid services, no Cloud Storage. (Linking billing would also end the Gemini Developer API free tier.)
11. **Do not invent** test results, credentials, data, deployment status or features. Never claim a test passed unless it was actually run; say plainly what was NOT run. Separate: *executed by the agent*, *owner-confirmed*, *not run*.
12. **Never print, request, commit or include** `.env.local`, service-account JSON, private keys, tokens or passwords (in answers, patches or this file).
13. **No account deletion and no password rotation without explicit owner approval.**
14. **Custom token claims are the only trusted authorization role source.** `users/{uid}.role` in Firestore is only a display mirror.
15. **Every new email/Google account defaults to `victim`.** Elevated roles (`medical`, `rescue`, `admin`) are granted only by trusted local Admin SDK provisioning (`scripts/set-role.mjs`). Anonymous accounts have no claim and are treated as `victim` (section 9).
16. **AI is advisory only:** no autonomous medical decisions, no false promises that help is coming, no fabricated AI provenance (never label a report "on-device" or "cloud" unless that is what actually ran, and never trust a client's claim of it).
17. **SOS reports must never be automatically deduplicated or merged.**
18. Any scheduling/automation must be described honestly according to its real reliability and free-tier limits (never claim real-time guarantees that an external free cron cannot give).
19. Keep demo data simulated; never expose real victim information.
20. Do not change existing custom claims or Firestore role mirrors unless an audit shows a real mismatch **and** the owner approves the change.

## 2. Project overview

RapidAID: offline-first, AI-assisted disaster-response reporting and coordination web app for the Google #BuildHybridAI 2026 hackathon (Firebase AI Logic hybrid inference is the intended centrepiece; it is **not built yet**).
Repo: github.com/Swarnabha07/RapidAID · Live: rapid-aid-two.vercel.app · Firebase project id: `rapidaid-9c11e`.
Roles: citizen (`victim`), `medical`, `rescue`, `admin`. The app assists human responders; it must never make autonomous medical decisions or promise that help is coming.

Team: Swarnabha Banerjee (owner; backend, AI Logic, API integration; uses Claude Free + Codex Free; learning backend), Abhirup Sarkar (frontend, security testing), Rana Pratap Roy (backend, Firestore, auth), Snehasish Saha (dashboards, UI, demo).

Stack (installed, verified from `package.json` / `node_modules`): Next.js 16.4.6 (`cacheComponents: true`, Turbopack), React 19.3.0, TypeScript 5, Tailwind 4.3.3, firebase JS SDK 13.3.0 (with `@firebase/ai` 3.1.0), firebase-admin 14.5.1, Firestore, Firebase Auth, Vercel hosting. devDependency `@firebase/rules-unit-testing ^6.0.0` (Firestore rules emulator tests).
NOT installed (README/docs claim them; align docs in T8): Leaflet, shadcn/ui, Framer Motion, next-pwa, Remote Config. There is no `functions/` directory and no PWA manifest/app-shell service worker (only the FCM service worker exists). **No Firebase App Check is initialised anywhere in the code.**

Pages: `/` landing, `/login`, `/home` (citizen, also reachable by anonymous visitors), `/dashboard` (medical, admin), `/rescue` (rescue, admin).
API routes: `/api/auth/role`, `/api/reports`, `/api/reports/[id]`, `/api/alerts`.
Key code: `lib/firebase/{config,auth,firestore,ai,messaging,admin,server-auth}.ts`, `lib/types/*`, `lib/server/report-security.ts` (T1; responder state machine), `lib/constants/report.ts` and `lib/validation/report.ts` (T2; canonical schema and shared validator).

## 3. Approved decisions and constraints

- **Spark only** (rule 10). Privileged work = Next.js server routes (Admin SDK on Vercel). Scheduled work = an external HTTP cron calling a secured route (plus a responder-dashboard sweep as backup), described honestly (rule 18).
- All responder actions and privileged writes go through authenticated Next.js server routes.
- Citizens create reports with the Firestore client SDK (keeps offline persistence). **No second offline queue.** A server fallback (`POST /api/reports`) exists for when the client write is rejected.
- Every new email/Google account = `victim`; elevated roles only via `scripts/set-role.mjs`.
- Custom token claims are the only trusted role source (rules and server).
- Keep existing UI/architecture; no redesign; no new dependencies; no package upgrades.
- Process: plan -> approval -> code; one consolidated patch per task (T1..T8) with PowerShell apply commands.
- Owner works on Windows (working tree CRLF, git index LF). Patches are LF; apply with `git apply --ignore-whitespace` (a plain `git apply` fails on CRLF files — verified in T1).
- Read `AGENTS.md` and the installed Next docs (`node_modules/next/dist/docs/`) before touching Next code (this Next version has breaking changes). Already read in the audit: Route Handlers + Cache Components (GET handlers may be prerendered unless they use request/runtime/uncached data; `params` is a Promise; both `middleware.md` and `proxy.md` exist in this version).
- Historical note: the original "exposed test credentials must not remain usable" constraint has been superseded by the owner's decision in section 5 (accounts retained, rotation deferred).

### T2 decisions (owner-approved, 2026-11-24)
1. Canonical constants in `lib/constants/report.ts`; browser-safe shared validation and report building in `lib/validation/report.ts`; `lib/server/report-security.ts` re-exports for compatibility.
2. The citizen-create document shape is unchanged except: `processedBy` is pinned to `"manual"` and `confidenceScore` to `null` for direct citizen writes; `accessConditions` is an optional key; `assignedDashboard` must equal the routing of `category`. `processedAt` and `escalationLevel` are server-managed, type-level additions only.
3. Client initial activity-trail wording is canonical (`"Emergency report created"` / `"⚡ Emergency SOS Triggered"`, note `"Instant SOS beacon"`).
4. No npm scripts and no dependencies were added.
5. `lib/types/user.ts` was reviewed and left unchanged (section 10.6).
6. `lib/types/alert.ts` was aligned with what `/api/alerts` really writes, without touching the alerts route (T7).
7. Misleading "AI triage" dashboard labels were replaced with neutral wording.

### Audit recommendations (treated as approved unless the owner objects — confirm when each task starts)
- Escalation (single MVP policy, resolves a documented conflict between the handoff docs): unacknowledged = `status == "received"`; **critical 10 min, high 20 min; 5-minute sweep**; sets `escalated`, `escalatedAt`, `escalationLevel`, high -> critical (weight 3); writes `escalationLog` + activity entry; idempotent via the `escalated` guard. The thresholds now live in `ESCALATION_POLICY` (`lib/constants/report.ts`); T6 must use them and replace the demo thresholds (2/5/10/20) and the non-existent "Medium" level in `escalation-watch.tsx`.
- SOS with no medical content routes to `rescue`, critical. *(Recommended in the audit; the owner's approval of this specific routing is not separately recorded — reconfirm in T4.)* SOS reports are never auto-merged (rule 17).
- Dedupe: same category, <=30 min, <=0.5 km (Haversine); oldest non-duplicate is primary; transaction; `FieldValue.increment` on `peopleAffected`; idempotent via `processedAt`; duplicates hidden from queues; uncertain duplicates go to human review.
- App Check: reCAPTCHA provider, debug token for localhost. Per the official hybrid-inference page (as read during the original audit; not re-verified since), Firebase automatically enforced App Check for Firebase AI Logic in all projects on 2 Nov 2026; the repo has no App Check, so cloud Gemini calls from the client probably fail today (console state not inspected).
- Cloud model default: the code/`.env.example` currently use `gemini-3.5-flash`; the audit recommended `gemini-3.5-flash-lite` via env var. The model-list pages changed between snapshots seen, so **re-verify on the official Firebase "Models" page before T3**; `gemini-3.5-pro` in the current `SUPPORTED_GEMINI_MODELS` list was not found in the lists retrieved.
- Hybrid AI must use `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE })` + `initializeDeviceModel()` after a user gesture (desktop Chrome 139+; on-device is single-turn; text/image input only); take the inference source from the SDK response (`inferenceSource`, section 15.2), not from the UI. Phones mostly get cloud or manual input — say so plainly in the demo.
- Offline shell: minimal hand-written service worker + manifest (no new package). Firestore persistence alone does not make the app load offline.
- Voice note: no audio storage (stretch: small base64 clip in Firestore). Cloud Storage for new buckets is believed to need Blaze (unverified) — avoid.
- FCM targeting: in-app alert feed first; push uses coarse `geoCell` + exact Haversine, radius cap 25 km, `in` queries chunked by 30; opt-in location consent.
- Firestore cannot do native radius queries; never rely on a simple lat/lng range query.

## 4. Implementation status and Git state

| Task | Status |
|---|---|
| T1 Security lockdown | **Completed; merged into `main`.** Owner-confirmed Preview test + rules emulator run. |
| T2 Canonical schema, shared constants/types/validators, indexes, truthful mappers | **Implemented in a patch (baseline `f998cd7`); completed only after the owner applies, verifies and merges it.** |
| T3 Hybrid AI (official InferenceMode) + App Check | **Next — planning only first** |
| T4 Report intake UI (text form, SOS fixes, non-blocking submit, pending/synced/failed) | pending |
| T5 Responder actions and dashboards (remove mock fallbacks, surface errors, limits, on-demand summaries) | pending |
| T6 Process (dedupe) + escalation route/log + real Escalation Watch | pending |
| T7 Alerts (create form, citizen feed, geoCells, optional FCM) | pending |
| T8 PWA shell, seed/docs alignment, demo checklist, end-to-end test | pending |

### Git history relevant to this handover (verified from GitHub, 2026-11-24)
- Branches: `main`, `security/t1-lockdown` (tip `45fad82`), `feat/api-routes`, `feat/firebase-integration` (the last two are old).
- `bf723f2` — merge: T1 security lockdown (T1 tip `45fad82` is an ancestor of `main`).
- `39dfc47` — feat: support anonymous emergency report submissions (anonymous auth in the two citizen components, `getCurrentLocation`, `firebase.json` anonymous provider, the rules emulator test suite, `firebase.rules-test.json`, the `@firebase/rules-unit-testing` devDependency).
- `f998cd7` — fix: connect emergency help buttons to anonymous authentication (`components/landing/emergency-help-button.tsx` and the landing navbar/hero/closing CTA). **This was `main` HEAD when T2 was written.**
- The supplied source ZIP had identical content to `main@f998cd7` (compared ignoring CRLF; the ZIP has no `.git`).

## 5. Test accounts and role audit (owner decision — supersedes the earlier "delete the test accounts" advice)

**Decision (explicit, from the owner): retain all four existing test accounts, their existing Firebase Auth UIDs and their Firestore user documents. Do not delete them. Password rotation is intentionally deferred until the owner decides to do it.**

| Email | Existing UID | Intended role |
|---|---|---|
| victim@rapidaid.test | z6TqvV5JgaS0LennYIGEdg3f0ik2 | victim |
| medic@rapidaid.test | p4udtU8frJXHJuZHy9Mz6FYbbrx2 | medical |
| rescue@rapidaid.test | MhhtbuRwiPUlrahFVLSgVqE8ySh2 | rescue |
| admin@rapidaid.test | Mm8jszhP74N9mRbObp8CmKjIFdK2 | admin |

Two other existing Firebase accounts were **not** modified: `H7f71pzRUkVEhoHw3YjDIAvtl992` and `mAM5SbWKRhg5aPq36Rqdk7ntP6z1`. (Anonymous accounts created by visitors since `ensureEmergencyUser()` shipped are additional and are not tracked here.)

**Read-only role audit already run by the owner (during T1):** `node scripts/set-role.mjs --list --project rapidaid-9c11e`
- 6 Auth accounts checked. `medic`: claim `medical`, mirror `medical`. `rescue`: claim `rescue`, mirror `rescue`. `admin`: claim `admin`, mirror `admin`. No mismatches reported. The victim account did not appear in the elevated/mismatch output (`--list` prints only elevated or mismatched accounts).
- **No role changes were made by this audit.** Do not change existing claims or mirrors unless a future audit shows a real mismatch and the owner approves.

**Outstanding security risk (accepted for now):** the old test-account passwords were previously committed to the public Git history of the repository (in `scripts/seed-firestore.mjs`) and must be treated as permanently compromised. The `admin`, `medic` and `rescue` test accounts hold elevated roles, so anyone who found those passwords could sign in with those roles. Recommend rotating all four passwords later; **do not rotate or delete without explicit owner approval.**

## 6. Local service-account setup (local only)

- The owner created a Firebase service-account JSON **outside the repository** at `$env:USERPROFILE\.config\rapidaid\service-account.json`, generated from the existing `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local` without displaying the secret.
- A PowerShell session variable `GOOGLE_APPLICATION_CREDENTIALS` can point at that file (a session variable does not persist to new sessions unless set again).
- `scripts/set-role.mjs` accepts `GOOGLE_APPLICATION_CREDENTIALS` or `--key <path>`.
- `.env.local` is ignored by Git (`service-account*.json` is also gitignored). Never print, request, commit or put the JSON in a patch.
- The owner confirmed the Vercel Firebase Admin environment variables are configured. This credential setup is local only: never instruct the owner to add the JSON file or its contents to Vercel.

## 7. T1 — Security lockdown (COMPLETED, merged) — what was done

**Verification status of T1 (be precise):**
- **Owner-confirmed (not independently verified by an agent):** T1 was tested successfully on a Vercel Preview deployment with no issues or regressions; the existing Firestore rules emulator suite (`tests/firestore/firestore.rules.test.mjs`) was run against the T1 `firestore.rules` and completed successfully. **The exact historical output and test counts are unavailable**, so neither confirmation can be quoted as numbers.
- **Executed by an agent in a scratch Linux clone (T1 time):** `npx tsc --noEmit` exit 0; `npx --yes tsx --test tests/security/report-security.test.ts` 13/13; `npx next build` succeeded; `next start` smoke test of 7 unauthenticated probes returned HTTP 401; `node --check` on both scripts; argument-validation checks of `set-role.mjs` and the seed guards.

New in T1:
- `scripts/set-role.mjs` — trusted role provisioning/demotion and `--list` audit (Admin SDK). Validates arguments before loading credentials; confirmation prompt (`--yes` to skip); revokes refresh tokens; mirrors the role into `users/{uid}`; `--list` shows elevated accounts and claim/mirror mismatches.
- `lib/server/report-security.ts` — pure responder state machine: `planReportAction` (T2 moved the creation validation out; see section 10).
- `tests/security/report-security.test.ts` — 13 unit tests (node:test; run with `npx --yes tsx --test ...`; tsx is NOT a dependency).

Modified in T1:
- `app/api/auth/role/route.ts` — POST never reads a role from the body; keeps an existing valid claim, otherwise sets `victim`; mirrors the role to `users/{uid}`; GET returns the claim role. Response `{success, role, claimsUpdated}`.
- `lib/firebase/server-auth.ts` — `verifyIdToken(token, true)` (revocation check); role from the claim only (`normalizeRole`); removed the users-doc fallback; generic 401 messages; added `jsonError`, `getDashboardForRole`, `resolveActorName`.
- `app/api/reports/route.ts` — POST: strict validation; owner = token uid; server-computed status/weight/dashboard/timestamps; `mediaUrl` forced null; optional client `reportId` written with `create()` so nothing is overwritten (own-report retry -> 200 `duplicate:true`, otherwise 409); 20 KB body cap; no error-message leakage. GET: citizens own reports; medical/rescue only their own dashboard (403 otherwise); admin any; uses the `assignedDashboard + urgencyWeight + createdAt` index; limit 50.
- `app/api/reports/[id]/route.ts` — PATCH is action-based: `{action: acknowledge|assign|escalate|resolve, note?, unitName?, urgency?, reason?, resolutionNote?}`. Firestore transaction; enforces responder role, dashboard ownership (admin = both), valid transitions (acknowledge only from `received`; assign/escalate/resolve from any non-resolved status; resolved is final), urgency can only rise (`critical|high`), computed `urgencyWeight`, server timestamps, trusted actor (`acknowledgedBy` name + `acknowledgedByUid`; trail entries carry `actorUid/actorName/actorRole`), and an `escalationLog` document written in the same transaction (`type:"manual"`, `actor` = uid). **Breaking contract change** (the old loose-field body was removed; only `firestore.ts` called it).
- `firestore.rules` — role from `request.auth.token.get('role','')` only. `users`: read self/admin, create false, update only `displayName|preferredLanguage|fcmToken|lastActiveAt`. `reports`: read owner/any responder; create only with the exact initial shape; update/delete false. `alerts`, `resources`, `escalationLog`: client writes false. Default deny kept.
- `lib/firebase/auth.tsx` — no client-side `users` writes or role choice; after sign-in calls `/api/auth/role` then force-refreshes the token; role state comes from token claims (`normalizeRole`); profile doc is display-only; uses `onIdTokenChanged`. `signInWithGoogle(preferredRole?)` and `signUpWithEmail(..., role?)` keep their signatures but IGNORE the role.
- `lib/firebase/firestore.ts` — `acknowledgeReport`, `assignResponderUnit`, `escalateReportManual`, `resolveReport` keep their signatures (`responderName` ignored) and call the PATCH route through `sendReportAction`. They THROW on failure (dialogs still swallow errors — fix in T5).
- `components/login/login-page.tsx`, `lib/types/user.ts` (`USER_ROLES`, `DEFAULT_ROLE`, `isUserRole`, `normalizeRole`), `scripts/seed-firestore.mjs` (no hard-coded passwords; requires `SEED_TEST_PASSWORD` and `SEED_CONFIRM_PROJECT`; seed data still uses the OLD schema and re-sets claims of existing users by email, so never run it against production), `.env.example`, `README.md`, `documentation.md` (security/role notes).

T1 remaining limitations (still true): old test passwords are public (section 5); no rate limiting on API routes; offline responder actions are impossible by design; `GET /api/alerts` is public and returns `createdBy`/`createdByName`; `POST /api/alerts` still accepts a caller-supplied `alertId` and `active` (T7); responders can READ all reports but WRITE only their own dashboard (decide later whether reads should be dashboard-scoped); a role change takes effect after the user's next token refresh (rules cannot check revocation, so an old token keeps rules-level access up to 1 h).

## 8. Security decisions and important details

- Authorization never reads Firestore. Server role = verified-token claim; unknown/missing => `victim`.
- `acknowledgedBy` stays a display-name string (UI compatibility) plus `acknowledgedByUid`.
- **The citizen-create shape in `firestore.rules` and the shared builder must always match.** Any new field in the citizen payload needs: the constants (`NEW_REPORT_*_KEYS`), the builder/validator, `firestore.rules` (`hasOnly`/`hasAll` and a value check), and tests. `tests/schema/constants-rules-drift.test.ts` fails if the rules and constants diverge.
- **Provenance rule (T2):** a client cannot create a report that claims AI processing. Rules force `processedBy == 'manual'` and `confidenceScore == null`, and the builder ignores any client-supplied value. See section 15.7 for how T3 must treat this.
- Original audit findings fixed by T1: self-service role assignment via `/api/auth/role` and via the user-writable `users` doc; loose report create/update rules; report-ID overwrite through the Admin-SDK `.set()` fallback; spoofable `acknowledgedBy`/`acknowledgedAt`/`urgencyWeight` in PATCH; missing escalation audit on the primary path; committed test passwords.

## 9. Anonymous emergency access (added after the first handover; verified from code)

- `ensureEmergencyUser()` in `lib/firebase/auth.tsx`: waits for `auth.authStateReady()`, reuses an existing signed-in user, otherwise calls `signInAnonymously(auth)`. Anonymous users are **not** passed through `completeSignIn()`: no `/api/auth/role` call, no `users/{uid}` document, **no role claim**, never a responder role.
- Firebase Console (owner-reported): the Anonymous provider is enabled and **automatic cleanup of anonymous accounts is OFF**. `firebase.json` also lists `anonymous: true`.
- `components/landing/emergency-help-button.tsx` (shared by the landing navbar, hero and closing CTA): initialises auth via `ensureEmergencyUser()`, blocks `medical`/`rescue` claims with an alert (admins are not blocked; `RoleGate` on `/home` allows `victim` and `admin`), then routes to `/home`. It does **not** submit a report.
- `components/citizen/emergency-cta-card.tsx` and `quick-start-section.tsx` call `ensureEmergencyUser()` before `createReport(...)`, then `getCurrentLocation()` (rejects with a clear error instead of faking a location).
- Compatibility facts: the effective role of an anonymous user is `victim` (`normalizeRole(undefined)`); in rules `claimRole()` is `''`, so they are not responders; they can create and read only their own reports (`userId == request.auth.uid`); server routes accept their ID token (`verifyIdToken(token, true)`). T2 rules and the schema were designed and tested (emulator test written, see section 11) to keep this working.
- Known consequences: reports are owned by an anonymous uid, so a visitor who clears browser storage loses access to their history (no account linking is implemented); anonymous accounts accumulate (cleanup OFF); there is **no abuse control** yet beyond the rules' shape validation (App Check is T3; rate limiting is not planned).

## 10. T2 — Canonical schema: what the patch implements

### 10.1 Files
Created: `lib/constants/report.ts`, `lib/validation/report.ts`, `lib/types/escalation-log.ts`, `tests/schema/constants-rules-drift.test.ts`, `tests/schema/report-document.test.ts`, `tests/schema/report-mappers.test.ts`.
Modified: `lib/types/report.ts`, `lib/types/alert.ts`, `lib/server/report-security.ts`, `lib/firebase/firestore.ts`, `app/api/reports/route.ts`, `firestore.rules`, `firestore.indexes.json`, `components/citizen/emergency-cta-card.tsx`, `components/citizen/quick-start-section.tsx`, `components/rescue/incident-workspace.tsx`, `components/dashboard/incident-detail-panel.tsx`, `tests/firestore/firestore.rules.test.mjs`, this file.
Deliberately NOT modified: `auth.tsx`, `emergency-help-button.tsx` and the landing components, `server-auth.ts`, `app/api/auth/role/route.ts`, `app/api/reports/[id]/route.ts`, `app/api/alerts/route.ts` (T7), `lib/types/user.ts`, `scripts/*` (seed -> T8), `README.md`/`documentation.md` (no schema tables conflicted with the code), `tests/security/report-security.test.ts` (all 13 tests pass unchanged through the re-exports), `package.json`.

### 10.2 Shared constants — `lib/constants/report.ts` (no imports; browser/server/test safe)
Enumerations as `as const` arrays + derived types: `REPORT_CATEGORIES` (medical, water, shelter, missing_person, other), `REPORT_URGENCIES` (critical, high, normal), `REPORT_STATUSES` (received, in_progress, dispatched, resolved), `REPORT_DASHBOARDS` (medical, rescue), `REPORT_PROCESSORS` (on-device, cloud, manual). `URGENCY_WEIGHTS` (3/2/1) with `urgencyWeightOf`; `dashboardForCategory` (medical -> medical, everything else -> rescue); `REPORT_LIMITS` (description 1000, translatedDescription 1000, address 300, zone 100, reportedInjuries 500, accessConditions 500, note 500, resolutionNote 1000, unitName 80, peopleAffected 1..500); `REPORT_ID_PATTERN`, `LANGUAGE_PATTERN`; `NEW_REPORT_REQUIRED_KEYS` (27), `NEW_REPORT_OPTIONAL_KEYS` (`accessConditions`), `NEW_REPORT_CALLER_KEYS` (`createdAt`, `syncedAt`, `updatedAt`, `activityTrail`); `INITIAL_TRAIL` wording; `CITIZEN_PROCESSED_BY = "manual"`, `CITIZEN_CONFIDENCE_SCORE = null`; `ESCALATION_POLICY` (10/20/5 minutes, for T6).

### 10.3 Shared validation and builder — `lib/validation/report.ts` (browser-safe; no Firebase/Admin import)
- `cleanText`, `validateNewReport(body)` (moved from `report-security.ts`; `lib/server/report-security.ts` re-exports `validateNewReport`, `cleanText`, `REPORT_CATEGORIES`, `REPORT_URGENCIES`, `urgencyWeightOf`, `dashboardForCategory`, so T1 imports keep working).
- Behaviour changes vs T1: `translatedDescription` is `null` when absent (no longer a copy of `description`); `processedBy`/`confidenceScore` are no longer read from the input at all; `location.address`/`zone` are stored only when provided (no empty strings); `accessConditions` is kept (optional, <= 500 chars).
- `buildNewReportFields(validated, {reportId, userId})` builds every non-timestamp field: urgency weight and dashboard derived, status `received`, flags false/null, `mediaUrl` null, **`processedBy: "manual"`, `confidenceScore: null`**, `peopleAffected` (default 1), `reportedInjuries` (default null), and `accessConditions` only when provided. `buildInitialTrailEntry(...)` builds the single initial trail entry (client wording; the server fallback appends ` · Submitted via server fallback` to the note).

### 10.4 Client/server creation consistency
- Client `createReport` (`lib/firebase/firestore.ts`): validates with `validateNewReport`, builds with `buildNewReportFields`, adds `serverTimestamp()` x3 and the trail entry, then `await setDoc` (offline persistence unchanged; no second queue). On a Firestore rejection the existing fallback posts to `/api/reports` with only citizen-provided content (including the `reportId`, so a retry is idempotent). `CreateReportInput` **no longer has** `processedBy`, `confidenceScore`, `status`, `urgencyWeight`, `assignedDashboard` or `mediaUrl`; it gained optional `accessConditions`.
- Server fallback `POST /api/reports`: same validator and builder, owner = token uid, `FieldValue.serverTimestamp()` x3, trail actorRole = `citizen` for `victim` (otherwise the caller's role, as before), `ref.create()` so nothing is overwritten. Unchanged: 20 KB cap, 200 `duplicate:true` for an own retry, 409 for someone else's id.
- The two anonymous-auth components only lost their `processedBy`/`confidenceScore` lines (now compile errors and fabricated provenance).

### 10.5 `accessConditions` (traced, preserved)
Used by: the rescue mapper (`mapReportToRescueIncident`, shown in `incident-workspace.tsx`), the seed data (two documents), mock data in `lib/types/rescue.ts`, and the T1 server fallback (which accepted and stored it). No current form collects it and the T1 rules did not allow it on the client path (so the two paths were inconsistent). Decision: it is a meaningful optional field, so it is kept in the canonical schema as an optional key on both paths (client writes it only when provided; rules allow it as an optional string/null <= 500 chars). Nothing was removed.

### 10.6 Types
- `lib/types/report.ts`: enums are re-exported from the constants; `ReportProcessor` now includes `"manual"`; `confidenceScore: number | null`; added `processedAt?`; documented `escalationLevel?`, `accessConditions?`. `peopleAffected` and `reportedInjuries` stay optional on the **read** model (legacy/seed documents may lack them); the write model always sets them.
- `lib/types/escalation-log.ts` (new): `EscalationLogEntry` (`logId, reportId, triggeredAt, type auto|manual, reason, previousUrgency, newUrgency, actor, actorName, actorRole`); `planReportAction`'s `escalationLog` type is derived from it (behaviour unchanged).
- `lib/types/alert.ts`: `ALERT_SEVERITIES`; `Alert` now matches `POST /api/alerts`: `coordinates` and `radiusKm` nullable, `createdByName`, `active` required, optional `geoCells` (reserved for T7). The alerts route itself is untouched.
- `lib/types/user.ts`: **unchanged.** It already matches the canonical users schema (`userId, role, displayName, preferredLanguage, fcmToken, createdAt, lastActiveAt, email?`, plus a currently unwritten `phoneNumber?`); `geoCell` is deliberately left for T7. `UserProfile.role` remains a display mirror; stored role name stays `victim`.

### 10.7 Mappers (`lib/types/report.ts`) — truthful
Removed: the canned AI summaries ("Gemini Nano 4", "Cross-referenced against regional reports", "multi-source synthesis…"), the fake "On-device Gemini Nano" timeline actor, the invented "North District" zones, the "Medical triage indicated · Field verification pending" injuries text, and "Last verified via … sync". Added: `describeLocation` (never throws on missing/partial `location`), `describeProcessing` (states only what the document records), `NO_AI_SUMMARY_LABEL`, `ZONE_UNKNOWN_LABEL`. A stored `aiTriageSummary`/`aiTriageLabel` is passed through unchanged. Rescue `lastVerified` now reads `Report source: <processing description>`; the default triage label is `REPORTED <URGENCY>` (not "ESTIMATED"). Dashboard text changed: `incident-workspace.tsx` "AI triage · …" -> "Triage · …" (the Sparkles icon is unchanged), `incident-detail-panel.tsx` "AI triage / decision support" -> "Triage / decision support". Not changed (deferred to T5/T6): `acknowledgementOverdueBy: "Overdue"` when `escalated`, the "Verified Coordinator"/"· Reviewed" fallbacks, mock `INCIDENTS` fallbacks, demo timers in the escalation watches.

### 10.8 Firestore rules (repo copy; owner must redeploy — section 13)
- `isValidNewReport`: `processedBy == 'manual'`, `confidenceScore == null` (was: on-device|cloud and a number 0..1); `assignedDashboard` must equal `category == 'medical' ? 'medical' : 'rescue'` (was: any of the two); `accessConditions` allowed as an optional key (`hasOnly` includes it, `hasAll` does not) with a string/null <= 500 value check. Everything else (27 required keys, SOS => critical, weight consistency, `status == received`, `createdAt/syncedAt/updatedAt == request.time`, single citizen trail entry, bounds) is unchanged. Header comments document the provenance rule, the constants mirror and anonymous users.
- `users`, `alerts`, `resources`, `escalationLog` rules are unchanged.

### 10.9 Indexes (`firestore.indexes.json`; owner must deploy — section 13)
Deleted `(assignedDashboard ASC, urgency DESC, createdAt DESC)` (sorted alphabetically; no query uses `urgency` for ordering — verified by grepping every `orderBy`). Added `(category ASC, createdAt DESC)` for T6 dedupe. Kept `(assignedDashboard ASC, urgencyWeight DESC, createdAt DESC)` (medical/rescue queues, `GET /api/reports`), `(userId ASC, createdAt DESC)` (citizen history), `(status ASC, escalated ASC, createdAt ASC)` (T6 sweep). The `alerts.expiresAt` field override is unchanged. **Whether the live project actually has the old indexes was never inspected.** T6 note: Firestore `== null` does not match a field that is absent, so the sweep/dedupe must treat absent `processedAt` / `escalationLevel` as "not processed / level 0" (query by `createdAt` and filter in code, or write explicit nulls from the server).

## 11. Commands and tests

### Verification of the T2 patch — executed by the agent (scratch Linux clone of `main@f998cd7` + patch, `npm ci`)
- `npx tsc --noEmit`: exit 0.
- `npx --yes tsx --test tests/security/*.test.ts tests/schema/*.test.ts`: **39 tests, 39 pass, 0 fail** (13 existing T1 tests unchanged + 26 new T2 tests: 6 drift, 12 document/builder, 8 mapper).
- Mutation checks of the drift test (temporarily widening `processedBy`, adding an extra allowed key, changing the description limit, re-adding an `urgency` index): each was caught; the files were restored and the suite is green.
- `npx eslint .`: 34 errors / 10 warnings — **identical to the baseline of `main@f998cd7`** (the handover's earlier "35/9" was from before the anonymous-auth commit). Per-file counts for the four edited files that have findings are unchanged (all pre-existing).
- `npx next build` with dummy `NEXT_PUBLIC_FIREBASE_*` env: succeeded; routes `/`, `/dashboard`, `/home`, `/login`, `/rescue`, `/api/alerts`, `/api/auth/role`, `/api/reports`, `/api/reports/[id]`.
- `git diff --check`: clean. `node --check tests/firestore/firestore.rules.test.mjs`: syntax OK.

### NOT executed by the agent (the sandbox cannot do it)
- **The Firestore rules emulator suite** (`tests/firestore/firestore.rules.test.mjs`, now 29 tests: the 22 existing ones, with the shared fixture changed to `processedBy: "manual"`, `confidenceScore: null`, plus 7 new cases). The agent installed `firebase-tools` but the emulator JAR download (`storage.googleapis.com`) is blocked in the sandbox, so **the updated rules and the new rules tests are UNTESTED by any agent.** The owner must run it (command below) before deploying the rules.
- Live deployed rules/indexes inspection, authenticated API flows against real Firebase, browser/offline behaviour, anonymous sign-in against the real project, Vercel Preview/Production behaviour after T2.

### Rules emulator command (PowerShell, from the repo root; needs Java; downloads `firebase-tools` on demand, no repo change)
```powershell
npx --yes firebase-tools emulators:exec --only firestore --project demo-rapidaid-rules --config firebase.rules-test.json "node --test tests/firestore/firestore.rules.test.mjs"
```
The test file connects to `127.0.0.1:8080` (the port in `firebase.rules-test.json`).

### General verification loop for every iteration
`npm ci` -> `npx tsc --noEmit` -> `npx eslint .` (must not exceed 34 errors / 10 warnings; do not add findings) -> `npm run build` (dummy `NEXT_PUBLIC_FIREBASE_*` env if needed) -> `npx --yes tsx --test tests/security/*.test.ts tests/schema/*.test.ts` plus any new tests -> the rules emulator command whenever `firestore.rules` changes -> `git diff --check`. Report honestly what was NOT run.

## 12. Remaining issues and known limitations

- **T2 is unapplied until the owner applies it; rules/indexes redeploy is a manual owner step** (section 13). The rules change is **stricter**, which creates a transition risk for reports queued offline by an older client bundle (section 13).
- The deployed rules/indexes/claims/App Check state/billing plan were never inspected by an agent.
- `processedBy` of existing/seed documents may still be `on-device`/`cloud` (legacy); mappers tolerate it, and describe it only as "as recorded on the report".
- Old test-account passwords are in the public Git history (section 5) — accepted, rotation deferred.
- Dashboards still fall back to mock `INCIDENTS`; dialogs close as "success" even when the server rejects (T5). Rescue "fire"/"evac" tabs are mock. Maps are visual mocks (no Leaflet). Escalation Watch/ack watch use demo timers and thresholds; `acknowledgementOverdueBy` shows "Overdue" for any escalated report (T5/T6).
- `GET /api/alerts` is public and returns `createdBy`/`createdByName`; `POST /api/alerts` still accepts a caller-supplied `alertId`/`active`; no alert creation UI, no citizen alert feed (T7).
- No rate limiting; anonymous report creation is unauthenticated spam-capable beyond the rules' shape checks (App Check in T3).
- AI: `lib/firebase/ai.ts` is unused; no App Check; no free-text report form (the quick-start card submits a canned description; the SOS card hard-codes category `medical` and a canned description); offline `await setDoc` blocks the UI, and `SyncStatusCard` is a hard-coded "connected / all synchronized" display (T4).
- FCM: `requestPushPermission` is never called, no VAPID key in `.env.example`, a single `fcmToken` per user, and the service worker pins Firebase 10.13 compat while the app uses 13.3 (T7).
- Seed data uses the legacy schema (numeric `confidenceScore`, `on-device`/`cloud`); the script is intentionally unsafe to run on production (T8).
- Docs vs code drift: README/documentation claim Gemini Nano 4, Leaflet, shadcn, Framer Motion, next-pwa, Remote Config (T8). The handoff doc's AI function signatures differ from the code.
- Cosmetic: `tests/firestore/firestore.rules.test.mjs` and `firebase.rules-test.json` start with a UTF-8 BOM (left as is).
- The hackathon submission deadline was never verified — the owner should check Devpost.

## 13. T2 manual rollout (owner steps; nothing was deployed by any agent)

1. Apply the patch on a branch, run the verification loop (section 11) **including the rules emulator command**, merge via the normal Git workflow.
2. **Order:** deploy the code (Vercel) first, then publish the new `firestore.rules`, then the indexes. Reason: new code sends `processedBy: "manual"` / `confidenceScore: null`, which the *old* rules reject (the server fallback would still save the report); old code sends `"cloud"`/`"on-device"`, which the *new* rules reject. Keep the gap between the code deploy and the rules publish short.
3. **Transition risk:** a report written offline by an OLD bundle and still queued in a browser's IndexedDB would be rejected by the new rules when it syncs (the Firestore SDK drops rejected writes). Test with a clean browser profile; accept or manage this for the demo.
4. Indexes: first compare Firestore -> Indexes in the console with `firestore.indexes.json` (the live state was never inspected). `firebase deploy --only firestore:indexes` normally asks before deleting an index that is not in the file (not verified here); the `urgency DESC` index is the unused one. New indexes take a few minutes to build.
5. Smoke test after deploy: anonymous SOS from the landing page; quick-start report; a medic/rescue acknowledge; confirm the stored document has `processedBy: "manual"`, `confidenceScore: null`.

## 14. Implementation roadmap

### Five-day plan (dependency-ordered; prioritise working end-to-end features over extras)
- Day 1 — Security foundation (T1, done) and schema (T2).
- Day 2 — Report intake: App Check and hybrid AI module (T3), text report form, non-blocking `createReport`, truthful badges, SOS fixes (T4).
- Day 3 — Responder side: actions via server routes, remove mock fallbacks and surface errors, queue limits, on-demand cloud summaries (T5).
- Day 4 — Automation: process route (dedupe), escalation cron and log, real Escalation Watch, service worker for the app shell (T6, start of T8).
- Day 5 — Alerts and polish: alert form and feed, optional FCM, update seed and docs, end-to-end test in desktop Chrome with Nano plus offline mode, demo script (T7, T8). Day 5 is also the buffer.
- **If days run short, cut in this order:** 1. FCM push. 2. Voice note. 3. PWA shell polish. 4. Summaries beyond critical reports.
- *(Calendar days are indicative; the hackathon deadline was not verified.)*

### Iterations — one prompt and one patch each
**T1 — Security lockdown** — *Completed (section 7).*
**T2 — Canonical schema** — *Implemented in a patch (section 10); completed after the owner applies, verifies and merges it.*
**T3 — Hybrid AI and App Check** — *Next. Full handover in section 15.*
**T4 — Report intake UI** — text report form (description, language, category, people affected, injuries, optional accessConditions); correct SOS category and location handling; non-blocking offline-first submission (do not `await` server acknowledgement; use snapshot `hasPendingWrites` for pending/synced); clear pending, synced and failed states; truthful AI processing indicators; remove hard-coded "connected/synchronized" wording; preserve the existing design. Depends on T2, T3. Keep the Firestore-client create path and rules; update the rules' create shape in lock-step if the payload changes.
**T5 — Responder actions and dashboards** — real data only (remove mock `INCIDENTS` fallbacks and simulated operational data), surface action failures instead of showing success, queue limits (`limit(100)`) and filters (hide duplicates), on-demand cloud summaries only when justified and within free-tier limits, role-based access enforced server-side. Depends on T1, T2, T3. Do not weaken the T1 server checks.
**T6 — Process and escalation** — secure process/dedupe route (same category, <=30 min, <=0.5 km; `processedAt` guard; transaction; atomic `peopleAffected` increment; audit trail; **SOS never auto-merged**; human review for uncertain duplicates); escalation route + auditable `escalationLog` (`type:"auto"`, actor `system_timeout`); real Escalation Watch driven by `ESCALATION_POLICY`; scheduled execution only if a genuine secure free-tier mechanism exists. Depends on T2 (constants, indexes), T5. Any cron route needs a secret and an honest description (Vercel Hobby cron limits were not verified).
**T7 — Alerts** — alert creation form; citizen feed (Firestore listener on unexpired alerts, works from cache); `geoCells` (coarse cells + exact Haversine, radius cap 25 km); optional FCM; alert writes via `POST /api/alerts`; harden the public GET and caller-supplied `alertId`/`active`. No claim that anyone was notified unless delivery is confirmed.
**T8 — Offline shell and documentation** — minimal service worker + manifest (no new package; cache only safe static assets; never private API/auth/user responses); update the seed script to the canonical schema (still dev-project-only); correct README/documentation; demo checklist; desktop-Chrome end-to-end run with Nano and offline sync recovery.

## 15. T3 — AI integration: handover for the next agent

> **T3 is PLANNING ONLY until the owner approves your plan. Do not write T3 code first.** The items below record what is verified and what is open, so you do not need to repeat earlier investigations.

### 15.1 Objective and scope
Implement Firebase AI Logic hybrid inference (on-device Gemini Nano via Chrome's built-in model with cloud Gemini as fallback) so that the citizen intake can obtain an **advisory** classification of a free-text report: category, urgency, language, optional translation, people-affected estimate and a confidence value, via one structured-output call. App Check (reCAPTCHA provider; debug token on localhost) is part of T3 because Firebase AI Logic cloud calls are enforced by App Check per the official page (audit reading, not re-verified). Manual category/urgency pickers must remain the offline / no-Nano / failure fallback. **Out of scope:** the report form UI and non-blocking submit (T4), responder dashboards/summaries (T5), dedupe/escalation (T6), alerts (T7).

### 15.2 What exists today (verified in the current source)
- `lib/firebase/ai.ts` (about 8 KB) is **imported nowhere** (grep). It uses `getAI(app, { backend: new GoogleAIBackend() })`, `getGenerativeModel` for cloud (`getCloudGeminiModel`), `DEFAULT_GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3.5-flash"`, `SUPPORTED_GEMINI_MODELS = ["gemini-3.5-flash","gemini-3.5-pro"]`, and a **legacy** on-device path through `window.ai.languageModel` (`checkOnDeviceNanoAvailability`, `executeAIInference`, `executeJsonInference` which strips code fences and `JSON.parse`s with no schema). That legacy path does **not** use the official `InferenceMode`; `executeAIInference` labels `source` by which branch ran inside the app, not by the SDK. Treat it as replaceable; preserve nothing that contradicts the approach below.
- `.env.example` already has `NEXT_PUBLIC_GEMINI_MODEL=gemini-3.5-flash`. No App Check code exists anywhere. `lib/firebase/config.ts` exports `app`, `auth`, `db` (persistent multi-tab cache) and messaging helpers; `app` is the object to hand to `getAI` and `initializeAppCheck`.
- Verified in the installed SDK typings (`firebase` 13.3.0 / `@firebase/ai` 3.1.0): `getGenerativeModel(ai, ModelParams | HybridParams)`; `HybridParams = { mode: InferenceMode; onDeviceParams?; inCloudParams? }`; `InferenceMode.PREFER_ON_DEVICE = "prefer_on_device"`, `ONLY_ON_DEVICE`; `GenerativeModel.initializeDeviceModel(onDownloadProgress?)`; the response exposes `inferenceSource?: InferenceSource` where `InferenceSource.ON_DEVICE = "on_device"` and `IN_CLOUD = "in_cloud"` (**note the underscores: they differ from the report enum values `on-device` / `cloud`; map explicitly**). `firebase/app-check` exports `initializeAppCheck`, `ReCaptchaV3Provider`, `ReCaptchaEnterpriseProvider`. Verify against the official Firebase docs before relying on any of it (model identifiers, quotas, Chrome versions, App Check enforcement, exact `onDeviceParams` / structured-output options were not read in full).
- Report-side readiness from T2: `processedBy` enum already includes `on-device` | `cloud` | `manual`; `confidenceScore: number | null`; `processedAt?`; `aiTriageSummary?`/`aiTriageLabel?` exist on the type and are passed through by the mappers unchanged; the mappers no longer fabricate AI text.

### 15.3 Integration architecture (Spark-compatible)
- Firebase AI Logic is a **client SDK** feature (browser, `GoogleAIBackend` = Gemini Developer API free tier). There is no server-side Firebase AI Logic call in this architecture, and **no Cloud Functions** (Spark). Privileged server routes (Admin SDK on Vercel) must not call the browser SDK.
- New module(s) under `lib/ai/` (e.g. `classify.ts`) wrapping the SDK, plus App Check initialisation near `config.ts`; keep the client hybrid path separate from privileged server operations. Never place Admin credentials or non-`NEXT_PUBLIC_` secrets in browser code.

### 15.4 Data flow (current, and where T3 plugs in)
1. Citizen (signed-in or anonymous, section 9) enters or selects report details on `/home`.
2. **T3 step (client, advisory, optional, non-blocking):** run the hybrid classification on the text; show suggestions the person can accept or override; the manual pickers always work.
3. Client `createReport` (T2) validates with the shared validator, builds the document (`processedBy: "manual"`, `confidenceScore: null`) and writes with Firestore persistence (works offline); on rejection it falls back to `POST /api/reports`.
4. Rules accept only the exact shape; responders see the report in their queue via the dashboard listeners; responders act via `PATCH /api/reports/[id]`.
Where AI output is stored, and who may write it, is **open decision D1** (15.7).

### 15.5 Security and privacy requirements
- AI is advisory only: no autonomous medical decisions; suggestions are confirmed by a human; no promise that help is coming; always keep "Not a diagnosis. Authorized human review required."
- **No client-trusted AI results:** a browser can claim anything. T2's rules deliberately reject a citizen write that claims `on-device`/`cloud` or a confidence value. Do not loosen `processedBy == 'manual'` / `confidenceScore == null` to "make AI work".
- No fabricated provenance; derive the source from the SDK's `inferenceSource`, never from UI state or a model name string.
- Do not send private data beyond what is needed (description text only; no names, emails, uids, exact location unless justified); do not log report text; do not expose server operations; keep demo data simulated.

### 15.6 Offline behaviour
- On-device inference can run offline only where Chrome supports it (desktop Chrome 139+ per the audit reading; the model must already be downloaded; `initializeDeviceModel()` needs a user gesture; phones mostly get cloud or manual input — state this plainly). Cloud inference needs connectivity.
- A report submitted offline is created `manual` through the existing Firestore offline queue; **AI must never block or delay submission**. Post-sync enrichment (if the owner approves any) must **update the existing document by its `reportId`** through a trusted path and be guarded by a processed marker, so it can never create a second report; `reportId` is generated before the write, rules/`create()` prevent overwrites, and the server fallback is idempotent (200 `duplicate:true`). SOS reports are never merged or deduplicated.

### 15.7 Provenance (`processedBy`, `confidenceScore`, `processedAt`) — the key T3 decision
Truthful population rules (binding):
- Citizen direct writes: always `manual` / `null` (rules-enforced).
- `on-device` / `cloud` may be written **only by trusted Admin-SDK server code that itself ran, or can genuinely attest, the processing**. Client-reported inference is *advisory and unattested* and must not set these fields. `confidenceScore` is `null` unless a value comes from attested processing (0..1). `processedAt` is a server-set timestamp (absent/null until server processing completes); it is also T6's idempotency marker, so do not repurpose it for something else without a decision.
**Open decision D1 (needs owner approval, present options in your plan):** because the rules force `manual`, an AI-assisted citizen report needs a deliberate design. Options: (A) client suggestion only; the person confirms; the report stays `manual` and no AI provenance is stored (simplest, honest); (B) add an optional, clearly labelled **client-declared advisory block** (for example a map such as `aiAssist` with source from the SDK, a confidence and suggested values, labelled "declared by the submitting device, unverified") with a rules, builder, constants and test update, keeping `processedBy: "manual"`; (C) a server-side processing route that calls a model with a server-held key (this is **not** Firebase AI Logic, needs a new secret/service, and requires owner approval under the Spark/no-new-service rules); (D) responder-side on-demand summaries stored through a server route (belongs to T5). Recommendation for the plan: start with (A), consider (B) if the owner wants provenance badges.

### 15.8 Failure handling (define in the plan; minimum expectations)
AI unavailable, App Check failure, quota/429, offline, timeout (set an explicit client timeout, e.g. 8–10 s, to be justified), non-JSON or schema-invalid output, low confidence (< 0.8 -> retry once in cloud mode when online, per the approved design), or the user cancelling: show a neutral message, fall back to the manual pickers, never block submission, never claim AI processed the report, never store partial/unvalidated AI output. Validate every AI response against the shared enums (`REPORT_CATEGORIES`, `REPORT_URGENCIES`, `LANGUAGE_PATTERN`, limits in `REPORT_LIMITS`) before use; treat the output as untrusted input.

### 15.9 Spark restrictions: compatible vs needs approval
Compatible: Firebase AI Logic with the Gemini Developer API backend from the browser (free tier; re-verify quotas and current free-tier terms); Firebase App Check with reCAPTCHA (free; needs a reCAPTCHA site key and console registration = **owner action in the Firebase Console**); the debug token for localhost. **Requires approval or a plan change:** the Vertex AI backend (needs Blaze), Cloud Functions, any paid scheduler/service, Cloud Storage, a server-held Gemini key/new secret (option C), any new package, enforcing App Check in the console (owner action; could break existing clients until the code is deployed).

### 15.10 Prerequisites and dependencies
T2 applied, verified and merged (section 0); the updated rules/indexes deployed (section 13); decision D1; the owner's console steps for App Check (site key, debug token registration); verification of the official Firebase documentation for models, quotas, `InferenceMode`/`inferenceSource`, Chrome requirements and App Check enforcement; env vars (`NEXT_PUBLIC_GEMINI_MODEL`, a new public App Check site-key variable if needed; update `.env.example` only for what is genuinely required).

### 15.11 Files to inspect before planning
`AGENT_IMPLEMENTATION_CONTEXT.md` (this file), `AGENTS.md`, `package.json`, `.env.example`, `lib/firebase/ai.ts`, `lib/firebase/config.ts`, `lib/firebase/auth.tsx`, `lib/firebase/firestore.ts` (`createReport`), `lib/constants/report.ts`, `lib/validation/report.ts`, `lib/types/report.ts`, `firestore.rules`, `app/api/reports/route.ts`, `app/api/reports/[id]/route.ts`, `lib/firebase/server-auth.ts`, `components/citizen/emergency-cta-card.tsx`, `components/citizen/quick-start-section.tsx`, `app/(user)/home/page.tsx`, `components/landing/emergency-help-button.tsx`, `tests/schema/*`, `tests/security/*`, `tests/firestore/firestore.rules.test.mjs`, `node_modules/@firebase/ai/dist/ai-public.d.ts`, `node_modules/@firebase/app-check/dist/app-check-public.d.ts`, `node_modules/next/dist/docs/` (before touching Next code).

### 15.12 Testing requirements for T3
- Unit: parsing/validation of AI output against the shared enums (valid, invalid enum, extra fields, oversized text, non-JSON, code-fenced JSON), confidence thresholds and the retry decision, mapping `InferenceSource` (`on_device`/`in_cloud`) to the report enum, timeout and error paths, with the SDK mocked (no network in unit tests).
- Security: no code path lets a client write `on-device`/`cloud`/a confidence value to a report; the drift test and the rules emulator suite stay green (rerun the emulator command whenever rules change); AI text cannot reach privileged server routes unvalidated.
- Offline: DevTools Offline toggle — submit with AI unavailable; report still created and later synced exactly once; no duplicate.
- Manual (owner, desktop Chrome): on-device path with Nano where supported (record browser version), cloud fallback, App Check debug token on localhost, behaviour on a phone (cloud/manual only). Record exactly what was and was not exercised.
- General loop (section 11); ESLint must not exceed 34/10.

### 15.13 Implementation boundaries
T3 = AI module, App Check, provenance handling and its schema/rules/test consequences. T3 must **not** build the report form or SOS fixes (T4), change responder dashboards or summaries (T5), implement dedupe/escalation (T6), touch alerts (T7), alter authentication architecture or the anonymous flow, or add dependencies.

### 15.14 T3 workflow instructions (mandatory)
1. First read this entire file and inspect the current repository.
2. Verify the actual GitHub `main` commit and compare it with the supplied source ZIP; report differences and the commits since `f998cd7`.
3. **Verify that the T2 patch is actually applied** (for example `lib/constants/report.ts`, `lib/validation/report.ts`, `tests/schema/*` exist and `firestore.rules` contains `d.processedBy == 'manual'`) and that its tests pass; if not, stop and tell the owner. Do not assume T2 is implemented because this file says so. Ask the owner whether the updated rules/indexes were deployed.
4. Produce a detailed T3 implementation plan first: exact files, changes, dependencies, risks, tests, approval questions (including D1).
5. **Wait for the owner's explicit approval** before writing implementation code. After approval return **one consolidated unified diff patch** (including the re-created handover).
6. Never edit the owner's repository directly; never commit, push, merge or deploy without explicit permission.

## 16. T3 readiness and remaining work

| Phase | Status |
|---|---|
| T1 — Security lockdown | Completed (merged; owner-confirmed Preview test and rules emulator run) |
| T2 — Canonical schema | Implemented in a patch; completed after owner application, verification (including the rules emulator suite) and merge |
| T3 — AI integration | Next phase; planning and approval required |
| T4 onwards | Pending |

- **What T2 makes possible for T3:** one canonical enum/limit set to validate AI output against; a shared browser-safe validator/builder; the provenance fields (`processedBy` incl. `manual`, nullable `confidenceScore`, `processedAt`) and truthful mappers that already render stored AI summaries/labels without inventing any; a drift test that protects rules/constants consistency; a rules emulator suite to extend.
- **What T3 still needs to implement:** the real hybrid AI module (`InferenceMode`, `initializeDeviceModel`, `inferenceSource`), structured output with validation, App Check, failure/timeout handling, the provenance design (D1) with any rules/schema/test changes, and the `.env.example` additions that are genuinely required.
- **Known blockers / prerequisites:** the owner must apply and verify T2 and run the rules emulator suite; redeploy the rules and indexes (section 13); official-documentation verification (models, quotas, App Check enforcement, Chrome support); owner console actions for App Check.
- **Decisions needing the owner's approval (T3):** D1 (where and how AI provenance is stored); model identifier and free-tier limits after verification; App Check provider/key and when to enforce it in the console; whether any post-sync enrichment is wanted; any server-held model key (option C).
- **Deliberately deferred:** report form and non-blocking submit (T4); dashboard data/summaries/mock removal and the "Overdue" label (T5); dedupe/escalation and the `processedAt`/`escalationLevel` semantics (T6); alerts and `geoCells`/`geoCell` (T7); PWA shell, seed and docs alignment (T8); rotating the old test passwords and account linking for anonymous users (owner decision).

## 17. Notes for the next agent

- Work from a clean LF checkout; the owner's Windows tree is CRLF. Produce `git diff` patches and test them with `git apply --check --ignore-whitespace` on a fresh copy of the repository.
- AI-produced category/urgency are suggestions confirmed by humans, never authoritative.
- Keep demo data simulated; never commit credentials or service-account files.
- Avoid `pkill -f` patterns that can match your own shell command line (this killed a shell once during T1).
- The sandbox used by previous agents could `npm ci`, run `tsc`, `eslint`, `next build` and `tsx --test`, and could install `firebase-tools`, but could NOT download the Firestore emulator JAR (blocked host) and could read GitHub only through `git clone` (the REST API and the fetch tool were rate-limited).
- Information in this document that could not be verified is marked as such. If you find a conflict between this file and the repository, record both facts and ask the owner instead of silently choosing.
