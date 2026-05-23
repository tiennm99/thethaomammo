import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LiveIndexPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("v_tournaments_public")
    .select("id, slug, name, status")
    .in("status", ["open", "in_progress"])
    .eq("is_legacy", false)
    .order("starts_at", { ascending: false });

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Live</h1>
      {(!tournaments || tournaments.length === 0) ? (
        <p className="text-sm text-muted-foreground">Chưa có giải đấu đang diễn ra.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {tournaments.map((t) => (
            <li key={t.id} className="p-3 text-sm">
              <Link href={`/live/${t.id}`} className="font-medium underline">
                {t.name}
              </Link>
              <span className="ml-2 text-muted-foreground">[{t.status}]</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
