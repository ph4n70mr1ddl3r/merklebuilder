'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { ZeroAddress, getAddress, isAddress } from "ethers";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import { CHAIN_ID, CHAIN_NAME, CONTRACT_ADDRESS, DEMO_ABI, API_BASE } from "../lib/airdrop";
import { fireConfettiBurst } from "../lib/confetti";
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain } from "wagmi";
import { writeContract, readContract, sendTransaction } from "wagmi/actions";
import { wagmiConfig } from "../lib/wagmi";
import { Hero } from "./components/Hero";
import { InvitesPanel } from "./components/InvitesPanel";
import { ProviderModal } from "./components/ProviderModal";
import { PersonaSelector, UserIntent } from "./components/PersonaSelector";
import { SimplifiedClaimPanel } from "./components/SimplifiedClaimPanel";
import { EnhancedMarketPanel } from "./components/EnhancedMarketPanel";
import { WalletStatus } from "./components/WalletStatus";
import { formatToken, shorten } from "../lib/format";
import { addressSchema } from "../lib/validators";
import { useAirdropData } from "../hooks/useAirdropData";
import { useMarketData } from "../hooks/useMarketData";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const parseSlippageBps = (value: string): bigint | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,3})(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  if (whole > 100) return null;
  const frac = match[2] ?? "";
  const padded = (frac + "00").slice(0, 2);
  const bps = BigInt(whole * 100 + Number(padded));
  if (bps > 10000n) return null;
  return bps;
};

