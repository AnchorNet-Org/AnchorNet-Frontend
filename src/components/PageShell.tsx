import { SiteHeader } from "@/components/SiteHeader";

interface PageShellProps {
  /** Content rendered inside the <main> landmark. */
  children: React.ReactNode;
  /**
   * Tailwind max-width class applied to the <main> element.
   * @default "max-w-4xl"
   */
  maxWidth?: string;
  /**
   * Additional Tailwind classes appended to the <main> element.
   * Use this for per-page overrides such as layout or alignment
   * (e.g. "flex flex-col items-center text-center").
   * To change vertical padding, use the `py` prop instead.
   */
  className?: string;
  /**
   * Tailwind vertical-padding class for the <main> element.
   * @default "py-12"
   */
  py?: string;
}

/**
 * Shared page wrapper rendered by every route under `src/app/`.
 *
 * Renders:
 *   - The full-screen outer shell (`min-h-screen bg-zinc-950 text-zinc-100 font-sans`)
 *   - `<SiteHeader />` at the top
 *   - A `<main id="main-content" tabIndex={-1}>` landmark that
 *     `SkipToContentLink` targets, with `mx-auto px-6` plus the
 *     caller-supplied `maxWidth`, `py`, and any extra `className`.
 */
export function PageShell({
  children,
  maxWidth = "max-w-4xl",
  className,
  py = "py-12",
}: PageShellProps) {
  const mainClasses = [
    "mx-auto",
    maxWidth,
    "px-6",
    py,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={mainClasses}>
        {children}
      </main>
    </div>
  );
}
