"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/browser";

/**
 * @typedef {object} LiveMatch
 * @property {string} id
 * @property {string} event_id
 * @property {number} round
 * @property {number} slot
 * @property {string} status
 * @property {string | null} court_name
 * @property {boolean} third_place
 */

/**
 * @typedef {object} Props
 * @property {string} tournamentId
 * @property {string[]} eventIds
 * @property {LiveMatch[]} initial
 */

/**
 * @param {Props} props
 */
export function LiveMatches({ tournamentId, eventIds, initial }) {
  const [matches, setMatches] = useState(
    /** @type {LiveMatch[]} */ (initial),
  );
  // Stable key so the effect doesn't re-subscribe on every parent re-render.
  const eventIdsKey = useMemo(() => [...eventIds].sort().join(","), [eventIds]);

  useEffect(() => {
    if (eventIdsKey.length === 0) return;
    const ids = eventIdsKey.split(",");
    const supabase = getSupabase();
    // Scope realtime to this tournament's events using the in.() filter.
    const filter = `event_id=in.(${ids.join(",")})`;
    const refetch = async () => {
      const { data } = await supabase
        .from("v_matches_live")
        .select("id, event_id, round, slot, status, court_name, third_place")
        .in("event_id", ids)
        .order("status")
        .order("round")
        .order("slot");
      if (data) setMatches(data);
    };
    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "thethaomammo", table: "matches", filter },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "thethaomammo", table: "match_scores" },
        refetch,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, eventIdsKey]);

  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có trận đấu.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {matches.map((m) => (
        <li key={m.id} className="flex items-center justify-between p-3 text-sm">
          <span>
            {m.third_place ? "Tranh hạng 3" : `Vòng ${m.round} · Bàn ${m.slot}`}
            {m.court_name && (
              <span className="ml-2 text-muted-foreground">@ {m.court_name}</span>
            )}
          </span>
          <span
            className={
              m.status === "in_progress"
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }
          >
            {m.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
