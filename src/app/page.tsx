import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function Home() {
  return (
    <PageShell maxWidth="max-w-3xl" py="py-24">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          AnchorNet
        </h1>
        <p className="mt-2 text-xl text-zinc-400">
          Liquidity Network
        </p>
        <p className="mt-8 text-zinc-300 leading-relaxed">
          A liquidity coordination network for Stellar anchors — efficient
          cross-anchor settlement and liquidity sharing. This app will integrate
          with the AnchorNet API and Stellar wallet for payments and routing.
        </p>
        <div className="mt-12 flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Open dashboard
          </Link>
          <a
            href="https://github.com/AnchorNet-Org"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Learn more
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureLink
            href="/dashboard"
            title="Dashboard"
            body="Live pools, liquidity totals and routing quotes."
          />
          <FeatureLink
            href="/anchors"
            title="Anchors"
            body="Register and manage liquidity-providing anchors."
          />
          <FeatureLink
            href="/settlements"
            title="Settlements"
            body="Open, execute and cancel cross-anchor settlements."
          />
        </div>
    </PageShell>
  );
}

function FeatureLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700"
    >
      <div className="text-sm font-semibold text-zinc-100">{title}</div>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </Link>
  );
}
