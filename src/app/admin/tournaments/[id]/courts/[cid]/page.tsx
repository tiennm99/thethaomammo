import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm } from "@/components/admin/admin-form";
import { CourtFormFields } from "@/components/admin/court-form-fields";
import { deleteCourtAction, updateCourtAction } from "@/server/admin/courts";
import { DeleteCourtButton } from "./delete-court-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; cid: string }> };

export default async function AdminCourtEditPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id, cid } = await params;

  const supabase = await createClient();
  const [tournamentRes, courtRes, matchCountRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("courts")
      .select("id, name, sort_order, status")
      .eq("id", cid)
      .eq("tournament_id", id)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("court_id", cid),
  ]);

  if (!tournamentRes.data || !courtRes.data) notFound();
  const tournament = tournamentRes.data;
  const court = courtRes.data;
  const matchCount = matchCountRes.count ?? 0;

  const updateAction = updateCourtAction.bind(null, id, cid);
  const deleteAction = deleteCourtAction.bind(null, id, cid);

  return (
    <main className="flex-1 p-6 max-w-xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}/courts`} className="underline">
          ← Sân thi đấu — {tournament.name}
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{court.name}</h1>
          <p className="text-sm text-muted-foreground">
            {matchCount} trận đã gán
          </p>
        </div>
        <DeleteCourtButton action={deleteAction} disabled={matchCount > 0} />
      </header>

      <AdminForm
        action={updateAction}
        submitLabel="Lưu thay đổi"
        successMessage="Đã lưu."
      >
        <CourtFormFields initial={court} />
      </AdminForm>
    </main>
  );
}
