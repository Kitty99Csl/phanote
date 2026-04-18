// useAdminGate — reads current session and checks profiles.is_admin.
//
// Returns one of four states:
//   { status: "loading" }           — initial, session/admin check pending
//   { status: "no-session" }        — no Supabase session; redirect to /login
//   { status: "denied", user }      — authenticated but is_admin = false; show /denied
//   { status: "admin", user }       — authenticated and is_admin = true; render app
//
// The gate runs ONCE on mount and also subscribes to auth changes
// (so sign-out mid-session flips status immediately).
//
// RLS context (Migration 007 revised preflight, Session 16 Phase 1b):
// The 'profiles_policy' FOR ALL policy permits auth.uid() = id
// reads. Users read their own row (and only their own) via
// anon key. This is the third gate of three-layer defense:
//   1. CF Access Zero Trust (edge)
//   2. Tower Supabase login (this file — app layer)
//   3. profiles.is_admin check (also this file — database layer)

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminGate() {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) {
        setState({ status: "no-session", error: sessionError.message });
        return;
      }

      const session = sessionData?.session;
      if (!session) {
        setState({ status: "no-session" });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin, display_name")
        .eq("id", session.user.id)
        .single();

      if (!mounted) return;

      if (profileError) {
        setState({ status: "no-session", error: profileError.message });
        return;
      }

      if (!profile?.is_admin) {
        setState({ status: "denied", user: session.user });
        return;
      }

      setState({ status: "admin", user: session.user, displayName: profile.display_name });
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event) => {
      check();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return state;
}
