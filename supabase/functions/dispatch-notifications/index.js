// Dispatcher: dequeue oldest queued notifications, render template, send via
// Gmail SMTP, mark sent/failed. Invoked by QStash on a 5-min schedule.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { renderEmail } from "../_shared/templates.js";
import { sendMail } from "../_shared/smtp.js";
import { verifyQstash } from "../_shared/qstash-verify.js";

const BATCH = 20;

/**
 * @typedef {Object} QueuedRow
 * @property {string} id
 * @property {import("../_shared/templates.js").NotificationType} type
 * @property {string | null} email
 * @property {string | null} user_id
 * @property {Record<string, unknown>} payload
 */

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

  const { data: rows, error: selErr } = await supabase
    .from("notifications")
    .select("id, type, email, user_id, payload")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (selErr) {
    return new Response(JSON.stringify({ error: selErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const queued = /** @type {QueuedRow[]} */ (rows ?? []);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of queued) {
    let recipient = row.email;
    if (!recipient && row.user_id) {
      const { data: user } = await supabase.auth.admin.getUserById(row.user_id);
      recipient = user?.user?.email ?? null;
    }
    if (!recipient) {
      skipped++;
      await supabase
        .from("notifications")
        .update({ status: "failed", error: "no recipient email" })
        .eq("id", row.id);
      continue;
    }

    try {
      const rendered = renderEmail(row.type, row.payload ?? {});
      await sendMail({
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", row.id);
      sent++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("notifications")
        .update({ status: "failed", error: msg })
        .eq("id", row.id);
    }
  }

  return new Response(
    JSON.stringify({ picked: queued.length, sent, failed, skipped }),
    { headers: { "content-type": "application/json" } },
  );
});
