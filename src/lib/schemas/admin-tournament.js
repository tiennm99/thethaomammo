import { z } from "zod";
import { tournamentStatusSchema } from "@/lib/types/domain";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const tournamentInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(slugRegex, "Slug chỉ chứa chữ thường, số và dấu gạch ngang"),
  name: z.string().min(1).max(200),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  status: tournamentStatusSchema,
  zalo_group_url: z.union([z.string().url(), z.literal(""), z.null()]),
  payment_info_text: z.string().max(2000).optional().nullable(),
});

export type TournamentInput = z.infer<typeof tournamentInputSchema>;

export function tournamentFormDataToInput(fd: FormData) {
  const obj = Object.fromEntries(fd) as Record<string, string>;
  return {
    slug: obj.slug,
    name: obj.name,
    starts_at: obj.starts_at || null,
    ends_at: obj.ends_at || null,
    venue: obj.venue || null,
    status: obj.status,
    zalo_group_url: obj.zalo_group_url || null,
    payment_info_text: obj.payment_info_text || null,
  };
}
