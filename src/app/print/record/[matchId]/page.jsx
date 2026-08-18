import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PrintActions } from "@/components/print/print-actions";
import { formatDate } from "@/lib/format/date-range";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ matchId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { matchId } = await params;
  return {
    title: `Biên bản thi đấu — ${matchId.slice(0, 8)}`,
    robots: { index: false },
  };
}

type Match = {
  id: string;
  round: number;
  slot: number;
  status: string;
  third_place: boolean;
  scheduled_at: string | null;
  event: {
    name: string | null;
    tournament: { name: string | null; venue: string | null } | null;
  } | null;
  court: { name: string | null } | null;
};

type Participant = {
  slot: number;
  athlete: { full_name: string | null; display_id: string | null; club_name: string | null } | null;
  team: { name: string | null } | null;
};

type Score = { set_no: number; slot1_score: number; slot2_score: number };

function flatten<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function nameFor(participants: Participant[], slot: number): string {
  const p = participants.find((x) => x.slot === slot);
  if (!p) return "";
  const a = flatten(p.athlete);
  if (a?.full_name) return a.full_name;
  const t = flatten(p.team);
  return t?.name ?? "";
}

function clubFor(participants: Participant[], slot: number): string {
  const p = participants.find((x) => x.slot === slot);
  if (!p) return "";
  const a = flatten(p.athlete);
  return a?.club_name ?? "";
}

export default async function PrintRecordPage({ params }: Params) {
  const { matchId } = await params;
  const supabase = await createClient();

  const { data: matchRaw } = await supabase
    .from("matches")
    .select(
      `id, round, slot, status, third_place, scheduled_at,
       event:event_id ( name, tournament:tournament_id ( name, venue ) ),
       court:court_id ( name )`,
    )
    .eq("id", matchId)
    .maybeSingle();
  if (!matchRaw) notFound();

  type RawEvent = {
    name: string | null;
    tournament:
      | { name: string | null; venue: string | null }
      | { name: string | null; venue: string | null }[]
      | null;
  };
  type RawCourt = { name: string | null };
  const rawEvent = flatten<RawEvent>(matchRaw.event as RawEvent | RawEvent[] | null);
  const match: Match = {
    id: matchRaw.id,
    round: matchRaw.round,
    slot: matchRaw.slot,
    status: matchRaw.status,
    third_place: matchRaw.third_place,
    scheduled_at: matchRaw.scheduled_at,
    event: rawEvent
      ? {
          name: rawEvent.name,
          tournament: flatten(rawEvent.tournament),
        }
      : null,
    court: flatten(matchRaw.court as RawCourt | RawCourt[] | null),
  };

  const [participantsRes, scoresRes] = await Promise.all([
    supabase
      .from("match_participants")
      .select(
        `slot,
         athlete:athlete_id ( full_name, display_id, club_name ),
         team:team_id ( name )`,
      )
      .eq("match_id", matchId)
      .order("slot"),
    supabase
      .from("match_scores")
      .select("set_no, slot1_score, slot2_score")
      .eq("match_id", matchId)
      .order("set_no"),
  ]);

  const participants: Participant[] = (participantsRes.data ?? []).map((p: {
    slot: number;
    athlete: unknown;
    team: unknown;
  }) => ({
    slot: p.slot,
    athlete: flatten(p.athlete as {
      full_name: string | null;
      display_id: string | null;
      club_name: string | null;
    }),
    team: flatten(p.team as { name: string | null }),
  }));
  const scores: Score[] = scoresRes.data ?? [];
  const blankRows = Math.max(0, 3 - scores.length);

  return (
    <main>
      <PrintActions />
      <header style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: "16pt", fontWeight: 700, textTransform: "uppercase" }}>
          Biên bản thi đấu
        </h1>
        {match.event?.tournament?.name && (
          <p style={{ fontSize: "12pt", fontWeight: 600 }}>
            {match.event.tournament.name}
          </p>
        )}
        {match.event?.name && (
          <p style={{ fontSize: "11pt" }}>Nội dung: {match.event.name}</p>
        )}
      </header>

      <section style={{ marginBottom: 12 }}>
        <table>
          <tbody>
            <tr>
              <th style={{ width: "20%" }}>Vòng / Bàn</th>
              <td>
                {match.third_place ? "Tranh hạng 3" : `Vòng ${match.round} · Bàn ${match.slot}`}
              </td>
              <th style={{ width: "15%" }}>Sân</th>
              <td>{match.court?.name ?? "—"}</td>
            </tr>
            <tr>
              <th>Thời gian</th>
              <td>{match.scheduled_at ? formatDate(match.scheduled_at) : "—"}</td>
              <th>Địa điểm</th>
              <td>{match.event?.tournament?.venue ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 12 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Bên</th>
              <th>Họ và tên / Đội</th>
              <th>CLB</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>A</td>
              <td>{nameFor(participants, 1)}</td>
              <td>{clubFor(participants, 1)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>B</td>
              <td>{nameFor(participants, 2)}</td>
              <td>{clubFor(participants, 2)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: "12pt", fontWeight: 700, marginBottom: 4 }}>Tỉ số các séc</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "12%" }}>Séc</th>
              <th>A</th>
              <th>B</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.set_no}>
                <td>{s.set_no}</td>
                <td>{s.slot1_score}</td>
                <td>{s.slot2_score}</td>
                <td></td>
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={`blank-${i}`}>
                <td>{scores.length + i + 1}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div style={{ textAlign: "center", fontSize: "11pt" }}>
          <div style={{ fontWeight: 600 }}>Trọng tài</div>
          <div style={{ marginTop: 48, borderTop: "1px solid #000", paddingTop: 6 }}>
            (Ký, ghi rõ họ tên)
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: "11pt" }}>
          <div style={{ fontWeight: 600 }}>VĐV bên A</div>
          <div style={{ marginTop: 48, borderTop: "1px solid #000", paddingTop: 6 }}>
            (Ký)
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: "11pt" }}>
          <div style={{ fontWeight: 600 }}>VĐV bên B</div>
          <div style={{ marginTop: 48, borderTop: "1px solid #000", paddingTop: 6 }}>
            (Ký)
          </div>
        </div>
      </section>
    </main>
  );
}
