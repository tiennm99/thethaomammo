import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm } from "@/components/admin/admin-form";
import { ClubFormFields } from "@/components/admin/club-form-fields";
import { deleteClubAction, updateClubAction } from "@/server/admin/clubs";
import { DeleteClubButton } from "./delete-club-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminClubEditPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("id, slug, name, zalo_phone")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!club) notFound();

  const updateAction = updateClubAction.bind(null, id);
  const deleteAction = deleteClubAction.bind(null, id);

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/clubs" className="underline">
          ← Câu lạc bộ
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{club.name}</h1>
          <p className="text-sm text-muted-foreground">{club.slug}</p>
        </div>
        <DeleteClubButton action={deleteAction} />
      </header>

      <AdminForm
        action={updateAction}
        submitLabel="Lưu thay đổi"
        successMessage="Đã lưu."
      >
        <ClubFormFields initial={club} />
      </AdminForm>
    </main>
  );
}
