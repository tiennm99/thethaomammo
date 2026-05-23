"use client";

import { useMemo, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AthleteFields } from "@/components/registration/athlete-fields";
import { PaymentProofUploader } from "@/components/registration/payment-proof-uploader";
import {
  registrationSchema,
  type RegistrationPayload,
} from "@/lib/schemas/registration";
import { registerAction } from "./actions";

type Event = {
  id: string;
  name: string;
  kind: "singles" | "doubles";
  entry_fee_vnd: number;
};

type Props = {
  tournamentId: string;
  tournamentSlug: string;
  events: Event[];
};

export function RegistrationForm({ tournamentId, tournamentSlug, events }: Props) {
  const router = useRouter();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === eventId),
    [events, eventId],
  );
  const kind: "singles" | "doubles" = selectedEvent?.kind ?? "singles";

  const form = useForm<RegistrationPayload>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      kind: "singles",
      event_id: eventId,
      athletes: [
        { full_name: "", dob: "", gender: "male", club_name: "", phone: "" },
      ],
      payment_proof_path: "",
    },
    shouldUnregister: false,
  });

  function onEventChange(nextEventId: string) {
    setEventId(nextEventId);
    const next = events.find((e) => e.id === nextEventId);
    if (!next) return;
    if (next.kind === "doubles") {
      form.reset({
        kind: "doubles",
        event_id: nextEventId,
        athletes: [
          { full_name: "", dob: "", gender: "male", club_name: "", phone: "" },
          { full_name: "", dob: "", gender: "male", club_name: "", phone: "" },
        ],
        payment_proof_path: "",
      });
    } else {
      form.reset({
        kind: "singles",
        event_id: nextEventId,
        athletes: [
          { full_name: "", dob: "", gender: "male", club_name: "", phone: "" },
        ],
        payment_proof_path: "",
      });
    }
  }

  function onSubmit(values: RegistrationPayload) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await registerAction(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      const firstId = result.registration_ids[0];
      router.push(`/giai/${tournamentSlug}/dang-ky/thanks?id=${firstId}`);
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Nội dung thi đấu</label>
          <select
            value={eventId}
            onChange={(e) => onEventChange(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.entry_fee_vnd.toLocaleString("vi-VN")}đ
              </option>
            ))}
          </select>
        </div>

        <AthleteFields index={0} legend={kind === "doubles" ? "VĐV 1" : "Vận động viên"} />
        {kind === "doubles" && <AthleteFields index={1} legend="VĐV 2" />}

        <PaymentProofUploader
          tournamentId={tournamentId}
          onUploaded={(path) => form.setValue("payment_proof_path", path, { shouldValidate: true })}
        />

        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Đang gửi..." : "Đăng ký"}
        </button>
      </form>
    </FormProvider>
  );
}
