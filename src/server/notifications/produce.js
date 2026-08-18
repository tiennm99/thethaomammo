/** @typedef {import("@/lib/notifications/templates").NotificationType} NotificationType */

/**
 * @typedef {object} EnqueueParams
 * @property {NotificationType} type
 * @property {string | null} [user_id]
 * @property {string | null} [email]
 * @property {Record<string, unknown>} [payload]
 * @property {string | null} [dedup_key]
 */

// Minimal duck-typed client surface — `.from("notifications").insert(...)`
// only. Avoids @supabase/supabase-js schema-generic friction.
// CALLER RESPONSIBILITY: the client passed here must target the correct
// application schema (e.g. `db: { schema: "thethaomammo" }`). A client
// scoped to the wrong schema will receive a Postgres error ("relation
// does not exist") which is returned as `{ ok: false, error: <msg> }`.
// The SSR client from `@/lib/supabase/server` satisfies this already.
/**
 * @typedef {object} Insertable
 * @property {(row: Record<string, unknown>) => any} insert
 */
/**
 * @typedef {object} NotificationsCapableClient
 * @property {(table: "notifications") => Insertable} from
 */

/**
 * @typedef {object} EnqueueResult
 * @property {boolean} ok
 * @property {string} [error]
 * @property {boolean} [deduped] true when the row was skipped due to a duplicate dedup_key (idempotent)
 */

/**
 * @param {NotificationsCapableClient} supabase
 * @param {EnqueueParams} params
 * @returns {Promise<EnqueueResult>}
 */
export async function enqueueNotification(supabase, params) {
  if (!params.user_id && !params.email) {
    return { ok: false, error: "user_id or email required" };
  }
  const { error } = await supabase.from("notifications").insert({
    type: params.type,
    user_id: params.user_id ?? null,
    email: params.email ?? null,
    payload: params.payload ?? {},
    dedup_key: params.dedup_key ?? null,
  });
  if (error) {
    // Unique-constraint hit on dedup_key is expected and idempotent.
    if (error.code === "23505") return { ok: true, deduped: true };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
