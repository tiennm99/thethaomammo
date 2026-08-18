import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { AdminForm } from "@/components/admin/admin-form";
import { EventFormFields } from "@/components/admin/event-form-fields";
import { createEventAction } from "@/server/admin/events";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminEventNewPage({ params }: Params) {
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

  const { data: ageCategories } = await supabase
    .from("age_categories")
    .select("id, name")
    .order("sort_order");

  const action = createEventAction.bind(null, id);

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}`} className="underline">
          ← {tournament.name}
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tạo nội dung</h1>
      </header>
      <AdminForm action={action} submitLabel="Tạo nội dung">
        <EventFormFields ageCategories={ageCategories ?? []} />
      </AdminForm>
    </main>
  );
}
