'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { ZeroAddress, getAddress, isAddress } from "ethers";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import { CHAIN_ID, CHAIN_NAME, CONTRACT_ADDRESS, DEMO_ABI, API_BASE } from "../lib/airdrop";
import { fireConfettiBurst } from "../lib/confetti";
import { parseWeb3Error, getExplorerUrl } from "../lib/errors";
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain } from "wagmi";
import { writeContract, readContract, sendTransaction } from "wagmi/actions";
import { wagmiConfig } from "../lib/wagmi";
import { MinimalHero } from "./components/MinimalHero";
import { MinimalInvitesPanel } from "./components/MinimalInvitesPanel";
import { ProviderModal } from "./components/ProviderModal";
import { MinimalPersonaSelector, UserIntent } from "./components/MinimalPersonaSelector";
import { MinimalClaimPanel } from "./components/MinimalClaimPanel";
import { MinimalMarketPanel } from "./components/MinimalMarketPanel";
import { MinimalWalletPanel } from "./components/MinimalWalletPanel";
import { MinimalInfoPanel } from "./components/MinimalInfoPanel";
import { formatToken, shorten } from "../lib/format";
import { addressSchema } from "../lib/validators";
import { useAirdropData } from "../hooks/useAirdropData";
import { useMarketData } from "../hooks/useMarketData";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const MAX_SLIPPAGE_PERCENT = 100;
const SLIPPAGE_BPS_MULTIPLIER = 100;
const MAX_SLIPPAGE_BPS = 10000n;
const DECIMAL_PLACES = 2;

