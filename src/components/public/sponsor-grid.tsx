import { publicUrlFor } from "@/lib/storage/asset-upload";
import { createClient } from "@/lib/supabase/server";

type Sponsor = {
  id: string;
  name: string;
  tier: string;
  logo_path: string | null;
  link_url: string | null;
  invert_in_light: boolean;
  sort_order: number;
};

const TIER_ORDER: Record<string, number> = {
  gold: 0,
  silver: 1,
  bronze: 2,
  partner: 3,
  court: 4,
};

const TIER_LABEL: Record<string, string> = {
  gold: "Tài trợ Vàng",
  silver: "Tài trợ Bạc",
  bronze: "Tài trợ Đồng",
  partner: "Đối tác",
  court: "Tài trợ sân",
};

export async function SponsorGrid({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;
  const supabase = await createClient();

  const byTier = new Map<string, Sponsor[]>();
  for (const s of sponsors) {
    const list = byTier.get(s.tier) ?? [];
    list.push(s);
    byTier.set(s.tier, list);
  }
  const tiers = Array.from(byTier.keys()).sort(
    (a, b) => (TIER_ORDER[a] ?? 9) - (TIER_ORDER[b] ?? 9),
  );

  return (
    <div className="space-y-6">
      {tiers.map((tier) => (
        <section key={tier}>
          <h3 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
            {TIER_LABEL[tier] ?? tier}
          </h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
            {(byTier.get(tier) ?? []).map((s) => {
              const url = publicUrlFor(supabase, "tournament-assets", s.logo_path);
              const inner = url ? (
                /* eslint-disable-next-line @next/next/no-img-element -- public sponsor logo, served from public Supabase Storage bucket */
                <img
                  src={url}
                  alt={s.name}
                  loading="lazy"
                  className={`max-h-16 w-full object-contain ${
                    s.invert_in_light ? "invert" : ""
                  }`}
                />
              ) : (
                <span className="text-sm">{s.name}</span>
              );
              return (
                <li key={s.id} className="flex items-center justify-center p-2">
                  {s.link_url ? (
                    <a
                      href={s.link_url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      title={s.name}
                    >
                      {inner}
                    </a>
                  ) : (
                    <span title={s.name}>{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
