import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm, SelectField, TextField } from "@/components/admin/admin-form";
import { updateMatchScheduleAction } from "@/server/admin/match-schedule";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ thi đấu",
  in_progress: "Đang thi đấu",
  completed: "Đã kết thúc",
  walkover: "Walkover",
};

function toDateInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

type Params = { params: Promise<{ id: string }> };

export default async function AdminMatchDetailPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select(
      `id, round, slot, status, third_place, scheduled_at, court_id, event_id,
       events:event_id ( id, name,
         tournament:tournament_id ( id, name )
       )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!match) notFound();

  const event = Array.isArray(match.events) ? match.events[0] : match.events;
  const tournament = event
    ? Array.isArray(event.tournament)
      ? event.tournament[0]
      : event.tournament
    : null;

  const { data: courts } = tournament
    ? await supabase
        .from("courts")
        .select("id, name")
        .eq("tournament_id", tournament.id)
        .order("sort_order")
        .order("name")
    : { data: [] };

  const action = updateMatchScheduleAction.bind(null, id);

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/matches" className="underline">
          ← Trận đấu
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {match.third_place
              ? "Tranh hạng 3"
              : `Vòng ${match.round} · Bàn ${match.slot}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tournament?.name} — {event?.name}
            {" · "}Trạng thái: {STATUS_LABEL[match.status] ?? match.status}
          </p>
        </div>
        {match.status !== "completed" && (
          <Link
            href={`/admin/matches/${id}/scoring`}
            className="inline-flex h-9 px-3 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Chấm điểm →
          </Link>
        )}
      </header>

      <section>
        <h2 className="text-lg font-medium mb-3">Lịch thi đấu</h2>
        <AdminForm
          action={action}
          submitLabel="Lưu lịch"
          successMessage="Đã lưu."
        >
          <TextField
            name="scheduled_at"
            label="Giờ thi đấu"
            type="datetime-local"
            defaultValue={toDateInput(match.scheduled_at)}
            required={false}
          />
          <SelectField
            name="court_id"
            label="Sân"
            defaultValue={match.court_id ?? ""}
            required={false}
            options={[
              { value: "", label: "— Chưa gán —" },
              ...(courts ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </AdminForm>
      </section>
    </main>
  );
}
