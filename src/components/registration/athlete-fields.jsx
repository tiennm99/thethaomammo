"use client";

import { useFormContext } from "react-hook-form";
import type { RegistrationPayload } from "@/lib/schemas/registration";

type Props = { index: 0 | 1; legend: string };

export function AthleteFields({ index, legend }: Props) {
  const { register, formState } = useFormContext<RegistrationPayload>();
  const base = `athletes.${index}` as const;
  const errors = (formState.errors.athletes as Array<Record<string, { message?: string }>> | undefined)?.[index];

  return (
    <fieldset className="space-y-3 border border-border rounded-md p-4">
      <legend className="text-sm font-medium px-1">{legend}</legend>

      <Field label="Họ tên" error={errors?.full_name?.message}>
        <input
          {...register(`${base}.full_name` as const)}
          autoComplete="name"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ngày sinh" error={errors?.dob?.message}>
          <input
            type="date"
            {...register(`${base}.dob` as const)}
            className={inputClass}
          />
        </Field>

        <Field label="Giới tính" error={errors?.gender?.message}>
          <select {...register(`${base}.gender` as const)} className={inputClass}>
            <option value="">--</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
          </select>
        </Field>
      </div>

      <Field label="CLB" error={errors?.club_name?.message}>
        <input {...register(`${base}.club_name` as const)} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Số điện thoại" error={errors?.phone?.message}>
          <input
            {...register(`${base}.phone` as const)}
            inputMode="numeric"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>

        <Field label="Email (tuỳ chọn)" error={errors?.email?.message}>
          <input
            type="email"
            {...register(`${base}.email` as const)}
            autoComplete="email"
            className={inputClass}
          />
        </Field>
      </div>
    </fieldset>
  );
}

const inputClass =
  "w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </label>
  );
}
