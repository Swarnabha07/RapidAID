"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  AiSuggestionPanel,
  type AiApplyChanges,
} from "@/components/citizen/ai-suggestion-panel";
import { LocationPicker } from "@/components/citizen/location-picker";
import { cancelClassification } from "@/lib/ai/classify-report";
import { ensureEmergencyUser } from "@/lib/firebase/auth";
import { retrySubmission, submitReport } from "@/lib/firebase/firestore";
import { useSubmission } from "@/lib/hooks/use-submissions";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  LANGUAGE_PATTERN,
  REPORT_CATEGORIES,
  REPORT_LIMITS,
  REPORT_URGENCIES,
  type ReportCategory,
  type ReportUrgency,
} from "@/lib/constants/report";
import type { LatLng } from "@/lib/utils/location-math";
import { describeSubmission } from "@/lib/utils/report-sync";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  medical: "Medical assistance",
  water: "Food & water",
  shelter: "Shelter",
  missing_person: "Missing person",
  other: "Rescue / other emergency",
};

const URGENCY_LABELS: Record<ReportUrgency, string> = {
  critical: "Critical: life-threatening",
  high: "High: urgent help needed",
  normal: "Normal: not urgent",
};

const BASE_LANGUAGES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "en", label: "English" },
  { value: "bn", label: "Bengali" },
  { value: "hi", label: "Hindi" },
  { value: "und", label: "Other / not sure" },
];

const FIELD_CLASS =
  "w-full rounded-md border bg-white px-3.5 text-[15px] text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1";

interface FormErrors {
  description?: string;
  category?: string;
  urgency?: string;
  people?: string;
  location?: string;
  language?: string;
}

export interface ReportFormProps {
  /** Pre-selects a category (from Quick Start "Add details"). A new `nonce` re-applies it. */
  prefill?: { category: ReportCategory; nonce: number } | null;
}

/**
 * Full free-text citizen report (T4). Offline-first: submit never waits for the network, and
 * the result card shows what is actually known (saved on this device / received / not sent).
 * AI is an optional, confirm-first helper; the stored report remains `manual` provenance.
 */
