"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/**
 * Browser connectivity hint (`navigator.onLine`). `false` is reliable ("no network"); `true` only
 * means a network interface exists, NOT that RapidAID's servers are reachable. It is used for
 * wording only. Delivery is never inferred from it: only Firestore acknowledgements count.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine !== false,
    () => true,
  );
}
