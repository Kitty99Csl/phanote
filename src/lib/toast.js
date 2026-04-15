// Module-level toast store. One toast at a time — a new toast replaces the current one.
//
// Usage:
//   import { showToast } from "./lib/toast";
//   showToast(t(lang, "toastSaveError"), "error");
//
// Rendering: mount <ToastContainer /> once at App root.

import { useSyncExternalStore } from "react";

let current = null;
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

const getSnapshot = () => current;

const notify = () => listeners.forEach((l) => l());

export const showToast = (message, type = "error", duration = 4000) => {
  current = { id: Date.now() + Math.random(), message, type, duration };
  notify();
};

export const dismissToast = () => {
  if (current === null) return;
  current = null;
  notify();
};

export const useToast = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
