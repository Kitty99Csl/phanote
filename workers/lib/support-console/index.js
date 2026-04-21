/**
 * Support Console subsystem — route dispatcher.
 *
 * Added Session 21 Sprint I (2026-04-20). Split into sub-modules in
 * Session 23 Batch 6 (I-10): helpers, user-recovery, admin-approve,
 * admin-summary. This index.js is the thin dispatcher entry point.
 *
 * Architecture (Rule 17 + Session 21 DECISIONS):
 *   Tower is a viewer, the worker is the writer. All credential-
 *   adjacent actions and privacy-sensitive reads go through these
 *   endpoints, mediated by Supabase service-role + audit-logged.
 *
 * Route ownership:
 *   /recovery/*              → user-facing recovery (requireAuth)
 *   /admin/users/*           → admin-facing support console (requireAdmin)
 *   /admin/pending-requests  → admin queue listing (Session 23 I-14)
 *
 * Main worker imports handleSupportConsoleRoute() and dispatches
 * matching paths to this module. Non-matching paths return null
 * so the main worker continues its own fall-through.
 */

import {
  CORS,
  authErrorResponse,
  internalErrorResponse,
  extractTargetUserId,
} from './helpers.js';

import {
  handleRequestPinReset,
  handleRecoveryStatus,
  handleCompletePinReset,
} from './user-recovery.js';

import {
  handleApprovePinReset,
  handleApprovePasswordReset,
} from './admin-approve.js';

import {
  handlePendingRequests,
  handleSearchUsers,
  handleUserSummary,
  handleViewTransactions,
} from './admin-summary.js';


// ─── Route dispatcher ──────────────────────────────────────────
// Called from the main worker. Returns a Response if the path
// matches a support-console route; returns null otherwise so the
// main worker continues its own dispatch chain.
//
// Non-matching paths return null. Matching-prefix-but-unknown-
// route returns 404 (we "own" the prefix, so falling back to the
// main worker would be misleading).
export async function handleSupportConsoleRoute(url, request, env, ctx) {
  const path = url.pathname;
  const isRecovery = path.startsWith('/recovery/');
  const isAdmin = path.startsWith('/admin/');
  if (!isRecovery && !isAdmin) return null;

  // Only POST + GET are expected on these routes. OPTIONS preflight
  // is handled by the main worker before this dispatcher is called.
  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  try {
    // NOTE: every handler call uses `return await` so that async
    // throws (e.g. requireAuth / requireAdmin AuthError) are caught
    // by the try/catch below. Plain `return handler(...)` would
    // adopt the rejecting promise but escape the try/catch entirely
    // (latent bug from Session 21 dispatcher — caught Session 23
    // Phase C Step 2 when an unauth probe returned CF 1101).

    // ─── Group B — user-facing recovery endpoints ─────────────
    if (path === '/recovery/request-pin-reset' && request.method === 'POST') {
      return await handleRequestPinReset(request, env);
    }
    if (path === '/recovery/status' && request.method === 'GET') {
      return await handleRecoveryStatus(request, env);
    }
    if (path === '/recovery/complete-pin-reset' && request.method === 'POST') {
      return await handleCompletePinReset(request, env);
    }

    // ─── Group C — admin approval endpoints ──────────────────
    if (request.method === 'POST') {
      const pinTarget = extractTargetUserId(path, 'approve-pin-reset');
      if (pinTarget) {
        return await handleApprovePinReset(request, env, ctx, pinTarget);
      }
      const pwTarget = extractTargetUserId(path, 'approve-password-reset');
      if (pwTarget) {
        return await handleApprovePasswordReset(request, env, ctx, pwTarget);
      }
    }

    // ─── Group D — admin summary + queue endpoints ───────────
    if (path === '/admin/pending-requests' && request.method === 'GET') {
      return await handlePendingRequests(request, env, ctx);
    }
    if (path === '/admin/users/search' && request.method === 'POST') {
      return await handleSearchUsers(request, env, ctx);
    }
    if (request.method === 'GET') {
      const summaryTarget = extractTargetUserId(path, 'summary');
      if (summaryTarget) {
        return await handleUserSummary(request, env, ctx, summaryTarget);
      }
    }
    if (request.method === 'POST') {
      const viewTarget = extractTargetUserId(path, 'view-transactions');
      if (viewTarget) {
        return await handleViewTransactions(request, env, ctx, viewTarget);
      }
    }

    return new Response('Not found', { status: 404, headers: CORS });
  } catch (err) {
    if (err?.isAuthError) return authErrorResponse(err);
    console.error('support-console dispatcher error:', err?.message || 'unknown');
    return internalErrorResponse();
  }
}


// ─── Re-exports for main worker + future reuse ────────────────
// The main worker imports only handleSupportConsoleRoute. Helper
// re-exports live here for future tests and callers that need to
// share the auth/audit plumbing without reimplementing it.
export {
  requireAuth,
  requireAdmin,
  logAdminRead,
  logAdminAction,
} from './helpers.js';
