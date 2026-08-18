import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRulesHtml } from "@/lib/sanitize/rules-html";
import { formatDate, formatDateRange } from "@/lib/format/date-range";
import { SponsorGrid } from "@/components/public/sponsor-grid";
import { GalleryPreview } from "@/components/public/gallery-preview";

const loadTournament = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_tournaments_public")
    .select(
      "id, slug, name, starts_at, ends_at, venue, status, zalo_group_url, payment_info_text, rules_html, is_legacy",
    )
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

export const revalidate = 60;

const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở đăng ký",
  in_progress: "Đang diễn ra",
  completed: "Đã kết thúc",
  draft: "Nháp",
  archived: "Lưu trữ",
};

const KIND_LABEL: Record<string, string> = {
  singles: "Đơn",
  doubles: "Đôi",
};

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  mixed: "Đôi nam nữ",
};

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadTournament(slug);
  if (!data) return { title: "Không tìm thấy giải đấu" };
  const dateLabel = formatDate(data.starts_at, "");
  const description = `${data.name}${data.venue ? ` tại ${data.venue}` : ""}${
    dateLabel ? `, ${dateLabel}` : ""
  }.`;
  return {
    title: data.name,
    description,
    alternates: { canonical: `/giai/${data.slug}` },
    openGraph: {
      type: "article",
      title: data.name,
      description,
      url: `/giai/${data.slug}`,
    },
    twitter: {
      card: "summary",
      title: data.name,
      description,
    },
  };
}

export default async function TournamentDetailPage({ params }: Params) {
  const { slug } = await params;
  const tournament = await loadTournament(slug);
  if (!tournament) notFound();
  const supabase = await createClient();

  const [eventsRes, sponsorsRes, galleryRes] = await Promise.all([
    supabase
      .from("v_events_public")
      .select(
        "id, name, kind, gender, entry_fee_vnd, capacity, age_category_name",
      )
      .eq("tournament_id", tournament.id)
      .order("name"),
    supabase
      .from("sponsors")
      .select(
        "id, name, tier, logo_path, link_url, invert_in_light, sort_order",
      )
      .eq("tournament_id", tournament.id)
      .order("sort_order"),
    supabase
      .from("gallery_photos")
      .select("id, storage_path, caption")
      .eq("tournament_id", tournament.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  const events = eventsRes.data ?? [];
  const sponsors = sponsorsRes.data ?? [];
  const photos = galleryRes.data ?? [];

  const rulesHtml = sanitizeRulesHtml(tournament.rules_html);
  const canRegister =
    !tournament.is_legacy && tournament.status === "open";

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto p-6 space-y-10">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="underline">
          ← Trang chủ
        </Link>
      </nav>
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {tournament.name}
            </h1>
            <p className="text-muted-foreground">
              {formatDateRange(tournament.starts_at, tournament.ends_at, "Chưa công bố")}
              {tournament.venue && ` · ${tournament.venue}`}
            </p>
          </div>
          <span className="shrink-0 text-xs px-2 py-1 rounded bg-muted">
            {STATUS_LABEL[tournament.status] ?? tournament.status}
          </span>
        </div>
        {tournament.is_legacy && (
          <p className="text-sm rounded-md border border-border bg-muted/30 px-3 py-2">
            Giải đấu này có dữ liệu trận đấu trên hệ thống cũ.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {canRegister && (
            <Link
              href={`/giai/${tournament.slug}/dang-ky`}
              className="inline-flex h-10 px-4 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Đăng ký ngay
            </Link>
          )}
          {tournament.status === "in_progress" && (
            <Link
              href={`/live/${tournament.id}`}
              className="inline-flex h-10 px-4 items-center rounded-md border border-input text-sm hover:bg-accent"
            >
              Xem trực tiếp →
            </Link>
          )}
          {tournament.zalo_group_url && (
            <a
              href={tournament.zalo_group_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 px-4 items-center rounded-md border border-input text-sm hover:bg-accent"
            >
              Nhóm Zalo
            </a>
          )}
        </div>
      </header>

      {events.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Nội dung thi đấu</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-border p-3 text-sm space-y-1"
              >
                <div className="font-medium">{e.name}</div>
                <div className="text-xs text-muted-foreground space-x-2">
                  <span>{KIND_LABEL[e.kind] ?? e.kind}</span>
                  <span>· {GENDER_LABEL[e.gender] ?? e.gender}</span>
                  {e.age_category_name && <span>· {e.age_category_name}</span>}
                </div>
                {e.entry_fee_vnd != null && e.entry_fee_vnd > 0 && (
                  <div className="text-xs">
                    Phí: {e.entry_fee_vnd.toLocaleString("vi-VN")} VND
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rulesHtml && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Điều lệ</h2>
          <div
            className="prose prose-sm max-w-none [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: rulesHtml }}
          />
        </section>
      )}

      {tournament.payment_info_text && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Thông tin thanh toán</h2>
          <p className="text-sm whitespace-pre-wrap">
            {tournament.payment_info_text}
          </p>
        </section>
      )}

      {sponsors.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Nhà tài trợ</h2>
          <SponsorGrid sponsors={sponsors} />
        </section>
      )}

      {photos.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Thư viện ảnh</h2>
          <GalleryPreview tournamentId={tournament.id} photos={photos} />
        </section>
      )}
    </main>
  );
}
