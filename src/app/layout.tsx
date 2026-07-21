import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import { SkipToContentLink } from "@/components/SkipToContentLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnchorNet – Liquidity Network",
  description: "Liquidity coordination network for Stellar anchors",
};

/**
 * Inline script run synchronously before first paint to apply the stored
 * theme (or fall back to the OS preference) without a flash of the wrong
 * colour scheme.  The script is intentionally minimal – it only reads
 * localStorage and toggles a class/attribute on <html>.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('anchornet:theme');
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (_) {}
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme before first paint to prevent flash of incorrect theme */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipToContentLink />
        <WalletProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
              <SiteFooter />
              <GlobalErrorHandler />
            </ToastProvider>
          </ThemeProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
