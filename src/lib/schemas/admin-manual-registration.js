import { z } from "zod";
import { paymentStatusSchema } from "@/lib/types/domain";

// Manual admin registration. For now only the user-facing payment_status
// values are accepted (admin shouldn't manually set "unknown").
const manualPaymentStatusSchema = paymentStatusSchema.exclude(["unknown"]);

export const manualRegistrationInputSchema = z.object({
  event_id: z.string().uuid(),
  athlete_display_id: z.string().trim().min(1).max(40),
  payment_status: manualPaymentStatusSchema,
  amount_vnd: z.number().int().nonnegative().nullable(),
  note: z.string().trim().max(500).nullable(),
});

export type ManualRegistrationInput = z.infer<
  typeof manualRegistrationInputSchema
>;

export function manualRegistrationFormDataToInput(fd: FormData) {
  const obj = Object.fromEntries(fd) as Record<string, string>;
  const amountRaw = obj.amount_vnd?.trim() ?? "";
  const amount = amountRaw ? Number.parseInt(amountRaw, 10) : null;
  return {
    event_id: obj.event_id,
    athlete_display_id: obj.athlete_display_id ?? "",
    payment_status: obj.payment_status,
    amount_vnd: amount !== null && Number.isFinite(amount) ? amount : null,
    note: obj.note?.trim() || null,
  };
}
