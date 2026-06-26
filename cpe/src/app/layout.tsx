import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, League_Gothic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const league = League_Gothic({
  variable: "--font-league",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hardhatting 2026 · Attendance & Seating",
  description:
    "Attendance & QR seating management for the Hardhatting Ceremony 2026 — Coded for the Future.",
};

export const viewport: Viewport = {
  themeColor: "#faf6ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${league.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
