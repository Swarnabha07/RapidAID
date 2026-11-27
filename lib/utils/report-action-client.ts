/**
 * T5 - the browser side of a responder action (PATCH /api/reports/[id]), with its dependencies
 * injected so the behaviour is unit-tested without Firebase or a network.
 *
 * Responders can never write a report directly (Firestore rules block it); this only sends the
 * request. The server decides. A rejected request ALWAYS throws a ResponderActionError.
 */
import {
  ResponderActionError,
  actionErrorFromResponse,
  networkActionError,
  notSignedInActionError,
} from "@/lib/utils/action-errors";

export interface ReportActionDeps {
  /** Returns an ID token, or null when nobody is signed in. `forceRefresh` bypasses the cache. */
  getToken: (forceRefresh: boolean) => Promise<string | null>;
  fetchImpl: (input: string, init: RequestInit) => Promise<Response>;
}

async function readServerMessage(res: Response): Promise<string | null> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "error" in data) {
      const e = (data as { error?: unknown }).error;
      return typeof e === "string" ? e : null;
    }
  } catch {
    // not JSON: fall through
  }
  return null;
}

export async function performReportAction(
  reportId: string,
  payload: Record<string, unknown>,
  deps: ReportActionDeps,
): Promise<void> {
  const send = async (forceRefresh: boolean): Promise<Response> => {
    const token = await deps.getToken(forceRefresh);
    if (!token) throw notSignedInActionError();
    try {
      return await deps.fetchImpl(`/api/reports/${encodeURIComponent(reportId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof ResponderActionError) throw err;
      throw networkActionError();
    }
  };

  let res = await send(false);
  // An expired cached token is the common 401; refresh once and retry (the request is idempotent
  // enough: the server re-validates the state transition inside its transaction).
  if (res.status === 401) res = await send(true);
  if (res.ok) return;
  throw actionErrorFromResponse(res.status, await readServerMessage(res));
}
