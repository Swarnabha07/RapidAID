# RapidAID

**Disaster response triage and coordination — built for the moment connectivity fails.**

Submission for #BuildHybridAI 2026 | Platform: Web (Chrome)

---

## 1. The Problem

When disaster strikes — floods, earthquakes, cyclones — two things fail at the same time: infrastructure, and the networks people rely on to ask for help. Cell towers go down or get overloaded. Victims can't reach responders. Responders can't see who needs what, where, or how urgently.

Most disaster-response software assumes a stable internet connection. That assumption breaks exactly when it matters most.

## 2. Our Solution

**RapidAID** is a web app that lets people report emergencies (medical, water, shelter, missing persons) **instantly, even with zero or intermittent connectivity** — and routes those reports to the right responders the moment a connection is available.

It does this using **Firebase AI Logic's hybrid inference**: on-device Gemini Nano 4 handles instant classification and triage completely offline, while cloud Gemini takes over for complex, ambiguous, or multi-report reasoning once connectivity returns.

This isn't hybrid AI as an optimization — it's hybrid AI as the actual feature. Offline capability is the product's core value, not a fallback mode.

## 3. How We Used Firebase AI Logic

| Scenario | What runs | Why |
|---|---|---|
| User submits a report with no/poor connectivity | **On-device Gemini Nano 4** classifies category (medical / water / shelter / missing person) and urgency, and translates non-English input, entirely offline | Disaster zones lose connectivity — on-device inference is the only way to triage instantly when it matters most |
| Report is ambiguous, multi-need, or needs cross-referencing against other reports | **Cloud Gemini** (via Firebase AI Logic's cloud fallback) handles deeper reasoning: splitting multi-need reports, deduplicating near-identical reports from the same area, generating structured summaries for responders | On-device models can't reason across many reports or handle highly ambiguous input — this is where cloud depth is genuinely needed |
| Every report | Tagged with a visible **⚡ instant (on-device)** or **☁ cloud-enhanced** badge in the UI | Makes the hybrid architecture visible to the user and to judges, not just working invisibly in the background |

Firebase AI Logic is called directly in the client (Web SDK) for on-device inference, with automatic cloud fallback configured through the same SDK when on-device confidence is low or the device doesn't support local inference.

**Implementation status (T3).** The hybrid AI module lives in `lib/ai/` and is advisory only: it returns a validated suggestion (category, urgency, language, optional English translation, an explicitly stated people count, and a model-estimated confidence) that a person must confirm. Chrome's on-device model is tried first for Latin-script text; Bengali, Hindi and other non-Latin text goes to cloud Gemini (`gemini-3.5-flash-lite`, free tier) through Firebase AI Logic, protected by App Check. If AI is unavailable, offline, rate-limited or slow, the manual options always work. Reports are never stored as AI-processed (`processedBy` stays `manual`). The source badge (on-device or cloud) is shown transiently and only reflects what the SDK reports. The free-text report form that uses this module is T4; until then the admin-only `/ai-check` page exercises it. Not a diagnosis. Authorized human review required.

## 4. Features

### User App
- **Submit a report** (text) — classified by category and urgency on-device, works fully offline
- **SOS button** — one-tap emergency flag; skips the form, captures GPS location + a single voice note, automatically marked critical
- **Multi-language input** — on-device translation normalizes input in any language before classification, so language is never a barrier during a crisis
- **Offline queueing** — reports are stored locally and automatically sync to the cloud the moment connectivity returns
- **Status tracker** — "Received → In Progress → Help Dispatched" visibility for the person who filed the report
- **Disaster notification feed** — real-time alerts (evacuation zones, shelter locations, danger updates) pushed from responders to nearby users

### Medical Dashboard
- Live, urgency-sorted queue of medical-category reports
- Mark reports in-progress / resolved
- **Auto-escalation** — a critical case left unresolved past a set time window automatically bumps priority and/or flags to the Rescue dashboard

### Rescue / Coordination Dashboard
- Live, urgency-sorted queue of shelter, rescue, and missing-person reports
- Cloud Gemini merges duplicate/near-duplicate reports from the same incident
- Mark reports in-progress / resolved
- Same auto-escalation logic as the Medical dashboard
- Push disaster alerts out to the User app's notification feed

## 5. Value Proposition

- **For victims:** a way to ask for help that works even when nothing else does — no signal required to be heard.
- **For responders:** a single, prioritized, de-duplicated view of need across a disaster zone, instead of fragmented calls, texts, and rumors.
- **For organizations (NGOs, hospitals, rescue coordination):** faster triage, fewer missed critical cases (via auto-escalation), and a structured record of every request for after-action review.

## 6. Architecture

```
┌─────────────────┐
│   User App       │  Next.js + React (PWA)
│  (Web / Chrome)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│     Firebase AI Logic          │
│  ┌─────────────┐  ┌──────────┐ │
│  │ Gemini Nano 4│  │  Cloud    │ │
│  │ (on-device)  │→│  Gemini   │ │
│  │ offline-first│  │ fallback  │ │
│  └─────────────┘  └──────────┘ │
└────────────┬───────────────────┘
             │
             ▼
     ┌───────────────┐
     │   Firestore     │  (offline persistence + real-time sync)
     └───────┬────────┘
             │
   ┌─────────┼─────────┐
   ▼         ▼         ▼
User App  Medical    Rescue
Feed      Dashboard  Dashboard
```

**Offline flow:** Report submitted → on-device Nano classifies → stored in local queue (IndexedDB via Firestore offline persistence) → confirmation shown to user → synced to Firestore automatically when connectivity returns → cloud Gemini enriches if needed → routed to the relevant dashboard.

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui, Framer Motion |
| AI | Firebase AI Logic — Gemini Nano 4 (on-device) + cloud Gemini fallback |
| Database | Firestore (offline persistence, real-time sync) |
| Auth | Firebase Authentication. Roles (victim / medical / rescue / admin) are signed custom claims, provisioned by an administrator with `scripts/set-role.mjs`; never self-assigned |
| Security | Firebase App Check |
| Offline / PWA | next-pwa (service worker, offline caching) |
| Notifications | Firebase Cloud Messaging |
| Automation | Firebase Cloud Functions (scheduled auto-escalation) |
| Maps | Leaflet + OpenStreetMap tiles (citizen report location picker; responder maps are still mocks) |
| Config | Firebase Remote Config |
| Hosting | Vercel (frontend), Firebase (backend services) |

## 8. Scope & Responsible Use

RapidAID is a **routing and triage tool for human responders** — it never makes medical decisions, never tells a user "help is coming," and never replaces professional judgment. Its job is to structure and prioritize information so human teams can act faster. All demo data used in our video and repository is simulated; no real victim data is used.

**Access control.** New accounts are always citizens. Only a trusted administrator can grant a responder or admin role (`node scripts/set-role.mjs`, Firebase Admin SDK). Firestore rules and server routes read the role only from the signed token claim. Citizens create reports directly in Firestore (offline-capable) in the initial `received` state only; responders change reports exclusively through authenticated server routes (`PATCH /api/reports/[id]`) that enforce dashboard ownership and valid status transitions and record the responder's verified UID.

## 9. Setup & Running Locally

```bash
# Clone the repo
git clone <repo-url>
cd rapidaid

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Firebase project config (the App Check debug token is registered in the console, see below)

# Run locally
npm run dev
```

**Firebase project setup required:**
1. Create a Firebase project, enable Firestore, Authentication, Cloud Messaging, App Check, and Firebase AI Logic (Gemini Developer API or Vertex AI backend).
2. Enable App Check with the **reCAPTCHA Enterprise** provider (production domain only) and register a debug token for localhost (open `/ai-check` as an admin, click *Get AI suggestion* once and copy the token from the browser console). Enforce App Check for Firebase AI Logic only, never for Firestore or Authentication.
3. Stay on the **Spark** plan and the Gemini Developer API free tier (no billing account, no Cloud Functions). Auto-escalation uses Next.js server routes plus an external HTTP cron (T6).
4. Deploy Firestore security rules and indexes from the repo (`firebase deploy --only firestore`).
