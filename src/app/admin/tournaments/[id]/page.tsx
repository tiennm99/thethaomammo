import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm } from "@/components/admin/admin-form";
import { TournamentFormFields } from "@/components/admin/tournament-form-fields";
import {
  archiveTournamentAction,
  updateTournamentAction,
} from "@/server/admin/tournaments";
import { ArchiveButton } from "./archive-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminTournamentEditPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      "id, slug, name, status, starts_at, ends_at, venue, zalo_group_url, payment_info_text, is_legacy",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!tournament) notFound();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, kind")
    .eq("tournament_id", id)
    .order("name");

  const updateAction = updateTournamentAction.bind(null, id);
  const archiveAction = archiveTournamentAction.bind(null, id);

  return (
    <main className="flex-1 p-6 max-w-3xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/tournaments" className="underline">
          ← Giải đấu
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">/giai/{tournament.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/tournaments/${id}/courts`}
            className="inline-flex h-9 px-3 items-center rounded-md border border-input text-sm hover:bg-accent"
          >
            Sân thi đấu →
          </Link>
          {tournament.status !== "archived" && (
            <ArchiveButton action={archiveAction} />
          )}
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3">Thông tin chung</h2>
        <AdminForm
          action={updateAction}
          submitLabel="Lưu thay đổi"
          successMessage="Đã lưu."
        >
          <TournamentFormFields initial={tournament} />
        </AdminForm>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Nội dung thi đấu</h2>
          <Link
            href={`/admin/tournaments/${id}/events/new`}
            className="inline-flex h-9 px-3 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            + Thêm nội dung
          </Link>
        </div>
        {(!events || events.length === 0) && (
          <p className="text-sm text-muted-foreground">
            Chưa có nội dung nào.
          </p>
        )}
        {events && events.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div>
                  <Link
                    href={`/admin/tournaments/${id}/events/${e.id}`}
                    className="font-medium hover:underline"
                  >
                    {e.name}
                  </Link>
                  <span className="ml-2 text-muted-foreground">
                    [{e.kind}]
                  </span>
                </div>
                <Link
                  href={`/admin/tournaments/${id}/events/${e.id}/bracket`}
                  className="underline text-muted-foreground"
                >
                  Bảng đấu →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
