// Verify QStash JWT signature on incoming webhook. Skipped in local dev when
// QSTASH_CURRENT_SIGNING_KEY is unset. In production the key MUST be present;
// an absent key is treated as a misconfiguration and the request is rejected.

import { Receiver } from "https://esm.sh/@upstash/qstash@2.7.16";

// Detect production Supabase edge runtime. DENO_DEPLOYMENT_ID is injected
// by the Supabase edge runtime for every deployed function; it is absent in
// `supabase functions serve` (local dev).
function isProduction(): boolean {
  if (Deno.env.get("DENO_DEPLOYMENT_ID")) return true;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return supabaseUrl.includes("supabase.co");
}

export async function verifyQstash(req: Request, rawBody: string): Promise<boolean> {
  const current = Deno.env.get("QSTASH_CURRENT_SIGNING_KEY");
  const next = Deno.env.get("QSTASH_NEXT_SIGNING_KEY");
  if (!current) {
    if (isProduction()) {
      // Refuse unsigned requests in production even if secrets were not set.
      // This prevents an open endpoint on misconfigured deployments.
      return false;
    }
    // Local dev: allow unsigned requests but warn so developers notice.
    console.warn(
      "[qstash-verify] QSTASH_CURRENT_SIGNING_KEY is unset — skipping verification (local dev only)",
    );
    return true;
  }

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
