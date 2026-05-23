import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

export default async function AdminPaymentsQueuePage() {
  if (!(await isAdmin())) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      `id, created_at, payment_status, payment_proof_path,
       athletes:athlete_id ( id, display_id, full_name, phone ),
       events:event_id ( id, name, entry_fee_vnd,
         tournament:tournament_id ( id, name, slug )
       )`,
    )
    .eq("payment_status", "pending")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <main className="flex-1 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Duyệt thanh toán</h1>
        <p className="text-sm text-muted-foreground">
          Đăng ký đang chờ xác minh chuyển khoản.
        </p>
      </header>

      {error && (
        <p className="text-sm text-destructive">Lỗi tải: {error.message}</p>
      )}

      {!error && (!data || data.length === 0) && (
        <p className="text-sm text-muted-foreground">
          Không có đăng ký chờ duyệt.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Đăng ký lúc</th>
                <th className="px-3 py-2 font-medium">VĐV</th>
                <th className="px-3 py-2 font-medium">Giải / Nội dung</th>
                <th className="px-3 py-2 font-medium">Phí</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const athlete = Array.isArray(r.athletes) ? r.athletes[0] : r.athletes;
                const event = Array.isArray(r.events) ? r.events[0] : r.events;
                const tournament = event
                  ? Array.isArray(event.tournament)
                    ? event.tournament[0]
                    : event.tournament
                  : null;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{athlete?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {athlete?.display_id}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{tournament?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {event?.name}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {event?.entry_fee_vnd?.toLocaleString("vi-VN") ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/payments/${r.id}`}
                        className="underline"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
