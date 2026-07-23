import { PageShell } from "@/components/PageShell";
import { Spinner } from "@/components/Spinner";

export default function SettlementDetailLoading() {
  return (
    <PageShell>
        <Spinner label="Loading settlement…" />
    </PageShell>
  );
}
