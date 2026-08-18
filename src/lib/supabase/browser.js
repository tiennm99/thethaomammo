import { createBrowserClient } from "@supabase/ssr";

const APP_SCHEMA = "thethaomammo";

/** @typedef {ReturnType<typeof createBrowserClient>} Client */

/** @type {Client | undefined} */
let client;

/** @returns {Client} */
export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      /** @type {string} */ (process.env.NEXT_PUBLIC_SUPABASE_URL),
      /** @type {string} */ (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      { db: { schema: APP_SCHEMA } },
    );
  }
  return client;
}
