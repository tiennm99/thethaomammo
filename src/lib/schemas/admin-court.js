import { z } from "zod";
import { courtStatusSchema } from "@/lib/types/domain";

export const courtInputSchema = z.object({
  name: z.string().min(1).max(80),
  sort_order: z.number().int().nonnegative(),
  status: courtStatusSchema,
});

/** @typedef {import("zod").infer<typeof courtInputSchema>} CourtInput */

/** @param {FormData} fd */
export function courtFormDataToInput(fd) {
  const obj = /** @type {Record<string, string>} */ (Object.fromEntries(fd));
  const sort = Number.parseInt(obj.sort_order ?? "0", 10);
  return {
    name: obj.name,
    sort_order: Number.isFinite(sort) ? sort : 0,
    status: obj.status,
  };
}
