import Link from "next/link";
import { WalletConnect } from "./WalletConnect";
import { CHAIN_NAME, CONTRACT_ADDRESS, API_BASE } from "@/lib/airdrop";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                    <span className="text-lg font-bold tracking-tight text-slate-100">
                        Merkle<span className="text-emerald-400">Drop</span>
                    </span>
                    <div className="ml-4 hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 md:flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        {CHAIN_NAME}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <nav className="hidden gap-4 text-sm font-medium text-slate-400 md:flex">
                        <Link
                            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                            target="_blank"
                            className="hover:text-emerald-300 transition-colors"
                        >
                            Contract
                        </Link>
                        <Link
                            href={API_BASE}
                            target="_blank"
                            className="hover:text-emerald-300 transition-colors"
                        >
                            API
                        </Link>
                    </nav>
                    <WalletConnect />
                </div>
            </div>
        </header>
    );
}
