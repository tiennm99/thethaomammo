import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm } from "@/components/admin/admin-form";
import { CourtFormFields } from "@/components/admin/court-form-fields";
import { createCourtAction } from "@/server/admin/courts";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminCourtNewPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!tournament) notFound();

  const action = createCourtAction.bind(null, id);

  return (
    <main className="flex-1 p-6 max-w-xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}/courts`} className="underline">
          ← Sân thi đấu
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tạo sân</h1>
      </header>
      <AdminForm action={action} submitLabel="Tạo sân">
        <CourtFormFields />
      </AdminForm>
    </main>
  );
}
