"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

type ActionResult = { error?: string; ok?: boolean };

const scheduleInputSchema = z.object({
  scheduled_at: z.string().datetime().nullable(),
  court_id: z.string().uuid().nullable(),
});

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function updateMatchScheduleAction(
  matchId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const obj = Object.fromEntries(fd) as Record<string, string>;
  // datetime-local string is YYYY-MM-DDTHH:mm interpreted in server's local TZ;
  // ensure deploy pins TZ=Asia/Ho_Chi_Minh so admin-entered times match VN tournament time.
  const scheduledLocal = obj.scheduled_at?.trim() || "";
  const scheduledIso = scheduledLocal ? new Date(scheduledLocal).toISOString() : null;
  const courtId = obj.court_id?.trim() || null;

  const parsed = scheduleInputSchema.safeParse({
    scheduled_at: scheduledIso,
    court_id: courtId,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update(parsed.data)
    .eq("id", matchId);

  if (error) return { error: error.message };

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);
  return { ok: true };
}
