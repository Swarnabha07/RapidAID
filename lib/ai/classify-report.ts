/**
 * T3 - hybrid (on-device first, cloud fallback) report classifier.
 *
 * This is the ONLY module that talks to the Firebase AI Logic SDK. It is
 * client-side and advisory: it returns a validated AiSuggestion and writes
 * nothing anywhere (no Firestore, no processedBy / confidenceScore).
 *
 * Design notes (all verified against @firebase/ai 3.1.0 source):
 *  - systemInstruction is ignored by the on-device adapter, so instructions
 *    live inside the single prompt string.
 *  - In PREFER_ON_DEVICE the SDK only falls back to cloud when the on-device
 *    model is unavailable up front; a runtime on-device failure throws, so we
 *    retry once in cloud ourselves.
 *  - AbortSignal is honoured for cloud requests only; on-device calls are
 *    bounded by a race timeout and late results are discarded.
 *  - getAI() captures the App Check instance at creation time, so
 *    ensureAppCheck() always runs before the first getAI().
 */
import {
  AI_ATTEMPT_TIMEOUT_MS,
  AI_CONFIDENCE_RETRY_THRESHOLD,
  AI_COOLDOWN_MS,
  AI_MAX_OUTPUT_TOKENS,
  AI_OVERALL_TIMEOUT_MS,
  AI_TEMPERATURE,
  resolveModelName,
} from "@/lib/constants/ai";
import {
  SUGGESTION_SCHEMA,
  buildClassificationPrompt,
  mapInferenceSource,
  needsCloudInference,
  parseAiResponse,
  prepareAiInput,
} from "@/lib/ai/schema";
import type {
  AiFailureCode,
  AiSource,
  AiSuggestion,
  ClassifyOptions,
  ClassifyOutcome,
  OnDeviceAvailability,
  PrepareOutcome,
} from "@/lib/ai/types";
import { ensureAppCheck, type AppCheckStatus } from "@/lib/firebase/app-check";

// ---------------------------------------------------------------------------
// Runtime seam (lets tests run the whole flow without the real SDK)
// ---------------------------------------------------------------------------

export type ModelKind = "hybrid" | "on-device" | "cloud";

export interface ModelLike {
  generateContent(
    request: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ response: { text(): string; inferenceSource?: string } }>;
  initializeDeviceModel?(onProgress?: (fraction: number) => void): Promise<void>;
}

export interface ClassifierRuntime {
  now(): number;
  isOnline(): boolean;
  ensureAppCheck(): Promise<AppCheckStatus>;
  getModel(kind: ModelKind): Promise<ModelLike>;
  onDeviceAvailability(): Promise<OnDeviceAvailability>;
}

export interface ClassifierConfig {
  attemptTimeoutMs: number;
  overallTimeoutMs: number;
  cooldownMs: number;
  retryThreshold: number;
}

const DEFAULT_CONFIG: ClassifierConfig = {
  attemptTimeoutMs: AI_ATTEMPT_TIMEOUT_MS,
  overallTimeoutMs: AI_OVERALL_TIMEOUT_MS,
  cooldownMs: AI_COOLDOWN_MS,
  retryThreshold: AI_CONFIDENCE_RETRY_THRESHOLD,
};

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function statusFromMessage(message: unknown): number | null {
  if (typeof message !== "string") return null;
  const m = /\[(\d{3})[\s\]]/.exec(message);
  return m ? Number(m[1]) : null;
}

/** Maps SDK / platform errors to neutral failure codes. Never includes report text. */
export function mapAiError(err: unknown, online: boolean): { code: AiFailureCode; detail: string } {
  const e = (typeof err === "object" && err !== null ? err : {}) as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
    customErrorData?: { status?: unknown };
  };
  if (e.name === "AbortError") return { code: "cancelled", detail: "abort" };

  const rawStatus = e.customErrorData?.status;
  const status = typeof rawStatus === "number" ? rawStatus : statusFromMessage(e.message);
  const sdkCode = typeof e.code === "string" ? e.code : "";

  if (status === 429) return { code: "rate-limited", detail: "http-429" };
  if (status === 401 || status === 403) {
    return {
      code: sdkCode === "api-not-enabled" ? "ai-unavailable" : "access-denied",
      detail: sdkCode === "api-not-enabled" ? "api-not-enabled" : `http-${status}`,
    };
  }
  if (sdkCode === "api-not-enabled" || sdkCode === "unsupported") {
    return { code: "ai-unavailable", detail: sdkCode };
  }
  if (sdkCode === "fetch-error" && status === null) {
    return online
      ? { code: "ai-unavailable", detail: "network" }
      : { code: "offline", detail: "network" };
  }
  if (sdkCode === "response-error" || sdkCode === "parse-failed") {
    return { code: "invalid-output", detail: sdkCode };
  }
  return { code: "ai-unavailable", detail: sdkCode || "error" };
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

type AttemptResult =
  | { ok: true; suggestion: AiSuggestion; source: AiSource }
  | { ok: false; code: AiFailureCode; detail?: string };

