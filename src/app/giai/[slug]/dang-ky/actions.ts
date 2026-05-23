"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { registrationSchema } from "@/lib/schemas/registration";
import { registrationRateLimit } from "@/lib/upstash/ratelimit";

export type RegisterResult =
  | {
      ok: true;
      registration_ids: string[];
      athlete_ids: string[];
      team_id: string | null;
    }
  | { ok: false; error: string };

const GENERIC_ERROR = "Đăng ký không thành công. Vui lòng thử lại.";

// Whitelist of Vietnamese error messages our RPC explicitly raises.
// Anything else collapses to GENERIC_ERROR so raw Postgres details
// (constraint names, stack hints) never leak to client.
const KNOWN_RPC_ERRORS = new Set<string>([
  "Vận động viên đã đăng ký cho nội dung này.",
  "Giải đấu không mở đăng ký.",
  "Hai vận động viên phải khác nhau.",
  "event not found",
]);

export async function registerAction(rawPayload: unknown): Promise<RegisterResult> {
  const parsed = registrationSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "anon";
  const rl = await registrationRateLimit.limit(ip);
  if (!rl.success) {
    return { ok: false, error: "Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_athlete_transaction", {
    payload: parsed.data,
  });

  if (error) {
    console.error("[registerAction] rpc error", {
      code: error.code,
      message: error.message,
    });
    if (KNOWN_RPC_ERRORS.has(error.message)) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  const result = data as {
    registration_ids: string[];
    athlete_ids: string[];
    team_id: string | null;
  };
  return {
    ok: true,
    registration_ids: result.registration_ids,
    athlete_ids: result.athlete_ids,
    team_id: result.team_id ?? null,
  };
}
