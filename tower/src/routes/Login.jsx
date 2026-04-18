// Tower login — minimal Supabase phone+country+password.
// Option Z per Session 16 Phase 2 verification: mirror buildEmail(),
// no legacy fallback.
//
// Styling matches Cosmodrome design system (dark tactical,
// celadon accent on success, ember on errors).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { buildEmail } from "../lib/auth";

export default function Login() {
  const [countryCode, setCountryCode] = useState("+856");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = buildEmail(countryCode, phone);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.kicker}>TOWER / OPERATOR ACCESS</div>
          <h1 style={styles.title}>Authenticate</h1>
          <p style={styles.subtitle}>
            Phajot admin credentials required. Same login as the main app.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.fieldSmall}>
              <label style={styles.label}>COUNTRY</label>
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={styles.input}
                autoComplete="tel-country-code"
                required
              />
            </div>
            <div style={styles.fieldLarge}>
              <label style={styles.label}>PHONE</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
                autoComplete="tel-national"
                placeholder="20 5599 9988"
                required
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={styles.error}>
              <strong>AUTH FAILED:</strong> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? "AUTHENTICATING..." : "SIGN IN"}
          </button>
        </form>

        <div style={styles.footer}>
          Defense-in-depth: CF Access (edge) · Supabase auth (app) · is_admin (database)
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
    maxWidth: "420px",
    background: "var(--bg-1, #101820)",
    border: "1px solid var(--border-1, #1f2933)",
    padding: "32px",
  },
  header: {
    marginBottom: "28px",
    borderBottom: "1px solid var(--border-1, #1f2933)",
    paddingBottom: "20px",
  },
  kicker: {
    fontSize: "11px",
    letterSpacing: "0.15em",
    color: "var(--accent-ember, #f5a623)",
    marginBottom: "8px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "600",
    color: "var(--text-0, #e6edf3)",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--text-2, #8b98a5)",
    margin: 0,
  },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  row: { display: "flex", gap: "12px" },
  field: { display: "flex", flexDirection: "column" },
  fieldSmall: { display: "flex", flexDirection: "column", width: "80px" },
  fieldLarge: { display: "flex", flexDirection: "column", flex: 1 },
  label: {
    fontSize: "10px",
    letterSpacing: "0.12em",
    color: "var(--text-2, #8b98a5)",
    marginBottom: "6px",
  },
  input: {
    background: "var(--bg-0, #0a0e13)",
    border: "1px solid var(--border-1, #1f2933)",
    color: "var(--text-0, #e6edf3)",
    padding: "10px 12px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  error: {
    fontSize: "12px",
    color: "var(--accent-ember, #f5a623)",
    background: "rgba(245, 166, 35, 0.08)",
    border: "1px solid var(--accent-ember, #f5a623)",
    padding: "10px 12px",
  },
  submit: {
    background: "var(--accent-nominal, #ace1af)",
    color: "var(--bg-0, #0a0e13)",
    border: "none",
    padding: "12px 16px",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.1em",
    cursor: "pointer",
  },
  footer: {
    marginTop: "24px",
    fontSize: "10px",
    color: "var(--text-3, #6b7885)",
    textAlign: "center",
    letterSpacing: "0.05em",
  },
};
