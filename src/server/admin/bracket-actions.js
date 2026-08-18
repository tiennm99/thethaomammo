"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

/**
 * @typedef {{ ok: true, rounds: number, matches: number, byes: number } | { ok: false, error: string }} BracketResult
 */

const KNOWN_ERRORS = new Set([
  "Sự kiện đã có bảng đấu. Hãy xoá trước khi tạo lại.",
  "Cần ít nhất 2 đăng ký đã xác nhận.",
  "event not found",
  "forbidden",
]);

/**
 * @param {string} eventId
 * @param {string} [seed]
 * @returns {Promise<BracketResult>}
 */
export async function generateBracketAction(eventId, seed = "random") {
  if (!(await isAdmin())) {
    return { ok: false, error: "forbidden" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_event_bracket", {
    p_event_id: eventId,
    p_seed: seed,
  });

  if (error) {
    console.error("[generateBracketAction]", error.code, error.message);
    return {
      ok: false,
      error: KNOWN_ERRORS.has(error.message)
        ? error.message
        : "Không tạo được bảng đấu.",
    };
  }

  const result = /** @type {{ rounds: number, matches: number, byes: number }} */ (data);
  return { ok: true, ...result };
}

/**
 * @param {string} matchId
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function rollbackMatchAction(matchId) {
  if (!(await isAdmin())) {
    return { ok: false, error: "forbidden" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cascade_rollback_match", {
    p_match_id: matchId,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.startsWith("Trận")
        ? error.message
        : "Không thể rollback.",
    };
  }
  return { ok: true };
}
