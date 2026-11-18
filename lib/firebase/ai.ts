import { app } from "@/lib/firebase/config";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  type GenerativeModel,
  type GenerationConfig,
} from "firebase/ai";

/**
 * Singleton instance of Firebase AI Logic.
 */
let aiInstance: ReturnType<typeof getAI> | null = null;

export function getFirebaseAI() {
  if (!aiInstance) {
    aiInstance = getAI(app, { backend: new GoogleAIBackend() });
  }
  return aiInstance;
}

/**
 * Default Gemini model: Gemini 3.5+ generation.
 * Can be overridden via NEXT_PUBLIC_GEMINI_MODEL environment variable.
 */
export const DEFAULT_GEMINI_MODEL =
  process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3.5-flash";

export const SUPPORTED_GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-pro",
] as const;

export type SupportedGeminiModel = (typeof SUPPORTED_GEMINI_MODELS)[number];

/**
 * Initializes and returns a Cloud Gemini model instance from Firebase AI Logic.
 * Defaults to "gemini-3.5-flash" (models above 3.5).
 */
export function getCloudGeminiModel(
  modelName: string = DEFAULT_GEMINI_MODEL,
  generationConfig?: Partial<GenerationConfig>
): GenerativeModel {
  const ai = getFirebaseAI();
  return getGenerativeModel(ai, {
    model: modelName,
    generationConfig: {
      temperature: 0.2, // Default low temperature for consistent triage & classification
      maxOutputTokens: 2048,
      ...generationConfig,
    },
  });
}

// ---------------------------------------------------------------------------
// On-Device Gemini Nano Detector & Types
// ---------------------------------------------------------------------------

export type NanoAvailabilityStatus = "readily" | "after-download" | "no";

export interface OnDeviceCapabilities {
  maxTokens?: number;
  defaultTemperature?: number;
  defaultTopK?: number;
}

export interface OnDeviceAvailabilityResult {
  available: boolean;
  status: NanoAvailabilityStatus;
  capabilities?: OnDeviceCapabilities | null;
  error?: string | null;
}

/**
 * Safely checks if on-device Gemini Nano (Chrome Prompt API: window.ai / self.ai.languageModel)
 * is available in the browser without throwing Server-Side Rendering (SSR) errors.
 */
export async function checkOnDeviceNanoAvailability(): Promise<OnDeviceAvailabilityResult> {
  // Safe guard against Server-Side Rendering execution
  if (typeof window === "undefined" && typeof self === "undefined") {
    return {
      available: false,
      status: "no",
      error: "SSR environment: browser window/self is undefined.",
    };
  }

  try {
    const globalObj = typeof window !== "undefined" ? window : self;
    const aiScope = (globalObj as any)?.ai;

    if (!aiScope || !aiScope.languageModel) {
      return {
        available: false,
        status: "no",
        error: "Prompt API (window.ai.languageModel) not supported or disabled in this browser.",
      };
    }

    if (typeof aiScope.languageModel.capabilities === "function") {
      const caps = await aiScope.languageModel.capabilities();
      const status: NanoAvailabilityStatus =
        caps.available === "readily" || caps.available === "after-download"
          ? caps.available
          : "no";

      return {
        available: status === "readily" || status === "after-download",
        status,
        capabilities: {
          maxTokens: caps.maxTokens,
          defaultTemperature: caps.defaultTemperature,
          defaultTopK: caps.defaultTopK,
        },
      };
    }

    return {
      available: true,
      status: "readily",
      capabilities: null,
    };
  } catch (err: any) {
    return {
      available: false,
      status: "no",
      error: err?.message || "Unknown error inspecting on-device AI capabilities.",
    };
  }
}

// ---------------------------------------------------------------------------
// Generic Hybrid AI Helpers for P1 (Classify, Translate) and P2 (Enrich)
// ---------------------------------------------------------------------------

export interface AIInferenceOptions {
  modelName?: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  preferOnDevice?: boolean;
}

export interface AIInferenceResult<T = string> {
  result: T;
  rawText: string;
  source: "on-device" | "cloud";
  modelUsed: string;
  durationMs: number;
}

/**
 * Executes an AI text generation task with automatic fallback:
 * 1. Attempts on-device Gemini Nano if supported and available.
 * 2. Seamlessly falls back to Cloud Gemini via Firebase AI Logic.
 */
export async function executeAIInference(
  prompt: string,
  options: AIInferenceOptions = {}
): Promise<AIInferenceResult<string>> {
  const startTime = Date.now();
  const preferOnDevice = options.preferOnDevice !== false;

  // 1. Attempt on-device Gemini Nano if running on client and preferred
  if (preferOnDevice && typeof window !== "undefined") {
    try {
      const nanoStatus = await checkOnDeviceNanoAvailability();
      if (nanoStatus.available && nanoStatus.status === "readily") {
        const aiScope = (window as any).ai;
        const session = await aiScope.languageModel.create({
          systemPrompt: options.systemPrompt,
          temperature: options.temperature ?? 0.2,
        });

        const textResult = await session.prompt(prompt);
        session.destroy?.();

        return {
          result: textResult.trim(),
          rawText: textResult,
          source: "on-device",
          modelUsed: "gemini-nano",
          durationMs: Date.now() - startTime,
        };
      }
    } catch (nanoErr) {
      console.warn("On-device inference bypassed or failed; falling back to Cloud Gemini:", nanoErr);
    }
  }

  // 2. Cloud Gemini execution via Firebase AI Logic
  const modelName = options.modelName || DEFAULT_GEMINI_MODEL;
  const model = getCloudGeminiModel(modelName, {
    temperature: options.temperature ?? 0.2,
    maxOutputTokens: options.maxOutputTokens ?? 2048,
  });

  const fullPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\nTask:\n${prompt}`
    : prompt;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const outputText = response.text().trim();

  return {
    result: outputText,
    rawText: outputText,
    source: "cloud",
    modelUsed: modelName,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Executes a structured JSON inference task with automatic markdown extraction and fallback.
 */
export async function executeJsonInference<T = any>(
  prompt: string,
  options: AIInferenceOptions = {}
): Promise<AIInferenceResult<T>> {
  const jsonSystemPrompt =
    (options.systemPrompt ? `${options.systemPrompt}\n\n` : "") +
    "You must reply with valid JSON only. Do not wrap in commentary or unformatted text.";

  const rawInference = await executeAIInference(prompt, {
    ...options,
    systemPrompt: jsonSystemPrompt,
  });

  let cleaned = rawInference.rawText.trim();
  // Strip markdown code fences if present (e.g. ```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    const parsedData = JSON.parse(cleaned) as T;
    return {
      result: parsedData,
      rawText: rawInference.rawText,
      source: rawInference.source,
      modelUsed: rawInference.modelUsed,
      durationMs: rawInference.durationMs,
    };
  } catch (parseError: any) {
    throw new Error(
      `Failed to parse JSON response from ${rawInference.source} (${rawInference.modelUsed}): ${parseError.message}. Content was: ${rawInference.rawText}`
    );
  }
}
