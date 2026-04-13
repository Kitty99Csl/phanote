// Prevents double-click / re-entrancy on async action buttons.
//
// Returns { busy, run }:
//   - busy: boolean, true while the wrapped fn is executing
//   - run: (fn) => Promise — calls fn() at most once at a time
//
// Usage:
//   const { busy, run } = useClickGuard();
//   const save = () => run(async () => {
//     await onSave(data);
//     onClose();
//   });
//   <button onClick={save} disabled={busy}>Save</button>
//
// Why useRef + useState:
//   - useRef blocks re-entry SYNCHRONOUSLY (the race we're
//     preventing is between tap-1 setting state and tap-2
//     reading state in the same frame — refs mutate immediately)
//   - useState drives the visual disabled={busy} feedback

import { useRef, useState } from "react";

export const useClickGuard = () => {
  const guardRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    if (guardRef.current) return;
    guardRef.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      guardRef.current = false;
      setBusy(false);
    }
  };

  return { busy, run };
};
