import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

// Initialize Sentry — only if DSN is configured (prevents dev-mode
// spam and CI/test environment noise)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    ignoreErrors: [
      /extension\//i,
      /^chrome-extension:/,
      /^moz-extension:/,
      /^safari-extension:/,
      /Network request failed/,
      /Failed to fetch/,
      /Load failed/,
      /ResizeObserver loop/,
      'Non-Error promise rejection captured',
    ],
    denyUrls: [
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
    ],
    release: import.meta.env.VITE_COMMIT_SHA || 'unknown',
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary lang="lo">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
