import { PageShell } from "@/components/PageShell";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function AnchorsLoading() {
  return (
    <PageShell>
        <TableSkeleton columns={3} />
    </PageShell>
  );
}
