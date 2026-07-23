"use client";

import { FormEvent, useRef, useState, useEffect } from "react";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 outline-none focus:border-zinc-600";
const invalidInputClass =
  "w-full rounded-lg border border-red-500/60 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 outline-none focus:border-red-500";
const ASSET_DATALIST_ID = "settlement-form-asset-list";

interface FormErrors {
  anchor?: string;
  asset?: string;
  amount?: string;
}

/** Validates the settlement fields, returning field-level error messages. */
function validate(
  anchor: string,
  asset: string,
  amount: string,
  availableLiquidity?: Record<string, number>,
): FormErrors {
  const errors: FormErrors = {};
  if (anchor.trim() === "") errors.anchor = "Anchor id is required.";
  if (asset.trim() === "") errors.asset = "Asset is required.";

  const numeric = Number(amount);
  if (amount.trim() === "" || !Number.isFinite(numeric)) {
    errors.amount = "Enter a valid amount.";
  } else if (numeric <= 0) {
    errors.amount = "Amount must be greater than zero.";
  } else if (availableLiquidity && asset in availableLiquidity) {
    if (numeric > availableLiquidity[asset]) {
      errors.amount = "Amount exceeds available liquidity.";
    }
  }
  return errors;
}

/** Form for opening a settlement against a pool. */
export function SettlementForm({
  onSubmit,
  pending,
  availableLiquidity,
  serverError,
}: {
  onSubmit: (input: {
    anchor: string;
    asset: string;
    amount: number;
  }) => Promise<boolean | void> | boolean | void;
  pending?: boolean;
  availableLiquidity?: Record<string, number>;
  serverError?: string;
}) {
  const [anchor, setAnchor] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (serverError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrors((prev) => ({ ...prev, amount: serverError }));
    }
  }, [serverError]);

  const anchorRef = useRef<HTMLInputElement>(null);
  const assetOptions = Object.keys(availableLiquidity ?? {});
  const assetListId = assetOptions.length > 0 ? ASSET_DATALIST_ID : undefined;
  const anchorErrorId = "settlement-anchor-error";
  const assetErrorId = "settlement-asset-error";
  const amountErrorId = "settlement-amount-error";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(anchor, asset, amount, availableLiquidity);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = await onSubmit({
      anchor: anchor.trim(),
      asset: asset.trim().toUpperCase(),
      amount: Number(amount),
    });
    if (result === false) return;

    setAmount("");
    setErrors({});
  }

  function reset() {
    setAnchor("");
    setAsset("USDC");
    setAmount("");
    setErrors({});
    anchorRef.current?.focus();
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <input
          ref={anchorRef}
          id="settlement-anchor"
          value={anchor}
          onChange={(e) => {
            setAnchor(e.target.value);
            if (errors.anchor) setErrors((prev) => ({ ...prev, anchor: undefined }));
          }}
          placeholder="Anchor id"
          aria-invalid={Boolean(errors.anchor)}
          aria-describedby={errors.anchor ? anchorErrorId : undefined}
          className={errors.anchor ? invalidInputClass : inputClass}
        />
        {errors.anchor ? (
          <p id={anchorErrorId} className="mt-1 text-xs text-red-400">
            {errors.anchor}
          </p>
        ) : null}
      </div>
      <div>
        <input
          id="settlement-asset"
          value={asset}
          onChange={(e) => {
            setAsset(e.target.value);
            if (errors.asset) setErrors((prev) => ({ ...prev, asset: undefined }));
          }}
          placeholder="Asset"
          list={assetListId}
          aria-invalid={Boolean(errors.asset)}
          aria-describedby={errors.asset ? assetErrorId : undefined}
          className={errors.asset ? invalidInputClass : inputClass}
        />
        {assetOptions.length > 0 ? (
          <datalist id={ASSET_DATALIST_ID}>
            {assetOptions.map((assetOption) => (
              <option key={assetOption} value={assetOption} />
            ))}
          </datalist>
        ) : null}
        {errors.asset ? (
          <p id={assetErrorId} className="mt-1 text-xs text-red-400">
            {errors.asset}
          </p>
        ) : null}
      </div>
      <div>
        <input
          id="settlement-amount"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
          }}
          inputMode="numeric"
          placeholder="Amount"
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? amountErrorId : undefined}
          className={errors.amount ? invalidInputClass : inputClass}
        />
        {errors.amount ? (
          <p id={amountErrorId} className="mt-1 text-xs text-red-400">
            {errors.amount}
          </p>
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
