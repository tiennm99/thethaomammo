import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format/date-range";

export const revalidate = 300;

const loadAthlete = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_athletes_public")
    .select(
      "id, display_id, full_name, gender, club_id, club_name, club_resolved_name",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
});

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
};

const MATCH_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ thi đấu",
  in_progress: "Đang thi đấu",
  completed: "Đã kết thúc",
  walkover: "Walkover",
};

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const data = await loadAthlete(id);
  if (!data) return { title: "Không tìm thấy VĐV" };
  const club = data.club_resolved_name ?? data.club_name;
  return {
    title: data.full_name,
    description: club ? `${data.full_name} — ${club}` : data.full_name,
  };
}

export default async function AthleteProfilePage({ params }: Params) {
  const { id } = await params;
  const athlete = await loadAthlete(id);
  if (!athlete) notFound();
  const supabase = await createClient();

  let clubSlug: string | null = null;
  if (athlete.club_id) {
    const { data: club } = await supabase
      .from("clubs")
      .select("slug")
      .eq("id", athlete.club_id)
      .is("deleted_at", null)
      .maybeSingle();
    clubSlug = club?.slug ?? null;
  }

  const [regsRes, matchesRes] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        `created_at, status,
         event:event_id!inner ( id, name,
           tournament:tournament_id!inner ( slug, name, is_legacy )
         )`,
      )
      .eq("athlete_id", athlete.id)
      .eq("status", "confirmed")
      .is("deleted_at", null)
      .eq("event.tournament.is_legacy", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("match_participants")
      .select(
        `slot,
         match:match_id!inner ( id, round, scheduled_at, status, third_place,
           event:event_id!inner (
             name,
             tournament:tournament_id!inner ( slug, name, is_legacy )
           )
         )`,
      )
      .eq("athlete_id", athlete.id)
      .eq("match.event.tournament.is_legacy", false)
      .order("scheduled_at", {
        foreignTable: "match",
        ascending: false,
        nullsFirst: false,
      })
      .limit(20),
  ]);

  const registrations = regsRes.data ?? [];
  const matches = (matchesRes.data ?? [])
    .map((m) => (Array.isArray(m.match) ? m.match[0] : m.match))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const clubName = athlete.club_resolved_name ?? athlete.club_name;

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto p-6 space-y-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="underline">
          ← Trang chủ
        </Link>
      </nav>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {athlete.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {athlete.display_id}
          {athlete.gender && ` · ${GENDER_LABEL[athlete.gender] ?? athlete.gender}`}
          {clubName && (
            <>
              {" · "}
              {clubSlug ? (
                <Link href={`/club/${clubSlug}`} className="underline">
                  {clubName}
                </Link>
              ) : (
                clubName
              )}
            </>
          )}
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Giải đấu đã tham gia</h2>
        {registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có giải đấu nào được xác nhận.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {registrations.map((r, i) => {
              const event = Array.isArray(r.event) ? r.event[0] : r.event;
              const tournament = event
                ? Array.isArray(event.tournament)
                  ? event.tournament[0]
                  : event.tournament
                : null;
              return (
                <li key={i} className="p-3 text-sm flex items-center justify-between gap-3">
                  <div>
                    {tournament ? (
                      <Link
                        href={`/giai/${tournament.slug}`}
                        className="font-medium hover:underline"
                      >
                        {tournament.name}
                      </Link>
                    ) : (
                      <span className="font-medium">—</span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {event?.name}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Trận đấu gần đây</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có trận đấu.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {matches.map((m) => {
              const event = Array.isArray(m.event) ? m.event[0] : m.event;
              const tournament = event
                ? Array.isArray(event.tournament)
                  ? event.tournament[0]
                  : event.tournament
                : null;
              return (
                <li key={m.id} className="p-3 text-sm flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {m.third_place ? "Tranh hạng 3" : `Vòng ${m.round}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tournament?.name} — {event?.name}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{MATCH_STATUS_LABEL[m.status] ?? m.status}</div>
                    {m.scheduled_at && (
                      <div>{formatDate(m.scheduled_at)}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