const parseSlippageBps = (value: string): bigint | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,3})(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  if (whole > MAX_SLIPPAGE_PERCENT) return null;
  const frac = match[2] ?? "";
  const padded = (frac + "00").slice(0, DECIMAL_PLACES);
  const bps = BigInt(whole * SLIPPAGE_BPS_MULTIPLIER + Number(padded));
  if (bps > MAX_SLIPPAGE_BPS) return null;
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
  const [claimError, setClaimError] = useState<string | null>(null);
  const [invitee, setInvitee] = useState("");
  const [inviting, setInviting] = useState(false);
  const [revokingSlot, setRevokingSlot] = useState<number | null>(null);
  const [recipient, setRecipient] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [slippage, setSlippage] = useState("1.0");
  const [trading, setTrading] = useState(false);
  const [userIntent, setUserIntent] = useState<UserIntent>('claim');

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
    const price = eth / demo;
    // Format with appropriate precision
    if (price < 0.0001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(4);
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
        } catch (err) {
          console.error("Failed to switch chain:", err);
          return;
        }
      }
      await airdrop.refreshOnChain(account);
      await airdrop.refreshProof(account);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, chain, switchChain]);

  // Persist slippage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("demo-slippage");
      if (stored) setSlippage(stored);
    } catch (err) {
      console.warn("Failed to read slippage from localStorage:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("demo-slippage", slippage);
    } catch (err) {
      console.warn("Failed to write slippage to localStorage:", err);
    }
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
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unable to connect wallet.";
      toast.error(message);
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
    
    setClaimError(null);
    
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
      const toastId = toast.loading("Step 1/2: Submitting claim transaction…");
      
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "claimTo",
        args: [recipientAddr as `0x${string}`, airdrop.proof.proof.map((p) => p.hash) as `0x${string}`[], airdrop.proof.proof_flags],
        account: account as `0x${string}`,
      });
      
      toast.loading(
        <div className="flex flex-col gap-1">
          <span>Step 2/2: Waiting for confirmation…</span>
          <a 
            href={getExplorerUrl(hash, CHAIN_ID)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:underline"
          >
            View on Explorer →
          </a>
        </div>, 
        { id: toastId }
      );
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      
      toast.success("🎉 Claim confirmed! DEMO minted.", { id: toastId });
      airdrop.setHasClaimed(true);
      setClaimError(null);
      fireConfettiBurst();
      await airdrop.refreshOnChain(account);
      await market.refreshReserves(account);
    } catch (err) {
      console.error(err);
      const friendlyError = parseWeb3Error(err);
      setClaimError(friendlyError);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Claim failed</span>
          <span className="text-sm">{friendlyError}</span>
        </div>
      );
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
      } catch (err) {
        console.error("Failed to switch chain:", err);
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
    } catch (err) {
      console.error(err);
      const friendlyError = parseWeb3Error(err);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Invitation failed</span>
          <span className="text-sm">{friendlyError}</span>
        </div>
      );
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
    } catch (err) {
      console.error(err);
      const friendlyError = parseWeb3Error(err);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Revoke failed</span>
          <span className="text-sm">{friendlyError}</span>
        </div>
      );
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
    } catch (err) {
      console.error(err);
      const friendlyError = parseWeb3Error(err);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Buy failed</span>
          <span className="text-sm">{friendlyError}</span>
        </div>
      );
    } finally {
      setTrading(false);
    }
  };

  const handleSellExactDemo = async (demoAmount: bigint, minEthOut: bigint) => {
    if (!account) return;
    if (chain?.id !== CHAIN_ID && switchChain) {
      try { await switchChain({ chainId: CHAIN_ID }); } catch (err) { console.error(err); toast.error(`Switch to ${CHAIN_NAME}`); return; }
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
    } catch (err) {
      console.error(err);
      const friendlyError = parseWeb3Error(err);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Sell failed</span>
          <span className="text-sm">{friendlyError}</span>
        </div>
      );
    } finally {
      setTrading(false);
    }
  };

  const handleSpendExactEth = async (ethAmount: bigint, minDemoOut: bigint) => {
    if (!account) return;
    if (chain?.id !== CHAIN_ID && switchChain) {
      try { await switchChain({ chainId: CHAIN_ID }); } catch (err) { console.error(err); toast.error(`Switch to ${CHAIN_NAME}`); return; }
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
    } catch (err) {
      console.error(err);
      const friendlyError = parseWeb3Error(err);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Buy failed</span>
          <span className="text-sm">{friendlyError}</span>
        </div>
      );
    } finally {
      setTrading(false);
    }
  };

  const handleReceiveExactEth = async (demoAmount: bigint, exactEthOut: bigint) => {
    if (!account) return;
    if (chain?.id !== CHAIN_ID && switchChain) {
      try { await switchChain({ chainId: CHAIN_ID }); } catch (err) { console.error(err); toast.error(`Switch to ${CHAIN_NAME}`); return; }
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
    } catch (err) {
      console.error(err);
      const friendlyError = parseWeb3Error(err);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Sell failed</span>
          <span className="text-sm">{friendlyError}</span>
        </div>
      );
    } finally {
      setTrading(false);
    }
  };

  const copyToClipboard = async (value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 3000);
    } catch (err) {
      console.warn("Failed to copy to clipboard:", err);
    }
  };

  const copyInviteLink = async () => {
    if (!account) return;
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const inviteUrl = `${baseUrl}?invite=${account}`;
      await navigator.clipboard?.writeText(inviteUrl);
      toast.success("Invite link copied!");
      setCopiedKey("invite-link");
      setTimeout(() => setCopiedKey((prev) => (prev === "invite-link" ? null : prev)), 3000);
    } catch (err) {
      console.warn("Failed to copy invite link:", err);
      toast.error("Failed to copy link");
    }
  };

  const heroStats = {
    claimCountText: airdrop.claimCount !== null ? `${airdrop.claimCount} claimed` : "Checking…",
    freeClaimsText: freeClaimsRemaining !== null
      ? `${freeClaimsRemaining} open claims left before invites lock in.`
      : "Fetch your proof to see your lane.",
    invitesText: `${airdrop.invitesCreated} / ${airdrop.maxInvites} slots used`,
    invitesHint: invitesOpen ? "Invite phase is live; reserve slots before they're gone." : "Invite phase opens after open-claim window fills.",
    marketText: poolFunded && poolHasDemo ? `${priceEthPerDemo} ETH / DEMO` : "Waiting for liquidity",
    reserveText: `Reserves: ${formatToken(market.reserveEth)} ETH · ${formatToken(market.reserveDemo)} DEMO`,
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      <MinimalHero
      />

      {/* Persona Selector - Always visible for navigation */}
      <MinimalPersonaSelector
        onSelectIntent={setUserIntent}
        currentIntent={userIntent}
      />

      {/* Claim Flow */}
      {userIntent === 'claim' && (
        <MinimalClaimPanel
          account={account}
          isEligible={airdrop.proof !== null}
          hasChecked={airdrop.hasCheckedEligibility}
          hasClaimed={airdrop.hasClaimed}
          checking={airdrop.checkingProof}
          claiming={claiming}
          claimError={claimError}
          proof={airdrop.proof}
          invitedBy={airdrop.invitedBy}
          invitesRequired={invitesRequired}
          poolFunded={poolFunded}
          onCheckEligibility={() => airdrop.refreshProof()}
          onClaim={claim}
          onRetryClaim={() => {
            setClaimError(null);
            claim();
          }}
          setShowProviderModal={setShowProviderModal}
        />
      )}

      {/* Invite Friends */}
      {userIntent === 'invite' && (
        <MinimalInvitesPanel
          account={account}
          hasClaimed={airdrop.hasClaimed}
          invitesOpen={invitesOpen}
          maxInvites={airdrop.maxInvites}
          invitesCreated={airdrop.invitesCreated}
          normalizedSlots={normalizedSlots}
          invitee={invitee}
          setInvitee={setInvitee}
          createInvite={createInvite}
          inviting={inviting}
          hasEmptySlot={hasEmptySlot}
          setShowProviderModal={setShowProviderModal}
          revokeInvite={revokeInvite}
          revokingSlot={revokingSlot}
        />
      )}

      {/* Trade Tokens */}
      {userIntent === 'trade' && (
        <MinimalMarketPanel
          account={account}
          reserveEth={market.reserveEth}
          reserveDemo={market.reserveDemo}
          priceEthPerDemo={priceEthPerDemo}
          poolFunded={poolFunded}
          poolHasDemo={poolHasDemo}
          slippage={slippage}
          setSlippage={setSlippage}
          slippageBps={slippageBps}
          handleBuyDemo={handleBuyExactDemo}
          handleSellDemo={handleSellExactDemo}
          handleSpendEth={handleSpendExactEth}
          demoBalance={market.demoBalance}
          trading={trading}
          setShowProviderModal={setShowProviderModal}
        />
      )}

      {/* Wallet Info */}
      {userIntent === 'wallet' && (
        <MinimalWalletPanel
          account={account}
          ethBalance={market.ethBalance}
          demoBalance={market.demoBalance}
          chainName={CHAIN_NAME}
          onDisconnect={disconnectWallet}
          onSwitchWallet={() => setShowProviderModal(true)}
          setShowProviderModal={setShowProviderModal}
        />
      )}

      {/* Project Info */}
      {userIntent === 'info' && (
        <MinimalInfoPanel
          totalClaims={airdrop.claimCount}
          freeClaims={airdrop.freeClaims}
          maxInvites={airdrop.maxInvites}
        />
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
