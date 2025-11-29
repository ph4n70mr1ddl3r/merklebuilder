import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { Providers } from "./providers";
import { ErrorBoundary } from "../components/ErrorBoundary";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "DEMO Airdrop",
  description: "Claim DEMO tokens using a Merkle proof with invite gating.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.className} min-h-screen bg-ink text-slate-50`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
