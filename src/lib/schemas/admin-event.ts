import { z } from "zod";
import { eventKindSchema, genderSchema } from "@/lib/types/domain";

export const eventInputSchema = z.object({
  name: z.string().min(1).max(200),
  kind: eventKindSchema,
  gender: genderSchema,
  age_category_id: z.string().uuid().nullable(),
  entry_fee_vnd: z.number().int().nonnegative(),
  capacity: z.number().int().positive().nullable(),
  color_code: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Mã màu phải có dạng #RRGGBB")
    .nullable(),
});

export type EventInput = z.infer<typeof eventInputSchema>;

export function eventFormDataToInput(fd: FormData) {
  const obj = Object.fromEntries(fd) as Record<string, string>;
  const fee = Number.parseInt(obj.entry_fee_vnd ?? "0", 10);
  const cap = obj.capacity ? Number.parseInt(obj.capacity, 10) : null;
  return {
    name: obj.name,
    kind: obj.kind,
    gender: obj.gender,
    age_category_id: obj.age_category_id || null,
    entry_fee_vnd: Number.isFinite(fee) ? fee : 0,
    capacity: cap && Number.isFinite(cap) ? cap : null,
    color_code: obj.color_code || null,
  };
}
