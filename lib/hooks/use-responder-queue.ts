"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  initialQueueState,
  queueReducer,
  type QueueAction,
  type QueueErrorLike,
  type QueueMetaLike,
  type QueueState,
} from "@/lib/utils/responder-view";

type Unsubscribe = () => void;

export type QueueSubscribe<T> = (
  callback: (items: T[], meta: QueueMetaLike) => void,
  onError: (error: QueueErrorLike) => void
) => Unsubscribe;

/**
 * Subscribes a responder dashboard to its queue and exposes an honest state:
 * loading (no snapshot yet) -> ready (real data, maybe empty) -> error (listener failed).
 * No sample data is ever substituted. `subscribe` must be a stable (module-level) function.
 */
export function useResponderQueue<T>(subscribe: QueueSubscribe<T>): {
  state: QueueState<T>;
  retry: () => void;
} {
  const [state, dispatch] = useReducer(
    (s: QueueState<T>, a: QueueAction<T>) => queueReducer(s, a),
    undefined,
    () => initialQueueState<T>()
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribe(
      (items, meta) => dispatch({ type: "snapshot", items, meta }),
      (error) => dispatch({ type: "error", error })
    );
    return unsubscribe;
  }, [subscribe, attempt]);

  const retry = useCallback(() => {
    dispatch({ type: "reset" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