export function createClassifier(runtime: ClassifierRuntime, overrides: Partial<ClassifierConfig> = {}) {
  const config: ClassifierConfig = { ...DEFAULT_CONFIG, ...overrides };
  let generation = 0;
  let lastStartedAt = Number.NEGATIVE_INFINITY;
  let inflight: AbortController | null = null;

  /** Must be called from a user gesture (click): Chrome requires it for the model download. */
  async function prepareOnDeviceModel(onProgress?: (fraction: number) => void): Promise<PrepareOutcome> {
    try {
      const before = await runtime.onDeviceAvailability();
      if (before === "unsupported" || before === "unavailable") {
        return { ok: false, code: "ai-unavailable", availability: before };
      }
      if (before === "available") return { ok: true, availability: before };
      const model = await runtime.getModel("hybrid");
      await model.initializeDeviceModel?.(onProgress);
      const after = await runtime.onDeviceAvailability();
      return after === "available"
        ? { ok: true, availability: after }
        : { ok: false, code: "ai-unavailable", availability: after };
    } catch (err) {
      return { ok: false, code: mapAiError(err, runtime.isOnline()).code, availability: "unavailable" };
    }
  }

  function cancel(): void {
    inflight?.abort();
  }

  async function classify(text: string, options: ClassifyOptions = {}): Promise<ClassifyOutcome> {
    const start = runtime.now();
    const fail = (code: AiFailureCode, detail?: string): ClassifyOutcome => ({
      ok: false,
      code,
      detail,
      durationMs: runtime.now() - start,
    });

    const input = prepareAiInput(text);
    if (!input) return fail("empty-input");
    if (options.signal?.aborted) return fail("cancelled");
    if (start - lastStartedAt < config.cooldownMs) return fail("cooldown");
    lastStartedAt = start;

    // A newer request supersedes the previous one.
    inflight?.abort();
    const controller = new AbortController();
    inflight = controller;
    const myGeneration = ++generation;
    const onExternalAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onExternalAbort, { once: true });
    const isStale = () => controller.signal.aborted || myGeneration !== generation;
    const deadline = start + config.overallTimeoutMs;

    async function attempt(kind: ModelKind): Promise<AttemptResult> {
      const remaining = deadline - runtime.now();
      if (remaining <= 0) return { ok: false, code: "timeout", detail: "overall-deadline" };
      const budget = Math.min(config.attemptTimeoutMs, remaining);

      const attemptController = new AbortController();
      const relayAbort = () => attemptController.abort();
      controller.signal.addEventListener("abort", relayAbort, { once: true });
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const run = (async () => {
          const model = await runtime.getModel(kind);
          return model.generateContent(buildClassificationPrompt(input), {
            signal: attemptController.signal,
          });
        })();
        run.catch(() => undefined); // a lost race must not become an unhandled rejection
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            attemptController.abort();
            reject(new Error("ai-timeout"));
          }, budget);
        });
        const result = await Promise.race([run, timeout]);
        if (isStale()) return { ok: false, code: "cancelled" };

        const source = mapInferenceSource(result.response.inferenceSource);
        if (!source) return { ok: false, code: "invalid-output", detail: "no-inference-source" };
        const parsed = parseAiResponse(result.response.text(), input);
        if (!parsed.ok) return { ok: false, code: "invalid-output", detail: parsed.reason };
        return { ok: true, suggestion: parsed.suggestion, source };
      } catch (err) {
        if (timedOut) return { ok: false, code: "timeout", detail: "attempt" };
        if (isStale()) return { ok: false, code: "cancelled" };
        const mapped = mapAiError(err, runtime.isOnline());
        return { ok: false, code: mapped.code, detail: mapped.detail };
      } finally {
        if (timer) clearTimeout(timer);
        controller.signal.removeEventListener("abort", relayAbort);
      }
    }

    try {
      const cloudOnly = needsCloudInference(input);
      // Always before any getAI(): see header note.
      const appCheck = await runtime.ensureAppCheck();
      if (isStale()) return fail("cancelled");
      const online = runtime.isOnline();
      const cloudAllowed = online && appCheck.ready;

      if (cloudOnly && !cloudAllowed) {
        return fail(online ? "ai-unavailable" : "offline", online ? "cloud-not-allowed" : "offline");
      }

      const firstKind: ModelKind = cloudOnly ? "cloud" : cloudAllowed ? "hybrid" : "on-device";
      const first = await attempt(firstKind);
      if (isStale()) return fail("cancelled");

      const succeed = (r: Extract<AttemptResult, { ok: true }>, retried: boolean): ClassifyOutcome => ({
        ok: true,
        suggestion: r.suggestion,
        source: r.source,
        lowConfidence: r.suggestion.confidence < config.retryThreshold,
        retriedInCloud: retried,
        durationMs: runtime.now() - start,
      });

      if (first.ok) {
        const lowOnDevice = first.source === "on-device" && first.suggestion.confidence < config.retryThreshold;
        if (lowOnDevice && cloudAllowed) {
          const retry = await attempt("cloud");
          if (isStale()) return fail("cancelled");
          // If the retry fails we keep the on-device answer, flagged low-confidence.
          return retry.ok ? succeed(retry, true) : succeed(first, true);
        }
        return succeed(first, false);
      }

      // The hybrid path may have failed inside Nano (runtime error / bad JSON).
      // Retry once in cloud, but never after an access, quota or timeout failure.
      const retryable = first.code === "invalid-output" || first.code === "ai-unavailable";
      if (firstKind === "hybrid" && cloudAllowed && retryable) {
        const retry = await attempt("cloud");
        if (isStale()) return fail("cancelled");
        return retry.ok ? succeed(retry, true) : fail(retry.code, retry.detail);
      }
      return fail(first.code, first.detail);
    } finally {
      options.signal?.removeEventListener("abort", onExternalAbort);
      if (inflight === controller) inflight = null;
    }
  }

  return { classify, prepareOnDeviceModel, cancel };
}

