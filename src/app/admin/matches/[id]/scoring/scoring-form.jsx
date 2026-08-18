"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordSetAction } from "@/server/admin/scoring-actions";

type Score = { set_no: number; slot1_score: number; slot2_score: number };

export function ScoringForm({
  matchId,
  initialScores,
}: {
  matchId: string;
  initialScores: Score[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initial: Score[] = [1, 2, 3].map(
    (n) =>
      initialScores.find((s) => s.set_no === n) ?? {
        set_no: n,
        slot1_score: 0,
        slot2_score: 0,
      },
  );
  const [sets, setSets] = useState(initial);

  function saveSet(setNo: number) {
    const s = sets.find((x) => x.set_no === setNo);
    if (!s) return;
    setError(null);
    startTransition(async () => {
      const result = await recordSetAction({
        match_id: matchId,
        set_no: setNo,
        slot1_score: s.slot1_score,
        slot2_score: s.slot2_score,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {sets.map((s) => (
        <div key={s.set_no} className="flex items-center gap-2">
          <span className="w-16 text-sm">Set {s.set_no}</span>
          <input
            type="number"
            min={0}
            max={99}
            value={s.slot1_score}
            onChange={(e) =>
              setSets((prev) =>
                prev.map((p) =>
                  p.set_no === s.set_no ? { ...p, slot1_score: +e.target.value } : p,
                ),
              )
            }
            className="w-16 h-10 px-2 rounded-md border border-input text-center"
          />
          <span>—</span>
          <input
            type="number"
            min={0}
            max={99}
            value={s.slot2_score}
            onChange={(e) =>
              setSets((prev) =>
                prev.map((p) =>
                  p.set_no === s.set_no ? { ...p, slot2_score: +e.target.value } : p,
                ),
              )
            }
            className="w-16 h-10 px-2 rounded-md border border-input text-center"
          />
          <button
            type="button"
            onClick={() => saveSet(s.set_no)}
            disabled={pending}
            className="ml-auto h-10 px-3 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            Lưu
          </button>
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
