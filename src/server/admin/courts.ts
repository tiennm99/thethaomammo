"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  courtFormDataToInput,
  courtInputSchema,
} from "@/lib/schemas/admin-court";

type ActionResult = { error?: string; ok?: boolean };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function createCourtAction(
  tournamentId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = courtInputSchema.safeParse(courtFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .insert({ ...parsed.data, tournament_id: tournamentId });

  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/courts`);
  redirect(`/admin/tournaments/${tournamentId}/courts`);
}

export async function updateCourtAction(
  tournamentId: string,
  courtId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = courtInputSchema.safeParse(courtFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update(parsed.data)
    .eq("id", courtId)
    .eq("tournament_id", tournamentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/courts`);
  return { ok: true };
}

export async function deleteCourtAction(
  tournamentId: string,
  courtId: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("court_id", courtId);
  if ((count ?? 0) > 0) {
    return { error: "Không thể xóa sân đang gán cho trận đấu." };
  }

  const { error } = await supabase
    .from("courts")
    .delete()
    .eq("id", courtId)
    .eq("tournament_id", tournamentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/courts`);
  return { ok: true };
}
