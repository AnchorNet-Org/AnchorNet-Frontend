"use client";

import { FormEvent, useState } from "react";
import { Quote } from "@/lib/types";
import { requestQuote } from "@/lib/api";
import { feeInBps, formatAmount } from "@/lib/format";
import { Card } from "./Card";
import { CopyButton } from "./CopyButton";

type Result =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; quote: Quote };

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 outline-none focus:border-zinc-600";

/** Form that requests a routing quote for an asset/amount pair. */
export function QuoteForm() {
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("1000");
  const [result, setResult] = useState<Result>({ status: "idle" });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setResult({ status: "error", message: "Enter a positive amount." });
      return;
    }

    setResult({ status: "loading" });
    try {
      const quote = await requestQuote({ asset: asset.trim(), amount: numeric });
      setResult({ status: "ready", quote });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Quote failed.";
      setResult({ status: "error", message });
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-zinc-200">Routing quote</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Asset</label>
          <input
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className={inputClass}
            placeholder="USDC"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            className={inputClass}
            placeholder="1000"
          />
        </div>
        <button
          type="submit"
          disabled={result.status === "loading"}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {result.status === "loading" ? "Quoting…" : "Get quote"}
        </button>
      </form>

      {result.status === "error" ? (
        <p className="mt-3 text-sm text-red-400">{result.message}</p>
      ) : null}

      {result.status === "ready" ? (
        <dl className="mt-4 space-y-1 text-sm">
          <Row label="Deliverable">
            {formatAmount(result.quote.deliverable)} {result.quote.asset}
          </Row>
          <Row label="Fee">
            {formatAmount(result.quote.fee)} (
            {feeInBps(result.quote.fee, result.quote.amount)})
          </Row>
          <RouteRow route={result.quote.route} />
        </dl>
      ) : null}
    </Card>
  );
}

function RouteRow({ route }: { route: string[] }) {
  const routeText = route.join(" → ");
  return (
    <Row label="Route">
      <span className="inline-flex items-center gap-1">
        {routeText || "—"}
        {routeText ? <CopyButton text={routeText} /> : null}
      </span>
    </Row>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right font-mono text-zinc-100">{children}</dd>
    </div>
  );
}
