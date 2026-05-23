import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm } from "@/components/admin/admin-form";
import { EventFormFields } from "@/components/admin/event-form-fields";
import { deleteEventAction, updateEventAction } from "@/server/admin/events";
import { DeleteEventButton } from "./delete-event-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; eid: string }> };

export default async function AdminEventEditPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id, eid } = await params;

  const supabase = await createClient();
  const [tournamentRes, eventRes, agesRes, regCountRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("events")
      .select(
        "id, name, kind, gender, age_category_id, entry_fee_vnd, capacity, color_code",
      )
      .eq("id", eid)
      .eq("tournament_id", id)
      .maybeSingle(),
    supabase
      .from("age_categories")
      .select("id, name")
      .order("sort_order"),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eid)
      .is("deleted_at", null),
  ]);

  if (!tournamentRes.data || !eventRes.data) notFound();

  const tournament = tournamentRes.data;
  const event = eventRes.data;
  const regCount = regCountRes.count ?? 0;

  const updateAction = updateEventAction.bind(null, id, eid);
  const deleteAction = deleteEventAction.bind(null, id, eid);

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}`} className="underline">
          ← {tournament.name}
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {regCount} đăng ký
            {" · "}
            <Link
              href={`/admin/tournaments/${id}/events/${eid}/bracket`}
              className="underline"
            >
              Bảng đấu
            </Link>
          </p>
        </div>
        <DeleteEventButton action={deleteAction} disabled={regCount > 0} />
      </header>

      <AdminForm
        action={updateAction}
        submitLabel="Lưu thay đổi"
        successMessage="Đã lưu."
      >
        <EventFormFields
          initial={event}
          ageCategories={agesRes.data ?? []}
        />
      </AdminForm>
    </main>
  );
}