// ---------------------------------------------------------------------------
// Real runtime (Firebase AI Logic, Gemini Developer API, Spark-compatible)
// ---------------------------------------------------------------------------

const ON_DEVICE_CREATE_OPTIONS = {
  // Text only, English: avoids the multimodal Chrome flag (the SDK default
  // also requests image input) and matches the documented configuration.
  expectedInputs: [{ type: "text" as const, languages: ["en"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

const KNOWN_AVAILABILITY: readonly OnDeviceAvailability[] = [
  "available",
  "downloadable",
  "downloading",
  "unavailable",
];

function createDefaultRuntime(): ClassifierRuntime {
  const models = new Map<ModelKind, Promise<ModelLike>>();
  let aiPromise: Promise<unknown> | null = null;

  async function getAi() {
    // App Check first, then getAI(): the AI service captures it at creation.
    await ensureAppCheck();
    const [sdk, { app }] = await Promise.all([import("firebase/ai"), import("@/lib/firebase/config")]);
    aiPromise ??= Promise.resolve(sdk.getAI(app, { backend: new sdk.GoogleAIBackend() }));
    return { sdk, ai: (await aiPromise) as ReturnType<typeof sdk.getAI> };
  }

  async function buildModel(kind: ModelKind): Promise<ModelLike> {
    const { sdk, ai } = await getAi();
    const inCloudParams = {
      model: resolveModelName(process.env.NEXT_PUBLIC_GEMINI_MODEL),
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: SUGGESTION_SCHEMA as unknown as Record<string, unknown>,
        temperature: AI_TEMPERATURE,
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
      },
    };
    const onDeviceParams = {
      createOptions: ON_DEVICE_CREATE_OPTIONS,
      promptOptions: { responseConstraint: SUGGESTION_SCHEMA as unknown as Record<string, unknown> },
    };
    const mode =
      kind === "hybrid"
        ? sdk.InferenceMode.PREFER_ON_DEVICE
        : kind === "on-device"
          ? sdk.InferenceMode.ONLY_ON_DEVICE
          : sdk.InferenceMode.ONLY_IN_CLOUD;
    return sdk.getGenerativeModel(
      ai,
      { mode, onDeviceParams, inCloudParams },
      { timeout: AI_ATTEMPT_TIMEOUT_MS },
    ) as unknown as ModelLike;
  }

  return {
    now: () => Date.now(),
    isOnline: () => (typeof navigator === "undefined" ? true : navigator.onLine !== false),
    ensureAppCheck,
    getModel(kind) {
      let model = models.get(kind);
      if (!model) {
        model = buildModel(kind);
        // Do not cache a failed construction.
        model.catch(() => models.delete(kind));
        models.set(kind, model);
      }
      return model;
    },
    async onDeviceAvailability() {
      const lm = (globalThis as unknown as {
        LanguageModel?: { availability(options?: unknown): Promise<string> };
      }).LanguageModel;
      if (!lm || typeof lm.availability !== "function") return "unsupported";
      try {
        const value = (await lm.availability(ON_DEVICE_CREATE_OPTIONS)) as OnDeviceAvailability;
        return KNOWN_AVAILABILITY.includes(value) ? value : "unavailable";
      } catch {
        return "unavailable";
      }
    },
  };
}

let defaultClassifier: ReturnType<typeof createClassifier> | null = null;
function shared() {
  defaultClassifier ??= createClassifier(createDefaultRuntime());
  return defaultClassifier;
}

/** Classify a free-text report description. Advisory only; never stores anything. */
export function classifyReportText(text: string, options?: ClassifyOptions): Promise<ClassifyOutcome> {
  return shared().classify(text, options);
}

/** Start the on-device model download. Call only from a click handler. */
export function prepareOnDeviceModel(onProgress?: (fraction: number) => void): Promise<PrepareOutcome> {
  return shared().prepareOnDeviceModel(onProgress);
}

export function cancelClassification(): void {
  shared().cancel();
}

/** Current Chrome on-device status (no download, no inference). */
export function getOnDeviceAvailability(): Promise<OnDeviceAvailability> {
  return createDefaultRuntime().onDeviceAvailability();
}

/** Warm the SDK chunks so a later click handler is not delayed by a download. */
export function preloadAiSdk(): void {
  void import("firebase/ai").catch(() => undefined);
  void import("@/lib/firebase/config").catch(() => undefined);
}
