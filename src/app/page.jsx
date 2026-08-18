import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TournamentCard } from "@/components/public/tournament-card";

export const revalidate = 300;

export const metadata = {
  description:
    "Danh sách các giải thể thao thiện nguyện đang mở đăng ký và đang diễn ra.",
};

export default async function HomePage() {
  const supabase = await createClient();

  const [upcomingRes, liveRes] = await Promise.all([
    supabase
      .from("v_tournaments_public")
      .select("slug, name, starts_at, ends_at, venue, status")
      .in("status", ["open", "in_progress"])
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from("v_tournaments_public")
      .select("slug")
      .eq("status", "in_progress")
      .limit(1),
  ]);

  const tournaments = upcomingRes.data ?? [];
  const hasLive = (liveRes.data ?? []).length > 0;

  return (
    <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
      <section className="py-8 sm:py-12 text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Thể Thao Mầm Mơ
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Hệ thống đăng ký, theo dõi và quản lý giải đấu cầu lông gây quỹ thiện
          nguyện.
        </p>
        {hasLive && (
          <p>
            <Link
              href="/live"
              className="inline-flex items-center gap-1.5 text-sm underline text-primary"
            >
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              Đang có trận đấu trực tiếp
            </Link>
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Giải đấu sắp tới</h2>
        {tournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hiện chưa có giải đấu nào đang mở. Vui lòng quay lại sau.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <li key={t.slug}>
                <TournamentCard
                  slug={t.slug}
                  name={t.name}
                  starts_at={t.starts_at}
                  ends_at={t.ends_at}
                  venue={t.venue}
                  status={t.status}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