export default function HomePage() {
  const { address: account, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();

  // Use extracted hooks
  const airdrop = useAirdropData(account);
  const market = useMarketData(account);

  // Local UI state only
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [invitee, setInvitee] = useState("");
  const [inviting, setInviting] = useState(false);
  const [revokingSlot, setRevokingSlot] = useState<number | null>(null);
  const [recipient, setRecipient] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [slippage, setSlippage] = useState("1.0");
  const [trading, setTrading] = useState(false);
  const [userIntent, setUserIntent] = useState<UserIntent | null>(null);
  const [inviteFromUrl, setInviteFromUrl] = useState<string | null>(null);

  // Derived state
  const invitesRequired = airdrop.claimCount !== null ? airdrop.claimCount >= airdrop.freeClaims : false;
  const invitesOpen = airdrop.claimCount !== null ? airdrop.claimCount >= airdrop.freeClaims : false;
  const slippageBps = useMemo(() => parseSlippageBps(slippage), [slippage]);
  const freeClaimsRemaining = useMemo(() => {
    if (airdrop.claimCount === null) return null;
    const remaining = airdrop.freeClaims - airdrop.claimCount;
    return remaining > 0 ? remaining : 0;
  }, [airdrop.claimCount, airdrop.freeClaims]);

  const normalizedSlots = useMemo(() => {
    const base = airdrop.invitationSlots.slice(0, airdrop.maxInvites);
    const missing = Math.max(0, airdrop.maxInvites - base.length);
    return [...base, ...Array.from({ length: missing }, () => ({ invitee: null, used: false }))];
  }, [airdrop.invitationSlots, airdrop.maxInvites]);

  const hasEmptySlot = normalizedSlots.some((s) => !s.invitee);
  const poolFunded = market.reserveEth > 0n;
  const poolHasDemo = market.reserveDemo > 0n;

  const priceEthPerDemo = useMemo(() => {
    if (!poolFunded || !poolHasDemo) return "—";
    const eth = Number(formatEther(market.reserveEth));
    const demo = Number(formatEther(market.reserveDemo));
    if (demo === 0) return "—";
    return (eth / demo).toFixed(6);
  }, [poolFunded, poolHasDemo, market.reserveEth, market.reserveDemo]);

  const priceDemoPerEth = useMemo(() => {
    if (!poolFunded || !poolHasDemo) return "—";
    const eth = Number(formatEther(market.reserveEth));
    if (eth === 0) return "—";
    const demo = Number(formatEther(market.reserveDemo));
    return (demo / eth).toFixed(2);
  }, [poolFunded, poolHasDemo, market.reserveEth, market.reserveDemo]);

  // Initialize on account change
  useEffect(() => {
    if (!account) {
      setRecipient("");
      return;
    }
    setRecipient(account);
    const init = async () => {
      if (chain?.id && chain.id !== CHAIN_ID && switchChain) {
        try {
          await switchChain({ chainId: CHAIN_ID });
        } catch {
          return;
        }
      }
      await airdrop.refreshOnChain(account);
      await airdrop.refreshProof(account);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, chain, switchChain]);

  // Parse URL params for invite links
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get("invite");
      if (inviteParam && isAddress(inviteParam)) {
        const normalized = getAddress(inviteParam);
        setInviteFromUrl(normalized);
        toast.info(`You've been invited by ${shorten(normalized)}!`);
        setUserIntent("claim");
      }
    } catch {}
  }, []);

  // Persist slippage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("demo-slippage");
      if (stored) setSlippage(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("demo-slippage", slippage);
    } catch {}
  }, [slippage]);

  const connectWallet = async (connectorId?: string) => {
    const connector = connectors.find((c) => c.id === connectorId) ?? connectors.find((c) => c.ready) ?? connectors[0];
    if (!connector) {
      toast.error("No wallet connector available.");
      return;
    }
    try {
      const toastId = toast.loading("Connecting wallet…");
      await connect({ connector, chainId: CHAIN_ID });
      setShowProviderModal(false);
      toast.success("Wallet connected successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Unable to connect wallet.");
    }
  };

  const disconnectWallet = () => {
    disconnect();
    toast.info("Disconnected. Connect again when ready.");
  };

  const claim = async () => {
    if (!airdrop.proof || !account) return;
    if (invitesRequired && !airdrop.invitedBy) {
      toast.error("An invitation is required to claim now.");
      return;
    }
    
    const recipientAddr = recipient.trim() || account;
    const validation = addressSchema.safeParse(recipientAddr);
    if (!validation.success) {
      toast.error("Enter a valid recipient address.");
      return;
    }
    if (recipientAddr === ZeroAddress) {
      toast.error("Cannot send to zero address.");
      return;
    }
    
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch {
        toast.error("Switch to Sepolia to claim.");
        return;
      }
    }
    
    try {
      setClaiming(true);
      const toastId = toast.loading("Submitting claim transaction…");
      
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "claimTo",
        args: [recipientAddr as `0x${string}`, airdrop.proof.proof.map((p) => p.hash) as `0x${string}`[], airdrop.proof.proof_flags],
        account: account as `0x${string}`,
      });
      
      toast.loading(`Tx sent: ${hash.slice(0, 10)}… waiting for confirmation.`, { id: toastId });
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      
      toast.success("🎉 Claim confirmed! DEMO minted.", { id: toastId });
      airdrop.setHasClaimed(true);
      fireConfettiBurst();
      await airdrop.refreshOnChain(account);
      await market.refreshReserves(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Claim failed.");
    } finally {
      setClaiming(false);
    }
  };

  const createInvite = async () => {
    if (!account) return;
    if (!isAddress(invitee)) {
      toast.error("Enter a valid Ethereum address to invite.");
      return;
    }
    if (!invitesOpen) {
      toast.error(`Invitations unlock after the first ${airdrop.freeClaims} claims.`);
      return;
    }
    if (!hasEmptySlot) {
      toast.error("No free invitation slots left.");
      return;
    }
    
    const target = getAddress(invitee);
    try {
      const [alreadyClaimed, existingInviter] = await Promise.all([
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "hasClaimed",
          args: [target as `0x${string}`],
        }),
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "invitedBy",
          args: [target as `0x${string}`],
        }),
      ]);
      if (alreadyClaimed) {
        toast.error("That address has already claimed.");
        return;
      }
      if (existingInviter !== ZeroAddress) {
        toast.error("That address is already invited.");
        return;
      }
    } catch {
      toast.error("Unable to validate invitee.");
      return;
    }
    
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch {
        toast.error("Switch to Sepolia to create invites.");
        return;
      }
    }
    
    try {
      setInviting(true);
      const toastId = toast.loading("Creating invitation…");
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "createInvitation",
        args: [target as `0x${string}`],
        account: account as `0x${string}`,
      });
      toast.loading(`Tx sent: ${hash.slice(0, 10)}…`, { id: toastId });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      toast.success("Invitation created.", { id: toastId });
      setInvitee("");
      await airdrop.refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create invitation.");
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (slotIndex: number) => {
    if (!account) return;
    const slot = airdrop.invitationSlots[slotIndex];
    if (!slot?.invitee) {
      toast.error("Slot is empty; nothing to revoke.");
      return;
    }
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch {
        toast.error("Switch to Sepolia to revoke.");
        return;
      }
    }
    try {
      setRevokingSlot(slotIndex);
      const toastId = toast.loading("Revoking invitation…");
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "revokeInvitation",
        args: [slotIndex],
        account: account as `0x${string}`,
      });
      toast.loading(`Tx sent: ${hash.slice(0, 10)}…`, { id: toastId });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      toast.success("Invitation revoked.", { id: toastId });
      await airdrop.refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to revoke invitation.");
    } finally {
      setRevokingSlot(null);
    }
  };

  // Trade handlers
  const handleBuyExactDemo = async (demoAmount: bigint, maxEthIn: bigint) => {
    if (!account) return;
    if (chain?.id !== CHAIN_ID && switchChain) {
      try { await switchChain({ chainId: CHAIN_ID }); } catch { toast.error(`Switch to ${CHAIN_NAME}`); return; }
    }
    try {
      setTrading(true);
      const toastId = toast.loading("Buying DEMO…");
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "buyDemo",
        args: [demoAmount],
        account: account as `0x${string}`,
        value: maxEthIn,
        chainId: CHAIN_ID,
      });
      toast.loading(`Tx sent: ${hash.slice(0, 10)}…`, { id: toastId });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Swap confirmed. DEMO purchased.", { id: toastId });
      await market.refreshReserves(account);
      await airdrop.refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Buy failed.");
    } finally {
      setTrading(false);
    }
  };

  const handleSellExactDemo = async (demoAmount: bigint, minEthOut: bigint) => {
    if (!account) return;
    if (chain?.id !== CHAIN_ID && switchChain) {
      try { await switchChain({ chainId: CHAIN_ID }); } catch { toast.error(`Switch to ${CHAIN_NAME}`); return; }
    }
    try {
      setTrading(true);
      const toastId = toast.loading("Selling DEMO…");
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "sellDemo",
        args: [demoAmount, minEthOut],
        account: account as `0x${string}`,
        chainId: CHAIN_ID,
      });
      toast.loading(`Tx sent: ${hash.slice(0, 10)}…`, { id: toastId });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Swap confirmed. ETH received.", { id: toastId });
      await market.refreshReserves(account);
      await airdrop.refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Sell failed.");
    } finally {
      setTrading(false);
    }
  };

  const handleSpendExactEth = async (ethAmount: bigint, minDemoOut: bigint) => {
    if (!account) return;
    if (chain?.id !== CHAIN_ID && switchChain) {
      try { await switchChain({ chainId: CHAIN_ID }); } catch { toast.error(`Switch to ${CHAIN_NAME}`); return; }
    }
    try {
      setTrading(true);
      const toastId = toast.loading("Spending ETH…");
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "buyDemo",
        args: [minDemoOut],
        account: account as `0x${string}`,
        value: ethAmount,
        chainId: CHAIN_ID,
      });
      toast.loading(`Tx sent: ${hash.slice(0, 10)}…`, { id: toastId });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Swap confirmed. DEMO purchased.", { id: toastId });
      await market.refreshReserves(account);
      await airdrop.refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Buy failed.");
    } finally {
      setTrading(false);
    }
  };

  const handleReceiveExactEth = async (demoAmount: bigint, exactEthOut: bigint) => {
    if (!account) return;
    if (chain?.id !== CHAIN_ID && switchChain) {
      try { await switchChain({ chainId: CHAIN_ID }); } catch { toast.error(`Switch to ${CHAIN_NAME}`); return; }
    }
    try {
      setTrading(true);
      const toastId = toast.loading("Selling DEMO for ETH…");
      const minOut = exactEthOut - (exactEthOut * (slippageBps || 100n)) / 10000n;
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "sellDemo",
        args: [demoAmount, minOut > 0n ? minOut : 1n],
        account: account as `0x${string}`,
        chainId: CHAIN_ID,
      });
      toast.loading(`Tx sent: ${hash.slice(0, 10)}…`, { id: toastId });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Swap confirmed. ETH received.", { id: toastId });
      await market.refreshReserves(account);
      await airdrop.refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Sell failed.");
    } finally {
      setTrading(false);
    }
  };

  const copyToClipboard = async (value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1200);
    } catch {}
  };

  const copyInviteLink = async () => {
    if (!account) return;
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const inviteUrl = `${baseUrl}?invite=${account}`;
      await navigator.clipboard?.writeText(inviteUrl);
      toast.success("Invite link copied!");
      setCopiedKey("invite-link");
      setTimeout(() => setCopiedKey((prev) => (prev === "invite-link" ? null : prev)), 1200);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const heroStats = {
    claimCountText: airdrop.claimCount !== null ? `${airdrop.claimCount} claimed` : "Checking…",
    freeClaimsText: freeClaimsRemaining !== null
      ? `${freeClaimsRemaining} free claims left before invites lock in.`
      : "Fetch your proof to see your lane.",
    invitesText: `${airdrop.invitesCreated} / ${airdrop.maxInvites} slots used`,
    invitesHint: invitesOpen ? "Invite phase is live; reserve slots before they're gone." : "Invite phase opens after free-claim window fills.",
    marketText: poolFunded && poolHasDemo ? `${priceEthPerDemo} ETH / DEMO` : "Waiting for liquidity",
    reserveText: `Reserves: ${formatToken(market.reserveEth)} ETH · ${formatToken(market.reserveDemo)} DEMO`,
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-500 blur-[120px] opacity-20" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-emerald-500 blur-[120px] opacity-20" />

      {/* Wallet Status Bar */}
      {account && (
        <WalletStatus
          account={account}
          ethBalance={market.ethBalance}
          demoBalance={market.demoBalance}
          chainName={CHAIN_NAME}
          onDisconnect={disconnectWallet}
          onSwitchWallet={() => setShowProviderModal(true)}
        />
      )}

      <Hero
        chainName={CHAIN_NAME}
        contractAddress={CONTRACT_ADDRESS}
        apiBase={API_BASE}
        onPrimary={() => setUserIntent(null)}
        stats={heroStats}
      />

      {/* Persona Selector */}
      {!userIntent && (
        <PersonaSelector
          onSelectIntent={setUserIntent}
          currentIntent={userIntent || 'claim'}
          hasClaimed={airdrop.hasClaimed}
          isEligible={airdrop.proof !== null}
          hasChecked={airdrop.hasCheckedEligibility}
        />
      )}

      {/* Simplified Claim Flow */}
      {userIntent === 'claim' && (
        <SimplifiedClaimPanel
          account={account}
          isEligible={airdrop.proof !== null}
          hasChecked={airdrop.hasCheckedEligibility}
          hasClaimed={airdrop.hasClaimed}
          checking={airdrop.checkingProof}
          claiming={claiming}
          proof={airdrop.proof}
          invitedBy={airdrop.invitedBy}
          inviteFromUrl={inviteFromUrl}
          invitesRequired={invitesRequired}
          poolFunded={poolFunded}
          onCheckEligibility={() => airdrop.refreshProof()}
          onClaim={claim}
          onSwitchToInvite={() => setUserIntent('invite')}
          onSwitchToTrade={() => setUserIntent('trade')}
          setShowProviderModal={setShowProviderModal}
        />
      )}

      {/* Invite Friends */}
      {userIntent === 'invite' && (
        <InvitesPanel
          account={account}
          hasClaimed={airdrop.hasClaimed}
          invitesOpen={invitesOpen}
          invitedBy={airdrop.invitedBy}
          maxInvites={airdrop.maxInvites}
          invitesCreated={airdrop.invitesCreated}
          normalizedSlots={normalizedSlots}
          invitee={invitee}
          setInvitee={setInvitee}
          createInvite={createInvite}
          refreshOnChain={airdrop.refreshOnChain}
          setShowProviderModal={setShowProviderModal}
          copyToClipboard={copyToClipboard}
          copyInviteLink={copyInviteLink}
          copiedKey={copiedKey}
          revokingSlot={revokingSlot}
          revokeInvite={revokeInvite}
          inviting={inviting}
          hasEmptySlot={hasEmptySlot}
        />
      )}

      {/* Trade Tokens */}
      {userIntent === 'trade' && (
        <EnhancedMarketPanel
          account={account}
          contractAddress={CONTRACT_ADDRESS}
          reserveEth={market.reserveEth}
          reserveDemo={market.reserveDemo}
          priceEthPerDemo={priceEthPerDemo}
          priceDemoPerEth={priceDemoPerEth}
          poolFunded={poolFunded}
          poolHasDemo={poolHasDemo}
          slippage={slippage}
          setSlippage={setSlippage}
          slippageBps={slippageBps}
          handleBuyDemo={handleBuyExactDemo}
          handleSellDemo={handleSellExactDemo}
          handleSpendEth={handleSpendExactEth}
          handleReceiveEth={handleReceiveExactEth}
          demoBalance={market.demoBalance}
          trading={trading}
          setShowProviderModal={setShowProviderModal}
        />
      )}

      {/* Back button */}
      {userIntent && (
        <div className="mx-auto max-w-3xl px-4 py-6">
          <button
            onClick={() => setUserIntent(null)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
          >
            ← Back to Main Menu
          </button>
        </div>
      )}

      <ProviderModal
        open={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        connectors={connectors}
        selectedId={selectedConnectorId ?? connectors[0]?.id ?? null}
        onSelect={(id) => setSelectedConnectorId(id)}
        onConnect={() => connectWallet(selectedConnectorId ?? connectors[0]?.id)}
      />
    </div>
  );
}
