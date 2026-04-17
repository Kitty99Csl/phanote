import { Component } from "react";
import * as Sentry from "@sentry/react";
import { t } from "../lib/i18n";

// React ErrorBoundary
//
// Catches errors during render / lifecycle / constructor of
// children. Does NOT catch errors in event handlers, async code,
// SSR, or errors thrown in the boundary itself.
//
// On error: renders a Phajot-branded fallback UI with a Reload
// button. Logs error to console (Sentry wiring deferred to 5b).
//
// Sprint E item 5a.

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorCode: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Generate a human-readable error code for screenshots.
    // Format: e_render_YYYY-MM-DD_HHMMSS_<random4>
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
    const rand = Math.random().toString(36).slice(2, 6);
    const errorCode = `e_render_${dateStr}_${timeStr}_${rand}`;

    return { hasError: true, errorCode };
  }

  componentDidCatch(error, errorInfo) {
    // SECURITY: do NOT log user input or PII; the error message +
    // component stack are usually safe but be cautious.
    console.error("ErrorBoundary caught:", {
      code: this.state.errorCode,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });

    // Report to Sentry with Phajot context. If Sentry.init didn't
    // run (no DSN configured), captureException is a no-op by design.
    Sentry.captureException(error, {
      contexts: {
        errorBoundary: {
          code: this.state.errorCode,
          componentStack: errorInfo?.componentStack,
        },
      },
      tags: {
        boundary: 'root',
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Determine language from props or fall back to 'lo' (Phajot is Lao-first)
    const lang = this.props.lang || "lo";

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#F7FCF5",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          fontFamily: "Noto Sans, Noto Sans Lao, sans-serif",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
          }}
        >
          🌿
        </div>

        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "#2D2D3A",
            margin: "0 0 12px 0",
          }}
        >
          {t(lang, "errorBoundaryTitle")}
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#5C5C6A",
            margin: "0 0 24px 0",
            maxWidth: "320px",
            lineHeight: 1.5,
          }}
        >
          {t(lang, "errorBoundaryMessage")}
        </p>

        <button
          onClick={this.handleReload}
          style={{
            background: "#ACE1AF",
            color: "#2D2D3A",
            border: "none",
            borderRadius: "20px",
            padding: "12px 28px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(45,45,58,0.07)",
          }}
        >
          {t(lang, "errorBoundaryReload")}
        </button>

        <p
          style={{
            fontSize: "11px",
            color: "#9B9BAD",
            margin: "32px 0 0 0",
            fontFamily: "monospace",
          }}
        >
          {t(lang, "errorBoundaryCode").replace("{code}", this.state.errorCode)}
        </p>
      </div>
    );
  }
}
