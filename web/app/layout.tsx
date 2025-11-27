import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DEMO Airdrop",
  description: "Claim DEMO tokens using a Merkle proof with invite gating.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-slate-50">{children}</body>
    </html>
  );
}
