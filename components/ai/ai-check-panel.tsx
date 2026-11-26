"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AI_DISCLAIMER,
  AI_INPUT_MAX_CHARS,
  AI_SUGGESTION_NOTICE,
} from "@/lib/constants/ai";
import { REPORT_URGENCIES, type ReportUrgency } from "@/lib/constants/report";
import {
  cancelClassification,
  classifyReportText,
  getOnDeviceAvailability,
  prepareOnDeviceModel,
  preloadAiSdk,
} from "@/lib/ai/classify-report";
import { urgencyChange } from "@/lib/ai/schema";
import {
  AI_FAILURE_MESSAGES,
  type ClassifyOutcome,
  type OnDeviceAvailability,
} from "@/lib/ai/types";
import {
  describeAppCheckConfig,
  verifyAppCheckToken,
} from "@/lib/firebase/app-check";

const SOURCE_LABEL = {
  "on-device": "Suggested on this device",
  cloud: "Suggested by cloud AI",
} as const;

export function AiCheckPanel() {
  const [text, setText] = React.useState("");
  const [currentUrgency, setCurrentUrgency] = React.useState<
    ReportUrgency | ""
  >("");
  const [availability, setAvailability] = React.useState<
    OnDeviceAvailability | "checking"
  >("checking");
  const [progress, setProgress] = React.useState<number | null>(null);
  const [prepareMessage, setPrepareMessage] = React.useState<string | null>(
    null,
  );
  const [running, setRunning] = React.useState(false);
  const [outcome, setOutcome] = React.useState<ClassifyOutcome | null>(null);
  const [config, setConfig] = React.useState<{
    siteKeyConfigured: boolean;
    hostname: string;
  } | null>(null);

  const [checkingToken, setCheckingToken] = React.useState(false);
  const [tokenCheck, setTokenCheck] = React.useState<{
    ok: boolean;
    detail?: string;
  } | null>(null);

  React.useEffect(() => {
    preloadAiSdk();
    let active = true;
    void getOnDeviceAvailability().then((value) => {
      if (active) setAvailability(value);
    });
    void Promise.resolve().then(() => {
      if (active) setConfig(describeAppCheckConfig());
    });
    return () => {
      active = false;
    };
  }, []);

  // Must stay a direct click handler: Chrome requires user activation to download the model.
  async function handlePrepare() {
    setPrepareMessage(null);
    setProgress(0);
    const result = await prepareOnDeviceModel((fraction) =>
      setProgress(fraction),
    );
    setProgress(null);
    setAvailability(result.availability);
    setPrepareMessage(
      result.ok
        ? "On-device model is ready."
        : "On-device model is not available on this browser or device.",
    );
  }

  async function handleRun() {
    setRunning(true);
    setOutcome(null);
    const result = await classifyReportText(text);
    setOutcome(result);
    setRunning(false);
  }

  async function handleCheckAppCheck() {
    setCheckingToken(true);
    setTokenCheck(null);

    try {
      const result = await verifyAppCheckToken();
      setTokenCheck(result);
    } catch {
      setTokenCheck({
        ok: false,
        detail: "unexpected-error",
      });
    } finally {
      setCheckingToken(false);
    }
  }

  const change = outcome?.ok
    ? urgencyChange(currentUrgency || null, outcome.suggestion.urgency)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text-primary">
          AI diagnostics (temporary)
        </h1>
        <p className="text-sm text-text-secondary">
          Admin-only check of App Check and hybrid AI suggestions. Nothing is
          saved or submitted.
        </p>
      </header>

      <section className="rounded-[var(--radius-sm)] border border-black/10 bg-white p-4 text-sm">
        <h2 className="mb-2 font-medium text-text-primary">Environment</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-text-secondary">
          <dt>Host</dt>
          <dd>{config?.hostname || "…"}</dd>
          <dt>reCAPTCHA site key</dt>
          <dd>
            {config
              ? config.siteKeyConfigured
                ? "configured"
                : "not configured"
              : "…"}
          </dd>
          <dt>On-device model</dt>
          <dd>{availability}</dd>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePrepare}
            disabled={progress !== null}
          >
            {progress === null
              ? "Prepare on-device model"
              : `Downloading ${Math.round(progress * 100)}%`}
          </Button>

          {prepareMessage ? (
            <span className="text-text-secondary">{prepareMessage}</span>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCheckAppCheck}
            disabled={checkingToken}
          >
            {checkingToken ? "Checking token..." : "Check App Check token"}
          </Button>

          {tokenCheck ? (
            <span className="text-text-secondary" role="status">
              {tokenCheck.ok
                ? "App Check token acquired successfully."
                : `Token acquisition failed: ${tokenCheck.detail}`}
            </span>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <label
          className="text-sm font-medium text-text-primary"
          htmlFor="ai-check-text"
        >
          Report text
        </label>
        <textarea
          id="ai-check-text"
          value={text}
          maxLength={AI_INPUT_MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full rounded-[var(--radius-sm)] border border-black/10 bg-white p-3 text-sm"
          placeholder="Describe the situation (English, Bengali, Hindi…)"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label
            className="text-sm text-text-secondary"
            htmlFor="ai-check-urgency"
          >
            Urgency already chosen
          </label>
          <select
            id="ai-check-urgency"
            value={currentUrgency}
            onChange={(e) =>
              setCurrentUrgency(e.target.value as ReportUrgency | "")
            }
            className="min-h-9 rounded-[var(--radius-sm)] border border-black/10 bg-white px-2 text-sm"
          >
            <option value="">none</option>
            {REPORT_URGENCIES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs text-text-secondary">
            {text.length}/{AI_INPUT_MAX_CHARS}
          </span>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleRun}
            disabled={running || text.trim().length === 0}
          >
            {running ? "Working…" : "Get AI suggestion"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={cancelClassification}
            disabled={!running}
          >
            Cancel
          </Button>
        </div>
      </section>

      {outcome ? (
        <section
          className="rounded-[var(--radius-sm)] border border-black/10 bg-white p-4 text-sm"
          aria-live="polite"
        >
          {outcome.ok ? (
            <div className="flex flex-col gap-2">
              <p className="inline-flex w-fit rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium text-text-primary">
                {SOURCE_LABEL[outcome.source]}
                {outcome.retriedInCloud ? " (after cloud re-check)" : ""}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-text-secondary">
                <dt>Category</dt>
                <dd>{outcome.suggestion.category}</dd>
                <dt>Urgency</dt>
                <dd>{outcome.suggestion.urgency}</dd>
                <dt>Language</dt>
                <dd>{outcome.suggestion.language ?? "unknown"}</dd>
                <dt>People stated</dt>
                <dd>
                  {outcome.suggestion.peopleAffectedStated ?? "not stated"}
                </dd>
                <dt>Confidence</dt>
                <dd>
                  {outcome.suggestion.confidence.toFixed(2)} (model-estimated)
                  {outcome.lowConfidence ? " - low, review carefully" : ""}
                </dd>
                <dt>Translation</dt>
                <dd>{outcome.suggestion.translation ?? "none"}</dd>
              </dl>
              {change === "lower" ? (
                <p className="font-medium text-critical">
                  AI suggests a lower urgency than the one already chosen. It is
                  never applied automatically; keep the higher urgency unless a
                  person deliberately changes it.
                </p>
              ) : null}
              <p className="text-text-secondary">{AI_SUGGESTION_NOTICE}</p>
              <p className="text-xs text-text-secondary">
                {outcome.durationMs} ms
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-text-primary">
                {AI_FAILURE_MESSAGES[outcome.code]}
              </p>
              <p className="text-xs text-text-secondary">
                code: {outcome.code}
                {outcome.detail ? ` / ${outcome.detail}` : ""} /{" "}
                {outcome.durationMs} ms
              </p>
            </div>
          )}
        </section>
      ) : null}

      <p className="text-xs font-medium text-text-secondary">{AI_DISCLAIMER}</p>
    </main>
  );
}
