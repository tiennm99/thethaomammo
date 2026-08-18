"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasRole, isAdmin } from "@/lib/auth/grants";

// Best-of-3 fixed (per Phase 05 plan); cap at 3 sets.
const scoreSchema = z.object({
  match_id: z.string().uuid(),
  set_no: z.number().int().min(1).max(3),
  slot1_score: z.number().int().min(0).max(99),
  slot2_score: z.number().int().min(0).max(99),
});

export type ScoreInput = z.infer<typeof scoreSchema>;

export async function recordSetAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = scoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  if (!(await isAdmin()) && !(await hasRole("referee"))) {
    return { ok: false, error: "forbidden" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("match_scores").upsert(
    {
      match_id: parsed.data.match_id,
      set_no: parsed.data.set_no,
      slot1_score: parsed.data.slot1_score,
      slot2_score: parsed.data.slot2_score,
      recorded_by: user?.id ?? null,
    },
    { onConflict: "match_id,set_no" },
  );

  if (error) {
    console.error("[recordSetAction]", error.code, error.message);
    return { ok: false, error: "Không lưu được tỉ số." };
  }

  return { ok: true };
}
