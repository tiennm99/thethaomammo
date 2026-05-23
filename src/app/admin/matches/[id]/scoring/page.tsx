import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRole, isAdmin } from "@/lib/auth/grants";
import { ScoringForm } from "./scoring-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function ScoringPage({ params }: Params) {
  const { id } = await params;
  if (!(await isAdmin()) && !(await hasRole("referee"))) notFound();

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, round, slot, status, third_place, event_id")
    .eq("id", id)
    .maybeSingle();
  if (!match) notFound();

  const { data: scores } = await supabase
    .from("match_scores")
    .select("set_no, slot1_score, slot2_score")
    .eq("match_id", id)
    .order("set_no");

  return (
    <main className="flex-1 p-6 max-w-md mx-auto">
      <header className="mb-4 space-y-1">
        <h1 className="text-xl font-semibold">
          {match.third_place ? "Tranh hạng 3" : `Vòng ${match.round} · Bàn ${match.slot}`}
        </h1>
        <p className="text-sm text-muted-foreground">Trạng thái: {match.status}</p>
      </header>
      <ScoringForm matchId={match.id} initialScores={scores ?? []} />
    </main>
  );
}
