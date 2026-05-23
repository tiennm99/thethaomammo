import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { MultipartAdminForm } from "@/components/admin/multipart-admin-form";
import { SponsorFormFields } from "@/components/admin/sponsor-form-fields";
import { createSponsorAction } from "@/server/admin/sponsors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminSponsorNewPage({ params }: Params) {
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

  const action = createSponsorAction.bind(null, id);

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}/sponsors`} className="underline">
          ← Nhà tài trợ
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Thêm nhà tài trợ</h1>
      </header>
      <MultipartAdminForm action={action} submitLabel="Tạo nhà tài trợ">
        <SponsorFormFields />
      </MultipartAdminForm>
    </main>
  );
}
