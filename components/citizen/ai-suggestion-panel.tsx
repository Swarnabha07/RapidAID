"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type AiSource,
  type AiSuggestion,
  type OnDeviceAvailability,
} from "@/lib/ai/types";
import { AI_DISCLAIMER, AI_SUGGESTION_NOTICE } from "@/lib/constants/ai";
import type { ReportCategory, ReportUrgency } from "@/lib/constants/report";
import { cn } from "@/lib/utils";

/**
 * Optional AI advisory panel for the full report form (T4).
 *
 * Rules this component enforces (see AGENT_IMPLEMENTATION_CONTEXT.md, T3 + T4):
 *  - It only ever SUGGESTS. Nothing changes in the form until the citizen ticks a field and
 *    presses "Apply selected". Lowering urgency needs its own explicit confirmation.
 *  - The report is still saved as `manual` provenance; nothing about the suggestion is stored.
 *  - A suggestion belongs to the exact text it was made for. Editing the text discards it.
 *  - Submit never waits for AI, and AI is never part of one-tap SOS (different component tree).
 */

export interface AiFormValues {
  category: ReportCategory | "";
  urgency: ReportUrgency | "";
  language: string;
  peopleAffected: string;
  translation: string;
}

export interface AiApplyChanges {
  category?: ReportCategory;
  urgency?: ReportUrgency;
  language?: string;
  peopleAffected?: number;
  translation?: string;
}

export interface AiSuggestionPanelProps {
  description: string;
  current: AiFormValues;
  /** Disables asking and applying (for example while the form is submitting). */
  disabled?: boolean;
  onApply: (changes: AiApplyChanges) => void;
  categoryLabel: (category: ReportCategory) => string;
  urgencyLabel: (urgency: ReportUrgency) => string;
}

const SOURCE_LABEL: Record<AiSource, string> = {
  "on-device": "On-device model",
  cloud: "Cloud model",
};

type FieldKey = "category" | "urgency" | "language" | "peopleAffected" | "translation";

interface Result {
  suggestion: AiSuggestion;
  source: AiSource;
  lowConfidence: boolean;
  /** Exact description text this suggestion was produced for. */
  forText: string;
}

