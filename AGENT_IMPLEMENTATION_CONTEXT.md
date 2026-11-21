# RapidAID — Agent Implementation Context

> Self-contained handover for any future Claude / Codex agent. Read it fully before doing anything.
> Update it after EVERY implementation iteration: keep earlier decisions, correct anything that became outdated, append progress.
> Last updated: **after T1 was applied locally by the owner on branch `security/t1-lockdown` (not yet committed, pushed, deployed or merged).**

## 0. Handover status at a glance

- **T1 (Security lockdown):** implemented, and the patch has been **applied locally by the owner** on branch `security/t1-lockdown` (base branch `main`).
  Owner-reported local checks all passed: `npx tsc --noEmit`, `npx --yes tsx --test tests/security/report-security.test.ts` (13/13), `npm run build`, `git diff --check`.
- **NOT done yet:** T1 is **not committed, not pushed, not deployed** (no Preview and no Production deployment), the Firestore rules are **not deployed**, and T1 is **not merged into `main`**.
- **Production risk until T1 is deployed:** the live site still runs the old code, so the old `/api/auth/role` flaw (any signed-in user could grant themselves any role) is presumably still exploitable there. This is an inference from the fact that nothing has been deployed; it was not tested against production.
- **Next agent's first task: T2 PLANNING ONLY.** Do not write T2 code or a T2 patch until the owner explicitly approves your plan (see section 13).
- **Owner is currently:** completing T1 verification and the Git workflow (commit, push, Preview test, merge into `main`). T1 must be Preview-tested and merged before T2 starts.
- **Test accounts are retained** (owner decision, section 5). Do **not** delete them or rotate their passwords unless the owner explicitly approves.

## 1. Global rules for every future agent (prominent — follow all of them)

1. The owner is a beginner-friendly **Windows PowerShell** user: give exact PowerShell commands and briefly explain important consequences in plain language.
2. **Inspect the current repository and relevant files before proposing or implementing anything.** Do not assume this document is perfectly current; if the repo disagrees, trust the repo and say so.
3. **One iteration at a time, one consolidated patch per iteration.**
4. **Plan first, code second:** give a concise implementation plan and **wait for explicit owner approval** before coding.
5. After approval, return a **unified diff patch only**. Never edit the owner's repository directly.
6. **Include the updated `AGENT_IMPLEMENTATION_CONTEXT.md` in every implementation patch.**
7. **Never** commit, push, deploy, change Firebase project settings, alter accounts, or run destructive commands.
8. Preserve the existing architecture and UI unless the approved scope requires a change. No redesign.
9. No unnecessary dependencies and no package upgrades.
10. **Firebase Spark (free) plan only.** No Blaze upgrade, no Cloud Functions, no paid scheduler, no paid services, no Cloud Storage. (Linking billing would also end the Gemini Developer API free tier.)
11. **Do not invent** test results, credentials, data, deployment status or features. Never claim a test passed unless it was actually run; say plainly what was NOT run.
12. **Never print, request, commit or include** `.env.local`, service-account JSON, private keys, tokens or passwords (in answers, patches or this file).
13. **No account deletion and no password rotation without explicit owner approval.**
14. **Custom token claims are the only trusted authorization role source.** `users/{uid}.role` in Firestore is only a display mirror.
15. **Every new account defaults to `victim`.** Elevated roles (`medical`, `rescue`, `admin`) are granted only by trusted local Admin SDK provisioning (`scripts/set-role.mjs`).
16. **AI is advisory only:** no autonomous medical decisions, no false promises that help is coming, no fabricated AI provenance (never label a report "on-device" or "cloud" unless that is what actually ran).
17. **SOS reports must never be automatically deduplicated or merged.**
18. Any scheduling/automation must be described honestly according to its real reliability and free-tier limits (never claim real-time guarantees that an external free cron cannot give).
19. Keep demo data simulated; never expose real victim information.
20. Do not change existing custom claims or Firestore role mirrors unless an audit shows a real mismatch **and** the owner approves the change.

## 2. Project overview

RapidAID: offline-first, AI-assisted disaster-response reporting and coordination web app for the Google #BuildHybridAI 2026 hackathon (Firebase AI Logic hybrid inference is the centrepiece).
Repo: github.com/Swarnabha07/RapidAID · Live: rapid-aid-two.vercel.app · Firebase project id: `rapidaid-9c11e`.
Roles: citizen (`victim`), `medical`, `rescue`, `admin`. The app assists human responders; it must never make autonomous medical decisions or promise that help is coming.

Team: Swarnabha Banerjee (owner; backend, AI Logic, API integration; uses Claude Free + Codex Free; learning backend), Abhirup Sarkar (frontend, security testing), Rana Pratap Roy (backend, Firestore, auth), Snehasish Saha (dashboards, UI, demo).

