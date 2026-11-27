# RapidAID — Agent Implementation Context

> Self-contained handover for any future Claude / Codex agent. Read it fully before doing anything.
> Update it after EVERY implementation iteration: keep earlier decisions, correct anything that became outdated, append progress.
> Last updated: **2026-11-27, with the T4 (report intake UI) implementation patch. T1, T2 and T3 are COMPLETED and merged (owner-confirmed; T3's external configuration was done and its hybrid AI was verified in production). T4 is implemented in a patch; T5 (responder actions and dashboards) is next.**

## 0. Handover status at a glance

| Phase | Status |
|---|---|
| T1 — Security lockdown | **Completed.** Merged into `main` (`bf723f2`). Owner-confirmed Vercel Preview test and Firestore rules emulator run (see section 7). |
| T2 — Canonical schema | **Completed (owner-confirmed 2026-11-25).** Merged into `main` (PR #5, merge commit `4cf75f0`), pushed, deployed on Vercel; updated Firestore rules and indexes deployed to Firebase; production smoke test passed (existing report/SOS flows work, new reports follow the T2 schema, old reports remain readable). Automated T2 checks the owner reported: TypeScript, 39/39 schema/unit tests, 29/29 rules emulator tests, production build. **T2 is closed: do not reopen or modify it.** |
| T3 — Hybrid AI + App Check | **Completed (owner-confirmed 2026-11-27).** Merged; Firebase AI Logic, Gemini Developer API, App Check, reCAPTCHA Enterprise and the Vercel production environment are configured; local, production, emulator and CLI checks passed; hybrid AI verified in production. **T3 is closed: do not reopen it.** Section 15 is the T3 record. |
| T4 — Report intake UI | **Implemented in a patch (2026-11-27; baseline = the owner's supplied `RapidAID-T4-source.zip`, stated to be in sync with GitHub `main`; the commit hash was not verified).** Counts as COMPLETED only after the owner applies it, runs the owner checks in section 16.7, and merges it. Section 16 is the T4 record. |
| T5 — Responder actions and dashboards | **Next.** Starting points: `T5_HANDOFF.md` and section 16.8. |
| T6 onwards | Pending |

- Baseline for the T3 patch (historical): GitHub `main` at commit **`4cf75f0`** (`Merge pull request #5 from Swarnabha07/feature/t2-canonical-schema`). The supplied source ZIP matched it (compared ignoring CRLF; the ZIP has no `.git` and omits `.env.example`, which exists on `main`).
- **Anonymous emergency access exists**: see section 9. Preserve it.
- **Firestore rules and indexes (T2) were deployed by the owner** after merge (owner-confirmed). The agent cannot read the deployed state. **T3 changes neither rules nor indexes.**
- **Test accounts are retained** (owner decision, section 5). Do **not** delete them or rotate their passwords unless the owner explicitly approves.
- **AI suggestions are a client-side advisory module (T3). T4 uses it in the full report form only (optional, per-field confirmation); one-tap SOS and Quick Start never touch AI. `/ai-check` stays admin-only.** No report is ever stored as AI-processed: every report is still `processedBy: "manual"`, `confidenceScore: null` (decision D1-A, section 3). The legacy `lib/firebase/ai.ts` was deleted in T3.

## 1. Global rules for every future agent (prominent — follow all of them)

1. The owner is a beginner-friendly **Windows PowerShell** user: give exact PowerShell commands and briefly explain important consequences in plain language.
2. **Inspect the current repository and relevant files before proposing or implementing anything.** Do not assume this document is perfectly current; if the repo disagrees, trust the repo and say so.
3. **One iteration at a time, one consolidated patch per iteration.**
4. **Plan first, code second:** give a concise implementation plan and **wait for explicit owner approval** before coding.
5. After approval, return a **unified diff patch only**. Never edit the owner's repository directly.
6. **Include the updated `AGENT_IMPLEMENTATION_CONTEXT.md` in every implementation patch** (re-created as a coherent whole, not just appended).
7. **Never** commit, push, deploy, change Firebase project settings, alter accounts, or run destructive commands.
8. Preserve the existing architecture and UI unless the approved scope requires a change. No redesign.
9. No unnecessary dependencies and no package upgrades. (`@firebase/rules-unit-testing` is an existing devDependency, added by the owner in `39dfc47`. T4 added, with owner approval, exactly `leaflet@1.9.4` and `@types/leaflet@1.9.23`, both pinned; the lockfile also gained the transitive `@types/geojson`. Do not add others without approval; `react-leaflet` was deliberately NOT added.)
10. **Firebase Spark (free) plan only.** No Blaze upgrade, no Cloud Functions, no paid scheduler, no paid services, no Cloud Storage. (Linking billing would also end the Gemini Developer API free tier.) No Gemini API key and no other new secret: Firebase AI Logic uses a Google-managed service account behind the Firebase project, and the web `apiKey` only identifies the project.
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
21. **Never assume the owner approved a deployment, a Firebase Console change, a billing/plan change or a Vercel setting.** State what the owner must do, and wait.

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

### T3 decisions (owner-approved, 2026-11-25)
- **D1 — Option A:** AI gives suggestions only; the person confirms or overrides. Reports stay `processedBy: "manual"` / `confidenceScore: null`. **No AI provenance is stored.** (Option B, a client-declared `aiAssist` block, may be revisited in T4 only together with a rules change.)
- **Cloud model:** `gemini-3.5-flash-lite` (Gemini Developer API through Firebase AI Logic, free tier). It is listed by the official models page as supporting structured output; free-tier quotas for it were **not verifiable** (see 15.9). Override with `NEXT_PUBLIC_GEMINI_MODEL`.
- **Diagnostics:** temporary admin-only `/ai-check` page (T4 may remove it).
- **Legacy module:** `lib/firebase/ai.ts` deleted (it was imported nowhere).
- **App Check:** standard (not limited-use) tokens; no replay protection yet. Provider = **reCAPTCHA Enterprise** (the handover's earlier "reCAPTCHA provider" meant this). Production domain only; localhost = debug provider; Vercel Previews get no token (manual/on-device only).
- **Free tier only:** Spark, Gemini free tier, no Blaze, no Cloud Functions, no Gemini API key.


### T4 decisions (owner-approved, 2026-11-27)
- **D1 kept:** AI provenance unchanged: reports stay `processedBy: "manual"`, `confidenceScore: null`; no `aiAssist` block; no rules change.
- **D2:** add only `leaflet` and `@types/leaflet`; no React Leaflet.
- **D3:** OpenStreetMap standard tiles with attribution, following OSM's public tile usage policy; no offline tile download, prefetch or bulk caching.
- **D4:** SOS category/urgency/description unchanged (`medical`, `critical`, canned text). The audit's "route content-free SOS to rescue" is still NOT applied: T5/T6 may revisit it only with owner approval.
- **D5:** `/ai-check` stays admin-only.
- **D6:** fake citizen history rows removed; a real empty state is shown.
- **D7:** failures are tracked in memory for the current page session only; limitations documented in 16.5.
- Offline map rule: the form must work with GPS or typed coordinates; never block submission on the map or its tiles; never claim an offline map.

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
| T2 Canonical schema, shared constants/types/validators, indexes, truthful mappers | **Completed; merged (`4cf75f0`), deployed, smoke-tested (owner-confirmed).** |
| T3 Hybrid AI (official InferenceMode) + App Check | **Completed; merged, configured, verified in production (owner-confirmed 2026-11-27)** (section 15) |
| T4 Report intake UI (text form, Leaflet location picker, optional AI confirmation, non-blocking submit, real sync states) | **Implemented in a patch (2026-11-27); completed after the owner applies, verifies (16.7) and merges it** (section 16) |
| T5 Responder actions and dashboards (remove mock fallbacks, surface errors, limits, on-demand summaries) | **next** |
| T6 Process (dedupe) + escalation route/log + real Escalation Watch | pending |
| T7 Alerts (create form, citizen feed, geoCells, optional FCM) | pending |
| T8 PWA shell, seed/docs alignment, demo checklist, end-to-end test | pending |

### Git history relevant to this handover (verified from GitHub, 2026-11-24)
- Branches: `main`, `security/t1-lockdown` (tip `45fad82`), `feat/api-routes`, `feat/firebase-integration` (the last two are old).
- `bf723f2` — merge: T1 security lockdown (T1 tip `45fad82` is an ancestor of `main`).
- `39dfc47` — feat: support anonymous emergency report submissions (anonymous auth in the two citizen components, `getCurrentLocation`, `firebase.json` anonymous provider, the rules emulator test suite, `firebase.rules-test.json`, the `@firebase/rules-unit-testing` devDependency).
- `f998cd7` — fix: connect emergency help buttons to anonymous authentication (`components/landing/emergency-help-button.tsx` and the landing navbar/hero/closing CTA). **This was `main` HEAD when T2 was written.**
- The supplied source ZIP had identical content to `main@f998cd7` (compared ignoring CRLF; the ZIP has no `.git`).
- `7091a9b` — feat: implement T2 canonical report schema; `4cf75f0` — Merge pull request #5 (`feature/t2-canonical-schema`). **`4cf75f0` was `main` HEAD when the T3 patch was written** (verified from a fresh GitHub clone; the ZIP matched it ignoring CRLF).

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

### Verification of the T3 patch — executed by the agent (scratch Linux clone of `main@4cf75f0`, `npm ci`, 2026-11-25)
- `npx tsc --noEmit` — exit 0 (baseline also 0).
- `npx --yes tsx --test tests/ai/*.test.ts tests/security/*.test.ts tests/schema/*.test.ts` — **84/84 pass** (the 39 existing tests + 45 new T3 tests: schema 15, App Check 4, classifier 21, provenance guard 5).
- `npx eslint .` — **29 errors, 10 warnings** (baseline 34/10; the 5 fewer errors come from deleting `lib/firebase/ai.ts`; zero findings in any new T3 file).
- `npx next build` (dummy public Firebase env) — success; `/ai-check` is prerendered; 12 routes.
- `git diff --check` — clean.
- Baseline reproduced first on the untouched clone: tsc 0, 39/39, ESLint 34/10.

### NOT executed by the agent (T3)
- **Firestore rules emulator (29 tests):** the sandbox cannot download the emulator JAR (host blocked; retried in T3). Rules and indexes are untouched by T3, so the drift test (part of the 39) still guards them; the owner may re-run the command below as a harmless confirmation.
- **Every live check:** real Gemini/Firebase AI Logic calls, App Check token exchange, reCAPTCHA Enterprise, Chrome's on-device model, Vercel deployment. These need the owner's console setup (15.8) and the manual checklist (15.7).


### General verification loop for every iteration
`npm ci` -> `npx tsc --noEmit` -> `npx eslint .` (current baseline after T4: **22 errors / 10 warnings**; must not exceed it, do not add findings) -> `npm run build` (dummy `NEXT_PUBLIC_FIREBASE_*` env if needed) -> `npx --yes tsx --test tests/ai/*.test.ts tests/security/*.test.ts tests/schema/*.test.ts tests/citizen/*.test.ts` (112 tests after T4) plus any new tests -> the rules emulator command whenever `firestore.rules` changes -> `git diff --check`. Report honestly what was NOT run.

## 12. Remaining issues and known limitations

- **T2 rollout is finished (owner-confirmed).** The transition risk for reports queued offline by an older bundle (section 13) is historical for any browser that has since synced.
- The deployed rules/indexes/claims/App Check state/billing plan were never inspected by an agent.
- `processedBy` of existing/seed documents may still be `on-device`/`cloud` (legacy); mappers tolerate it, and describe it only as "as recorded on the report".
- Old test-account passwords are in the public Git history (section 5) — accepted, rotation deferred.
- Dashboards still fall back to mock `INCIDENTS`; dialogs close as "success" even when the server rejects (T5). Rescue "fire"/"evac" tabs are mock. The responder dashboards' maps (`LiveMap`, `FieldMap`) are still CSS mocks; Leaflet exists only in the citizen report form (T4). The responder-side map is T5 scope. Escalation Watch/ack watch use demo timers and thresholds; `acknowledgementOverdueBy` shows "Overdue" for any escalated report (T5/T6).
- `GET /api/alerts` is public and returns `createdBy`/`createdByName`; `POST /api/alerts` still accepts a caller-supplied `alertId`/`active`; no alert creation UI, no citizen alert feed (T7).
- No server-side rate limiting; anonymous report creation is unauthenticated spam-capable beyond the rules' shape checks. **T3 adds App Check for AI Logic only** (enforcement is a console step, 15.8); App Check is deliberately NOT enforced for Firestore/Auth (it would break anonymous SOS and offline writes).
- **T4 limits:** see 16.5 (session-only failure tracking, no recovery of a write the server rejects after a reload, anonymous sign-in needs one online visit, OSM tiles need a connection, no map download for offline).
- FCM: `requestPushPermission` is never called, no VAPID key in `.env.example`, a single `fcmToken` per user, and the service worker pins Firebase 10.13 compat while the app uses 13.3 (T7).
- Seed data uses the legacy schema (numeric `confidenceScore`, `on-device`/`cloud`); the script is intentionally unsafe to run on production (T8).
- Docs vs code drift: README/documentation claim Gemini Nano 4, Leaflet, shadcn, Framer Motion, next-pwa, Remote Config (T8). The handoff doc's AI function signatures differ from the code. T3 corrected the setup/App Check/AI text in README and documentation.md only where it was wrong or contradicted the free-tier rule; the broader cleanup remains T8.
- **T3 limits to remember:** on-device Gemini Nano accepts only a few Latin-script languages (declared as English here); Bengali/Hindi/any non-Latin text is routed to cloud deterministically. On-device needs desktop Chrome with enough disk/GPU/RAM and a user-gesture download; phones get cloud or manual only. Confidence is model-estimated and uncalibrated. Free-tier quotas for `gemini-3.5-flash-lite` and Google's free-tier data-use terms were not verifiable; assume report text sent to the cloud on the free tier may be used by Google to improve its products (verify) and keep demo data simulated.
- Cosmetic: `tests/firestore/firestore.rules.test.mjs` and `firebase.rules-test.json` start with a UTF-8 BOM (left as is).
- The hackathon submission deadline was never verified — the owner should check Devpost.

## 13. T2 manual rollout — DONE (owner-confirmed 2026-11-25); kept for history

> The owner completed these steps: code on Vercel, rules and indexes deployed, production smoke test passed. Do not repeat them. The text below is the original procedure.

1. Apply the patch on a branch, run the verification loop (section 11) **including the rules emulator command**, merge via the normal Git workflow.
2. **Order:** deploy the code (Vercel) first, then publish the new `firestore.rules`, then the indexes. Reason: new code sends `processedBy: "manual"` / `confidenceScore: null`, which the *old* rules reject (the server fallback would still save the report); old code sends `"cloud"`/`"on-device"`, which the *new* rules reject. Keep the gap between the code deploy and the rules publish short.
3. **Transition risk:** a report written offline by an OLD bundle and still queued in a browser's IndexedDB would be rejected by the new rules when it syncs (the Firestore SDK drops rejected writes). Test with a clean browser profile; accept or manage this for the demo.
4. Indexes: first compare Firestore -> Indexes in the console with `firestore.indexes.json` (the live state was never inspected). `firebase deploy --only firestore:indexes` normally asks before deleting an index that is not in the file (not verified here); the `urgency DESC` index is the unused one. New indexes take a few minutes to build.
5. Smoke test after deploy: anonymous SOS from the landing page; quick-start report; a medic/rescue acknowledge; confirm the stored document has `processedBy: "manual"`, `confidenceScore: null`.

## 14. Implementation roadmap

### Five-day plan (dependency-ordered; prioritise working end-to-end features over extras)
- **Day 1 — Security foundation:** T1 security lockdown (done) and T2 canonical schema (done).
- **Day 2 — Report intake:** T3 App Check and hybrid AI module (done), then T4 report intake UI (done in a patch: text form, non-blocking `submitReport`, truthful badges, Leaflet picker, optional AI).
- **Day 3 — Responder side:** T5 actions via server routes, remove mock fallbacks and surface errors, queue limits, on-demand cloud summaries.
- **Day 4 — Automation:** T6 process (dedupe) and escalation route/log, real Escalation Watch; start of T8 (service worker for the app shell).
- **Day 5 — Alerts and polish/buffer:** T7 alert form and feed, optional FCM; T8 seed and docs alignment, end-to-end test in desktop Chrome with Nano plus offline mode, demo script. Day 5 is also the buffer.
- **If days run short, cut in this order:** 1. FCM push. 2. Voice note. 3. PWA shell polish. 4. Summaries beyond critical reports.
- *(Calendar days are indicative; the hackathon deadline was not verified.)*
- Phase sequence: T1 Security lockdown (complete) -> T2 Canonical schema (complete) -> T3 Hybrid AI and App Check (complete) -> **T4 Report intake UI (implemented in a patch)** -> T5 Responder actions and dashboards (next) -> T6 Process and escalation -> T7 Alerts -> T8 Offline shell and docs.

### Iterations — one prompt and one patch each
**T1 — Security lockdown** — *Completed (section 7).*
**T2 — Canonical schema** — *Completed, merged, deployed, smoke-tested (section 13).*
**T3 — Hybrid AI and App Check** — *Completed, merged, configured, verified in production (section 15).*
**T4 — Report intake UI** — *Implemented in a patch (2026-11-27); record in section 16; completed after the owner applies, verifies and merges it. Delivered: full free-text form, Leaflet location picker, optional per-field AI confirmation, non-blocking `submitReport`, real pending/synced/failed states, SOS/Quick Start made non-blocking with unchanged payloads.*
**T5 — Responder actions and dashboards** — real data only (remove mock `INCIDENTS` fallbacks and simulated operational data), surface action failures instead of showing success, queue limits (`limit(100)`) and filters (hide duplicates), on-demand cloud summaries only when justified and within free-tier limits, role-based access enforced server-side. Depends on T1, T2, T3. Do not weaken the T1 server checks.
**T6 — Process and escalation** — secure process/dedupe route (same category, <=30 min, <=0.5 km; `processedAt` guard; transaction; atomic `peopleAffected` increment; audit trail; **SOS never auto-merged**; human review for uncertain duplicates); escalation route + auditable `escalationLog` (`type:"auto"`, actor `system_timeout`); real Escalation Watch driven by `ESCALATION_POLICY`; scheduled execution only if a genuine secure free-tier mechanism exists. Depends on T2 (constants, indexes), T5. Any cron route needs a secret and an honest description (Vercel Hobby cron limits were not verified).
**T7 — Alerts** — alert creation form; citizen feed (Firestore listener on unexpired alerts, works from cache); `geoCells` (coarse cells + exact Haversine, radius cap 25 km); optional FCM; alert writes via `POST /api/alerts`; harden the public GET and caller-supplied `alertId`/`active`. No claim that anyone was notified unless delivery is confirmed.
**T8 — Offline shell and documentation** — minimal service worker + manifest (no new package; cache only safe static assets; never private API/auth/user responses); update the seed script to the canonical schema (still dev-project-only); correct README/documentation; demo checklist; desktop-Chrome end-to-end run with Nano and offline sync recovery. *T8 is the later offline-shell/PWA and documentation phase; it stays separate from T3 and T4, and PWA polish is on the cut list above.*

## 15. T3 — Hybrid AI and App Check: what the patch implements

> **Status update (2026-11-27): T3 is completed and merged; its external configuration was done and the hybrid AI was verified in production (owner-confirmed).** Sections 15.7-15.8 are kept as the historical checklist.

### 15.1 Objective and result
A client-side, **advisory-only** classifier for free-text reports using Firebase AI Logic hybrid inference (on-device Gemini Nano first, Gemini Developer API free tier as fallback), App Check for the cloud path, strict validation of model output against the T2 enums, and an admin-only diagnostics page. It writes **nothing** to Firestore and cannot set `processedBy`/`confidenceScore` (a source-scan test enforces this). The T4 form will consume it.

### 15.2 Files (baseline `main@4cf75f0`)
| Action | File | Responsibility |
|---|---|---|
| new | `lib/constants/ai.ts` | No-import constants: default model, `resolveModelName`, 0.8 retry threshold, timeouts (10 s attempt / 15 s overall), 3 s cooldown, input cap (mirrors `REPORT_LIMITS`), disclaimer and notice strings. |
| new | `lib/ai/types.ts` | `AiSuggestion`, `ClassifyOutcome`, failure codes + neutral messages, `OnDeviceAvailability`, `UrgencyChange`. |
| new | `lib/ai/schema.ts` | Pure/SDK-free: one JSON Schema (used by Chrome `responseConstraint` and cloud `responseJsonSchema`), prompt builder, `parseAiResponse` (strict, unknown keys dropped), `needsCloudInference` (script routing), `explicitCountAppearsInText`, `mapInferenceSource`, `urgencyChange`. |
| new | `lib/ai/classify-report.ts` | The only module that imports `firebase/ai` (lazily): `createClassifier(runtime)` (testable seam), `classifyReportText`, `prepareOnDeviceModel`, `cancelClassification`, `getOnDeviceAvailability`, `preloadAiSdk`, `mapAiError`. |
| new | `lib/firebase/app-check.ts` | `ensureAppCheck()` (lazy, idempotent, never throws), `resolveAppCheckMode`, `describeAppCheckConfig`. No static import of `config.ts`. |
| new | `components/ai/ai-check-panel.tsx`, `app/ai-check/page.tsx`, `app/ai-check/layout.tsx` | Temporary admin-only diagnostics (`RoleGate allowedRoles={["admin"]}`, `noindex`). |
| new | `tests/ai/schema.test.ts`, `app-check.test.ts`, `classify-report.test.ts`, `provenance-guard.test.ts` | 45 tests, SDK mocked, no network. |
| modified | `.env.example`, `README.md`, `documentation.md`, this file | Config and docs only. |
| deleted | `lib/firebase/ai.ts` | Was imported nowhere; legacy `window.ai` path, no validation, 5 ESLint `any` errors. |
| untouched | `firestore.rules`, `firestore.indexes.json`, `lib/constants/report.ts`, `lib/validation/report.ts`, `lib/firebase/{config,auth,firestore}.ts`, API routes, `package.json` | T2 and the rest stay closed. No dependency added or upgraded. |

### 15.3 Request architecture
- `getAI(app, { backend: new GoogleAIBackend() })` (Gemini Developer API, Spark-compatible, no API key). Standard App Check tokens (decision D1/App Check, section 3).
- Three model kinds from the same configuration: `hybrid` (`PREFER_ON_DEVICE`), `on-device` (`ONLY_ON_DEVICE`, used when cloud is not allowed), `cloud` (`ONLY_IN_CLOUD`). Cloud config: `responseMimeType: application/json`, `responseJsonSchema`, temperature 0.1, 1024 max output tokens, SDK timeout 10 s. On-device config: text-only English `expectedInputs/Outputs` (avoids the multimodal Chrome flag) and `responseConstraint`.
- **One prompt string, no `systemInstruction`** (the on-device adapter ignores it). Report text is delimited, marker-injection stripped, and declared untrusted.
- **Language routing (deterministic):** any character outside Latin/Common/Inherited scripts (Bengali, Hindi, Arabic, Japanese, ...) goes straight to cloud. Latin-script text, including transliterated Bengali/Hindi, may run on-device; the low-confidence retry covers poor results.
- **Flow:** ensure App Check -> pick kind (cloud-only if non-Latin; `hybrid` if online and App Check ready; else `on-device` only, so **no cloud request is ever attempted without App Check or while offline**) -> parse/validate -> if on-device and confidence < 0.8 and cloud allowed, retry once in cloud (a failed retry keeps the on-device answer flagged `lowConfidence`). A hybrid failure of kind `invalid-output`/`ai-unavailable` is retried once in cloud; 401/403/429 and timeouts are never retried.
- **Source** comes only from the SDK `inferenceSource` (`on_device` -> `on-device`, `in_cloud` -> `cloud`); a missing/unknown source is a failure, never a guess. The badge is transient and never stored.
- **Timeouts/cancel:** cloud calls get an `AbortSignal`; on-device calls are raced against the timeout (the SDK does not abort them) and late results are discarded by a generation counter. One request in flight; a newer request supersedes the older; 3 s cooldown against double taps (courtesy only, **not** a security control).
- **Failure codes** (neutral messages, manual pickers always still work): `empty-input`, `cooldown`, `offline`, `ai-unavailable`, `access-denied` (401/403), `rate-limited` (429), `timeout`, `invalid-output`, `cancelled`. HTTP failures arrive from the SDK as `fetch-error` with `customErrorData.status` (verified in source).

### 15.4 Safety rules implemented (and required of T4)
1. **No invented headcounts:** the schema field is `peopleAffectedStated` (0 = not stated). The parser keeps it only if the number really appears in the report text (digits in Latin/Bengali/Devanagari/Arabic-Indic scripts, or an English number word up to twenty); otherwise `null`. This is a plausibility guard, not proof; the person still confirms. There is deliberately **no injuries field**: AI never estimates injuries.
2. **Urgency is never silently lowered:** `urgencyChange(current, suggested)` returns `none-selected | same | raise | lower`. A `lower` result must not be applied without a separate, deliberate confirmation (the diagnostics page demonstrates the warning).
3. **AI never runs for one-tap SOS** (no text; urgency fixed at critical). The module has no SOS entry point; T4 must not add one.
4. **Every suggestion needs explicit confirmation;** nothing is saved by the module. The source badge is transient; never claim AI processed a report the person confirmed manually (the report is `manual`).
5. Disclaimer kept: "Not a diagnosis. Authorized human review required." (`AI_DISCLAIMER`).
6. Only the description text is sent (no uid, name, email, location); report text is never logged; error logging uses codes only.

### 15.5 App Check design and ordering
- **Ordering is verified in the SDK:** `AIService` captures the App Check instance once at `getAI()` creation, so `ensureAppCheck()` runs before the first `getAI()` (inside the runtime's model factory). Initialisation is **lazy** (first AI use), so the landing page, anonymous SOS and offline writes never depend on the reCAPTCHA script. Firestore/Auth are created earlier in `config.ts` and are unchanged; they do not require App Check (not enforced), so offline writes, Auth and SOS are unaffected.
- `resolveAppCheckMode`: localhost/127.0.0.1/[::1] in a **non-production build** -> debug provider (`FIREBASE_APPCHECK_DEBUG_TOKEN = true`, token printed once in the DevTools console); otherwise reCAPTCHA Enterprise **only if** `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` is set; else App Check stays off and cloud calls are refused. A production build served on localhost (`next start`) uses the site key and will fail on localhost by design.
- The installed App Check 0.13.1 has no `DebugProvider` export (newer docs snippets use one), so the supported flag is used; no upgrade.
- Enforcement is a **console** setting for "Firebase AI Logic" only. **Never enforce App Check for Firestore or Authentication.**

### 15.6 Environment variables
| Variable | Local `.env.local` | Vercel | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_GEMINI_MODEL` | optional | optional | Default `gemini-3.5-flash-lite`; shape-validated (`gemini-...`), invalid falls back to the default. |
| `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` | leave empty (debug provider) | Production (and only environments whose domain is allowed on the key) | reCAPTCHA Enterprise **site** key, public by design. Not a Gemini key. |

`NEXT_PUBLIC_*` values are inlined at build time: **redeploy Vercel after adding or changing them.** No secrets, no server variables, no Gemini API key.

### 15.7 T3 verification checklist
**Agent-executed:** section 11 (tsc, 84/84 unit tests, ESLint 29/10, build, diff check).
**Owner, after applying the patch (PowerShell, repo root):**
```powershell
npx tsc --noEmit
npx --yes tsx --test tests/ai/*.test.ts tests/security/*.test.ts tests/schema/*.test.ts
npx eslint .
npm run build
git diff --check
```
Expected: tsc silent; **84 tests pass**; ESLint at most 34 errors / 10 warnings (the patch gives 29/10); build succeeds and lists `/ai-check`. Optionally re-run the rules emulator command (section 11); rules are unchanged.
**Manual (owner; record exactly what was and was not exercised):**
- [ ] Localhost (`npm run dev`), sign in as the **admin** test account, open `/ai-check`, type a sentence and click *Get AI suggestion* once. App Check initialises lazily on that first request, so the debug token is printed in the DevTools console only then; copy and register it (15.8 step 4), then run again (the first cloud attempt fails with `access-denied` until it is registered). A non-admin account must not see the page.
- [ ] English text: a suggestion appears with a source badge. Note the Chrome version and whether the source says on-device or cloud.
- [ ] A Bengali and a Hindi sentence: source must be **cloud**.
- [ ] "5 people are trapped" gives people stated = 5; "several people" gives not stated.
- [ ] Choose urgency "critical" and test a mild text: if AI suggests lower, the warning appears and nothing is applied.
- [ ] DevTools -> Network -> Offline: neutral failure message (or on-device result for Latin text); the rest of the app still works. SOS from the landing page still works offline/online.
- [ ] Production (after 15.8): same on the Vercel domain; App Check metrics show verified requests.
- [ ] A phone: cloud or manual only (Chrome on-device is desktop-only per the docs).
- [ ] Confirm no new document is created in Firestore by `/ai-check`, and the next real report is still `processedBy: "manual"`.

### 15.8 Remaining Firebase Console / local / Vercel steps (owner; none was done by the agent)
1. **AI Logic:** Firebase Console -> AI Services -> AI Logic: confirm setup was completed with the **Gemini Developer API** and the Firebase AI Logic and Gemini Developer APIs are enabled; project stays on **Spark** (no billing account).
2. **reCAPTCHA Enterprise key:** Google Cloud: enable the reCAPTCHA Enterprise API; create a **Website**, score-based key for the **production domain only** (e.g. `rapid-aid-two.vercel.app`). Never add `localhost`; never add bare `vercel.app`.
3. **Register the web app** in Firebase Console -> App Check -> Apps with the **reCAPTCHA Enterprise** provider and that key.
4. **Debug token (localhost):** run the dev server, open `/ai-check` as admin, click *Get AI suggestion* once (App Check starts lazily on first use), copy the token logged in the console, add it in App Check -> Manage debug tokens. Keep it private and uncommitted.
5. **API key restrictions:** Google Cloud -> APIs & Services -> Credentials: if the browser API key has an API allow-list, it must include the **Firebase AI Logic API** and the **Firebase App Check API**. (Current state was never inspected; a 403 `access-denied` is the symptom.)
6. **Vercel:** add `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` for Production, redeploy. Preview deployments (random domains) get no App Check token, so there AI is on-device/manual only unless you add that exact preview domain to the key.
7. **Enforcement:** App Check -> APIs: the docs say AI Logic enforcement is mandatory from 2 Nov 2026 and may already be on; keep it on and confirm *verified* requests after deployment. **Do NOT enforce Cloud Firestore or Authentication.**
8. **Model quota:** check the free-tier limits for `gemini-3.5-flash-lite` in Google AI Studio (not verifiable by the agent).
9. Optional later: "authenticated-users mode" (project-wide; anonymous users count as authenticated); limited-use tokens/replay protection (consumes a reCAPTCHA assessment per request). Not part of T3.

Deployment order: merge/apply patch -> console steps 1-5 (safe before deploy: nothing calls AI yet) -> add Vercel variable and deploy -> verify (15.7) -> confirm enforcement (step 7). No rules or index deploy is needed, so there is no offline-queue transition risk.

### 15.9 Free tier, costs and unverified items
- Compatible and free: Spark, Gemini Developer API free tier (no billing account linked), App Check with reCAPTCHA Enterprise (free up to 10,000 assessments per month without billing, per Google's documentation as read in T3), client-side Firebase AI Logic. Nothing in T3 requires Blaze, Cloud Functions, a paid model, Cloud Storage or a Gemini key. Linking billing would end the free tier: do not.
- **Not verifiable by the agent (re-check):** current free-tier requests-per-minute/day for `gemini-3.5-flash-lite` (a third-party blog suggested 15 RPM / 500 RPD; unofficial); Google's free-tier data-use terms for submitted content; the exact Chrome version/hardware requirements (the docs read in T3 said desktop Chrome with about 22 GB free disk and a GPU with more than 4 GB VRAM or a CPU with 16 GB RAM; flags may be needed on some versions); whether older 3.x Flash models are being retired (the docs flagged it). `firebase.google.com` blocked automated fetching, so official pages were read through search excerpts plus the installed SDK typings and source.
- 429s are handled and never retried in a loop; the per-user rate limit is Firebase's default (not changed).

### 15.10 Corrections made to earlier assumptions
App Check provider = reCAPTCHA Enterprise; model default replaced (old default is not on the structured-output list); the on-device adapter ignores `systemInstruction` and does not abort; a runtime on-device failure does not auto-fall-back in `PREFER_ON_DEVICE`; Chrome's on-device model does not accept Bengali/Hindi; HTTP errors surface as `fetch-error` + status.


## 15A. T3 planning handover (HISTORICAL — written before implementation; superseded where section 15 or its corrections say otherwise)

> **Superseded points:** (1) provenance decision D1 is resolved as Option A (section 3); (2) the App Check provider is reCAPTCHA **Enterprise**, not v3; (3) the model is `gemini-3.5-flash-lite`, not `gemini-3.5-flash`/`gemini-3.5-pro`; (4) `lib/firebase/ai.ts` is deleted; (5) the "T3 is PLANNING ONLY" banner below is no longer current. Everything else is kept as the record of what was verified before coding.

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

## 16. T4 — Report intake UI: what the patch implements

### 16.1 Objective and result
Citizen `/home` now has: a **full free-text report form** with a **Leaflet location picker** and an **optional, confirm-first AI suggestion panel**; **offline-first, non-blocking submission** for the form, Quick Start and one-tap SOS; and **truthful synchronisation feedback** (header badge, status card, history rows, result cards) derived from Firestore snapshot metadata. No Firestore rules, indexes, schema, API routes, auth or Firebase configuration changed. No new env var. No Cloud Function, no paid service.

### 16.2 Files
**New**
- `lib/utils/submit-flow.ts` — Firebase-free `startSubmission` state machine (injected `write`/`fallback`/tracker); `settled` never rejects; fallback only after the direct write was REJECTED (never while pending offline).
- `lib/firebase/submission-tracker.ts` — in-memory observable tracker (`saved-locally | synced | failed`), keeps the validated input only for failed items so Retry reuses the same `reportId`. Singleton `submissionTracker`; `createSubmissionTracker()` for tests.
- `lib/hooks/use-submissions.ts` (`useSubmissions`, `useSubmission`), `lib/hooks/use-online-status.ts` (`navigator.onLine` hint, wording only).
- `lib/utils/report-sync.ts` — `summarizeSync` (checking / failed / offline-pending / offline-idle / sending / unconfirmed / all-sent), `displaySyncState`, `mergeFailedSubmissions`, `describeSubmission` wording.
- `lib/utils/location-math.ts` — `normalizeLatLng` (round to 6 decimals, wrap longitude, reject lat outside ±90), `parseCoordinateInput`, `formatCoordinates`.
- `components/citizen/report-form.tsx`, `ai-suggestion-panel.tsx`, `location-picker.tsx`, `leaflet-map.tsx`.
- `tests/citizen/{location-math,report-sync,submit-flow,mapper-sync-meta,ai-isolation}.test.ts` (28 tests).

**Modified**
- `lib/firebase/firestore.ts` — `createReport` split into shared `prepareReport` + `postReportToServer`; **`createReport` keeps its signature and behaviour** (awaits the backend, same fallback, throws the original Firestore error if both fail). New `submitReport(data, {kind})` (returns `{reportId, settled}` at once), `retrySubmission`, `retryFailedSubmissions`. `subscribeToUserRequests` now uses `includeMetadataChanges: true`, reads `docSnap.data({serverTimestamps: "estimate"})`, and passes an optional second callback argument `{fromCache, hasPendingWrites}` (existing callers unaffected; responder listeners untouched).
- `lib/types/report.ts` — `mapReportToCitizenRequest(report, meta?)`: with `meta` the sync state comes from Firestore (`hasPendingWrites` => "Pending sync"), without it the legacy `syncedAt` inference is unchanged; adds `syncedAtMs`. `lib/types/citizen-request.ts` — `SyncState` gains `"Failed"`; optional `syncedAtMs`, `failure`.
- `components/citizen/emergency-cta-card.tsx` (SOS: same payload, now `submitReport`; real `SyncStatusCard`; props `pendingCount`/`lastSyncedTime` replaced by `syncSummary`/`onRetryFailed`), `quick-start-section.tsx` (non-blocking, honest outcome, new "Add details & location" button via `onAddDetails`), `request-history-section.tsx` (no demo rows, real empty state, Failed rows with Retry, "Urgency" label, rewritten delivery note; the component no longer subscribes by itself), `request-status-pills.tsx` (`Pill` exported, Failed tone), `citizen-header.tsx` (real badge via `syncSummary`), `app/(user)/home/page.tsx` (computes the summary once and wires everything).
- `package.json`/`package-lock.json` (Leaflet + types only), `README.md`/`documentation.md` (maps/offline rows made truthful), this file.

**Deliberately untouched:** `firestore.rules`, `firestore.indexes.json`, `lib/constants/report.ts`, `lib/validation/report.ts`, `lib/ai/*`, `lib/firebase/{config,auth,app-check}.ts`, all `app/api/*`, responder dashboards, `/ai-check`, `.env.example`.

### 16.3 Architecture
**Submission.** `submitReport` -> `prepareReport` (same validator/builder as T2; throws synchronously on invalid input before anything is written or tracked) -> `startSubmission`: tracker `begin` -> `setDoc` (applied to the local Firestore cache immediately, queued in IndexedDB offline; its promise settles only on backend acknowledgement and is NOT awaited by the UI) -> on resolve `markSynced`; on rejection call `/api/reports` once (idempotent by `reportId`: own retry => 200 `duplicate: true`) -> success `markSynced`, failure `markFailed` (keeps the input). The UI returns at once with the new `reportId`.
**Truth model.** Two independent, both truthful sources: (1) the history list/badge/status card use Firestore snapshot metadata (`hasPendingWrites` per document, `fromCache` per snapshot); (2) the result cards of reports submitted in THIS session use the tracker (`saved-locally` while online reads "Sending…"; only `synced` reads "received"). "All sent" requires online + nothing pending + nothing failed + snapshot not from cache. Nothing says or implies a responder has seen or will act on a report. `navigator.onLine === false` is reliable; `true` is only a hint, so it affects wording only.
**Location.** `LocationPicker` = `LeafletMap` (dynamic, `ssr:false`, own chunk + CSS; not in the landing/login/home initial HTML) + "Use my location" (`getCurrentLocation`, click only) + typed latitude/longitude + optional landmark (becomes `location.address` only when typed; `zone` is never sent by the form). Pin is a `divIcon` with inline styles (no marker images). Longitude is wrapped (`latlng.wrap` equivalent) so the rules' ±180 limit is never violated. Tile errors (3 in a row) or `!navigator.onLine` show a notice; the form never depends on the map.
**AI.** `AiSuggestionPanel` calls `classifyReportText` only from the "Get AI suggestion (optional)" button; submit calls `cancelClassification()` and never waits for AI. Review card: transient source badge, low-confidence caution, `AI_SUGGESTION_NOTICE` + `AI_DISCLAIMER`, one **unchecked** checkbox per field, "Apply selected". Lowering urgency (`urgencyChange === "lower"`) shows a warning and needs its own differently-worded confirmation. `peopleAffectedStated` only when non-null. A translation is attached to `translatedDescription` only when confirmed, is editable/removable, and is dropped (not sent) if the description changes afterwards. Editing the description makes a shown suggestion stale (cannot be applied) and cancels a running request. After apply the values are ordinary editable fields; nothing about AI is stored.
**SOS.** `EmergencyCtaCard` payload is byte-for-byte the previous one (`medical`, `critical`, canned text, `isSOS: true`, location from `getCurrentLocation`); only the submit call (non-blocking) and the feedback wording changed. It imports nothing from `lib/ai/*` (enforced by `tests/citizen/ai-isolation.test.ts`). If geolocation is denied the SOS still fails with the existing message (unchanged: a location is required by the schema).

### 16.4 T3 interface contract as used by T4 (kept for T5+)
`classifyReportText`, `cancelClassification`, `prepareOnDeviceModel` (click only), `getOnDeviceAvailability`, `preloadAiSdk`, `urgencyChange`, `AI_FAILURE_MESSAGES`, `AI_SUGGESTION_NOTICE`, `AI_DISCLAIMER`. The AI badge is transient UI state and is never written to a document (`processedBy: "manual"`, `confidenceScore: null`).

### 16.5 Known limitations (read before touching reporting)
1. **Failure tracking is session-only.** A write queued offline stays in Firestore's own IndexedDB queue and is sent by the SDK later, even after a reload. If the server then REJECTS it after a reload, the SDK drops it, no promise exists any more, and nothing in the app can tell: the report simply never appears. The in-memory tracker is NOT persistent failure recovery. Rejection should be very unlikely: client and server share one validator/builder and a drift test, and the rules were verified against the same shape.
2. A failed submission is shown in history (with Retry) only until the page is reloaded.
3. **First use offline is not possible**: `signInAnonymously` needs the network once. `/home` is behind `RoleGate`, so anyone who reaches the form already has a persisted identity; the landing-page emergency button offline still fails (T8 PWA shell territory).
4. OSM tiles need a connection and OSM's usage policy applies (attribution shown; no prefetch/bulk/offline caching). The tile host sees the user's IP and viewport. If a Content-Security-Policy is ever added, allow `tile.openstreetmap.org` (+ data/inline styles used by Leaflet).
5. Language defaults to English and is a user choice (English/Bengali/Hindi/Other = `und`, or a code from a confirmed AI suggestion). It is not auto-detected.
6. `Saved on this device` is shown for pending writes whether or not the device is online; "Sending…" vs "Saved offline" wording depends on the browser's online hint.
7. Quick Start still submits a canned description and hard-coded urgency (`critical` for medical, else `high`), exactly as before.
8. The history row for a report that is pending shows operational status as "Not yet received" (not the mapper's `Submitted`).

### 16.6 Verification executed by the agent (scratch Linux clone of the supplied ZIP normalised to LF, `npm ci`, 2026-11-27)
- `npx tsc --noEmit`: clean (baseline clean).
- `npx tsx --test tests/ai/*.test.ts tests/security/*.test.ts tests/schema/*.test.ts tests/citizen/*.test.ts`: **112/112 pass** (baseline 84/84 + 28 new).
- `npx eslint .`: **22 errors / 10 warnings** (baseline 29 / 10; no finding in any new file; the reduction comes from removing old `any` in rewritten components).
- `next build`: succeeds (Turbopack, 12 routes). **Requires the public Firebase variables**; the scratch build used dummy placeholder values because the ZIP has no `.env.local`. Leaflet's JS and CSS are emitted as separate chunks and are absent from the prerendered HTML of `/`, `/home` and `/login`.
- `git diff --check` clean; patch verified with `git apply --check --ignore-whitespace` on a fresh CRLF copy of the ZIP.

**NOT executed by the agent:** Firestore rules emulator (rules unchanged), any browser run (offline/online transitions, Leaflet rendering, geolocation, DevTools Offline), real Firebase, App Check/AI in production, Vercel. Nothing was deployed.

### 16.7 Owner checks (T4 acceptance, about 20 minutes; desktop Chrome + one phone)
1. `npm ci`, `npm run dev`; sign in/emergency access; open `/home`.
2. DevTools Network -> Offline: submit the form; expect "Saved on this device", header "Offline · 1 waiting", history row "Saved offline". Reload while offline (row stays). Go online: row flips to Synchronized, exactly one document in Firestore, `processedBy: "manual"`, `confidenceScore: null`, `location` has `lat`/`lng` (+ `address` only if typed).
3. Repeat with Quick Start and one-tap SOS (SOS payload unchanged: `medical`, `critical`, `isSOS: true`).
4. AI (online, production domain or localhost debug token): write text, press "Get AI suggestion"; nothing changes until you tick a field and press Apply; try a lower-urgency case; edit the text and confirm the suggestion goes stale; submit with AI unavailable/offline.
5. Map: tap, drag the pin, "Use my location", type coordinates, go offline (notice appears, submit still works).
6. Mobile viewport: SOS stays first; form usable.
7. Optional: force a failure (for example sign out in another tab) and confirm "Failed" + Retry creates no duplicate.

### 16.8 Open items and recommended T5 starting points
- T5 owns: responder dashboards still use mock fallbacks and report success when the server rejects; `LiveMap`/`FieldMap` are CSS mocks (Leaflet can be reused via a shared map component, but keep the citizen picker separate); `limit(100)`; filters; summaries.
- Owner decisions still open: SOS category routing (D4), Option B provenance (needs a rules change; not needed so far), removing `/ai-check` later, rotating old test passwords.
- Deferred: dedupe/escalation (T6), alerts (T7), PWA shell/seed/docs alignment (T8).

## 17. Notes for the next agent

- Work from a clean LF checkout; the owner's Windows tree is CRLF. Produce `git diff` patches and test them with `git apply --check --ignore-whitespace` on a fresh copy of the repository.
- AI-produced category/urgency are suggestions confirmed by humans, never authoritative.
- Keep demo data simulated; never commit credentials or service-account files.
- Avoid `pkill -f` patterns that can match your own shell command line (this killed a shell once during T1).
- The sandbox used by previous agents could `npm ci`, run `tsc`, `eslint`, `next build` and `tsx --test`, and could install `firebase-tools`, but could NOT download the Firestore emulator JAR (blocked host) and could read GitHub only through `git clone` (the REST API and the fetch tool were rate-limited).
- Information in this document that could not be verified is marked as such. If you find a conflict between this file and the repository, record both facts and ask the owner instead of silently choosing.


## 18. How to work with the owner

- Concise explanations, **one step at a time**, and exact **Windows PowerShell** commands with a plain-language note on consequences.
- **Minimum necessary changes**; preserve existing architecture and UI; no redesign.
- **One implementation task per prompt**, one consolidated **unified patch** for manual application (LF patches; the owner's tree is CRLF, so apply with `git apply --ignore-whitespace`; check first with `--check`).
- Plan first and wait for approval, unless the owner has explicitly approved implementation.
- Never commit, push, deploy or change Firebase Console/Vercel/billing settings; **never assume** the owner approved any of them. List the steps for the owner instead.
- Report test results honestly: *executed by the agent*, *owner-confirmed*, *not run*.

## 19. Project prerequisites, configuration and deployment (consolidated)

- **Stack:** Next.js 16.4 (Cache Components enabled; read `AGENTS.md` and `node_modules/next/dist/docs/` before Next code), React 19, Firebase JS SDK 13.3 (`@firebase/ai` 3.1, `@firebase/app-check` 0.13), Firebase Admin on Vercel server routes, Tailwind. No test runner dependency: tests run with `npx --yes tsx --test ...`; rules tests use `@firebase/rules-unit-testing`.
- **Plan restrictions:** Firebase **Spark** only; Gemini Developer API **free tier** only; no Blaze/billing, Cloud Functions, paid models or services, Cloud Storage, or Gemini API key.
- **Environment (`.env.example`):** `NEXT_PUBLIC_FIREBASE_*` (public web config); `NEXT_PUBLIC_GEMINI_MODEL`; `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY`; server-only `FIREBASE_SERVICE_ACCOUNT_KEY` or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (Vercel / `.env.local`, never `NEXT_PUBLIC_`). Redeploy Vercel after any `NEXT_PUBLIC_*` change.
- **Firebase Console prerequisites:** Firestore, Authentication (email, Google, **anonymous**), AI Logic (Gemini Developer API), App Check (reCAPTCHA Enterprise web app + debug token for localhost; enforce for AI Logic only), published Firestore rules and indexes from the repo (T2, deployed). Elevated roles only via `scripts/set-role.mjs` (section 5).
- **Deployment steps:** apply patch on a branch -> verification loop (section 11 and 15.7) -> owner console steps (15.8) -> Vercel env + deploy -> smoke test -> merge. Rules/index changes (when a future task has them) follow the order in section 13.
