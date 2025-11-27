import "./globals.css";
import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { Providers } from "./providers";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "DEMO Airdrop",
  description: "Claim DEMO tokens using a Merkle proof with invite gating.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.className} min-h-screen bg-ink text-slate-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