Stack (installed): Next.js 16.4.6 (`cacheComponents: true`, Turbopack), React 19.3.0, TypeScript 5, Tailwind 4.3.3, firebase JS SDK 13.3.0 (already exposes `InferenceMode`, `initializeDeviceModel`, `inferenceSource` and the App Check reCAPTCHA providers), firebase-admin 14.5.1, Firestore, Firebase Auth, Vercel hosting.
NOT installed (README/docs claim them; align docs in T8): Leaflet, shadcn/ui, Framer Motion, next-pwa, Remote Config. There is no `functions/` directory and no PWA manifest/app-shell service worker (only the FCM service worker exists).

Pages: `/` landing, `/login`, `/home` (citizen), `/dashboard` (medical, admin), `/rescue` (rescue, admin).
API routes: `/api/auth/role`, `/api/reports`, `/api/reports/[id]`, `/api/alerts`.
Key code: `lib/firebase/{config,auth,firestore,ai,messaging,admin,server-auth}.ts`, `lib/types/*`, `lib/server/report-security.ts` (new in T1).

## 3. Approved decisions and constraints

- **Spark only** (rule 10 above). Privileged work = Next.js server routes (Admin SDK on Vercel). Scheduled work = an external HTTP cron calling a secured route (plus a responder-dashboard sweep as backup), described honestly (rule 18).
- All responder actions and privileged writes go through authenticated Next.js server routes.
- Citizens create reports with the Firestore client SDK (keeps offline persistence). **No second offline queue.**
- Every new account = `victim`; elevated roles only via `scripts/set-role.mjs`.
- Custom token claims are the only trusted role source (rules and server).
- Keep existing UI/architecture; no redesign; no new dependencies; no package upgrades.
- Process: plan -> approval -> code; one consolidated patch per task (T1..T8) with PowerShell apply commands.
- Owner works on Windows (working tree CRLF, git index LF). Patches are LF; apply with `git apply --ignore-whitespace` (a plain `git apply` fails on CRLF files — verified).
- Read `AGENTS.md` and the installed Next docs (`node_modules/next/dist/docs/`) before touching Next code (this Next version has breaking changes). Already read in the audit: Route Handlers + Cache Components (GET handlers may be prerendered unless they use request/runtime/uncached data; `params` is a Promise; both `middleware.md` and `proxy.md` exist in this version).
- Historical note: the original "exposed test credentials must not remain usable" constraint has been superseded by the owner's decision in section 5 (accounts retained, rotation deferred).

