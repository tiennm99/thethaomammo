import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const clubInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(slugRegex, "Slug chỉ chứa chữ thường, số và dấu gạch ngang"),
  name: z.string().min(1).max(200),
  zalo_phone: z.string().max(20).optional().nullable(),
});

/** @typedef {import("zod").infer<typeof clubInputSchema>} ClubInput */

/** @param {FormData} fd */
export function clubFormDataToInput(fd) {
  const obj = /** @type {Record<string, string>} */ (Object.fromEntries(fd));
  return {
    slug: obj.slug,
    name: obj.name,
    zalo_phone: obj.zalo_phone || null,
  };
}
