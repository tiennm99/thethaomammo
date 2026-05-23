import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./registration-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function RegisterPage({ params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, slug, name, is_legacy, payment_qr_path, payment_info_text")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (!tournament || tournament.is_legacy) {
    notFound();
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, name, kind, entry_fee_vnd")
    .eq("tournament_id", tournament.id)
    .order("name");

  if (!events || events.length === 0) {
    return (
      <main className="flex-1 p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold">{tournament.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Chưa mở nội dung đăng ký. Vui lòng quay lại sau.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 max-w-xl mx-auto">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">{tournament.name}</h1>
        <p className="text-sm text-muted-foreground">Đăng ký thi đấu</p>
      </header>

      {tournament.payment_info_text && (
        <section className="mb-6 p-4 rounded-md border border-border text-sm space-y-1">
          <p className="font-medium">Thông tin chuyển khoản</p>
          <p className="text-muted-foreground whitespace-pre-line">{tournament.payment_info_text}</p>
        </section>
      )}

      <RegistrationForm
        tournamentId={tournament.id}
        tournamentSlug={tournament.slug}
        events={events as never}
      />
    </main>
  );
}
