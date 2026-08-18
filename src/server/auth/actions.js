"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = signInSchema.extend({
  display_name: z.string().min(1).max(120),
});

const resetSchema = z.object({ email: z.string().email() });

/**
 * @param {FormData} formData
 */
export async function signInAction(formData) {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Email hoặc mật khẩu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * @param {FormData} formData
 */
export async function signUpAction(formData) {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Thông tin đăng ký không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.display_name } },
  });
  if (error) return { error: error.message };

  return { ok: true };
}

/**
 * @param {FormData} formData
 */
export async function resetPasswordAction(formData) {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Email không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error) return { error: error.message };

  return { ok: true };
}

/** Signs the current user out and redirects to /login. @returns {Promise<void>} */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
