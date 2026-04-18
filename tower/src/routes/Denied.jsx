// Denied — authenticated user lacks is_admin. Cosmodrome styling.

import { supabase } from "../lib/supabase";

export default function Denied() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.kicker}>TOWER / ACCESS DENIED</div>
        <h1 style={styles.title}>Not an operator</h1>
        <p style={styles.body}>
          This account is authenticated but doesn't hold admin credentials.
          Tower is for Phajot operators only.
        </p>

        <div style={styles.actions}>
          <a href="https://app.phajot.com" style={styles.primaryAction}>
            GO TO PHAJOT APP
          </a>
          <button onClick={handleSignOut} style={styles.secondaryAction}>
            SIGN OUT
          </button>
        </div>

        <div style={styles.footer}>
          If you believe this is a mistake, contact the operator.
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--bg-0, #0a0e13)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "var(--bg-1, #101820)",
    border: "1px solid var(--accent-ember, #f5a623)",
    padding: "32px",
  },
  kicker: {
    fontSize: "11px",
    letterSpacing: "0.15em",
    color: "var(--accent-ember, #f5a623)",
    marginBottom: "12px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "var(--text-0, #e6edf3)",
    margin: "0 0 16px 0",
  },
  body: {
    fontSize: "14px",
    color: "var(--text-1, #b8c2cc)",
    lineHeight: 1.6,
    margin: "0 0 28px 0",
  },
  actions: { display: "flex", flexDirection: "column", gap: "10px" },
  primaryAction: {
    background: "var(--accent-nominal, #ace1af)",
    color: "var(--bg-0, #0a0e13)",
    border: "none",
    padding: "12px 16px",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.1em",
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
  },
  secondaryAction: {
    background: "transparent",
    color: "var(--text-1, #b8c2cc)",
    border: "1px solid var(--border-1, #1f2933)",
    padding: "12px 16px",
    fontSize: "13px",
    fontWeight: "500",
    letterSpacing: "0.1em",
    cursor: "pointer",
  },
  footer: {
    marginTop: "24px",
    fontSize: "11px",
    color: "var(--text-3, #6b7885)",
    textAlign: "center",
  },
};
