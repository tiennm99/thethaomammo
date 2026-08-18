import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGrants, hasRole, isAdmin } from "@/lib/auth/grants";

/** Redirects to /login unless a user session exists. @returns {Promise<import("@supabase/supabase-js").User>} */
export async function requireAuthenticated() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
}

/** 404s unless the user holds at least one grant for this app. @returns {Promise<{ admin: boolean, clubManager: boolean, referee: boolean, grants: import("@/lib/auth/grants").Grant[] }>} */
export async function requireAppGrant() {
  await requireAuthenticated();
  const grants = await getCurrentGrants();
  if (grants.length === 0) notFound();
  const admin = grants.some((g) => g.role === "admin");
  const clubManager = grants.some((g) => g.role === "club_manager");
  const referee = grants.some((g) => g.role === "referee");
  return { admin, clubManager, referee, grants };
}

/** 404s unless the user holds the admin role. @returns {Promise<void>} */
export async function requireAdmin() {
  await requireAuthenticated();
  if (!(await isAdmin())) notFound();
}

/** @returns {Promise<boolean>} */
export async function isClubManager() {
  return hasRole("club_manager");
}
