"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { fetchAnchor, deregisterAnchor } from "@/lib/anchorsApi";
import { ApiRequestError } from "@/lib/api";
import { Anchor } from "@/lib/types";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/format";
import { Card } from "./Card";
import { Spinner } from "./Spinner";
import { ConfirmDialog } from "./ConfirmDialog";
import { CopyButton } from "./CopyButton";

/** Full-record view of a single anchor, with a deactivate action. */
export function AnchorDetail({
  id,
  initialData,
}: {
  id: string;
  initialData?: Anchor;
}) {
  const load = useCallback(
    (signal: AbortSignal) => fetchAnchor(id, signal),
    [id],
  );
  const { state, reload } = useAsync(
    load,
    initialData ? { status: "ready", data: initialData } : undefined,
  );
  const { notify } = useToast();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function deactivate() {
    setPending(true);
    try {
      await deregisterAnchor(id);
      notify("success", `Deactivated anchor "${id}".`);
      reload();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Deactivation failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/anchors"
        className="text-sm text-zinc-400 hover:text-zinc-100"
      >
        ← Back to anchors
      </Link>
      <Card>
        {state.status === "loading" ? (
          <Spinner label="Loading anchor…" />
          ) : state.status === "error" ? (
            <> {
              state.error instanceof ApiRequestError && state.error.status === 404 ? (
                <p className="text-sm text-red-400">
                  Anchor not found. <Link href="/anchors" className="underline">Back to anchors</Link>
                </p>
              ) : (
                <p className="text-sm text-red-400">{state.message}</p>
              )
            } </>
          ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {state.data.name}
              </h2>
              <p className="flex items-center gap-1 font-mono text-xs text-zinc-500">
                {state.data.id}
                <CopyButton text={state.data.id} />
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-zinc-400">Status</dt>
                <dd className="mt-1 text-zinc-100">
                  {state.data.active ? "Active" : "Inactive"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Registered</dt>
                <dd className="mt-1 text-zinc-100">
                  {formatDate(state.data.registeredAt)}
                </dd>
              </div>
            </dl>
            {state.data.active ? (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={pending}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Deactivate
              </button>
            ) : null}
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate anchor"
        message={`Deactivate anchor "${id}"? It will stop receiving new settlements.`}
        confirmLabel="Deactivate"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          deactivate();
        }}
      />
    </div>
  );
}
