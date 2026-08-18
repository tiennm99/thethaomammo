import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PrintActions } from "@/components/print/print-actions";
import { formatDate } from "@/lib/format/date-range";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_events_public")
    .select("name")
    .eq("id", eventId)
    .maybeSingle();
  return {
    title: data ? `Bảng đấu — ${data.name}` : "Bảng đấu",
    robots: { index: false },
  };
}

type Participant = {
  slot: number;
  athlete: { full_name: string | null } | { full_name: string | null }[] | null;
  team: { name: string | null } | { name: string | null }[] | null;
};

type MatchRow = {
  id: string;
  round: number;
  slot: number;
  status: string;
  third_place: boolean;
  match_participants: Participant[] | null;
  match_scores: { set_no: number; slot1_score: number; slot2_score: number }[] | null;
};

function nameForSlot(participants: Participant[] | null | undefined, slot: number): string {
  if (!participants) return "—";
  const p = participants.find((x) => x.slot === slot);
  if (!p) return "—";
  const athlete = Array.isArray(p.athlete) ? p.athlete[0] : p.athlete;
  if (athlete?.full_name) return athlete.full_name;
  const team = Array.isArray(p.team) ? p.team[0] : p.team;
  if (team?.name) return team.name;
  return "—";
}

function scoreLine(scores: MatchRow["match_scores"]): string {
  if (!scores || scores.length === 0) return "";
  return [...scores]
    .sort((a, b) => a.set_no - b.set_no)
    .map((s) => `${s.slot1_score}-${s.slot2_score}`)
    .join(" / ");
}

export default async function PrintBracketPage({ params }: Params) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("v_events_public")
    .select("id, name, tournament_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const { data: tournament } = await supabase
    .from("v_tournaments_public")
    .select("name, starts_at, ends_at, venue")
    .eq("id", event.tournament_id)
    .maybeSingle();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `id, round, slot, status, third_place,
       match_participants ( slot, athlete:athlete_id ( full_name ), team:team_id ( name ) ),
       match_scores ( set_no, slot1_score, slot2_score )`,
    )
    .eq("event_id", eventId)
    .order("third_place")
    .order("round")
    .order("slot");

  const list = (matches ?? []) as unknown as MatchRow[];

  const grouped = new Map<string, MatchRow[]>();
  for (const m of list) {
    const key = m.third_place ? "Tranh hạng 3" : `Vòng ${m.round}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  return (
    <main>
      <PrintActions />
      <header style={{ borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 16 }}>
        <h1 style={{ fontSize: "18pt", fontWeight: 700 }}>BẢNG ĐẤU</h1>
        <p style={{ fontSize: "12pt", fontWeight: 600 }}>{event.name}</p>
        {tournament && (
          <p style={{ fontSize: "10pt" }}>
            {tournament.name}
            {tournament.starts_at && ` · ${formatDate(tournament.starts_at)}`}
            {tournament.venue && ` · ${tournament.venue}`}
          </p>
        )}
      </header>

      {list.length === 0 ? (
        <p>Chưa có trận đấu.</p>
      ) : (
        Array.from(grouped.entries()).map(([round, items]) => (
          <section key={round} style={{ marginBottom: 16 }} className="avoid-break">
            <h2 style={{ fontSize: "13pt", fontWeight: 700, marginBottom: 6 }}>{round}</h2>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>Bàn</th>
                  <th style={{ width: "32%" }}>VĐV / Đội 1</th>
                  <th style={{ width: "32%" }}>VĐV / Đội 2</th>
                  <th style={{ width: "20%" }}>Tỉ số</th>
                  <th style={{ width: "8%" }}>TT</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td>{m.slot}</td>
                    <td>{nameForSlot(m.match_participants, 1)}</td>
                    <td>{nameForSlot(m.match_participants, 2)}</td>
                    <td>{scoreLine(m.match_scores)}</td>
                    <td>{m.status === "completed" ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </main>
  );
}
