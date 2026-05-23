import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveMatches } from "@/components/live/live-matches";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ tournamentId: string }> };

export default async function LiveTournamentPage({ params }: Params) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("v_tournaments_public")
    .select("id, name, slug")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournament) notFound();

  const { data: events } = await supabase
    .from("v_events_public")
    .select("id")
    .eq("tournament_id", tournamentId);

  const eventIds = (events ?? []).map((e) => e.id);

  const { data: initialMatches } = await supabase
    .from("v_matches_live")
    .select("id, event_id, round, slot, status, court_name, third_place")
    .in("event_id", eventIds.length ? eventIds : ["00000000-0000-0000-0000-000000000000"])
    .order("status")
    .order("round")
    .order("slot");

  return (
    <main className="flex-1 p-6 max-w-3xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{tournament.name}</h1>
        <p className="text-sm text-muted-foreground">Trực tiếp</p>
      </header>
      <LiveMatches
        tournamentId={tournament.id}
        eventIds={eventIds}
        initial={initialMatches ?? []}
      />
    </main>
  );
}
