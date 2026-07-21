/** Shared page footer. */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-zinc-500">
        © {year} AnchorNet — liquidity coordination for Stellar anchors.{' '}
        <a
          href="https://github.com/AnchorNet-Org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          AnchorNet on GitHub
        </a>
      </div>
    </footer>
  );
}
