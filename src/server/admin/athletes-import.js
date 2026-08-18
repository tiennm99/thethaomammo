"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { csvRowSchema } from "@/lib/csv/athletes-csv";

/**
 * @typedef {object} ImportResult
 * @property {boolean} [ok]
 * @property {string} [error]
 * @property {number} [inserted]
 * @property {{ row: number, message: string }[]} [errors]
 */

const importInputSchema = z.object({
  rows: z.array(csvRowSchema).min(1).max(1000),
});

/**
 * @param {unknown} rawRows
 * @returns {Promise<ImportResult>}
 */
export async function importAthletesAction(rawRows) {
  if (!(await isAdmin())) return { error: "Không có quyền." };

  const parsed = importInputSchema.safeParse({ rows: rawRows });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bulk_create_athletes", {
    payload: { rows: parsed.data.rows },
  });

  if (error) return { error: error.message };

  const result = /** @type {{ inserted: number, errors: { row: number, message: string }[] }} */ (
    data
  );

  revalidatePath("/admin/athletes");
  return {
    ok: true,
    inserted: result.inserted,
    errors: result.errors ?? [],
  };
}
