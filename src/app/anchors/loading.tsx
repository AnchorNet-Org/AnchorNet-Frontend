import { PageShell } from "@/components/PageShell";
import { Spinner } from "@/components/Spinner";

export default function AnchorsLoading() {
  return (
    <PageShell>
        <Spinner label="Loading anchorsâ€¦" />
    </PageShell>
  );
}
