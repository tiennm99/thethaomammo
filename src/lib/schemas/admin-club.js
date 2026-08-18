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

export type ClubInput = z.infer<typeof clubInputSchema>;

export function clubFormDataToInput(fd: FormData) {
  const obj = Object.fromEntries(fd) as Record<string, string>;
  return {
    slug: obj.slug,
    name: obj.name,
    zalo_phone: obj.zalo_phone || null,
  };
}
