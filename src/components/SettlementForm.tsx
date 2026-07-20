"use client";

import { FormEvent, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 outline-none focus:border-zinc-600";
const invalidInputClass =
  "w-full rounded-lg border border-red-500/60 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 outline-none focus:border-red-500";

interface FormErrors {
  anchor?: string;
  asset?: string;
  amount?: string;
}

/** Validates the settlement fields, returning field-level error messages. */
function validate(anchor: string, asset: string, amount: string): FormErrors {
  const errors: FormErrors = {};
  if (anchor.trim() === "") errors.anchor = "Anchor id is required.";
  if (asset.trim() === "") errors.asset = "Asset is required.";

  const numeric = Number(amount);
  if (amount.trim() === "" || !Number.isFinite(numeric)) {
    errors.amount = "Enter a valid amount.";
  } else if (numeric <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }
  return errors;
}

/** Form for opening a settlement against a pool. */
export function SettlementForm({
  onSubmit,
  pending,
}: {
  onSubmit: (input: { anchor: string; asset: string; amount: number }) => void;
  pending?: boolean;
}) {
  const [anchor, setAnchor] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const anchorRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(anchor, asset, amount);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      anchor: anchor.trim(),
      asset: asset.trim(),
      amount: Number(amount),
    });
    setAmount("");
    setErrors({});
  }

  /**
   * Resets all field values, touched state, and errors back to the initial
   * state without triggering any network request. Focus is returned to the
   * first field so keyboard users can immediately start over.
   */
  function reset() {
    setAnchor("");
    setAsset("USDC");
    setAmount("");
    setErrors({});
    anchorRef.current?.focus();
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div>
        <input
          ref={anchorRef}
          value={anchor}
          onChange={(e) => {
            setAnchor(e.target.value);
            if (errors.anchor) setErrors((prev) => ({ ...prev, anchor: undefined }));
          }}
          placeholder="Anchor id"
          aria-invalid={Boolean(errors.anchor)}
          className={errors.anchor ? invalidInputClass : inputClass}
        />
        {errors.anchor ? (
          <p className="mt-1 text-xs text-red-400">{errors.anchor}</p>
        ) : null}
      </div>
      <div>
        <input
          value={asset}
          onChange={(e) => {
            setAsset(e.target.value);
            if (errors.asset) setErrors((prev) => ({ ...prev, asset: undefined }));
          }}
          placeholder="Asset"
          aria-invalid={Boolean(errors.asset)}
          className={errors.asset ? invalidInputClass : inputClass}
        />
        {errors.asset ? (
          <p className="mt-1 text-xs text-red-400">{errors.asset}</p>
        ) : null}
      </div>
      <div>
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
          }}
          inputMode="numeric"
          placeholder="Amount"
          aria-invalid={Boolean(errors.amount)}
          className={errors.amount ? invalidInputClass : inputClass}
        />
        {errors.amount ? (
          <p className="mt-1 text-xs text-red-400">{errors.amount}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 h-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Open settlement
        </button>
        <button
          type="button"
          onClick={reset}
          className="h-fit rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
