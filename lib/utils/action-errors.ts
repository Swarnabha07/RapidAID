/**
 * T5 - responder action failures, mapped to messages a responder can act on.
 * Pure (no Firebase / React) so it is unit-tested. The server's own message is shown for 400/403/409
 * because those are written for people ("reason is required", "Cannot acknowledge a report that
 * is 'in_progress'"); 5xx and network failures never claim more than is known.
 */

export type ActionErrorKind =
  | "auth"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "invalid"
  | "server"
  | "network";

export class ResponderActionError extends Error {
  readonly kind: ActionErrorKind;
  readonly status: number | null;

  constructor(kind: ActionErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "ResponderActionError";
    this.kind = kind;
    this.status = status;
  }
}

function clean(message: string | null | undefined): string {
  return (message ?? "").replace(/^Forbidden:\s*/i, "").trim();
}

export function actionErrorFromResponse(
  status: number,
  serverMessage?: string | null,
): ResponderActionError {
  const detail = clean(serverMessage);
  if (status === 401) {
    return new ResponderActionError(
      "auth",
      "Your session has expired or was revoked. Sign in again, then retry.",
      status,
    );
  }
  if (status === 403) {
    return new ResponderActionError(
      "forbidden",
      detail ? `Not allowed: ${detail}` : "You are not allowed to perform this action.",
      status,
    );
  }
  if (status === 404) {
    return new ResponderActionError("not-found", "This report no longer exists.", status);
  }
  if (status === 409) {
    return new ResponderActionError(
      "conflict",
      `The report changed before your action could be applied${detail ? ` (${detail})` : ""}. The list refreshes automatically; review the current status and try again.`,
      status,
    );
  }
  if (status === 400 || status === 413) {
    return new ResponderActionError(
      "invalid",
      detail ? `The server rejected this action: ${detail}` : "The server rejected this action.",
      status,
    );
  }
  return new ResponderActionError(
    "server",
    "The server could not confirm this action. It may not have been saved; check the incident's current status before retrying.",
    status,
  );
}

export function networkActionError(): ResponderActionError {
  return new ResponderActionError(
    "network",
    "Could not reach the server, so this action is not confirmed. Check your connection and the incident's current status before retrying.",
  );
}

export function notSignedInActionError(): ResponderActionError {
  return new ResponderActionError("auth", "You must be signed in to update a report.");
}

/** Text for the dialog's error alert. Never returns an empty string. */
export function describeActionFailure(err: unknown): string {
  if (err instanceof ResponderActionError) return err.message;
  return "The action could not be completed. Try again.";
}

/**
 * The name a responder will be recorded under. Mirrors the server's `resolveActorName`
 * (verified token name, else the e-mail prefix, else the role), so the dialogs never show a
 * different identity than the audit trail will. The Firestore profile mirror is NOT used.
 */
export function responderLabel(
  user: { displayName?: string | null; email?: string | null } | null | undefined,
  role?: string | null,
): string {
  const raw = user?.displayName || user?.email?.split("@")[0] || role || "Responder";
  return raw.slice(0, 80);
}
