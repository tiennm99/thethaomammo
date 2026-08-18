"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { eventFormDataToInput, eventInputSchema } from "@/lib/schemas/admin-event";

type ActionResult = { error?: string; ok?: boolean; id?: string };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function createEventAction(
  tournamentId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = eventInputSchema.safeParse(eventFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, tournament_id: tournamentId })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirect(`/admin/tournaments/${tournamentId}/events/${data.id}`);
}

export async function updateEventAction(
  tournamentId: string,
  eventId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = eventInputSchema.safeParse(eventFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", eventId)
    .eq("tournament_id", tournamentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}/events/${eventId}`);
  return { ok: true };
}

export async function deleteEventAction(
  tournamentId: string,
  eventId: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();

  // Refuse delete if any active registration exists — FK cascade would wipe history.
  const { count: regCount, error: countErr } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .is("deleted_at", null);
  if (countErr) return { error: countErr.message };
  if ((regCount ?? 0) > 0) {
    return { error: "Không thể xóa nội dung đã có đăng ký." };
  }

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("tournament_id", tournamentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  return { ok: true };
}
