// useTicker — returns a counter that increments every `intervalMs`.
//
// Parent drops it into a component and React re-renders the whole
// subtree on each tick. Age helpers that read Date.now() at render
// time pick up the fresh time automatically.
//
// Usage:
//   const _tick = useTicker(5000); // refresh every 5s
//   // just calling it is enough — the state change triggers re-render
//
// Deliberately NOT cascading to data-fetching hooks: those use
// useCallback with stable deps so they don't re-fire on ticker tick.
// This is a pure-render mechanism for age labels, "last updated"
// strings, and "Xm left" countdowns.

import { useState, useEffect } from "react";

export function useTicker(intervalMs = 5000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
