import { createClient } from "@/lib/supabase/server";
import { APP_SLUG, type AppRole } from "./app-slug";

export type Grant = { role: AppRole; scope_id: string | null };

export async function getCurrentGrants(): Promise<Grant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("shared")
    .rpc("current_grants", { app: APP_SLUG });
  if (error || !data) return [];
  return data as Grant[];
}

export async function hasRole(role: AppRole): Promise<boolean> {
  const grants = await getCurrentGrants();
  return grants.some((g) => g.role === role);
}

export async function isAdmin(): Promise<boolean> {
  return hasRole("admin");
}
