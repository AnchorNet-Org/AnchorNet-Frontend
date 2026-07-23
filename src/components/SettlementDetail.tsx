"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  fetchSettlement,
  executeSettlement,
  cancelSettlement,
} from "@/lib/settlementsApi";
import { ApiRequestError } from "@/lib/api";
import { Settlement } from "@/lib/types";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { formatAmount } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { Card } from "./Card";
import { Spinner } from "./Spinner";
import { ConfirmDialog } from "./ConfirmDialog";
import { CopyButton } from "./CopyButton";

/** Full-record view of a single settlement, with execute/cancel actions. */
export function SettlementDetail({
  id,
  initialData,
}: {
  id: number;
  initialData?: Settlement;
}) {
  const load = useCallback(
    (signal: AbortSignal) => fetchSettlement(id, signal),
    [id],
  );
  const { state, refresh } = useAsync(
    load,
    initialData ? { status: "ready", data: initialData } : undefined,
  );
  const { notify } = useToast();
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      notify("success", successMessage);
      await refresh();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/settlements"
        className="text-sm text-zinc-400 hover:text-zinc-100"
      >
        ← Back to settlements
      </Link>
      <Card>
        {state.status === "loading" ? (
          <Spinner label="Loading settlement…" />
          ) : state.status === "error" ? (
            <>
              {state.error instanceof ApiRequestError && state.error.status === 404 ? (
                <p className="text-sm text-red-400">
                  Settlement not found. <Link href="/settlements" className="underline">Back to settlements</Link>
                </p>
              ) : (
                <p className="text-sm text-red-400">{state.message}</p>
              )}
            </>
          ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Settlement #{state.data.id}
              </h2>
              <StatusBadge status={state.data.status} />
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-zinc-400">Anchor</dt>
                <dd className="mt-1 flex items-center gap-1 font-mono text-zinc-100">
                  {state.data.anchor}
                  <CopyButton text={state.data.anchor} />
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Asset</dt>
                <dd className="mt-1 font-mono text-zinc-100">
                  {state.data.asset}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Amount</dt>
                <dd className="mt-1 text-zinc-100">
                  {formatAmount(state.data.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Fee</dt>
                <dd className="mt-1 text-zinc-100">
                  {formatAmount(state.data.fee)}
                </dd>
              </div>
            </dl>
            {state.data.status === "pending" ? (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    run(
                      () => executeSettlement(state.data.id),
                      `Executed settlement #${state.data.id}.`,
                    )
                  }
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  Execute
                </button>
                <button
                  onClick={() => setConfirmCancelOpen(true)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-red-400 hover:text-red-300"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Card>
      {state.status === "ready" ? (
        <ConfirmDialog
          open={confirmCancelOpen}
          title="Cancel settlement"
          message={`Cancel settlement #${state.data.id}? Reserved liquidity will be released.`}
          confirmLabel="Cancel settlement"
          cancelLabel="Keep settlement"
          onCancel={() => setConfirmCancelOpen(false)}
          onConfirm={() => {
            setConfirmCancelOpen(false);
            run(
              () => cancelSettlement(state.data.id),
              `Cancelled settlement #${state.data.id}.`,
            );
          }}
        />
      ) : null}
    </div>
  );
}
