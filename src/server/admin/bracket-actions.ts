"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export type BracketResult =
  | { ok: true; rounds: number; matches: number; byes: number }
  | { ok: false; error: string };

const KNOWN_ERRORS = new Set([
  "Sự kiện đã có bảng đấu. Hãy xoá trước khi tạo lại.",
  "Cần ít nhất 2 đăng ký đã xác nhận.",
  "event not found",
  "forbidden",
]);

export async function generateBracketAction(
  eventId: string,
  seed = "random",
): Promise<BracketResult> {
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

  const result = data as { rounds: number; matches: number; byes: number };
  return { ok: true, ...result };
}

export async function rollbackMatchAction(matchId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
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
