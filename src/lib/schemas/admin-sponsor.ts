import { z } from "zod";
import { sponsorTierSchema } from "@/lib/types/domain";

export const sponsorInputSchema = z.object({
  name: z.string().min(1).max(200),
  tier: sponsorTierSchema,
  link_url: z.string().url("URL không hợp lệ").nullable(),
  sort_order: z.number().int().nonnegative(),
  invert_in_light: z.boolean(),
});

export type SponsorInput = z.infer<typeof sponsorInputSchema>;

export function sponsorFormDataToInput(fd: FormData) {
  const obj = Object.fromEntries(fd) as Record<string, string>;
  const sort = Number.parseInt(obj.sort_order ?? "0", 10);
  return {
    name: obj.name,
    tier: obj.tier,
    link_url: obj.link_url || null,
    sort_order: Number.isFinite(sort) ? sort : 0,
    invert_in_light: obj.invert_in_light === "on",
  };
}