export function ReportForm({ prefill = null }: ReportFormProps) {
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState<ReportCategory | "">(prefill?.category ?? "");
  const [urgency, setUrgency] = useState<ReportUrgency | "">("");
  const [peopleAffected, setPeopleAffected] = useState("1");
  const [injuries, setInjuries] = useState("");
  const [access, setAccess] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [landmark, setLandmark] = useState("");
  const [translation, setTranslation] = useState<{ text: string; forText: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [appliedPrefill, setAppliedPrefill] = useState<number | undefined>(prefill?.nonce);

  const online = useOnlineStatus();
  const submission = useSubmission(submittedId);

  // Apply a new Quick Start pre-selection during render (the React-sanctioned alternative to
  // an effect that sets state).
  if (prefill && prefill.nonce !== appliedPrefill) {
    setAppliedPrefill(prefill.nonce);
    setCategory(prefill.category);
    setSubmittedId(null);
  }

  const trimmedDescription = description.trim();
  const translationIsCurrent = translation !== null && translation.forText === trimmedDescription;
  const activeTranslation = translationIsCurrent ? translation.text.trim() : "";
  const languageOptions = BASE_LANGUAGES.some((l) => l.value === language)
    ? BASE_LANGUAGES
    : [...BASE_LANGUAGES, { value: language, label: language.toUpperCase() }];

  const missing: string[] = [];
  if (!trimmedDescription) missing.push("a description");
  if (!category) missing.push("a category");
  if (!urgency) missing.push("an urgency");
  if (!location) missing.push("a location");

  const handleApplyAi = (changes: AiApplyChanges) => {
    if (changes.category) setCategory(changes.category);
    if (changes.urgency) setUrgency(changes.urgency);
    if (changes.language) setLanguage(changes.language);
    if (changes.peopleAffected !== undefined) setPeopleAffected(String(changes.peopleAffected));
    if (changes.translation) {
      setTranslation({ text: changes.translation, forText: trimmedDescription });
    }
  };

  const validate = (): { errors: FormErrors; people: number } => {
    const next: FormErrors = {};
    if (!trimmedDescription) next.description = "Describe what is happening.";
    else if (trimmedDescription.length > REPORT_LIMITS.description) {
      next.description = `Keep the description under ${REPORT_LIMITS.description} characters.`;
    }
    if (!category) next.category = "Choose a category.";
    if (!urgency) next.urgency = "Choose how urgent this is.";
    if (!location) next.location = "Choose the incident location on the map, use your location, or type coordinates.";
    if (!LANGUAGE_PATTERN.test(language)) next.language = "Choose a language.";
    const people = Number(peopleAffected);
    if (
      !/^\d+$/.test(peopleAffected.trim()) ||
      people < REPORT_LIMITS.peopleAffectedMin ||
      people > REPORT_LIMITS.peopleAffectedMax
    ) {
      next.people = `Enter a whole number from ${REPORT_LIMITS.peopleAffectedMin} to ${REPORT_LIMITS.peopleAffectedMax}.`;
    }
    return { errors: next, people };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const { errors: found, people } = validate();
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length > 0 || !category || !urgency || !location) return;

    setSubmitting(true);
    cancelClassification(); // submit never waits for, or races with, AI
    try {
      const user = await ensureEmergencyUser();
      const address = landmark.trim();
      // Non-blocking: saved on this device at once (even offline), sent in the background.
      const { reportId } = submitReport(
        {
          userId: user.uid,
          category,
          urgency,
          description: trimmedDescription,
          translatedDescription: activeTranslation || undefined,
          originalLanguage: language,
          isSOS: false,
          location: {
            lat: location.lat,
            lng: location.lng,
            ...(address ? { address } : {}),
          },
          peopleAffected: people,
          reportedInjuries: injuries.trim() || undefined,
          accessConditions: access.trim() || undefined,
        },
        { kind: "form" },
      );
      setSubmittedId(reportId);
      setDescription("");
      setUrgency("");
      setCategory("");
      setPeopleAffected("1");
      setInjuries("");
      setAccess("");
      setLocation(null);
      setLandmark("");
      setTranslation(null);
      setErrors({});
    } catch (err: unknown) {
      console.error("Report submission error:", err);
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Could not save your report. Please check the form and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const outcome = submission ? describeSubmission("form", submission.state, online) : null;

  return (
    <section id="report-form" className="scroll-mt-24">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
        Full report
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-text-primary">
        Describe what is happening
      </h2>
      <p className="mt-1 text-[14px] text-text-secondary">
        Write in your own words and mark the place on the map. It is saved on this device
        first, so it works without a connection.
      </p>

      {outcome && submission && (
        <div
          role={outcome.tone === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 flex flex-wrap items-start gap-3 rounded-[var(--radius-md)] border p-4 text-[13.5px]",
            outcome.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
            outcome.tone === "pending" && "border-amber-200 bg-amber-50 text-amber-900",
            outcome.tone === "error" && "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {outcome.tone === "success" ? (
            <CheckCircle2 size={17} className="mt-0.5 flex-none" />
          ) : outcome.tone === "pending" ? (
            <Clock size={17} className="mt-0.5 flex-none" />
          ) : (
            <AlertCircle size={17} className="mt-0.5 flex-none" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {outcome.title} · Report #{submission.reportId.slice(0, 8)}
            </p>
            <p className="mt-0.5">{outcome.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {submission.state === "failed" && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => retrySubmission(submission.reportId)}
                >
                  <RotateCcw size={14} /> Try again
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSubmittedId(null)}
              >
                Report something else
              </Button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-5 space-y-5 rounded-[var(--radius-lg)] border border-black/8 bg-white p-5 sm:p-6"
      >
        <div>
          <label htmlFor="rf-description" className="mb-1.5 block text-[13.5px] font-medium text-text-primary">
            What is happening? <span className="text-critical">*</span>
          </label>
          <textarea
            id="rf-description"
            rows={5}
            maxLength={REPORT_LIMITS.description}
            value={description}
            disabled={submitting}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={errors.description ? true : undefined}
            placeholder="Who needs help, what happened, and anything responders should know."
            className={cn(FIELD_CLASS, "py-3 leading-relaxed", errors.description ? "border-critical" : "border-black/15")}
          />
          <div className="mt-1 flex justify-between text-[12px] text-text-secondary">
            <span className={errors.description ? "font-medium text-critical" : ""} role={errors.description ? "alert" : undefined}>
              {errors.description ?? "Any language is fine."}
            </span>
            <span>
              {description.length}/{REPORT_LIMITS.description}
            </span>
          </div>
        </div>

        <AiSuggestionPanel
          description={description}
          current={{
            category,
            urgency,
            language,
            peopleAffected,
            translation: activeTranslation,
          }}
          disabled={submitting}
          onApply={handleApplyAi}
          categoryLabel={(c) => CATEGORY_LABELS[c]}
          urgencyLabel={(u) => URGENCY_LABELS[u]}
        />

        {translation && (
          <div className="rounded-md border border-black/10 bg-subtle p-3.5">
            <label htmlFor="rf-translation" className="block text-[13px] font-medium text-text-primary">
              English translation attached to your report
            </label>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              Machine-made from your text. Check and correct it, or remove it.
            </p>
            {translationIsCurrent ? (
              <textarea
                id="rf-translation"
                rows={3}
                maxLength={REPORT_LIMITS.translatedDescription}
                value={translation.text}
                disabled={submitting}
                onChange={(e) => setTranslation({ text: e.target.value, forText: translation.forText })}
                className={cn(FIELD_CLASS, "mt-2 border-black/15 py-2.5")}
              />
            ) : (
              <p className="mt-2 rounded bg-amber-50 p-2 text-[12.5px] text-amber-900">
                You changed your description after this translation was made, so it will not be
                sent.
              </p>
            )}
            <button
              type="button"
              onClick={() => setTranslation(null)}
              className="mt-2 text-[12.5px] font-medium text-brand-blue underline"
            >
              Remove translation
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rf-category" className="mb-1.5 block text-[13.5px] font-medium text-text-primary">
              Category <span className="text-critical">*</span>
            </label>
            <select
              id="rf-category"
              value={category}
              disabled={submitting}
              onChange={(e) => setCategory(e.target.value as ReportCategory | "")}
              aria-invalid={errors.category ? true : undefined}
              className={cn(FIELD_CLASS, "h-12", errors.category ? "border-critical" : "border-black/15")}
            >
              <option value="">Choose…</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p role="alert" className="mt-1 text-[12px] font-medium text-critical">{errors.category}</p>
            )}
          </div>

          <div>
            <label htmlFor="rf-urgency" className="mb-1.5 block text-[13.5px] font-medium text-text-primary">
              Urgency <span className="text-critical">*</span>
            </label>
            <select
              id="rf-urgency"
              value={urgency}
              disabled={submitting}
              onChange={(e) => setUrgency(e.target.value as ReportUrgency | "")}
              aria-invalid={errors.urgency ? true : undefined}
              className={cn(FIELD_CLASS, "h-12", errors.urgency ? "border-critical" : "border-black/15")}
            >
              <option value="">Choose…</option>
              {REPORT_URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {URGENCY_LABELS[u]}
                </option>
              ))}
            </select>
            {errors.urgency && (
              <p role="alert" className="mt-1 text-[12px] font-medium text-critical">{errors.urgency}</p>
            )}
          </div>

          <div>
            <label htmlFor="rf-language" className="mb-1.5 block text-[13.5px] font-medium text-text-primary">
              Language you wrote in
            </label>
            <select
              id="rf-language"
              value={language}
              disabled={submitting}
              onChange={(e) => setLanguage(e.target.value)}
              className={cn(FIELD_CLASS, "h-12 border-black/15")}
            >
              {languageOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {errors.language && (
              <p role="alert" className="mt-1 text-[12px] font-medium text-critical">{errors.language}</p>
            )}
          </div>

          <div>
            <TextField
              label="People affected"
              inputMode="numeric"
              autoComplete="off"
              value={peopleAffected}
              disabled={submitting}
              error={Boolean(errors.people)}
              onChange={(e) => setPeopleAffected(e.target.value)}
            />
            {errors.people && (
              <p role="alert" className="mt-1 text-[12px] font-medium text-critical">{errors.people}</p>
            )}
          </div>
        </div>

        <LocationPicker
          value={location}
          onChange={setLocation}
          landmark={landmark}
          onLandmarkChange={setLandmark}
          disabled={submitting}
          error={errors.location ?? null}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Injuries (optional)"
            maxLength={REPORT_LIMITS.reportedInjuries}
            value={injuries}
            disabled={submitting}
            onChange={(e) => setInjuries(e.target.value)}
          />
          <TextField
            label="Access conditions (optional)"
            maxLength={REPORT_LIMITS.accessConditions}
            placeholder="e.g. flooded road, locked gate"
            value={access}
            disabled={submitting}
            onChange={(e) => setAccess(e.target.value)}
          />
        </div>

        {submitError && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-800">
            {submitError}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-black/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-text-secondary">
            {missing.length > 0
              ? `Still needed: ${missing.join(", ")}.`
              : online
                ? "Ready to send."
                : "Ready. You are offline: it will be saved on this device and sent when the connection returns."}
          </p>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? "Saving…" : "Send report"}
          </Button>
        </div>
      </form>
    </section>
  );
}
