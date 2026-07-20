import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipToContentLink />
        <WalletProvider>
          <ToastProvider>
            {children}
            <SiteFooter />
            <GlobalErrorHandler />
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
