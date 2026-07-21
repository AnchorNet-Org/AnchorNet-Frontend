import { PageShell } from "@/components/PageShell";
import { Spinner } from "@/components/Spinner";

export default function SettlementsLoading() {
  return (
    <PageShell>
        <Spinner label="Loading settlementsâ€¦" />
    </PageShell>
  );
}
