import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  AdminForm,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/admin-form";
import { createManualRegistrationAction } from "@/server/admin/manual-registration";

export const dynamic = "force-dynamic";

export default async function AdminManualRegistrationPage() {
  if (!(await isAdmin())) notFound();

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select(
      `id, name, kind, entry_fee_vnd,
       tournament:tournament_id ( id, name, status )`,
    )
    .eq("kind", "singles")
    .order("name");

  // Only show events from active tournaments (open/in_progress).
  const eligible = (events ?? []).filter((e) => {
    const t = Array.isArray(e.tournament) ? e.tournament[0] : e.tournament;
    return t && (t.status === "open" || t.status === "in_progress");
  });

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/registrations" className="underline">
          ← Đăng ký
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tạo đăng ký thủ công</h1>
        <p className="text-sm text-muted-foreground">
          Dùng cho người đăng ký trực tiếp hoặc qua giấy. Slice này hỗ trợ nội
          dung <strong>đơn</strong> trong các giải đang mở / đang diễn ra.
        </p>
      </header>

      {eligible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Không có nội dung đơn nào đang mở đăng ký.
        </p>
      ) : (
        <AdminForm
          action={createManualRegistrationAction}
          submitLabel="Tạo đăng ký"
        >
          <SelectField
            name="event_id"
            label="Nội dung"
            required
            options={eligible.map((e) => {
              const t = Array.isArray(e.tournament)
                ? e.tournament[0]
                : e.tournament;
              const fee = e.entry_fee_vnd
                ? ` · ${e.entry_fee_vnd.toLocaleString("vi-VN")} VND`
                : "";
              return {
                value: e.id,
                label: `${t?.name ? `${t.name} — ` : ""}${e.name}${fee}`,
              };
            })}
          />
          <TextField
            name="athlete_display_id"
            label="Mã VĐV"
            required
            placeholder="CL2605..."
            hint="Lấy từ danh sách VĐV (cột Mã)."
          />
          <SelectField
            name="payment_status"
            label="Trạng thái thanh toán"
            required
            defaultValue="pending"
            options={[
              { value: "unpaid", label: "Chưa thanh toán" },
              { value: "pending", label: "Chờ duyệt" },
              { value: "paid", label: "Đã thanh toán (xác nhận luôn)" },
              { value: "rejected", label: "Đã từ chối" },
            ]}
          />
          <TextField
            name="amount_vnd"
            label="Số tiền (VND)"
            type="number"
            required={false}
            hint="Bỏ trống để dùng phí mặc định của nội dung."
          />
          <TextAreaField
            name="note"
            label="Ghi chú"
            required={false}
            rows={2}
          />
        </AdminForm>
      )}
    </main>
  );
}
