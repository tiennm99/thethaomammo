"use client";

import { useState, useTransition } from "react";

/** @typedef {{ error?: string; ok?: boolean }} Result */

/**
 * @typedef {object} Props
 * @property {(fd: FormData) => Promise<Result | void>} action
 * @property {string} submitLabel
 * @property {string} [successMessage]
 * @property {import("react").ReactNode} children
 */

/**
 * @param {Props} props
 */
export function AdminForm({ action, submitLabel, successMessage, children }) {
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  /**
   * @param {FormData} fd
   */
  function onSubmit(fd) {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await action(fd);
      if (result?.error) setError(result.error);
      else if (result?.ok) setOk(true);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4 max-w-2xl">
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {ok && successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang lưu..." : submitLabel}
      </button>
    </form>
  );
}

/**
 * @typedef {object} FieldProps
 * @property {string} name
 * @property {string} label
 * @property {string} [type]
 * @property {string | null} [defaultValue]
 * @property {boolean} [required]
 * @property {string} [placeholder]
 * @property {string} [hint]
 */

/**
 * @param {FieldProps} props
 */
export function TextField({
  name,
  label,
  type = "text",
  defaultValue,
  required,
  placeholder,
  hint,
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * @param {FieldProps & { rows?: number }} props
 */
export function TextAreaField({
  name,
  label,
  defaultValue,
  required,
  placeholder,
  hint,
  rows = 4,
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * @typedef {FieldProps & { options: { value: string; label: string }[] }} SelectProps
 */

/**
 * @param {SelectProps} props
 */
export function SelectField({
  name,
  label,
  defaultValue,
  required,
  options,
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        required={required}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