export function AiSuggestionPanel({
  description,
  current,
  disabled = false,
  onApply,
  categoryLabel,
  urgencyLabel,
}: AiSuggestionPanelProps) {
  const [availability, setAvailability] = useState<OnDeviceAvailability | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<FieldKey, boolean>>({
    category: false,
    urgency: false,
    language: false,
    peopleAffected: false,
    translation: false,
  });
  const requestSeq = useRef(0);
  const requestedText = useRef("");

  // Warm up the AI SDK (no network call to the model, no download) and read on-device status.
  useEffect(() => {
    preloadAiSdk();
    let active = true;
    getOnDeviceAvailability()
      .then((value) => {
        if (active) setAvailability(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      cancelClassification();
    };
  }, []);

  // Editing the text while a request is running cancels it (the answer would be for old text).
  useEffect(() => {
    if (running && description.trim() !== requestedText.current) {
      requestSeq.current += 1;
      cancelClassification();
    }
  }, [description, running]);

  const stale = result !== null && result.forText !== description.trim();
  const trimmed = description.trim();

  const handleAsk = async () => {
    if (!trimmed || running || disabled) return;
    const seq = ++requestSeq.current;
    requestedText.current = trimmed;
    setRunning(true);
    setFailure(null);
    setApplied(null);
    setResult(null);
    setSelected({
      category: false,
      urgency: false,
      language: false,
      peopleAffected: false,
      translation: false,
    });
    try {
      const outcome = await classifyReportText(trimmed);
      if (seq !== requestSeq.current) return; // superseded or cancelled by an edit
      if (outcome.ok) {
        setResult({
          suggestion: outcome.suggestion,
          source: outcome.source,
          lowConfidence: outcome.lowConfidence,
          forText: trimmed,
        });
      } else if (outcome.code !== "cancelled") {
        setFailure(AI_FAILURE_MESSAGES[outcome.code]);
      }
    } catch {
      if (seq === requestSeq.current) {
        setFailure(AI_FAILURE_MESSAGES["ai-unavailable"]);
      }
    } finally {
      if (seq === requestSeq.current) setRunning(false);
    }
  };

  const handlePrepare = async () => {
    setDownloadProgress(0);
    try {
      const outcome = await prepareOnDeviceModel((fraction) => setDownloadProgress(fraction));
      setAvailability(outcome.availability);
    } catch {
      /* optional feature: stay silent, the cloud/manual paths still work */
    } finally {
      setDownloadProgress(null);
    }
  };

  const handleDismiss = () => {
    requestSeq.current += 1;
    cancelClassification();
    setRunning(false);
    setResult(null);
    setFailure(null);
  };

  const toggle = (key: FieldKey) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const s = result?.suggestion ?? null;
  const change = s
    ? urgencyChange(current.urgency === "" ? null : current.urgency, s.urgency)
    : "none-selected";

  const rows: Array<{
    key: FieldKey;
    label: string;
    value: string;
    note?: string;
    checkboxLabel: string;
    warn?: boolean;
    already: boolean;
  }> = [];
  if (s) {
    rows.push({
      key: "category",
      label: "Category",
      value: categoryLabel(s.category),
      checkboxLabel: "Use this category",
      already: current.category === s.category,
    });
    rows.push({
      key: "urgency",
      label: "Urgency",
      value: urgencyLabel(s.urgency),
      note:
        change === "lower"
          ? `This is LOWER than the urgency you chose (${urgencyLabel(current.urgency as ReportUrgency)}). Lowering urgency can delay help.`
          : change === "raise"
            ? "This is higher than the urgency you chose."
            : undefined,
      checkboxLabel:
        change === "lower"
          ? "I confirm I want to lower the urgency"
          : "Use this urgency",
      warn: change === "lower",
      already: change === "same",
    });
    if (s.language) {
      rows.push({
        key: "language",
        label: "Language",
        value: s.language,
        checkboxLabel: "Use this language",
        already: current.language === s.language,
      });
    }
    if (s.peopleAffectedStated !== null) {
      rows.push({
        key: "peopleAffected",
        label: "People affected (stated in your text)",
        value: String(s.peopleAffectedStated),
        checkboxLabel: "Use this number",
        already: current.peopleAffected === String(s.peopleAffectedStated),
      });
    }
    if (s.translation) {
      rows.push({
        key: "translation",
        label: "English translation (machine-made, please check it)",
        value: s.translation,
        checkboxLabel: "Attach this translation",
        already: current.translation === s.translation,
      });
    }
  }

  const chosen = rows.filter((row) => selected[row.key] && !row.already);

  const handleApply = () => {
    if (!s || stale || disabled || chosen.length === 0) return;
    const changes: AiApplyChanges = {};
    for (const row of chosen) {
      if (row.key === "category") changes.category = s.category;
      if (row.key === "urgency") changes.urgency = s.urgency;
      if (row.key === "language" && s.language) changes.language = s.language;
      if (row.key === "peopleAffected" && s.peopleAffectedStated !== null) {
        changes.peopleAffected = s.peopleAffectedStated;
      }
      if (row.key === "translation" && s.translation) changes.translation = s.translation;
    }
    onApply(changes);
    setApplied(chosen.map((row) => row.label.split(" (")[0].toLowerCase()).join(", "));
    setResult(null);
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-brand-blue/20 bg-brand-blue/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-text-primary">
            <Sparkles size={15} className="text-brand-blue" /> AI suggestion{" "}
            <span className="font-normal text-text-secondary">(optional)</span>
          </p>
          <p className="mt-0.5 text-[12.5px] text-text-secondary">
            Suggests a category, urgency and language from your text. You decide what to use.
            You can submit without it.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleAsk}
          disabled={!trimmed || running || disabled}
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {running ? "Thinking…" : "Get AI suggestion"}
        </Button>
      </div>

      {availability === "downloadable" && downloadProgress === null && (
        <p className="mt-2 text-[12px] text-text-secondary">
          On-device AI can be prepared on this browser (one-time download).{" "}
          <button
            type="button"
            onClick={handlePrepare}
            className="font-medium text-brand-blue underline"
          >
            Prepare on-device AI
          </button>
        </p>
      )}
      {downloadProgress !== null && (
        <p className="mt-2 text-[12px] text-text-secondary">
          Preparing on-device AI… {Math.round(downloadProgress * 100)}%
        </p>
      )}
      {availability === "available" && (
        <p className="mt-2 text-[12px] text-text-secondary">On-device AI is ready on this browser.</p>
      )}

      {failure && (
        <p role="status" className="mt-3 text-[13px] text-text-secondary">
          {failure}
        </p>
      )}

      {applied && (
        <p role="status" className="mt-3 text-[13px] text-emerald-800">
          Applied: {applied}. You can still change any field before sending.
        </p>
      )}

      {s && result && (
        <div className="mt-3 rounded-md border border-black/10 bg-white p-3.5" role="region" aria-label="AI suggestion review">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-text-secondary">
            <span>
              {SOURCE_LABEL[result.source]} · uncalibrated confidence {Math.round(s.confidence * 100)}%
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary"
            >
              <X size={13} /> Dismiss
            </button>
          </div>

          {result.lowConfidence && (
            <p className="mt-2 rounded bg-amber-50 p-2 text-[12.5px] text-amber-900">
              The model is not confident about this suggestion. Check every field carefully.
            </p>
          )}
          {stale && (
            <p className="mt-2 rounded bg-amber-50 p-2 text-[12.5px] text-amber-900">
              You changed the description after this suggestion was made. It can no longer be
              applied: ask again.
            </p>
          )}

          <ul className="mt-3 space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="text-[13px]">
                <p className="text-[11.5px] uppercase tracking-wide text-text-secondary">
                  {row.label}
                </p>
                <p className="mt-0.5 break-words font-medium text-text-primary">{row.value}</p>
                {row.note && (
                  <p
                    className={cn(
                      "mt-1 text-[12.5px]",
                      row.warn ? "font-medium text-red-700" : "text-text-secondary",
                    )}
                  >
                    {row.note}
                  </p>
                )}
                {row.already ? (
                  <p className="mt-1 text-[12px] text-text-secondary">Already what you have selected.</p>
                ) : (
                  <label
                    className={cn(
                      "mt-1.5 flex items-center gap-2 text-[13px]",
                      row.warn ? "font-medium text-red-700" : "text-text-primary",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected[row.key]}
                      disabled={stale || disabled}
                      onChange={() => toggle(row.key)}
                    />
                    {row.checkboxLabel}
                  </label>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={stale || disabled || chosen.length === 0}
            >
              Apply selected{chosen.length > 0 ? ` (${chosen.length})` : ""}
            </Button>
            <p className="text-[12px] text-text-secondary">Nothing changes until you apply.</p>
          </div>

          <p className="mt-3 border-t border-black/8 pt-2.5 text-[12px] text-text-secondary">
            {AI_SUGGESTION_NOTICE} {AI_DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  );
}
