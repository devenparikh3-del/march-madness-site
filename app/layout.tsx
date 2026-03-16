import type { ReactNode } from "react";

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sustainability March Madness HQ",
  description:
    "Sustainability men's and women's March Madness coworker pools with bracket tracking, leaderboard visibility, and commissioner updates."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
