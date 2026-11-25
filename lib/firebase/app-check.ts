/**
 * T3 - Firebase App Check (browser only, lazy).
 *
 * Why lazy: App Check must be initialised BEFORE the first getAI() call,
 * because the AI SDK captures the App Check instance once, when the AI
 * service is created (verified in @firebase/ai: AIService constructor).
 * Initialising it only when AI is first used keeps the landing page, the
 * anonymous SOS flow and offline use independent of the reCAPTCHA script.
 *
 * Firestore and Authentication do not require App Check. Do NOT enforce it for
 * them in the Firebase Console - that would break anonymous SOS and offline
 * writes. Enforce it only for "Firebase AI Logic".
 *
 * This file has no static import of lib/firebase/config so the decision logic
 * stays unit-testable without Firebase environment variables.
 */

export type AppCheckMode = "recaptcha-enterprise" | "debug" | "disabled";

export interface AppCheckStatus {
  ready: boolean;
  mode: AppCheckMode;
  reason?: "server" | "no-site-key" | "init-failed";
}

export interface AppCheckEnv {
  isBrowser: boolean;
  hostname: string;
  nodeEnv: string | undefined;
  siteKey: string | undefined;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Pure decision: debug provider only on localhost in a non-production build;
 * otherwise reCAPTCHA Enterprise when a site key is configured; otherwise
 * App Check stays off (and the AI module then refuses cloud calls).
 */
export function resolveAppCheckMode(
  env: AppCheckEnv,
): { mode: AppCheckMode; reason?: AppCheckStatus["reason"] } {
  if (!env.isBrowser) return { mode: "disabled", reason: "server" };
  if (env.nodeEnv !== "production" && LOCAL_HOSTS.has(env.hostname)) return { mode: "debug" };
  if (env.siteKey && env.siteKey.trim().length > 0) return { mode: "recaptcha-enterprise" };
  return { mode: "disabled", reason: "no-site-key" };
}

/** Safe, secret-free summary for the diagnostics page (no initialisation). */
export function describeAppCheckConfig(): { siteKeyConfigured: boolean; hostname: string } {
  return {
    siteKeyConfigured: Boolean(process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY?.trim()),
    hostname: typeof window === "undefined" ? "" : window.location.hostname,
  };
}

let pending: Promise<AppCheckStatus> | null = null;

/** Idempotent. Never throws. Safe to call before every AI request. */
export function ensureAppCheck(): Promise<AppCheckStatus> {
  if (!pending) pending = initialise();
  return pending;
}

function isAlreadyInitialized(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.includes("already-initialized");
}

async function initialise(): Promise<AppCheckStatus> {
  const isBrowser = typeof window !== "undefined";
  // NEXT_PUBLIC_* must be referenced literally so Next.js can inline it.
  const siteKey = process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY;
  const decision = resolveAppCheckMode({
    isBrowser,
    hostname: isBrowser ? window.location.hostname : "",
    nodeEnv: process.env.NODE_ENV,
    siteKey,
  });
  if (decision.mode === "disabled") {
    return { ready: false, mode: "disabled", reason: decision.reason };
  }

  try {
    const [{ app }, sdk] = await Promise.all([
      import("@/lib/firebase/config"),
      import("firebase/app-check"),
    ]);
    if (decision.mode === "debug") {
      // The SDK logs "Firebase App Check debug token: ..." once; register that
      // token in the Firebase Console (App Check > Manage debug tokens).
      (globalThis as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    sdk.initializeAppCheck(app, {
      // In debug mode the SDK swaps in its debug provider; the placeholder
      // key is never sent to reCAPTCHA.
      provider: new sdk.ReCaptchaEnterpriseProvider(siteKey?.trim() || "debug-mode-placeholder"),
      isTokenAutoRefreshEnabled: true,
    });
    return { ready: true, mode: decision.mode };
  } catch (err) {
    if (isAlreadyInitialized(err)) return { ready: true, mode: decision.mode };
    const code = (err as { code?: unknown } | null)?.code;
    console.warn("App Check initialisation failed", typeof code === "string" ? code : "unknown");
    return { ready: false, mode: "disabled", reason: "init-failed" };
  }
}
