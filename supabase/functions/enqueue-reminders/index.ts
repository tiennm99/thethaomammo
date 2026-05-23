// Daily cron: scan tournaments starting within 24h, insert reminder rows.
// Dedup_key constraint silently no-ops repeated runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyQstash } from "../_shared/qstash-verify.ts";

const WINDOW_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await verifyQstash(req, raw))) {
    return new Response("unauthorized", { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response("missing service-role config", { status: 500 });
  }

  const supabase = createClient(url, key, {
    db: { schema: "thethaomammo" },
    auth: { persistSession: false },
  });

  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_MS);
  const horizonIso = horizon.toISOString();
  const nowIso = now.toISOString();

  // Pending payments for tournaments starting in the next 24h.
  // Filter is_legacy=false at the DB level to avoid pulling legacy rows.
  // Runtime guard below is belt-and-suspenders.
  const { data: pendingPayments } = await supabase
    .from("registrations")
    .select(
      `id, user_id, event_id,
       event:event_id!inner ( tournament:tournament_id!inner ( id, name, starts_at, is_legacy ) )`,
    )
    .in("payment_status", ["unpaid", "pending"])
    .eq("event.tournament.is_legacy", false)
    .is("deleted_at", null);

  // Upcoming matches scheduled in the next 24h.
  // Filter is_legacy=false at the DB level to avoid pulling legacy rows.
  // Runtime guard below is belt-and-suspenders.
  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select(
      `id, scheduled_at, round,
       event:event_id!inner ( name, tournament:tournament_id!inner ( id, name, is_legacy ) ),
       participants:match_participants ( athlete_id )`,
    )
    .eq("status", "pending")
    .eq("event.tournament.is_legacy", false)
    .gte("scheduled_at", nowIso)
    .lte("scheduled_at", horizonIso);

  type EnvelopedTournament = {
    tournament:
      | { id: string; name: string; starts_at: string | null; is_legacy: boolean }
      | { id: string; name: string; starts_at: string | null; is_legacy: boolean }[]
      | null;
  };
  function flatten<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  const rows: Record<string, unknown>[] = [];

  for (const r of (pendingPayments ?? []) as Array<{
    id: string;
    user_id: string | null;
    event_id: string;
    event: EnvelopedTournament | EnvelopedTournament[] | null;
  }>) {
    if (!r.user_id) continue;
    const event = flatten(r.event);
    const t = event ? flatten(event.tournament) : null;
    if (!t || t.is_legacy) continue;
    const startsAt = t.starts_at ? new Date(t.starts_at).getTime() : null;
    if (!startsAt || startsAt > horizon.getTime() || startsAt < now.getTime()) continue;
    rows.push({
      type: "payment_reminder",
      user_id: r.user_id,
      payload: { tournament_name: t.name, registration_id: r.id, event_id: r.event_id },
      dedup_key: `payment_reminder:${r.id}`,
    });
  }

  type MatchRow = {
    id: string;
    scheduled_at: string | null;
    round: number;
    event:
      | { name: string; tournament: { id: string; name: string; is_legacy: boolean } | { id: string; name: string; is_legacy: boolean }[] | null }
      | { name: string; tournament: { id: string; name: string; is_legacy: boolean } | { id: string; name: string; is_legacy: boolean }[] | null }[]
      | null;
    participants: { athlete_id: string | null }[] | null;
  };

  // Collect all unique athlete IDs across all upcoming matches in one pass,
  // then resolve claim_user_id in a single DB roundtrip (avoids N+1).
  const allAthleteIds = new Set<string>();
  for (const m of (upcomingMatches ?? []) as MatchRow[]) {
    for (const p of m.participants ?? []) {
      if (p.athlete_id) allAthleteIds.add(p.athlete_id);
    }
  }
  const athleteUserMap = new Map<string, string>();
  if (allAthleteIds.size > 0) {
    const { data: athleteRows } = await supabase
      .from("athletes")
      .select("id, claim_user_id")
      .in("id", [...allAthleteIds]);
    for (const a of athleteRows ?? []) {
      if (a.claim_user_id) athleteUserMap.set(a.id, a.claim_user_id);
    }
  }

  for (const m of (upcomingMatches ?? []) as MatchRow[]) {
    const event = flatten(m.event);
    const t = event ? flatten(event.tournament) : null;
    if (!t || t.is_legacy) continue;
    const eventName = event?.name ?? "";
    const athletes = (m.participants ?? [])
      .map((p) => p.athlete_id)
      .filter((id): id is string => Boolean(id));
    for (const athleteId of athletes) {
      // Athletes without a claimed account won't receive a reminder;
      // could be extended via registrations.user_id.
      const userId = athleteUserMap.get(athleteId) ?? null;
      if (!userId) continue;
      rows.push({
        type: "match_reminder",
        user_id: userId,
        payload: {
          tournament_name: t.name,
          event_name: eventName,
          round: String(m.round),
          scheduled_at: m.scheduled_at ?? "",
        },
        dedup_key: `match_reminder:${m.id}:${athleteId}`,
      });
    }
  }

  let inserted = 0;
  for (const row of rows) {
    const { error } = await supabase.from("notifications").insert(row);
    if (!error) inserted++;
    // 23505 (unique violation on dedup_key) is the idempotent skip path.
  }

  return new Response(
    JSON.stringify({ candidates: rows.length, inserted }),
    { headers: { "content-type": "application/json" } },
  );
});
