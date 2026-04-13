// fetchWithTimeout — wraps fetch() with an AbortController timeout.
//
// Prevents hung network requests from spinning UI forever when the
// worker times out upstream (Gemini/Claude), the user's network
// drops mid-request, or Cloudflare Workers has a transient outage.
//
// Usage:
//     import { fetchWithTimeout, FetchTimeoutError } from "../lib/fetchWithTimeout";
//
//     try {
//       const res = await fetchWithTimeout("https://api.phajot.com/ocr", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       }, 20000);  // 20-second timeout for OCR
//       // ... handle res ...
//     } catch (e) {
//       if (e instanceof FetchTimeoutError) {
//         // network hung — show timeout-specific UI
//       } else {
//         // other error (offline, CORS, 5xx, etc.)
//       }
//     }
//
// Design notes:
//   - AbortController.abort() rejects the fetch with AbortError
//   - We catch AbortError and rethrow as FetchTimeoutError so call
//     sites can distinguish "timed out" from "user canceled" or
//     other abort reasons
//   - Timeout defaults to 30000ms; every call site should pass its
//     own timeout based on endpoint characteristics
//   - clearTimeout in finally ensures no leaked timers even on
//     non-timeout errors

export class FetchTimeoutError extends Error {
  constructor(url, timeoutMs) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

export const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (e) {
    if (e.name === "AbortError") {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
};
