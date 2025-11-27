'use client';

import { useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAirdrop } from "@/hooks/useAirdrop";
import { Header } from "@/components/features/Header";
import { ClaimSection } from "@/components/features/ClaimSection";
import { InviteSection } from "@/components/features/InviteSection";
import { motion } from "framer-motion";

export default function HomePage() {
  const { provider, account } = useWallet();
  const airdrop = useAirdrop(provider, account);
  const { refreshState } = airdrop;

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-500 blur-[120px] opacity-20" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-emerald-500 blur-[120px] opacity-20" />

      <Header />

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent pb-2">
            Claim your DEMO Tokens
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Verify your eligibility using Merkle proofs and manage your exclusive invitations.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <ClaimSection airdrop={airdrop} account={account || ""} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="space-y-6">
              <InviteSection airdrop={airdrop} />

              <div className="glass rounded-xl p-6 border border-white/5">
                <h3 className="font-semibold text-slate-200 mb-2">How it works</h3>
                <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                  <li>Connect your wallet to check eligibility</li>
                  <li>Claim your tokens if you are on the list</li>
                  <li>Unlock invitations after the initial phase</li>
                  <li>Share invites with friends to let them claim</li>
                </ol>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
