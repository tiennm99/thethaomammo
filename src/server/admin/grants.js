"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { APP_SLUG } from "@/lib/auth/app-slug";

type ActionResult = { error?: string; ok?: boolean };

const roleSchema = z.enum(["admin", "club_manager", "referee", "athlete"]);

const grantInputSchema = z
  .object({
    user_id: z.string().uuid(),
    role: roleSchema,
    scope_id: z.string().uuid().nullable(),
  })
  .refine(
    (v) => (v.role === "club_manager" ? v.scope_id !== null : v.scope_id === null),
    {
      message:
        "Quản lý CLB phải chọn CLB; các vai trò khác không được có phạm vi.",
      path: ["scope_id"],
    },
  );

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function grantRoleAction(fd: FormData): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const obj = Object.fromEntries(fd) as Record<string, string>;
  const parsed = grantInputSchema.safeParse({
    user_id: obj.user_id,
    role: obj.role,
    scope_id: obj.scope_id || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("shared")
    .from("app_grants")
    .insert({ ...parsed.data, app_slug: APP_SLUG });

  if (error) {
    // PK is (user_id, app_slug, role, coalesce(scope_id, ...)). Duplicates → 23505.
    if (error.code === "23505") return { error: "Quyền này đã được cấp." };
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function revokeRoleAction(
  userId: string,
  role: string,
  scopeId: string | null,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  let q = supabase
    .schema("shared")
    .from("app_grants")
    .delete()
    .eq("app_slug", APP_SLUG)
    .eq("user_id", userId)
    .eq("role", role);
  q = scopeId ? q.eq("scope_id", scopeId) : q.is("scope_id", null);

  const { error } = await q;
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
