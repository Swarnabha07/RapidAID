"use client";

import { useEffect, useState } from "react";

/** Current time in ms, refreshed on an interval so "4m ago" / elapsed labels stay accurate. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
