import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ShellLayout from "./layouts/ShellLayout";
import Lobby from "./routes/Lobby";
import Health from "./routes/Health";
import AICalls from "./routes/AICalls";
import DailyStats from "./routes/DailyStats";
import EngineRoom from "./routes/EngineRoom";
import LanguageStrings from "./routes/LanguageStrings";
import Login from "./routes/Login";
import Denied from "./routes/Denied";
import { useAdminGate } from "./hooks/useAdminGate";

function AdminGate({ children }) {
  const state = useAdminGate();

  if (state.status === "loading") {
    return (
      <div style={gateStyles.loading}>
        <div style={gateStyles.loadingInner}>
          <div style={gateStyles.kicker}>TOWER</div>
          <div style={gateStyles.loadingText}>Verifying admin credentials...</div>
        </div>
      </div>
    );
  }

  if (state.status === "no-session") {
    return <Navigate to="/login" replace />;
  }

  if (state.status === "denied") {
    return <Navigate to="/denied" replace />;
  }

  // status === "admin"
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/denied" element={<Denied />} />
        <Route
          path="/*"
          element={
            <AdminGate>
              <ShellLayout />
            </AdminGate>
          }
        >
          <Route index element={<Lobby />} />
          <Route path="health" element={<Health />} />
          <Route path="ai-calls" element={<AICalls />} />
          <Route path="daily-stats" element={<DailyStats />} />
          <Route path="engine-room" element={<EngineRoom />} />
          <Route path="admin/language-strings" element={<LanguageStrings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const gateStyles = {
  loading: {
    minHeight: "100vh",
    background: "var(--bg-0, #0a0e13)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  },
  loadingInner: { textAlign: "center" },
  kicker: {
    fontSize: "11px",
    letterSpacing: "0.2em",
    color: "var(--accent-ember, #f5a623)",
    marginBottom: "10px",
  },
  loadingText: {
    fontSize: "14px",
    color: "var(--text-2, #8b98a5)",
  },
};
