# Session 18 decisions

**Locked:** 2026-04-19, Session 18.
**Context:** Sprint G closing session. Engine Room (Item 1) + drift reconciliation (Item 2).

## Scope summary

- Item 1 — Room 4 Engine Room (Sprint G): UptimeRobot status + hourly AI traffic chart
- Item 2 — Migration 011: drift reconciliation (4 items)
- Roadmap: LINE removed, native app publishing promoted to Phase 6
- Process: trust-summary mode adopted for non-security file edits

## Decision log

### D18-Q1 — Sprint G scope: A/A/defer
**Question:** Engine Room full scope vs. scoped-down A/A/defer?
**Options:**
- A: Full scope (UptimeRobot embed + AI traffic chart + parser accuracy)
- B: A/A/defer — UptimeRobot status + AI traffic chart only; parser accuracy deferred to Sprint I (OCR Reliability Room)
**Decision:** B — A/A/defer.
**Rationale:** Expose what exists (UptimeRobot URL + ai_call_log chart) without building new observability infrastructure. Parser accuracy requires its own data collection pipeline (Sprint E ai_call_log columns not yet populated for OCR accuracy). Deferred cleanly to Sprint I OCR Reliability Room.
**Outcome:** Engine Room shipped with Section 1 (integrity HUD) + Section 2 (hourly chart). Parser accuracy deferred to Sprint I as planned.

---

### D18-Q2 — Engine Room placement: dedicated Room 4
**Question:** Add Engine Room to existing room (extends Health/Daily Stats) or create dedicated Room 4?
**Options:**
- A: Extend Room 1 Health (co-locate technical health)
- B: Dedicated Room 4 `/engine-room` (matches Sprint G vocabulary + Tower ROADMAP Floor 4)
**Decision:** B — dedicated Room 4.
**Rationale:** Tower ROADMAP.md and CHARTER.md both call it "Engine Room" as a distinct room. Combining with Health would conflate operational health (Room 1) with traffic/observability (Room 4). Cleaner nav separation.
**Outcome:** `/engine-room` route added to ShellLayout NAV_GROUPS under Operations.

---

### D18-Q3 — Chart library: Recharts accepted at +102KB
**Question:** Recharts (+102KB gzip) vs. simpler SVG-only chart vs. reuse existing?
**Options:**
- A: Raw SVG path implementation (no new dep, ~0KB)
- B: Recharts (proven, flexible, restylable — but +102KB on top of 126KB existing)
- C: D3 directly (powerful but complex)
**Decision:** B — Recharts.
**Rationale:** Tower is admin-only internal surface; bundle size cost is acceptable. Recharts already validated in ecosystem, matches Tower aesthetic with minimal styling. Future rooms should reuse Recharts (already bundled) instead of adding new chart libs.
**Outcome:** recharts 3.x installed. Bundle: 126KB → 228KB gzip. Accepted. Note in commit: "future rooms reuse existing Recharts."

---

### D18-Q4 — Chart window: hourly last 24h
**Question:** Chart granularity and window size?
**Options:**
- A: 7-day daily bars (matches Room 3 daily stats view)
- B: 24h hourly line (complements Room 3; finer granularity for operational monitoring)
- C: 30-day monthly
**Decision:** B — hourly last 24h.
**Rationale:** Room 3 already shows daily 14-day view. Engine Room should show fine-grained recent traffic for operational monitoring. Hourly buckets reveal traffic patterns invisible at daily aggregation. Same 7-day Supabase query serves both sections; chart slices to last 24h via client-side bucket matching.
**Outcome:** 24 hourly buckets, UTC-aligned. Gemini + Anthropic provider lines.

---

### D18-Q5 — Section 1 design: D3 Tactical HUD
**Question:** What replaces the failed UptimeRobot iframe for Section 1?
**Options presented:**
- D1: External-link card only (minimal, keeps page clean)
- D2: Minimal data table (uptime %, call counts — dense, low-visual-hierarchy)
- D3: Tactical HUD (corner brackets, stat cards, per-endpoint telemetry rows — matches Tower's existing Destiny-inspired design language)
**Decision:** D3 — Tactical HUD.
**Rationale:** D3 is the most cohesive with Tower's existing design system (design-system.md §4 corner bracket motif, ember registration marks, telemetry row pattern). Makes Section 1 visually primary, not just a fallback. "Observed uptime" from ai_call_log is more honest than synthetic pings.
**Outcome:** CornerBrackets + 4 StatCards + 4 EndpointRows. UptimeRobot kept as secondary "External ping ↗" footer affordance.

---

### D18-Q6 — UptimeRobot integration: external-link fallback + native HUD
**Question:** Full UptimeRobot API integration or external-link?
**Options:**
- A: Full UptimeRobot API (requires CORS proxy, API key management, out of Sprint G scope)
- B: External-link fallback only (anchor to stats.uptimerobot.com/...)
- C: External-link as secondary affordance alongside native HUD (selected D3)
**Decision:** C — native HUD primary, external-link secondary.
**Rationale:** UptimeRobot API integration is out of Sprint G scope and adds complexity. The native HUD already surffaces more operationally useful data (per-endpoint, real-user signal) than a synthetic ping would. UptimeRobot kept for DNS/connectivity events that ai_call_log wouldn't capture.
**Outcome:** Footer: "▲ Source · ai_call_log · Observed · idle endpoints dimmed" + "External ping ↗" link.

---

### D18-Q7 — LINE roadmap removal
**Question:** Keep LINE bot in Sprint K or remove?
**Options:**
- A: Keep LINE (OTP at registration + bot integration)
- B: Remove LINE (Laos is not LINE-oriented; replace with native app publishing)
**Decision:** B — remove LINE from roadmap, promote native app publishing to Phase 6.
**Rationale:** Laos is WhatsApp + Facebook Messenger-dominant; LINE is Japan/Thailand-focused with negligible Laos market share. LINE OTP adds dependency on a platform with weak Lao adoption. Native app publishing (App Store iOS TWA/PWABuilder + Google Play Android TWA) better serves the Lao-first strategy and aligns with Phase 6 "final milestone" positioning.
**Outcome:** project_codex.md Phase 4/5/6 rewritten. docs/tower/ROADMAP.md Sprint K updated. Changelog v1.3 added.

---

### D18-Q8 — Trust-summary mode adopted for non-security file edits
**Question:** What file categories require paste-back (verbatim output) vs. summary?
**Speaker feedback (mid-session):** Excessive paste-back requests for React components added friction without security benefit.
**Options:**
- A: Paste-back everything (current Session 17 practice)
- B: Paste-back security-critical only; summary for everything else
**Decision:** B — trust-summary mode.
**Scope of paste-back requirement:**
- **MANDATORY:** migrations (.sql), auth code (auth.js, AdminGate), worker code, RLS-related code
- **SUMMARY ACCEPTABLE:** React components, docs, configs, layout files, Tailwind changes
**Rationale:** The security value of verbatim review applies specifically to code that directly controls data access, execution privileges, or user auth. React component code has no privilege escalation surface; paste-back adds 5–10 min of friction per component edit without commensurate security benefit.
**Outcome:** Adopted from D18-Q8 forward. This rule does not retroactively change Session 17's practice.

## Session 18 outcomes

All 8 decisions executed. D18-Q3 (Recharts) and D18-Q5 (D3 HUD) involved mid-session design pivots; both landed per spec. Migration 011 postflight clean on all 4 items. Trust-summary mode confirmed by Speaker and adopted.
