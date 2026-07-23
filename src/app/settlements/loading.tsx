import { PageShell } from "@/components/PageShell";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function SettlementsLoading() {
  return (
    <PageShell>
        <TableSkeleton columns={6} />
    </PageShell>
  );
}
