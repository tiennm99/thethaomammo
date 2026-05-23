import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm } from "@/components/admin/admin-form";
import { AthleteFormFields } from "@/components/admin/athlete-form-fields";
import {
  restoreAthleteAction,
  softDeleteAthleteAction,
  updateAthleteAction,
} from "@/server/admin/athletes";
import { AthleteDangerButtons } from "./athlete-danger-buttons";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminAthleteEditPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const [athleteRes, clubsRes, regCountRes] = await Promise.all([
    supabase
      .from("athletes")
      .select(
        "id, display_id, full_name, dob, gender, club_id, club_name, phone, deleted_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("clubs")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", id)
      .is("deleted_at", null),
  ]);

  if (!athleteRes.data) notFound();
  const athlete = athleteRes.data;
  const regCount = regCountRes.count ?? 0;

  const updateAction = updateAthleteAction.bind(null, id);
  const deleteAction = softDeleteAthleteAction.bind(null, id);
  const restoreAction = restoreAthleteAction.bind(null, id);

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/athletes" className="underline">
          ← Vận động viên
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{athlete.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {athlete.display_id} · {regCount} đăng ký
            {athlete.deleted_at && " · Đã xóa"}
          </p>
        </div>
        <AthleteDangerButtons
          isDeleted={!!athlete.deleted_at}
          deleteAction={deleteAction}
          restoreAction={restoreAction}
          deleteDisabled={regCount > 0}
        />
      </header>

      <AdminForm
        action={updateAction}
        submitLabel="Lưu thay đổi"
        successMessage="Đã lưu."
      >
        <AthleteFormFields initial={athlete} clubs={clubsRes.data ?? []} />
      </AdminForm>
    </main>
  );
}
