import { createBrowserClient } from "@supabase/ssr";

const APP_SCHEMA = "thethaomammo";

type Client = ReturnType<typeof createBrowserClient>;

let client: Client | undefined;

export function getSupabase(): Client {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: APP_SCHEMA } },
    );
  }
  return client;
}
