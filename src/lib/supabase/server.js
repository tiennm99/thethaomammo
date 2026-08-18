import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const APP_SCHEMA = "thethaomammo";

/** Server Supabase client bound to the request cookie store. Return type stays inferred so query generics flow to callers. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    /** @type {string} */ (process.env.NEXT_PUBLIC_SUPABASE_URL),
    /** @type {string} */ (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      db: { schema: APP_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes session.
          }
        },
      },
    },
  );
}
