'use client';

import { CONTRACT_ADDRESS, API_BASE, CHAIN_NAME } from '../../lib/airdrop';

type MinimalInfoPanelProps = {
  totalClaims: number | null;
  freeClaims: number;
  maxInvites: number;
};

export function MinimalInfoPanel({ totalClaims, freeClaims, maxInvites }: MinimalInfoPanelProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-6">
        {/* Overview */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">About DEMO Airdrop</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            DEMO is a real Ethereum mainnet airdrop for 64M+ users who paid ≥0.004 ETH in gas fees 
            from blocks 0-23M. The project combines a Merkle-gated token claim with an invite system 
            and integrated constant-product AMM.
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 mt-6">
            <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Total Eligible</div>
              <div className="text-2xl font-semibold text-emerald-400">64M+</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Claims So Far</div>
              <div className="text-2xl font-semibold text-emerald-400">
                {totalClaims !== null ? totalClaims.toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">How It Works</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <h4 className="font-medium text-slate-200 mb-1">Check Eligibility</h4>
                <p className="text-sm text-slate-400">
                  Connect your wallet to see if you&apos;re eligible. We check against 64M+ addresses 
                  using Merkle proofs.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <h4 className="font-medium text-slate-200 mb-1">Claim Tokens</h4>
                <p className="text-sm text-slate-400">
                  Eligible users receive 100 DEMO tokens. The first {freeClaims} claims are open. 
                  After that, you need an invitation.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <h4 className="font-medium text-slate-200 mb-1">Invite Friends</h4>
                <p className="text-sm text-slate-400">
                  Each claimer gets {maxInvites} invitation slots. Earn 1 DEMO per level in a 
                  5-level referral chain.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">4️⃣</span>
              <div>
                <h4 className="font-medium text-slate-200 mb-1">Trade on AMM</h4>
                <p className="text-sm text-slate-400">
                  Buy or sell DEMO using the built-in constant-product AMM. Each claim adds 
                  10 DEMO to liquidity reserves.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Technical Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">Network</span>
              <span className="text-sm font-medium text-slate-200">{CHAIN_NAME}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">Contract</span>
              <code className="text-xs font-mono text-slate-200 bg-slate-800 px-2 py-1 rounded">
                {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
              </code>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">Token Standard</span>
              <span className="text-sm font-medium text-slate-200">ERC20</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">Claim Amount</span>
              <span className="text-sm font-medium text-emerald-400">100 DEMO</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">AMM Type</span>
              <span className="text-sm font-medium text-slate-200">Constant Product (x·y=k)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-400">Proof System</span>
              <span className="text-sm font-medium text-slate-200">Merkle Tree</span>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Resources</h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
            >
              <span>📄</span>
              <span>View Contract</span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
            >
              <span>💻</span>
              <span>Source Code</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
