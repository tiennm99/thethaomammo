// SMTP wrapper using denomailer. Requires env: GMAIL_USER, GMAIL_APP_PASSWORD,
// MAIL_FROM. Throws on misconfig; caller marks notification failed.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail(args: SendArgs): Promise<void> {
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  const from = Deno.env.get("MAIL_FROM") ?? user;
  if (!user || !pass || !from) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD / MAIL_FROM not set");
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({
      from,
      to: args.to,
      subject: args.subject,
      content: args.text,
      html: args.html,
    });
  } finally {
    await client.close();
  }
}
