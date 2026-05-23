import { z } from "zod";
import { courtStatusSchema } from "@/lib/types/domain";

export const courtInputSchema = z.object({
  name: z.string().min(1).max(80),
  sort_order: z.number().int().nonnegative(),
  status: courtStatusSchema,
});

export type CourtInput = z.infer<typeof courtInputSchema>;

export function courtFormDataToInput(fd: FormData) {
  const obj = Object.fromEntries(fd) as Record<string, string>;
  const sort = Number.parseInt(obj.sort_order ?? "0", 10);
  return {
    name: obj.name,
    sort_order: Number.isFinite(sort) ? sort : 0,
    status: obj.status,
  };
}
