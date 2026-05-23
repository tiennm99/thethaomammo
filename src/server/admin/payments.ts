"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

type ActionResult = { error?: string; ok?: boolean };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function verifyPaymentAction(
  registrationId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const noteRaw = (fd.get("note") as string | null) ?? "";
  const amountRaw = (fd.get("amount_vnd") as string | null) ?? "";
  const amount = Number.parseInt(amountRaw, 10);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Số tiền không hợp lệ." };
  }

  const supabase = await createClient();
  const userId = await currentUserId();

  const { data: reg, error: regErr } = await supabase
    .from("registrations")
    .update({ status: "confirmed", payment_status: "paid" })
    .eq("id", registrationId)
    .eq("payment_status", "pending")
    .select("id, event_id, athlete_id, user_id")
    .maybeSingle();

  if (regErr) return { error: regErr.message };
  if (!reg) return { error: "Đăng ký không ở trạng thái chờ duyệt." };

  // Phase 04 RPC pre-creates an unverified payment row at registration time;
  // verify updates it in place so we keep one row per registration.
  const { data: updated, error: payErr } = await supabase
    .from("registration_payments")
    .update({
      amount_vnd: amount,
      paid_at: new Date().toISOString(),
      verified_by: userId,
      note: noteRaw || null,
    })
    .eq("registration_id", registrationId)
    .is("verified_by", null)
    .select("id");

  if (payErr) return { error: payErr.message };

  // Fallback: if the pre-row is missing (legacy / migrated data), insert one.
  if (!updated || updated.length === 0) {
    const { error: insErr } = await supabase
      .from("registration_payments")
      .insert({
        registration_id: registrationId,
        amount_vnd: amount,
        paid_at: new Date().toISOString(),
        verified_by: userId,
        note: noteRaw || null,
      });
    if (insErr) return { error: insErr.message };
  }

  await supabase.from("notifications").insert({
    user_id: reg.user_id,
    type: "payment_verified",
    payload: {
      registration_id: reg.id,
      event_id: reg.event_id,
      athlete_id: reg.athlete_id,
    },
    dedup_key: `pay_verified:${reg.id}`,
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${registrationId}`);
  return { ok: true };
}

export async function rejectPaymentAction(
  registrationId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const note = ((fd.get("note") as string | null) ?? "").trim();
  if (!note) return { error: "Vui lòng nhập lý do từ chối." };

  const supabase = await createClient();

  const { data: reg, error: regErr } = await supabase
    .from("registrations")
    .update({ payment_status: "rejected" })
    .eq("id", registrationId)
    .eq("payment_status", "pending")
    .select("id, event_id, athlete_id, user_id")
    .maybeSingle();

  if (regErr) return { error: regErr.message };
  if (!reg) return { error: "Đăng ký không ở trạng thái chờ duyệt." };

  await supabase.from("notifications").insert({
    user_id: reg.user_id,
    type: "payment_rejected",
    payload: {
      registration_id: reg.id,
      event_id: reg.event_id,
      athlete_id: reg.athlete_id,
      reason: note,
    },
    dedup_key: `pay_rejected:${reg.id}`,
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${registrationId}`);
  return { ok: true };
}
