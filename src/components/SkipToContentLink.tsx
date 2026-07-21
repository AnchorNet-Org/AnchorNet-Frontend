"use client";

export function SkipToContentLink() {
  function focusMainContent() {
    document.getElementById("main-content")?.focus();
  }

  return (
    <a
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg"
      href="#main-content"
      onClick={focusMainContent}
    >
      Skip to main content
    </a>
  );
}
