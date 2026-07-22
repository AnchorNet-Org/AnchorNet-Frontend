import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Page not found – AnchorNet",
  description: "The page you're looking for doesn't exist.",
};

const secondaryLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/anchors", label: "Anchors" },
  { href: "/settlements", label: "Settlements" },
] as const;


/** Custom 404 page, shown for any unmatched route. */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center">
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

        <nav aria-label="Other destinations" className="mt-4 flex flex-wrap items-center justify-center gap-4">
          {secondaryLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-zinc-400 underline underline-offset-4 hover:text-zinc-100"
            >
              {label}
            </Link>
          ))}
        </nav>


      </main>
    </div>
  );
}
