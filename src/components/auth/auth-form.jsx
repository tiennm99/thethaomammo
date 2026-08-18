"use client";

import { useState, useTransition } from "react";

/** @typedef {(fd: FormData) => Promise<{ error?: string; ok?: boolean }>} Action */

/**
 * @typedef {object} Field
 * @property {string} name
 * @property {string} label
 * @property {string} [type]
 * @property {boolean} [required]
 * @property {string} [autoComplete]
 */

/**
 * @typedef {object} Props
 * @property {Action} action
 * @property {Field[]} fields
 * @property {string} submitLabel
 * @property {string} [successMessage]
 */

/**
 * @param {Props} props
 */
export function AuthForm({ action, fields, submitLabel, successMessage }) {
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  /**
   * @param {FormData} formData
   */
  function onSubmit(formData) {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
      else if (result?.ok) setOk(true);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="block text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            required={f.required !== false}
            autoComplete={f.autoComplete}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ))}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {ok && successMessage && (
        <p className="text-sm text-foreground" role="status">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "..." : submitLabel}
      </button>
    </form>
  );
}
