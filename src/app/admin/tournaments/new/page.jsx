import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { TournamentFormFields } from "@/components/admin/tournament-form-fields";
import { createTournamentAction } from "@/server/admin/tournaments";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

export default async function AdminTournamentNewPage() {
  if (!(await isAdmin())) notFound();
  return (
    <main className="flex-1 p-6 max-w-3xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/tournaments" className="underline">
          ← Giải đấu
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tạo giải đấu</h1>
      </header>
      <AdminForm action={createTournamentAction} submitLabel="Tạo giải">
        <TournamentFormFields />
      </AdminForm>
    </main>
  );
}
