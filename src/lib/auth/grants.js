import { createClient } from "@/lib/supabase/server";
import { APP_SLUG } from "./app-slug";

/** @typedef {import("./app-slug").AppRole} AppRole */
/** @typedef {{ role: AppRole, scope_id: string | null }} Grant */

/** @returns {Promise<Grant[]>} */
export async function getCurrentGrants() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("shared")
    .rpc("current_grants", { app: APP_SLUG });
  if (error || !data) return [];
  return /** @type {Grant[]} */ (data);
}

/**
 * @param {AppRole} role
 * @returns {Promise<boolean>}
 */
export async function hasRole(role) {
  const grants = await getCurrentGrants();
  return grants.some((g) => g.role === role);
}

/** @returns {Promise<boolean>} */
export async function isAdmin() {
  return hasRole("admin");
}
