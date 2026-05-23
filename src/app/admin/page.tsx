import { createClient } from "@/lib/supabase/server";

export const revalidate = 30;

async function fetchKpis() {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [regsToday, pendingPayments, matchesInProgress] = await Promise.all([
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
  ]);

  return {
    registrationsToday: regsToday.count ?? 0,
    pendingPayments: pendingPayments.count ?? 0,
    matchesInProgress: matchesInProgress.count ?? 0,
  };
}

function Kpi({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block hover:opacity-80">
        {inner}
      </a>
    );
  }
  return inner;
}

export default async function AdminDashboardPage() {
  const kpis = await fetchKpis();

  return (
    <main className="flex-1 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Tổng quan hệ thống.</p>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi
          label="Đăng ký hôm nay"
          value={kpis.registrationsToday}
        />
        <Kpi
          label="Chờ duyệt thanh toán"
          value={kpis.pendingPayments}
        />
        <Kpi
          label="Trận đang diễn ra"
          value={kpis.matchesInProgress}
        />
      </section>
    </main>
  );
}
