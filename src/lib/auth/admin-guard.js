import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGrants, hasRole, isAdmin } from "@/lib/auth/grants";

export async function requireAuthenticated() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
}

export async function requireAppGrant() {
  await requireAuthenticated();
  const grants = await getCurrentGrants();
  if (grants.length === 0) notFound();
  const admin = grants.some((g) => g.role === "admin");
  const clubManager = grants.some((g) => g.role === "club_manager");
  const referee = grants.some((g) => g.role === "referee");
  return { admin, clubManager, referee, grants };
}

export async function requireAdmin() {
  await requireAuthenticated();
  if (!(await isAdmin())) notFound();
}

export async function isClubManager() {
  return hasRole("club_manager");
}
