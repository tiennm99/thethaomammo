import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ thi đấu",
  in_progress: "Đang thi đấu",
  completed: "Đã kết thúc",
  walkover: "Walkover",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-yellow-100 text-yellow-900",
  completed: "bg-green-100 text-green-900",
  walkover: "bg-blue-100 text-blue-900",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

type SearchParams = Promise<{ status?: string; event?: string }>;

export default async function AdminMatchesListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await isAdmin())) notFound();

  const sp = await searchParams;
  const status = (sp.status ?? "").trim();
  const eventId = (sp.event ?? "").trim();

  const supabase = await createClient();
  const [eventsRes, matchesRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, tournament:tournament_id ( name )")
      .order("name"),
    (async () => {
      let q = supabase
        .from("matches")
        .select(
          `id, round, slot, status, third_place, scheduled_at, event_id,
           events:event_id ( id, name,
             tournament:tournament_id ( id, name )
           ),
           court:court_id ( name )`,
        )
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(PAGE_SIZE);

      if (status) q = q.eq("status", status);
      if (eventId) q = q.eq("event_id", eventId);
      return q;
    })(),
  ]);

  const events = eventsRes.data ?? [];
  // Active matches surface first — DB lex-sort on enum would put completed first.
  const STATUS_PRIORITY: Record<string, number> = {
    in_progress: 0,
    pending: 1,
    walkover: 2,
    completed: 3,
  };
  const matches = (matchesRes.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9),
    );

  return (
    <main className="flex-1 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Trận đấu</h1>
        <p className="text-sm text-muted-foreground">
          Danh sách trận đấu, lọc theo trạng thái và nội dung.
        </p>
      </header>

      <form className="mb-4 flex flex-wrap gap-3 items-end" method="get">
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
              const t = Array.isArray(e.tournament)
                ? e.tournament[0]
                : e.tournament;
              return (
                <option key={e.id} value={e.id}>
                  {t?.name ? `${t.name} — ` : ""}
                  {e.name}
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Lọc
        </button>
      </form>

      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có trận nào.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Vòng / Bàn</th>
                <th className="px-3 py-2 font-medium">Giải / Nội dung</th>
                <th className="px-3 py-2 font-medium">Sân</th>
                <th className="px-3 py-2 font-medium">Giờ</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const event = Array.isArray(m.events) ? m.events[0] : m.events;
                const tournament = event
                  ? Array.isArray(event.tournament)
                    ? event.tournament[0]
                    : event.tournament
                  : null;
                const court = Array.isArray(m.court) ? m.court[0] : m.court;
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {m.third_place
                        ? "Tranh hạng 3"
                        : `V${m.round} · B${m.slot}`}
                    </td>
                    <td className="px-3 py-2">
                      <div>{tournament?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {event?.name}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {court?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(m.scheduled_at)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${STATUS_BADGE[m.status] ?? ""}`}
                      >
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {m.status !== "completed" && (
                        <Link
                          href={`/admin/matches/${m.id}/scoring`}
                          className="underline"
                        >
                          Chấm điểm
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
        Hiển thị {matches.length} / tối đa {PAGE_SIZE} trận.
        {matches.length === PAGE_SIZE && " Lọc thêm để xem các trận còn lại."}
      </p>
    </main>
  );
}
