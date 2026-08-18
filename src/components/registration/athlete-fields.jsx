"use client";

import { useFormContext } from "react-hook-form";
/** @typedef {import("@/lib/schemas/registration").RegistrationPayload} RegistrationPayload */

/** @typedef {{ index: 0 | 1; legend: string }} Props */

/**
 * @param {Props} props
 */
export function AthleteFields({ index, legend }) {
  const { register, formState } = /** @type {import("react-hook-form").UseFormReturn<RegistrationPayload>} */ (
    useFormContext()
  );
  const base = /** @type {const} */ (`athletes.${index}`);
  const errors = /** @type {Array<Record<string, { message?: string }>> | undefined} */ (
    formState.errors.athletes
  )?.[index];

  return (
    <fieldset className="space-y-3 border border-border rounded-md p-4">
      <legend className="text-sm font-medium px-1">{legend}</legend>

      <Field label="Họ tên" error={errors?.full_name?.message}>
        <input
          {...register(/** @type {const} */ (`${base}.full_name`))}
          autoComplete="name"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ngày sinh" error={errors?.dob?.message}>
          <input
            type="date"
            {...register(/** @type {const} */ (`${base}.dob`))}
            className={inputClass}
          />
        </Field>

        <Field label="Giới tính" error={errors?.gender?.message}>
          <select
            {...register(/** @type {const} */ (`${base}.gender`))}
            className={inputClass}
          >
            <option value="">--</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
          </select>
        </Field>
      </div>

      <Field label="CLB" error={errors?.club_name?.message}>
        <input
          {...register(/** @type {const} */ (`${base}.club_name`))}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Số điện thoại" error={errors?.phone?.message}>
          <input
            {...register(/** @type {const} */ (`${base}.phone`))}
            inputMode="numeric"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>

        <Field label="Email (tuỳ chọn)" error={errors?.email?.message}>
          <input
            type="email"
            {...register(/** @type {const} */ (`${base}.email`))}
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

/**
 * @param {{ label: string; error?: string; children: import("react").ReactNode }} props
 */
function Field({ label, error, children }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </label>
  );
}
