/**
 * Support Console — admin summary + queue endpoints (Group D).
 *
 * All handlers are requireAdmin-gated. Read-path endpoints for
 * Tower Room 6 operator workflows.
 *
 * Routes:
 *   GET  /admin/pending-requests         — queue of active recoveries
 *   POST /admin/users/search             — phone-partial search
 *   GET  /admin/users/:id/summary        — full profile bundle
 *   POST /admin/users/:id/view-transactions
 *
 * Audit:
 *   All four write to tower_admin_reads (read audit).
 *   view-transactions additionally writes to tower_admin_actions with
 *   action_type='view_transactions' — double-logged intentionally per
 *   Session 21 plan because it is privacy-sensitive.
 *
 * Per R21-1: no profiles.total_transactions column exists. Counts come
 * from count(*) queries. Search uses parallel per-row followup calls
 * (R21-11 fallback); Summary uses Promise.allSettled for graceful
 * degradation (partial data > a full 500 for an operator trying to
 * help a user).
 */

import {
  CORS,
  requireAdmin,
  supabaseRest,
  countViaHead,
  logAdminRead,
  logAdminAction,
  sha256Hex,
  derivePendingRequest,
  classifyPendingRequest,
  fetchRecoveryForUser,
  settledCount,
} from './helpers.js';


// GET /admin/pending-requests
//
// Session 23 Batch 4 (I-14) — closes R22-1. Lists all users with
// an active recovery workflow (awaiting admin OR approved-awaiting-
// user, on either pin or password flow). Previously Tower fetched
// direct-Supabase via admin-read RLS; this endpoint moves the list
// behind the worker so audit-logging is uniform with other admin
// reads.
//
// Read strategy:
//   1. SELECT explicit columns FROM user_recovery_state ORDER BY
//      updated_at DESC (in-memory filter keeps the endpoint simple
//      at family-beta scale — Migration 014's partial index exists
//      but isn't leveraged by this query; revisit if row count
//      grows past ~50).
//   2. classifyPendingRequest() filters + enriches in one pass.
//   3. Single PostgREST .in() call enriches with display_name/phone/
//      avatar for only the user_ids that passed the filter.
//
// Response: { rows: [ { ...recovery_row, _classification, _profile } ] }.
// _profile may be null if the profiles row was deleted but the
// recovery row wasn't cascaded yet — client should defensive-render.
//
// Audit: logs to tower_admin_reads with table_name='user_recovery_state'
// and row_count=pending.length (post-filter). No user input to hash
// so query_hash=null.
export async function handlePendingRequests(request, env, ctx) {
  const admin = await requireAdmin(request, env);

  // ── Read all recovery state rows (ordered newest-first) ──
  //    Explicit select matches the response contract — omits
  //    last_action_metadata (admin can see that in /summary).
  const stateRes = await supabaseRest(
    env,
    '/user_recovery_state?select=user_id,' +
      'pin_reset_requested_at,pin_reset_approved_at,' +
      'pin_reset_required,pin_reset_expires_at,' +
      'password_reset_requested_at,password_reset_approved_at,' +
      'password_reset_required,password_reset_expires_at,' +
      'approved_by,updated_at' +
      '&order=updated_at.desc'
  );
  if (!stateRes.ok) {
    console.error(
      'admin/pending-requests state fetch failed:',
      'admin=' + admin.userId,
      'status=' + stateRes.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read recovery state' },
      { status: 500, headers: CORS }
    );
  }
  const allRows = await stateRes.json().catch(() => null);
  if (!Array.isArray(allRows)) {
    console.error(
      'admin/pending-requests state non-array body:',
      'admin=' + admin.userId
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read recovery state' },
      { status: 500, headers: CORS }
    );
  }

  // ── Filter + classify in one pass ──
  const pending = [];
  for (const row of allRows) {
    const classification = classifyPendingRequest(row);
    if (classification) {
      pending.push({ ...row, _classification: classification });
    }
  }

  // ── Empty-list fast path (skip profile enrichment) ──
  if (pending.length === 0) {
    logAdminRead(env, ctx, {
      admin_user_id: admin.userId,
      table_name: 'user_recovery_state',
      row_count: 0,
      query_hash: null,
    });
    return Response.json({ rows: [] }, { headers: CORS });
  }

  // ── Enrich with profile basics via a single .in() call ──
  const userIds = [...new Set(pending.map((r) => r.user_id))];
  const idList = userIds.map(encodeURIComponent).join(',');
  const profRes = await supabaseRest(
    env,
    `/profiles?id=in.(${idList})&select=id,display_name,phone,avatar`
  );
  if (!profRes.ok) {
    console.error(
      'admin/pending-requests profile fetch failed:',
      'admin=' + admin.userId,
      'status=' + profRes.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read profiles' },
      { status: 500, headers: CORS }
    );
  }
  const profRows = await profRes.json().catch(() => null);
  const profileMap = new Map(
    Array.isArray(profRows) ? profRows.map((p) => [p.id, p]) : []
  );

  const rows = pending.map((row) => ({
    ...row,
    _profile: profileMap.get(row.user_id) || null,
  }));

  // ── Audit ──
  logAdminRead(env, ctx, {
    admin_user_id: admin.userId,
    table_name: 'user_recovery_state',
    row_count: rows.length,
    query_hash: null,
  });

  return Response.json({ rows }, { headers: CORS });
}


