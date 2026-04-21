// ApproveButton — primary action for admin approving a recovery
// request. Credential-adjacent (calls worker /approve-*-reset
// endpoints which are audited to tower_admin_actions).
//
// Session 22 · Room 6. D22-Q4: ConfirmSheet-style modal only; no
// phone-typing confirmation for family-beta (2 admins).
//
// Flow:
//   1. Button click → opens inline confirm overlay
//   2. Confirm → useClickGuard-style ref-guard prevents double-fire
//      → POST worker /admin/users/:id/approve-{pin|password}-reset
//      → parent callback fires (success: onApproved; failure: onError)
//      → overlay closes either way
//
// ref-guard pattern mirrors Session 10's useClickGuard hook (Rule 16
// forbids cross-import from src/hooks/, so we inline the pattern).

import { useRef, useState } from "react";
import { Btn } from "../../components/shared";
import { useFetchAdmin } from "./hooks/useFetchAdmin";

export function ApproveButton({ userId, flow, onApproved, onError }) {
  const fetchAdmin = useFetchAdmin();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Ref guard against synchronous double-tap in the same event-loop
  // tick (before React re-renders with busy=true and disables the
  // button visually). Mirror of src/hooks/useClickGuard.js intent.
  const submittingRef = useRef(false);

  const flowLabel = flow === "pin" ? "PIN" : "password";
  // Password flow is dormant: no user-side request endpoint exists
  // until Session 23 wires the forgot-password flow. Admin-approve
  // code here is ready so when Session 23 ships, this button works
  // end-to-end with zero Tower changes.
  const endpoint =
    flow === "pin"
      ? `/admin/users/${encodeURIComponent(userId)}/approve-pin-reset`
      : `/admin/users/${encodeURIComponent(userId)}/approve-password-reset`;

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    const res = await fetchAdmin(endpoint, {
      method: "POST",
      body: JSON.stringify({ reason: "tower_room6_approve" }),
    });
    submittingRef.current = false;
    setBusy(false);
    setConfirmOpen(false);
    if (res.ok) {
      onApproved && onApproved();
    } else {
      onError && onError(res.error || "Approval failed");
    }
  };

  return (
    <>
      <Btn
        onClick={() => setConfirmOpen(true)}
        variant="primary"
        size="sm"
      >
        Approve {flowLabel}
      </Btn>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 max-w-md w-full mx-4">
            <div className="hud-kicker text-orange-500 mb-2">◈ CONFIRM APPROVAL</div>
            <div className="text-[16px] font-semibold text-slate-100 mb-2">
              Approve {flowLabel} reset?
            </div>
            <div className="text-[13px] text-slate-400 leading-relaxed mb-5">
              User will have 30 minutes to complete the reset. This action
              is logged to <span className="font-mono text-slate-300">tower_admin_actions</span>.
            </div>
            <div className="flex justify-end gap-2">
              <Btn
                onClick={() => !busy && setConfirmOpen(false)}
                variant="ghost"
                size="md"
              >
                Cancel
              </Btn>
              <Btn
                onClick={submit}
                variant="primary"
                size="md"
              >
                {busy ? "Approving…" : `Approve ${flowLabel}`}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