### Audit recommendations (treated as approved unless the owner objects — confirm when each task starts)
- Escalation (single MVP policy, resolves a documented conflict between the handoff docs): unacknowledged = `status == "received"`; **critical 10 min, high 20 min; 5-minute sweep**; sets `escalated`, `escalatedAt`, `escalationLevel`, high -> critical (weight 3); writes `escalationLog` + activity entry; idempotent via the `escalated` guard. One shared constants file feeds the sweep and the UI (replace the demo thresholds 2/5/10/20 and the non-existent "Medium" level in `escalation-watch.tsx`).
- SOS with no medical content routes to `rescue`, critical. *(Recommended in the audit; the owner's approval of this specific routing is not separately recorded — reconfirm in T4.)* SOS reports are never auto-merged (rule 17).
- Dedupe: same category, <=30 min, <=0.5 km (Haversine); oldest non-duplicate is primary; transaction; `FieldValue.increment` on `peopleAffected`; idempotent via `processedAt`; duplicates hidden from queues; uncertain duplicates go to human review.
- App Check: reCAPTCHA provider, debug token for localhost. Per the official hybrid-inference page, Firebase automatically enforced App Check for Firebase AI Logic in all projects on 2 Nov 2026; the repo has no App Check, so cloud Gemini calls from the client probably fail today (console state not inspected).
- Cloud model default `gemini-3.5-flash-lite` via env var. The model-list pages changed between snapshots I saw, so **re-verify on the official Firebase "Models" page before T3**; `gemini-3.5-pro` in the current `SUPPORTED_GEMINI_MODELS` list was not found in the lists retrieved.
- Hybrid AI must use `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE })` + `initializeDeviceModel()` after a user gesture (desktop Chrome 139+; on-device is single-turn; text/image input only); record `processedBy` from the SDK's inference-source result, not from the UI. Phones mostly get cloud or manual input — say so plainly in the demo. The official configuration page was not read in full; verify the exact `inferenceSource` property name before coding.
- Offline shell: minimal hand-written service worker + manifest (no new package). Firestore persistence alone does not make the app load offline.
- Voice note: no audio storage (stretch: small base64 clip in Firestore). Cloud Storage for new buckets is believed to need Blaze (unverified) — avoid.
- FCM targeting: in-app alert feed first; push uses coarse `geoCell` + exact Haversine, radius cap 25 km, `in` queries chunked by 30; opt-in location consent.
- Firestore cannot do native radius queries; never rely on a simple lat/lng range query.

## 4. Implementation status

| Task | Status |
|---|---|
| T1 Security lockdown | **Applied locally on `security/t1-lockdown`; checks passed; NOT committed/pushed/deployed/merged; rules NOT deployed** |
| T2 Canonical schema, shared constants/types/validators, indexes, truthful mappers | **Next — PLANNING ONLY first; starts only after T1 is Preview-tested and merged into `main`** |
| T3 Hybrid AI (official InferenceMode) + App Check | pending |
| T4 Report intake UI (text form, SOS fixes, non-blocking submit, pending/synced/failed) | pending |
| T5 Responder actions and dashboards (remove mock fallbacks, surface errors, limits, on-demand summaries) | pending |
| T6 Process (dedupe) + escalation route/log + real Escalation Watch | pending |
| T7 Alerts (create form, citizen feed, geoCells, optional FCM) | pending |
| T8 PWA shell, seed/docs alignment, demo checklist, end-to-end test | pending |

### T1 Git/deployment state (exact)
- Branch `security/t1-lockdown` created from `main`; the T1 patch is applied in the owner's working tree.
- Owner-reported passing checks: `npx tsc --noEmit`; `npx --yes tsx --test tests/security/report-security.test.ts` (13/13); `npm run build`; `git diff --check`.
- Still to do (owner): commit, push, open/inspect a Vercel Preview, test it, deploy the Firestore rules, then merge into `main`.
- Suggested ordering (from the T1 delivery): deploy the code first (closes the role-escalation hole), then deploy the rules with `firebase deploy --only firestore:rules`. Deploying rules before the new client code is live would break responder actions (the old client wrote directly with `updateDoc`).
- Uncertainties to check, not verified: (a) whether Preview deployments share the same Firebase project (`.firebaserc` shows one default project, `rapidaid-9c11e`; no staging project is known), which means rules deployment and role changes affect the same backend that Production uses; (b) whether the Firebase Admin environment variables on Vercel are scoped to Preview as well as Production (the owner confirmed they are configured but did not state scopes) — if Preview API routes return 500, check this; (c) Google sign-in on a Preview URL needs that domain under Firebase Authentication -> Authorized domains.

## 5. Test accounts and role audit (owner decision — supersedes the earlier "delete the test accounts" advice)

**Decision (explicit, from the owner): retain all four existing test accounts, their existing Firebase Auth UIDs and their Firestore user documents. Do not delete them. Password rotation is intentionally deferred until the owner decides to do it.**

| Email | Existing UID | Intended role |
|---|---|---|
| victim@rapidaid.test | z6TqvV5JgaS0LennYIGEdg3f0ik2 | victim |
| medic@rapidaid.test | p4udtU8frJXHJuZHy9Mz6FYbbrx2 | medical |
| rescue@rapidaid.test | MhhtbuRwiPUlrahFVLSgVqE8ySh2 | rescue |
| admin@rapidaid.test | Mm8jszhP74N9mRbObp8CmKjIFdK2 | admin |

Two other existing Firebase accounts were **not** modified: `H7f71pzRUkVEhoHw3YjDIAvtl992` and `mAM5SbWKRhg5aPq36Rqdk7ntP6z1`.

**Read-only role audit already run by the owner:** `node scripts/set-role.mjs --list --project rapidaid-9c11e`
- 6 Auth accounts checked.
- `medic@rapidaid.test`: claim `medical`, Firestore mirror `medical`.
- `rescue@rapidaid.test`: claim `rescue`, Firestore mirror `rescue`.
- `admin@rapidaid.test`: claim `admin`, Firestore mirror `admin`.
- No mismatches reported.
- The victim account did not appear in the elevated/mismatch output. (The `--list` mode prints only elevated or mismatched accounts, so the other three accounts, including the two unmodified ones, were presumably neither elevated nor mismatched; the owner's summary does not list them explicitly.)
- **No role changes were made by this audit.** Do not change existing claims or mirrors unless a future audit shows a real mismatch and the owner approves.

**Outstanding security risk (accepted for now):** the old test-account passwords were previously committed to the public Git history of the repository (in `scripts/seed-firestore.mjs`) and must be treated as permanently compromised. The `admin@rapidaid.test`, `medic@rapidaid.test` and `rescue@rapidaid.test` accounts hold elevated roles, so anyone who found those passwords could sign in with those roles. Recommend rotating all four passwords later; **do not rotate or delete without explicit owner approval.** After T1 is deployed, `/api/auth/role` no longer lets anyone self-promote, but these existing elevated accounts keep working with their (compromised) passwords until the owner rotates them.

## 6. Local service-account setup (local only)

- The owner created a Firebase service-account JSON **outside the repository** at `$env:USERPROFILE\.config\rapidaid\service-account.json`, generated from the existing `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local` without displaying the secret.
- The current PowerShell session has `GOOGLE_APPLICATION_CREDENTIALS` pointing at that file (an environment variable set in a session does not persist to new sessions unless set again).
- `scripts/set-role.mjs` accepts `GOOGLE_APPLICATION_CREDENTIALS` or `--key <path>`.
- `.env.local` is ignored by Git (`service-account*.json` is also gitignored). Never print, request, commit or put the JSON in a patch.
- The owner confirmed the existing Vercel Firebase Admin environment variables are configured. **No Vercel environment changes are required for T1.** This credential setup is local only: never instruct the owner to add the JSON file or its contents to Vercel.

## 7. T1 — files changed and why

New:
- `scripts/set-role.mjs` — trusted role provisioning/demotion and `--list` audit (Admin SDK). Validates arguments before loading credentials; confirmation prompt (`--yes` to skip); revokes refresh tokens; mirrors the role into `users/{uid}`; `--list` shows elevated accounts and claim/mirror mismatches.
- `lib/server/report-security.ts` — pure, Firebase-free validation + state machine: `validateNewReport`, `planReportAction`, `cleanText`, `urgencyWeightOf`, `dashboardForCategory`.
- `tests/security/report-security.test.ts` — 13 unit tests (node:test; run with `npx --yes tsx --test ...`; tsx is NOT a dependency).
- `AGENT_IMPLEMENTATION_CONTEXT.md` — this file.

Modified:
- `app/api/auth/role/route.ts` — POST never reads a role from the body; keeps an existing valid claim, otherwise sets `victim`; mirrors the role to `users/{uid}`; GET returns the claim role. Response `{success, role, claimsUpdated}`.
- `lib/firebase/server-auth.ts` — `verifyIdToken(token, true)` (revocation check); role from the claim only (`normalizeRole`); removed the users-doc fallback; generic 401 messages; added `jsonError`, `getDashboardForRole`, `resolveActorName`.
- `app/api/reports/route.ts` — POST: strict validation; owner = token uid; server-computed status/weight/dashboard/timestamps; `mediaUrl` forced null; optional client `reportId` (regex) written with `create()` so nothing is overwritten (own-report retry -> 200 `duplicate:true`, otherwise 409); 20 KB body cap; no error-message leakage. GET: citizens own reports; medical/rescue only their own dashboard (403 otherwise); admin any; uses the existing `assignedDashboard + urgencyWeight + createdAt` index.
- `app/api/reports/[id]/route.ts` — PATCH is action-based: `{action: acknowledge|assign|escalate|resolve, note?, unitName?, urgency?, reason?, resolutionNote?}`. Firestore transaction; enforces responder role, dashboard ownership (admin = both), valid transitions (acknowledge only from `received`; assign/escalate/resolve from any non-resolved status; resolved is final), urgency can only rise (`critical|high`), computed `urgencyWeight`, server timestamps, trusted actor (`acknowledgedBy` name + `acknowledgedByUid`; trail entries carry `actorUid/actorName/actorRole`), and an `escalationLog` document written in the same transaction (`type:"manual"`, `actor` = uid). **Breaking contract change** (the old loose-field body was removed; only `firestore.ts` called it).
- `firestore.rules` — role from `request.auth.token.get('role','')` only. `users`: read self/admin, create false, update only `displayName|preferredLanguage|fcmToken|lastActiveAt`. `reports`: read owner/any responder; create only with the exact 27-field initial shape (status `received`, flags false/null, `mediaUrl` null, server `request.time` stamps, weight consistent with urgency, SOS => critical, bounded sizes, single citizen trail entry); update/delete false. `alerts`, `resources`, `escalationLog`: client writes false. Default deny kept.
- `lib/firebase/auth.tsx` — no client-side `users` writes or role choice; after sign-in calls `/api/auth/role` then force-refreshes the token; role state comes from token claims (`normalizeRole`); profile doc is display-only; uses `onIdTokenChanged` so claim changes are picked up. `signInWithGoogle(preferredRole?)` and `signUpWithEmail(..., role?)` keep their signatures but IGNORE the role.
- `lib/firebase/firestore.ts` — `acknowledgeReport`, `assignResponderUnit`, `escalateReportManual`, `resolveReport` keep their signatures (`responderName` now ignored) and call the PATCH route through `sendReportAction`; removed direct `updateDoc`, `arrayUnion` and `patchReportFallback`. They now THROW on failure (dialogs still swallow errors — fix in T5). `createReport` is unchanged (client write + POST fallback).
- `components/login/login-page.tsx` — role no longer falls back to `profile?.role`.
- `lib/types/user.ts` — `USER_ROLES`, `DEFAULT_ROLE`, `isUserRole`, `normalizeRole`. `lib/types/report.ts` — optional `actorUid/actorName` on trail entries; `acknowledgedByUid` on `Report`.
- `scripts/seed-firestore.mjs` — hard-coded test passwords removed; requires `SEED_TEST_PASSWORD` (14+ chars) and `SEED_CONFIRM_PROJECT` equal to the project id; header warns to use a development project only. Seed data still uses the OLD schema. Note: when run, the seed finds existing users by email and re-sets their custom claims, so never run it against production.
- `.env.example`, `README.md`, `documentation.md` — security/role notes. None of them instruct anyone to delete the test accounts; the retained-accounts decision in section 5 governs. If any text elsewhere (including earlier versions of this file) implies deletion, treat it as outdated.

## 8. Security decisions and important details

- Authorization never reads Firestore. Server role = verified-token claim; unknown/missing => `victim`.
- A role change takes effect after the user's next token refresh (sign out/in). `set-role` revokes refresh tokens and the API checks revocation, but Firestore rules cannot, so an old token keeps rules-level access until it expires (<= 1 h).
- Responders can READ all reports (rules and GET `/api/reports/[id]`) but WRITE only their own dashboard. Decide later whether reads should also be dashboard-scoped.
- The rules require the citizen create payload to match exactly the keys `createReport` sends today. Any new field added to the citizen payload (T2/T4) must also be added to the `hasOnly/hasAll` lists in `firestore.rules` (and trail fields to `isValidInitialTrail`).
- The server fallback still defaults `translatedDescription` to `description` (legacy; the client uses null) — normalise in T2.
- `acknowledgedBy` stays a display-name string (UI compatibility) plus the new `acknowledgedByUid`.
- Original audit findings that T1 fixed: self-service role assignment via `/api/auth/role` and via the user-writable `users` doc; loose report create/update rules; report-ID overwrite through the Admin-SDK `.set()` fallback; spoofable `acknowledgedBy`/`acknowledgedAt`/`urgencyWeight` in PATCH; missing escalation audit on the primary path; committed test passwords.

## 9. Commands and tests

### Run by me (scratch copy on Linux, after `npm ci`)
- Baseline before changes: `npx tsc --noEmit` exit 0; `npx eslint .` 47 errors / 10 warnings (pre-existing, mostly `no-explicit-any`).
- After T1: `npx tsc --noEmit` exit 0. `npx eslint .` 35 errors / 9 warnings (no findings in the new or rewritten files). `npx next build` (dummy `NEXT_PUBLIC_*` env) compiled and generated pages; routes listed: `/api/alerts`, `/api/auth/role`, `/api/reports`, `/api/reports/[id]`.
- `npx --yes tsx --test tests/security/report-security.test.ts`: 13 tests, 13 pass, 0 fail.
- `next start` smoke test: 7 probes (POST role with `{"role":"admin"}` without a token and with a bad token, GET role, POST/GET reports, PATCH and GET report by id without a token) all returned HTTP 401.
- `node --check` on both scripts. `set-role.mjs`: `--help` and argument-validation errors (bad role, missing email/uid, both email and uid, missing credentials) verified. Seed-script guard refusals verified (missing password; missing project confirmation).
- The patch passed `git apply --check --ignore-whitespace` and applied to a fresh copy of the original ZIP (CRLF working tree); the result matched my copy file by file ignoring line endings. A plain `git apply --check` (without `--ignore-whitespace`) failed on the CRLF files, as expected.

### Reported by the owner after applying T1 locally (not independently verified by an agent)
- `npx tsc --noEmit` passed; `npx --yes tsx --test tests/security/report-security.test.ts` 13/13 passed; `npm run build` passed; `git diff --check` passed.
- `node scripts/set-role.mjs --list --project rapidaid-9c11e` ran read-only with the results in section 5.

### NOT run by anyone as far as this document knows
- Firestore rules (no emulator was available; brackets balanced but the rules are **UNTESTED** — test in the Rules Playground or emulator before relying on them; suggested checks: a citizen creating a `status:"resolved"` report must be denied; changing `role` on one's own user document must be denied; a citizen `update` on a report must be denied; a normal initial report must be allowed).
- Authenticated API flows against real Firebase; a real `set-role.mjs` write; browser UI and offline behaviour; Vercel Preview/Production behaviour.
- `npm run lint` is not clean repo-wide (pre-existing findings).

## 10. Remaining issues and known limitations

- Rules untested and not deployed (above). The live project's deployed rules, indexes, claims, App Check state and billing plan were never inspected by an agent.
- Old test-account passwords are in the public Git history (section 5) — accepted for now, rotation deferred. History rewriting was not requested.
- Production still runs pre-T1 code until the owner merges and deploys (section 0).
- Dashboards still fall back to mock `INCIDENTS`; dialogs close as "success" even when the server rejects (T5). Rescue "fire"/"evac" tabs are mock. Maps are visual mocks (no Leaflet installed). Escalation Watch/ack watch use demo timers and thresholds.
- `GET /api/alerts` is public and returns `createdBy`/`createdByName`; `POST /api/alerts` still accepts a caller-supplied `alertId` and `active` (responders only). The alerts route is otherwise not hardened in T1 (T7). There is no alert creation UI and no citizen alert feed.
- No rate limiting on API routes. Offline responder actions are no longer possible (by design).
- Hybrid AI (`lib/firebase/ai.ts`) is still the old unused `window.ai` code and is imported nowhere; no App Check; no free-text report form (the quick-start card submits a canned description); the SOS card still hard-codes category `medical`, falls back to a fake New York location, and shows "Responders notified" (a guarantee claim); offline `await setDoc` blocks the UI; `processedBy` is hard-coded by the UI/defaults; `lib/types/report.ts` mappers print canned AI text ("Gemini Nano 4", "cross-referenced against regional reports") regardless of what ran (T2/T3/T4).
- `mapReportToMedicalIncident` can throw when `location` is missing (T2/T5).
- FCM: `requestPushPermission` is never called, no VAPID key in `.env.example`, a single `fcmToken` per user, and the service worker pins Firebase 10.13 compat while the app uses 13.3 (T7).
- Firestore index `urgency DESC` is wrong/unused (sorts alphabetically); the `category + createdAt` index needed for dedupe is missing; `GET /api/reports` was changed in T1 to use an existing index (T2).
- Seed data uses the legacy schema; the script is intentionally unsafe to run on production.
- Docs vs code drift: handoff doc function signatures/return shapes for the AI module differ from the code; README/documentation claim uninstalled libraries (T8). Whether the live GitHub `main` differs from the ZIP originally audited (HEAD `6cce61d`) was never checked.
- The hackathon submission deadline was never verified — the owner should check Devpost.

## 11. Implementation roadmap

### Five-day plan (dependency-ordered; prioritise working end-to-end features over extras)
- **Day 1 — Security foundation.** Lock the role route, rewrite the rules and indexes, harden report and PATCH routes, write the `set-role` script, and add shared constants and schema types. **Do not delete the existing test accounts.** (T1 covers the role route, rules, route hardening and `set-role`; indexes, shared constants and schema types belong to T2.)
- **Day 2 — Report intake.** App Check and hybrid AI module, text report form, non-blocking `createReport`, truthful badges, and SOS fixes. (T3 + T4)
- **Day 3 — Responder side.** Actions via server routes, remove mock fallbacks and surface errors, queue limits, and on-demand cloud summaries. (T5)
- **Day 4 — Automation.** Process route (dedupe), escalation cron and log, real Escalation Watch, and service worker for the app shell. (T6, start of T8)
- **Day 5 — Alerts and polish.** Alert form and feed, optional FCM, update seed and README/docs to match reality, end-to-end test in desktop Chrome with Nano plus offline mode, and demo script. Day 5 is also the buffer. (T7, T8)

**If days run short, cut in this order:** 1. FCM push. 2. Voice note. 3. PWA shell polish. 4. Summaries beyond critical reports.

*(The calendar days are indicative: the owner works one approved iteration at a time and the real schedule may differ. The hackathon deadline was not verified.)*

### Iterations — one prompt and one patch each

General verification expectations for every iteration (adapt to scope): `npm ci` -> `npx tsc --noEmit` -> `npx eslint .` (compare with the 35 errors / 9 warnings post-T1 count; do not add new findings) -> `npm run build` (dummy `NEXT_PUBLIC_FIREBASE_*` env if needed) -> `npx --yes tsx --test tests/security/*.test.ts` plus any new tests -> `git diff --check`; manual Rules Playground/emulator checks whenever `firestore.rules` changes; report honestly what was NOT run.

**T1 — Security lockdown** — *Applied locally; not committed/pushed/deployed/merged.*
- Objective: stop role self-assignment and unsafe writes.
- Scope: role route, trusted `set-role.mjs`, Firestore rules, PATCH and POST hardening, seed credential removal, docs. Test accounts preserved; no account deletion.
- Dependencies: none. Constraints: Spark only, no new packages.
- Verification: see sections 4 and 9; remaining owner steps in section 4.

**T2 — Canonical schema** — *Next; planning first.*
- Objective: one canonical schema shared by client, server, rules and indexes.
- Scope: shared constants (`lib/constants/report.ts`: urgency -> weight, category -> dashboard routing, escalation thresholds, limits); canonical report, user, alert and related types; validators and schema consistency; Firestore indexes; mapper truthfulness (remove canned AI text and fake AI provenance); reconcile all client/server/Firestore field names and status values; add/update unit tests and keep the Firestore rules in agreement with the schema. Do not expand into T3 (AI integration) or T4 (UI work). Details in section 12.
- Dependencies: T1 merged into `main` and Preview-tested. Constraints: do not rename the stored `victim` role; keep the rules' citizen-create shape in sync with any client payload change; no UI redesign.
- Verification: general loop; unit tests for new validators; Rules Playground/emulator checks for rule changes; index definitions reviewed against actual queries.

**T3 — Hybrid AI and App Check**
- Objective: real Firebase AI Logic hybrid inference with truthful provenance.
- Scope: create `lib/ai/classify.ts`; rewrite the existing AI module as needed; implement on-device preference with cloud fallback per the approved architecture (`InferenceMode.PREFER_ON_DEVICE`, `initializeDeviceModel()` after a user gesture, JSON-schema structured output, one call for classification + language + translation + people count + confidence; re-run in cloud mode when confidence < 0.8 and online; keep the form's manual category/urgency pickers as the offline/no-Nano fallback); initialize App Check with the approved production (reCAPTCHA) and local-development (debug token) approaches; update `.env.example` only for genuinely required configuration.
- Before implementing, verify against current official Firebase documentation: model support and identifiers, free-tier quota/rate limits, SDK behaviour (including the exact inference-source property), supported Chrome versions/device requirements, and App Check enforcement.
- Dependencies: T2 (canonical `processedBy`/confidence fields). Constraints: AI output is advisory and must not autonomously determine medical decisions or falsely claim a report was processed on-device; the Nano path needs desktop Chrome and is not available to most phones; do not expose Admin credentials in browser code; keep the client hybrid path separate from privileged server operations.
- Verification: general loop; real desktop-Chrome test of both inference sources if the environment allows; state clearly what was not testable.

**T4 — Report intake UI**
- Objective: let citizens actually write and submit a report offline-first.
- Scope: text report form (description, language, category, people affected, injuries); correct SOS category and location handling; remove the fake GPS/location fallback (use real GPS or an explicit "location unavailable"); non-blocking offline-first submission (do not `await` server acknowledgement; use snapshot `hasPendingWrites` for pending/synced); clear pending, synced and failed states; truthful AI processing and inference-source indicators; remove the "Responders notified" guarantee wording; replace the hard-coded "connected" sync card. Preserve the existing design.
- Dependencies: T2, T3. Constraints: keep the Firestore-client create path and rules; update the rules' create shape if the payload changes; no unnecessary dependencies.
- Verification: general loop; DevTools Offline toggle; rules checks.

**T5 — Responder actions and dashboards**
- Objective: dashboards show real data and report real outcomes.
- Scope: route responder actions through trusted server routes (already the T1 contract); remove mock `INCIDENTS` fallbacks and simulated operational data from real dashboards; surface action failures instead of showing success; queue limits (`limit(100)`) and filters (hide duplicates); on-demand cloud summaries only when justified and within free-tier limits (critical reports first, per-session cap); role-based access and ownership enforced server-side.
- Dependencies: T1, T2, T3. Constraints: do not weaken the T1 server checks; do not claim an AI summary exists unless it was generated.
- Verification: general loop; a responder-flow walkthrough with a medical and a rescue account.

**T6 — Process and escalation**
- Objective: deterministic, auditable duplicate handling and escalation on the free tier.
- Scope: secure report-processing/dedupe route; conservative, deterministic, idempotent deduplication (same category, <=30 min, <=0.5 km; `processedAt` guard; transaction; atomic `peopleAffected` increment; audit trail); **SOS reports are never automatically merged**; human review for uncertain duplicates; escalation route and auditable `escalationLog`; real Escalation Watch UI driven by shared constants; scheduled execution only if a genuine secure free-tier mechanism exists.
- Approved thresholds: unacknowledged critical report at 10 minutes; high report at 20 minutes (escalating high to critical); 5-minute sweep; idempotent processing.
- Dependencies: T2 (constants, indexes incl. `category + createdAt`), T5. Constraints: Spark only; any cron route needs a secret and must be described honestly — do not claim real-time scheduling if the chosen free mechanism cannot guarantee it (an external free cron, a dashboard-open sweep and Vercel plan cron limits all have limits; Vercel Hobby cron frequency was not verified).
- Verification: general loop; unit tests for dedupe/escalation planning functions; idempotency tests (double invocation).

**T7 — Alerts**
- Objective: responders publish alerts; citizens see them.
- Scope: alert creation form; citizen alert feed (Firestore listener on unexpired alerts, works from cache); `geoCells` where appropriate (coarse cells + exact Haversine; radius cap 25 km); optional FCM only if it fits the free-tier and security constraints (token registration, cleanup of dead tokens, VAPID key, opt-in coarse location); alert writes use trusted server-side authorization (`POST /api/alerts`); harden the public GET and caller-supplied `alertId`/`active`.
- Dependencies: T2. Constraints: no claim that responders or citizens were notified unless delivery is confirmed.
- Verification: general loop; rules checks (alerts client writes denied).

**T8 — Offline shell and documentation**
- Objective: genuine offline load, honest documentation, a demo that works.
- Scope: minimal service worker and manifest; cache only safe static application-shell assets; never cache private API, authentication or user-specific responses; update the seed script to the final canonical schema (still dev-project-only and guarded); correct README and documentation to reflect implemented behaviour (remove claims for Leaflet, shadcn, Framer Motion, next-pwa, Remote Config unless installed); prepare the demo checklist and test instructions; desktop Chrome end-to-end test including on-device inference with Nano where supported, offline behaviour and sync recovery; prepare a truthful demo script.
- Dependencies: all earlier tasks. Constraints: no new package for the service worker unless explicitly approved; read the relevant installed Next docs first.
- Verification: general loop plus the manual Chrome end-to-end run; record exactly what was and was not exercised.

## 12. T2 planning reference (do not repeat the audit)

Goal: one canonical schema and shared code. No UI redesign. Items for the T2 plan:
1. `lib/constants/report.ts`: urgency -> weight, category -> dashboard routing, escalation thresholds, limits (single source for routes, rule comments and UI).
2. Canonical types: add `acknowledgedByUid`, `processedAt`, `escalationLevel`; `translatedDescription` is null when no translation is needed; always set `peopleAffected` (default 1) and `reportedInjuries`; keep role name `victim` (docs say `citizen`; the code, seed and API use `victim`); remove the canned AI text in the `lib/types/report.ts` mappers that claims analysis, "Gemini Nano 4" or cross-referencing that never ran (show a truthful processedBy badge only).
3. `firestore.indexes.json`: delete the `urgency DESC` index; add `reports(category ASC, createdAt DESC)`; keep `(assignedDashboard, urgencyWeight, createdAt)`, `(userId, createdAt)`, `(status, escalated, createdAt)`.
4. Make `validateNewReport` and the rules agree with the schema; keep `tests/security` green and add tests for new validators. Keep the `firestore.rules` create shape in sync with any client payload change.
5. Update README/documentation schema tables only where they conflict with the code. Update THIS file.

Canonical schema (target; field names/types/writers):
- `users{userId, role (server-only), displayName, preferredLanguage, email, fcmToken, createdAt, lastActiveAt [, geoCell]}`. Self-writes limited to `displayName`, `preferredLanguage`, `fcmToken`, `lastActiveAt` (+ `geoCell` when T7 adds it).
- `reports` = citizen-create fields (reportId, userId, category, urgency, urgencyWeight, description, translatedDescription, originalLanguage, isSOS, location{lat,lng,address?,zone?}, peopleAffected, reportedInjuries, mediaUrl=null, processedBy, confidenceScore) + initial state (status `received`, assignedDashboard, escalated false, nulls, createdAt/syncedAt/updatedAt, one-entry activityTrail) + server-only workflow fields (status transitions, assignedTeamOrUnit, acknowledgedAt/By/ByUid, resolvedNotes, escalated*, escalationLevel, isDuplicateOf, aiTriageSummary/Label, processedAt, activityTrail appends). Categories: medical, water, shelter, missing_person, other. Urgency: critical (3), high (2), normal (1); `urgencyWeight` is derived. Status: received, in_progress, dispatched, resolved. Dashboards: medical, rescue (`medical` category -> medical, everything else -> rescue).
- `escalationLog{logId, reportId, triggeredAt, type auto|manual, reason, previousUrgency, newUrgency, actor (uid | "system_timeout"), actorName, actorRole}` — server-only writes, responders read.
- `alerts{alertId, title, message, severity, area (string label), coordinates{lat,lng}|null, radiusKm|null, geoCells[], active, createdBy, createdByName, createdAt, expiresAt}` — server-only writes, signed-in read (the code's flat shape is canonical; the handoff docs' `area` map is outdated). `resources` is deferred (server-only writes).
- Documented conflicts resolved in the audit: `urgency` vs `urgencyWeight` (keep both, weight derived); three different escalation policies (single policy in section 3); medical/rescue routing; role names; who runs cloud enrichment (client Firebase AI Logic for classification/summaries, server routes for dedupe/escalation/alerts); client vs server writes (citizens client, responders server); Firestore persistence vs a separate queue (no second queue); FCM geo targeting; Cloud Functions vs free tier (Spark architecture).

## 13. Immediate next task for the next agent

**Do not begin T2 implementation automatically.**
1. The owner is completing T1 verification and the Git workflow.
2. T1 must be Preview-tested and merged into `main` before T2 starts.
3. Your first task is **T2 planning only**.
4. Inspect the current `main` branch and the actual files, compare them against the canonical schema plan in section 12, and identify exact changes, risks, dependencies and tests. Return a concise plan (include the approvals you need and anything in this document that turned out to be outdated).
5. **Wait for explicit owner approval before producing any T2 code or patch.**
If the owner has not yet merged T1 into `main`, say so and ask before planning against an unmerged branch.

## 14. Notes for the next agent

- Work from a clean LF checkout; the owner's Windows tree is CRLF. Produce `git diff --cached --binary` (or `git diff --no-index`) patches and test them with `git apply --check --ignore-whitespace` on a fresh copy of the repository.
- Verification loop: see the general expectations in section 11.
- AI-produced category/urgency are suggestions confirmed by humans, never authoritative.
- Keep demo data simulated; never commit credentials or service-account files.
- Avoid `pkill -f` patterns that can match your own shell command line (this killed a shell once during T1).
- Information in this document that could not be verified is marked as an uncertainty. If you find a conflict between this file and the repository, record both facts and ask the owner instead of silently choosing.
