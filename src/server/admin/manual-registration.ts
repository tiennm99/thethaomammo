"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  manualRegistrationFormDataToInput,
  manualRegistrationInputSchema,
} from "@/lib/schemas/admin-manual-registration";

type ActionResult = { error?: string; ok?: boolean; id?: string };

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function createManualRegistrationAction(
  fd: FormData,
): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Không có quyền." };

  const parsed = manualRegistrationInputSchema.safeParse(
    manualRegistrationFormDataToInput(fd),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      `id, kind, entry_fee_vnd, tournament_id,
       tournament:tournament_id ( status, deleted_at, is_legacy )`,
    )
    .eq("id", input.event_id)
    .maybeSingle();
  if (!event) return { error: "Không tìm thấy nội dung." };
  if (event.kind !== "singles") {
    return { error: "Chỉ hỗ trợ nội dung đơn cho đăng ký thủ công." };
  }
  // Mirror the public RPC's trust-boundary check so the manual path doesn't
  // create rows in archived / legacy / draft tournaments.
  const tournament = Array.isArray(event.tournament)
    ? event.tournament[0]
    : event.tournament;
  if (
    !tournament ||
    tournament.deleted_at ||
    tournament.is_legacy ||
    (tournament.status !== "open" && tournament.status !== "in_progress")
  ) {
    return { error: "Giải đấu không mở đăng ký." };
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, display_id, full_name")
    .eq("display_id", input.athlete_display_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!athlete) {
    return { error: `Không tìm thấy VĐV với mã ${input.athlete_display_id}.` };
  }

  // Reject early if (event, athlete) already registered. The DB unique partial
  // index would also reject, but a friendlier message is worth the extra read.
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("event_id", event.id)
    .eq("athlete_id", athlete.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return { error: "VĐV này đã đăng ký nội dung này." };
  }

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({ event_id: event.id, captain_athlete_id: athlete.id })
    .select("id")
    .single();
  if (teamErr || !team) {
    return { error: teamErr?.message ?? "Không tạo được team." };
  }

  const status =
    input.payment_status === "paid" ? "confirmed" : "registered";

  const { data: reg, error: regErr } = await supabase
    .from("registrations")
    .insert({
      event_id: event.id,
      athlete_id: athlete.id,
      team_id: team.id,
      user_id: null,
      status,
      payment_status: input.payment_status,
    })
    .select("id")
    .single();
  if (regErr || !reg) {
    await supabase.from("teams").delete().eq("id", team.id);
    if (regErr?.code === "23505") {
      return { error: "VĐV này đã đăng ký nội dung này." };
    }
    return { error: regErr?.message ?? "Không tạo được đăng ký." };
  }

  // Always record a payment row so list pages join consistently. When verified,
  // mirror payments-queue behavior (sets verified_by + paid_at).
  const amount = input.amount_vnd ?? event.entry_fee_vnd ?? 0;
  const verifiedBy =
    input.payment_status === "paid" ? await currentUserId() : null;
  const paidAt =
    input.payment_status === "paid" ? new Date().toISOString() : null;
  const note = input.note ?? (input.payment_status === "paid"
    ? "Admin xác nhận thủ công"
    : "Đăng ký thủ công, chờ thanh toán");

  await supabase.from("registration_payments").insert({
    registration_id: reg.id,
    amount_vnd: amount,
    paid_at: paidAt,
    verified_by: verifiedBy,
    note,
  });

  revalidatePath("/admin/registrations");
  redirect("/admin/registrations");
}
