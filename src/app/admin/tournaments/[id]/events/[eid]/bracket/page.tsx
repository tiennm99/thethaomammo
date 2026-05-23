import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { GenerateBracketButton } from "./generate-bracket-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; eid: string }> };

export default async function BracketAdminPage({ params }: Params) {
  const { id, eid } = await params;
  if (!(await isAdmin())) notFound();

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, kind, tournament_id")
    .eq("id", eid)
    .eq("tournament_id", id)
    .maybeSingle();

  if (!event) notFound();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, round, slot, status, third_place, court_id")
    .eq("event_id", eid)
    .order("third_place")
    .order("round")
    .order("slot");

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">Quản lý bảng đấu</p>
      </header>

      {(!matches || matches.length === 0) ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Chưa có bảng đấu. Đảm bảo đã có ≥ 2 đăng ký xác nhận trước khi tạo.
          </p>
          <GenerateBracketButton eventId={eid} />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{matches.length} trận đấu.</p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {matches.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">
                    {m.third_place ? "Tranh hạng 3" : `Vòng ${m.round} · Bàn ${m.slot}`}
                  </span>
                  <span className="ml-2 text-muted-foreground">[{m.status}]</span>
                </div>
                <a
                  href={`/admin/matches/${m.id}/scoring`}
                  className="text-sm underline"
                >
                  Chấm điểm
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