// POST /admin/users/search
//
// Phone-partial search (digits only). No email search per Session 21
// scope lock. Returns up to 50 rows with basic profile + pending-
// request flag + total transactions.
//
// Input validation:
//   - query must be string, ≤100 chars raw (cap before cleaning)
//   - cleaned (non-digit stripped) must be ≥3 chars (too-short =
//     too many hits, performance risk)
//   - limit clamped to [1, 50]; default 50
//
// Audit: logs to tower_admin_reads with query_hash = sha256(raw query).
export async function handleSearchUsers(request, env, ctx) {
  const admin = await requireAdmin(request, env);

  // ── Parse + validate body ──
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'bad_request', message: 'Invalid JSON body' },
      { status: 400, headers: CORS }
    );
  }

  const rawQuery = typeof body?.query === 'string' ? body.query.slice(0, 100) : '';
  const cleaned = rawQuery.replace(/\D/g, '');
  if (cleaned.length < 3) {
    return Response.json(
      { error: 'query_too_short', message: 'Query must contain at least 3 digits' },
      { status: 400, headers: CORS }
    );
  }

  const rawLimit = Number(body?.limit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 50)
      : 50;

  // ── Step 1: fetch matching profiles (no embeds) ──
  // PostgREST embedded resources (user_recovery_state, transactions)
  // failed in Session 21 smoke testing — R21-11. Fallback pattern:
  // fetch profiles first, then parallel per-user followups.
  // PostgREST wildcard syntax uses `*` for ILIKE patterns.
  const select =
    'id,display_name,phone,avatar,language,base_currency,last_seen_at,is_pro,is_admin';
  const qs =
    `select=${encodeURIComponent(select)}` +
    `&phone=ilike.*${encodeURIComponent(cleaned)}*` +
    `&limit=${limit}`;

  const res = await supabaseRest(env, `/profiles?${qs}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(
      'admin/users/search profiles fetch failed:',
      'admin=' + admin.userId,
      'status=' + res.status,
      txt.slice(0, 200)
    );
    return Response.json(
      { error: 'db_error', message: 'Search query failed' },
      { status: 500, headers: CORS }
    );
  }

  const rows = await res.json().catch(() => null);
  if (!Array.isArray(rows)) {
    console.error(
      'admin/users/search non-array response:',
      'admin=' + admin.userId
    );
    return Response.json(
      { error: 'db_error', message: 'Search query failed' },
      { status: 500, headers: CORS }
    );
  }

  // ── Step 2: parallel per-profile enrichment ──
  // For each matched profile, fetch in parallel: transaction count
  // (countViaHead) + recovery state row. Cloudflare Workers subrequest
  // limit is 1000 on paid plans; 50 profiles × 2 subrequests = 100 —
  // well under the cap. Both calls return null on failure; the mapped
  // result degrades gracefully rather than 500-ing the whole search.
  const results = await Promise.all(
    rows.map(async (row) => {
      const [txnCount, recovery] = await Promise.all([
        countViaHead(
          env,
          'transactions',
          `user_id=eq.${encodeURIComponent(row.id)}&is_deleted=eq.false`
        ),
        fetchRecoveryForUser(env, row.id),
      ]);
      return {
        id: row.id,
        display_name: row.display_name,
        phone: row.phone,
        avatar: row.avatar,
        language: row.language,
        base_currency: row.base_currency,
        last_seen_at: row.last_seen_at,
        total_transactions: typeof txnCount === 'number' ? txnCount : null,
        is_pro: !!row.is_pro,
        is_admin: !!row.is_admin,
        has_pending_request: derivePendingRequest(recovery),
      };
    })
  );

  // Audit. Hash the CLEANED digits, not the raw input — otherwise
  // identical searches in different formats ("+856 20 123" vs
  // "85620123") would hash differently and fragment the audit
  // trail. Small info loss (formatting nuance) vastly outweighed
  // by dedupe correctness for "same admin searched same person".
  const queryHash = await sha256Hex(cleaned);
  logAdminRead(env, ctx, {
    admin_user_id: admin.userId,
    table_name: 'profiles',
    row_count: results.length,
    query_hash: queryHash,
  });

  return Response.json({ results }, { headers: CORS });
}


// GET /admin/users/:id/summary
//
// Support-safe profile bundle for Tower Room 6. Aggregates are
// fetched concurrently via Promise.allSettled so a failure on any
// one degrades the summary rather than 500-ing the whole operator
// view.
//
// Profile fetch is the only required call — if that fails, 500.
// Everything else returns null on failure + console.warn.
export async function handleUserSummary(request, env, ctx, targetUserId) {
  const admin = await requireAdmin(request, env);

  // ── Required: profile basics (no embed — R21-11 fallback) ──
  const profRes = await supabaseRest(
    env,
    `/profiles?id=eq.${encodeURIComponent(targetUserId)}` +
      `&select=id,display_name,phone,avatar,language,base_currency,` +
      `created_at,last_seen_at,is_pro,is_admin`
  );
  if (!profRes.ok) {
    console.error(
      'admin/users/:id/summary profile fetch failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId,
      'status=' + profRes.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read profile' },
      { status: 500, headers: CORS }
    );
  }
  const profRows = await profRes.json().catch(() => null);
  if (!Array.isArray(profRows) || profRows.length === 0) {
    return Response.json(
      { error: 'not_found', message: 'Target user not found' },
      { status: 404, headers: CORS }
    );
  }

  const profile = profRows[0];
  // Recovery state fetched separately (see aggregate block below)
  // since embedded resource syntax failed in Session 21 — R21-11.

  // ── Concurrent aggregates ──
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const idFilter = `user_id=eq.${encodeURIComponent(targetUserId)}`;

  const results = await Promise.allSettled([
    countViaHead(env, 'transactions', `${idFilter}&is_deleted=eq.false`),
    countViaHead(env, 'transactions', `${idFilter}&is_deleted=eq.false&created_at=gte.${d7}`),
    countViaHead(env, 'transactions', `${idFilter}&is_deleted=eq.false&created_at=gte.${d30}`),
    // Categories over last 30d — fetched up to 500 rows and grouped
    // in-worker. Server-side GROUP BY would require an RPC (deferred).
    supabaseRest(
      env,
      `/transactions?${idFilter}&is_deleted=eq.false&created_at=gte.${d30}` +
        `&select=category_name,category_emoji&limit=500`
    ),
    countViaHead(env, 'app_events', `${idFilter}&created_at=gte.${d7}`),
    countViaHead(env, 'ai_call_log', `${idFilter}&status=neq.success&created_at=gte.${d7}`),
    // Recovery state — full row, concurrent with the aggregates.
    // Explicit fetch since embedded resource syntax failed (R21-11).
    supabaseRest(
      env,
      `/user_recovery_state?user_id=eq.${encodeURIComponent(targetUserId)}&select=*`
    ),
  ]);

  const [totalR, d7R, d30R, catsR, eventsR, aiErrR, recoveryR] = results;
  const txnTotal = settledCount(totalR);
  const txn7d = settledCount(d7R);
  const txn30d = settledCount(d30R);
  const events7d = settledCount(eventsR);
  const aiErrors7d = settledCount(aiErrR);

  // Parse the recovery state fetch result. Null on any failure —
  // summary still renders without it.
  let recoveryState = null;
  if (recoveryR.status === 'fulfilled' && recoveryR.value?.ok) {
    const rrows = await recoveryR.value.json().catch(() => null);
    if (Array.isArray(rrows) && rrows.length > 0) {
      recoveryState = rrows[0];
    }
  } else {
    console.warn(
      'summary recovery fetch failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId
    );
  }

  // ── Top 3 categories (in-worker aggregation) ──
  //    Skip uncategorized rows (NULL/empty category_name) rather than
  //    bucketing them into the legitimate 'other' category — keeps
  //    the "top 3" semantic clean. Surface 500-row truncation via
  //    top_categories_truncated so the Tower UI can label it.
  let topCategories = [];
  let topCategoriesTruncated = false;
  if (catsR.status === 'fulfilled' && catsR.value?.ok) {
    const rows = await catsR.value.json().catch(() => null);
    if (Array.isArray(rows)) {
      topCategoriesTruncated = rows.length === 500;
      const counts = Object.create(null);
      const emojis = Object.create(null);
      for (const row of rows) {
        const key = row.category_name;
        if (!key) continue; // skip uncategorized
        counts[key] = (counts[key] || 0) + 1;
        if (!emojis[key]) emojis[key] = row.category_emoji || '';
      }
      topCategories = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count, emoji: emojis[name] }));
    } else {
      console.warn(
        'summary category aggregate non-array:',
        'admin=' + admin.userId,
        'target=' + targetUserId
      );
    }
  } else {
    console.warn(
      'summary category fetch failed (partial view):',
      'admin=' + admin.userId,
      'target=' + targetUserId
    );
  }

  // ── Audit ──
  logAdminRead(env, ctx, {
    admin_user_id: admin.userId,
    table_name: 'profile_summary',
    row_count: 1,
    query_hash: null,
  });

  return Response.json(
    {
      profile,
      transaction_counts: {
        total: txnTotal,
        last_7d: txn7d,
        last_30d: txn30d,
      },
      top_categories: topCategories,
      top_categories_truncated: topCategoriesTruncated,
      issue_counts: {
        events_last_7d: events7d,
        ai_errors_last_7d: aiErrors7d,
      },
      recovery_state: recoveryState,
    },
    { headers: CORS }
  );
}


// POST /admin/users/:id/view-transactions
//
// Returns last 20 non-deleted transactions for the target user.
// Privacy-sensitive — double-logged to both tower_admin_reads
// (read channel) and tower_admin_actions (action channel) per
// Session 21 plan. Admin operator should supply a reason.
//
// Field selection deliberately OMITS `note` — that's user-entered
// private annotations (e.g. "my mom paid me back for this"). The
// description field is kept because it's often the AI-parsed or
// user-typed label that makes a transaction identifiable. If a
// support case actually needs `note`, the operator can ask the
// user directly. Defensive-privacy default.
export async function handleViewTransactions(request, env, ctx, targetUserId) {
  const admin = await requireAdmin(request, env);

  // ── Optional { reason?: string } body ──
  let reason = null;
  try {
    const raw = await request.json();
    if (raw && typeof raw.reason === 'string') {
      reason = raw.reason.slice(0, 500);
    }
  } catch {
    // empty/malformed body — treat as no reason
  }

  // ── Verify target exists (404 if not) ──
  //    Same rationale as Group C — FK constraint error would be
  //    less actionable than an explicit 404.
  const profRes = await supabaseRest(
    env,
    `/profiles?id=eq.${encodeURIComponent(targetUserId)}&select=id`
  );
  if (!profRes.ok) {
    console.error(
      'view-transactions profile check failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId,
      'status=' + profRes.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not verify target user' },
      { status: 500, headers: CORS }
    );
  }
  const profRows = await profRes.json().catch(() => null);
  if (!Array.isArray(profRows) || profRows.length === 0) {
    return Response.json(
      { error: 'not_found', message: 'Target user not found' },
      { status: 404, headers: CORS }
    );
  }

  // ── Fetch last 20 transactions ──
  const txnRes = await supabaseRest(
    env,
    `/transactions?user_id=eq.${encodeURIComponent(targetUserId)}` +
      `&is_deleted=eq.false` +
      `&select=id,date,type,category_name,category_emoji,amount,currency,description,created_at` +
      `&order=created_at.desc&limit=20`
  );
  if (!txnRes.ok) {
    const txt = await txnRes.text().catch(() => '');
    console.error(
      'view-transactions fetch failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId,
      'status=' + txnRes.status,
      txt.slice(0, 200)
    );
    // Log the FAILED read+action. Both channels because that's the
    // privacy-sensitive double-log contract — a failed attempt is
    // still a signal worth recording on both.
    logAdminRead(env, ctx, {
      admin_user_id: admin.userId,
      table_name: 'transactions',
      row_count: 0,
      query_hash: null,
    });
    logAdminAction(env, ctx, {
      admin_user_id: admin.userId,
      target_user_id: targetUserId,
      action_type: 'view_transactions',
      result: 'failed',
      error_message: 'fetch_failed_' + txnRes.status,
      metadata: { reason },
    });
    return Response.json(
      { error: 'db_error', message: 'Could not fetch transactions' },
      { status: 500, headers: CORS }
    );
  }
  const transactions = (await txnRes.json().catch(() => [])) || [];

  // ── Double-log success (Rule 17 audit) ──
  logAdminRead(env, ctx, {
    admin_user_id: admin.userId,
    table_name: 'transactions',
    row_count: transactions.length,
    query_hash: null,
  });
  logAdminAction(env, ctx, {
    admin_user_id: admin.userId,
    target_user_id: targetUserId,
    action_type: 'view_transactions',
    result: 'success',
    metadata: { reason, row_count: transactions.length },
  });

  return Response.json({ transactions }, { headers: CORS });
}
