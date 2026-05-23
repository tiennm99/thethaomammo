import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { MultipartAdminForm } from "@/components/admin/multipart-admin-form";
import { SponsorFormFields } from "@/components/admin/sponsor-form-fields";
import { deleteSponsorAction, updateSponsorAction } from "@/server/admin/sponsors";
import { publicUrlFor } from "@/lib/storage/asset-upload";
import { DeleteSponsorButton } from "./delete-sponsor-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; sid: string }> };

export default async function AdminSponsorEditPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id, sid } = await params;

  const supabase = await createClient();
  const [tournamentRes, sponsorRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("sponsors")
      .select(
        "id, name, tier, link_url, sort_order, invert_in_light, logo_path",
      )
      .eq("id", sid)
      .eq("tournament_id", id)
      .maybeSingle(),
  ]);

  if (!tournamentRes.data || !sponsorRes.data) notFound();
  const tournament = tournamentRes.data;
  const sponsor = sponsorRes.data;
  const logoUrl = publicUrlFor(supabase, "tournament-assets", sponsor.logo_path);

  const updateAction = updateSponsorAction.bind(null, id, sid);
  const deleteAction = deleteSponsorAction.bind(null, id, sid);

  return (
    <main className="flex-1 p-6 max-w-2xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}/sponsors`} className="underline">
          ← Nhà tài trợ — {tournament.name}
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{sponsor.name}</h1>
        <DeleteSponsorButton action={deleteAction} />
      </header>

      <MultipartAdminForm
        action={updateAction}
        submitLabel="Lưu thay đổi"
        successMessage="Đã lưu."
      >
        <SponsorFormFields initial={sponsor} currentLogoUrl={logoUrl} />
      </MultipartAdminForm>
    </main>
  );
}
