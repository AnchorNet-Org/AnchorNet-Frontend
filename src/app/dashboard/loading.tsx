import { PageShell } from "@/components/PageShell";
import { Spinner } from "@/components/Spinner";

export default function DashboardLoading() {
  return (
    <PageShell maxWidth="max-w-5xl">
        <Spinner label="Loading dashboard…" />
    </PageShell>
  );
}
