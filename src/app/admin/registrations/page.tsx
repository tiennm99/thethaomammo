import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  pending: "Chờ duyệt",
  paid: "Đã thanh toán",
  rejected: "Đã từ chối",
  unknown: "Không rõ",
};

const STATUS_LABEL: Record<string, string> = {
  registered: "Đã đăng ký",
  confirmed: "Đã xác nhận",
  withdrew: "Rút lui",
};

const PAYMENT_BADGE: Record<string, string> = {
  unpaid: "bg-muted text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-900",
  paid: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
  unknown: "bg-muted text-muted-foreground",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

type SearchParams = Promise<{
  event?: string;
  payment?: string;
  status?: string;
}>;

export default async function AdminRegistrationsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await isAdmin())) notFound();

  const sp = await searchParams;
  const eventId = (sp.event ?? "").trim();
  const payment = (sp.payment ?? "").trim();
  const status = (sp.status ?? "").trim();

  const supabase = await createClient();
  const [eventsRes, regsRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, tournament:tournament_id ( name )")
      .order("name"),
    (async () => {
      let q = supabase
        .from("registrations")
        .select(
          `id, created_at, status, payment_status,
           athletes:athlete_id ( id, display_id, full_name ),
           events:event_id ( id, name,
             tournament:tournament_id ( name )
           )`,
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (eventId) q = q.eq("event_id", eventId);
      if (payment) q = q.eq("payment_status", payment);
      if (status) q = q.eq("status", status);
      return q;
    })(),
  ]);

  const events = eventsRes.data ?? [];
  const regs = regsRes.data ?? [];

  return (
    <main className="flex-1 p-6">
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Đăng ký</h1>
          <p className="text-sm text-muted-foreground">
            Toàn bộ đăng ký, lọc theo nội dung và trạng thái.
          </p>
        </div>
        <Link
          href="/admin/registrations/new"
          className="inline-flex h-9 px-3 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          + Tạo đăng ký
        </Link>
      </header>

      <form className="mb-4 flex flex-wrap gap-3 items-end" method="get">
        <div className="space-y-1.5">
          <label htmlFor="event" className="block text-xs font-medium">
            Nội dung
          </label>
          <select
            id="event"
            name="event"
            defaultValue={eventId}
            className="h-9 max-w-[20rem] px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">— Tất cả —</option>
            {events.map((e) => {
              const tournament = Array.isArray(e.tournament)
                ? e.tournament[0]
                : e.tournament;
              return (
                <option key={e.id} value={e.id}>
                  {tournament?.name ? `${tournament.name} — ` : ""}
                  {e.name}
                </option>
              );
            })}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="payment" className="block text-xs font-medium">
            Thanh toán
          </label>
          <select
            id="payment"
            name="payment"
            defaultValue={payment}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">— Tất cả —</option>
            {Object.entries(PAYMENT_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-xs font-medium">
            Trạng thái
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">— Tất cả —</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Lọc
        </button>
      </form>

      {regs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có đăng ký.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Thời gian</th>
                <th className="px-3 py-2 font-medium">VĐV</th>
                <th className="px-3 py-2 font-medium">Giải / Nội dung</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Thanh toán</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => {
                const athlete = Array.isArray(r.athletes)
                  ? r.athletes[0]
                  : r.athletes;
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
                      {athlete?.id ? (
                        <Link
                          href={`/admin/athletes/${athlete.id}`}
                          className="font-medium hover:underline"
                        >
                          {athlete.full_name}
                        </Link>
                      ) : (
                        <span className="font-medium">—</span>
                      )}
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
                    <td className="px-3 py-2">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${PAYMENT_BADGE[r.payment_status] ?? ""}`}
                      >
                        {PAYMENT_LABEL[r.payment_status] ?? r.payment_status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.payment_status === "pending" && (
                        <Link
                          href={`/admin/payments/${r.id}`}
                          className="underline"
                        >
                          Duyệt
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Hiển thị {regs.length} / tối đa {PAGE_SIZE} đăng ký.
        {regs.length === PAGE_SIZE && " Lọc thêm để xem các đăng ký còn lại."}
      </p>
    </main>
  );
}
