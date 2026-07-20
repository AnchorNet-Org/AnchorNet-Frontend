"use client";

import { FormEvent, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 outline-none focus:border-zinc-600";
const invalidInputClass =
  "w-full rounded-lg border border-red-500/60 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 outline-none focus:border-red-500";

/** Valid anchor ids are a domain or account-style token. */
const ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

interface FormErrors {
  id?: string;
}

/** Validates the anchor id field, returning field-level error messages. */
function validate(id: string): FormErrors {
  const errors: FormErrors = {};
  const trimmed = id.trim();
  if (trimmed === "") {
    errors.id = "Anchor id is required.";
  } else if (!ID_PATTERN.test(trimmed)) {
    errors.id = "Use only letters, numbers, dots, dashes or underscores.";
  }
  return errors;
}

/** Form for registering a new anchor. Calls `onSubmit` with the form values. */
export function AnchorForm({
  onSubmit,
  pending,
}: {
  onSubmit: (input: { id: string; name?: string }) => void;
  pending?: boolean;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const idRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(id);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ id: id.trim(), name: name.trim() || undefined });
    setId("");
    setName("");
    setErrors({});
  }

  /**
   * Resets all field values, touched state, and errors back to the initial
   * state without triggering any network request. Focus is returned to the
   * first field so keyboard users can immediately start over.
   */
  function reset() {
    setId("");
    setName("");
    setErrors({});
    idRef.current?.focus();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row">
      <div className="flex-1">
        <input
          ref={idRef}
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            if (errors.id) setErrors({});
          }}
          placeholder="Anchor id (account or domain)"
          aria-invalid={Boolean(errors.id)}
          className={errors.id ? invalidInputClass : inputClass}
        />
        {errors.id ? (
          <p className="mt-1 text-xs text-red-400">{errors.id}</p>
        ) : null}
      </div>
      <div className="flex-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name (optional)"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-fit shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        Register
      </button>
      <button
        type="button"
        onClick={reset}
        className="h-fit shrink-0 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      >
        Reset
      </button>
    </form>
  );
}
