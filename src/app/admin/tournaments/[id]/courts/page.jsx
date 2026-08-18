import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  available: "Sẵn sàng",
  in_use: "Đang dùng",
  maintenance: "Bảo trì",
};

type Params = { params: Promise<{ id: string }> };

export default async function AdminCourtsListPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const [tournamentRes, courtsRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("courts")
      .select("id, name, sort_order, status")
      .eq("tournament_id", id)
      .order("sort_order")
      .order("name"),
  ]);

  if (!tournamentRes.data) notFound();
  const tournament = tournamentRes.data;
  const courts = courtsRes.data ?? [];

  return (
    <main className="flex-1 p-6 max-w-3xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}`} className="underline">
          ← {tournament.name}
        </Link>
      </nav>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sân thi đấu</h1>
        <Link
          href={`/admin/tournaments/${id}/courts/new`}
          className="inline-flex h-9 px-3 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          + Thêm sân
        </Link>
      </header>

      {courts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có sân nào.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {courts.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div>
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-muted-foreground">
                  · #{c.sort_order} · {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </div>
              <Link
                href={`/admin/tournaments/${id}/courts/${c.id}`}
                className="underline"
              >
                Sửa
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
