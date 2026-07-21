import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Page not found â€“ AnchorNet",
  description: "The page you're looking for doesn't exist.",
};

/** Custom 404 page, shown for any unmatched route. */
export default function NotFound() {
  return (
    <PageShell py="py-24" className="flex flex-col items-center text-center">
        <p className="text-sm font-medium text-zinc-500">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Back to home
        </Link>
    </PageShell>
  );
}
