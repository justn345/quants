import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";

const display = Archivo({ variable: "--font-display", subsets: ["latin"], weight: ["700", "800", "900"] });
const ui = Geist({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quants AI: never miss the move",
  description: "AI market alerts and clear trading signals for BTC, ETH, SOL, BNB, HYPE and 170+ coins. Personal price alerts on Telegram and one-tap, non-custodial trades. Built on NEAR.",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Quants AI", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0f2a1d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${ui.variable} antialiased`}>{children}</body>
    </html>
  );
}
