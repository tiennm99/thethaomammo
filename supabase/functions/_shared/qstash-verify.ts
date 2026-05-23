// Verify QStash JWT signature on incoming webhook. Skipped in local dev when
// QSTASH_CURRENT_SIGNING_KEY is unset.

import { Receiver } from "https://esm.sh/@upstash/qstash@2.7.16";

export async function verifyQstash(req: Request, rawBody: string): Promise<boolean> {
  const current = Deno.env.get("QSTASH_CURRENT_SIGNING_KEY");
  const next = Deno.env.get("QSTASH_NEXT_SIGNING_KEY");
  if (!current) return true; // local dev: skip verification

  const signature = req.headers.get("upstash-signature");
  if (!signature) return false;

  const receiver = new Receiver({
    currentSigningKey: current,
    nextSigningKey: next ?? current,
  });
  try {
    return await receiver.verify({ signature, body: rawBody });
  } catch {
    return false;
  }
}
