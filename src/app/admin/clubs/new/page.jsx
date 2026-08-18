import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { ClubFormFields } from "@/components/admin/club-form-fields";
import { createClubAction } from "@/server/admin/clubs";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

export default async function AdminClubNewPage() {
  if (!(await isAdmin())) notFound();
  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/clubs" className="underline">
          ← Câu lạc bộ
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tạo CLB</h1>
      </header>
      <AdminForm action={createClubAction} submitLabel="Tạo CLB">
        <ClubFormFields />
      </AdminForm>
    </main>
  );
}
