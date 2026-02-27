'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAddress, getAddress } from "ethers";
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
import { logger } from "../lib/logger";
import { clearProofCache, copyToClipboardFallback } from "../lib/utils";

import { MAX_SLIPPAGE_BPS, DECIMAL_PLACES, ZERO_ADDRESS, DEFAULT_SLIPPAGE, COPY_FEEDBACK_DURATION, parseSlippageBps } from "../lib/constants";

const ensureCorrectChain = async (
  chainId: number | undefined,
  switchChainFn: ((args: { chainId: number }) => void) | undefined,
  chainName: string
): Promise<boolean> => {
  if (chainId === CHAIN_ID) return true;
  if (!switchChainFn) {
    toast.error(`Switch to ${chainName} to continue.`);
    return false;
  }
  try {
    await switchChainFn({ chainId: CHAIN_ID });
    return true;
  } catch (err) {
    logger.error("Failed to switch chain:", err);
    toast.error(`Switch to ${chainName} to continue.`);
    return false;
  }
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
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [trading, setTrading] = useState(false);
  const [userIntent, setUserIntent] = useState<UserIntent>('claim');
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived state
  const invitesRequired = airdrop.claimCount !== null ? airdrop.claimCount >= airdrop.freeClaims : false;
  const slippageBps = useMemo(() => parseSlippageBps(slippage), [slippage]);
  const freeClaimsRemaining = useMemo(() => {
    if (airdrop.claimCount === null) return null;
    const remaining = airdrop.freeClaims - airdrop.claimCount;
    return remaining > 0 ? remaining : 0;
  }, [airdrop.claimCount, airdrop.freeClaims]);

  const normalizedSlots = useMemo(() => {
    if (!airdrop.invitationSlots || airdrop.invitationSlots.length === 0) {
      return Array.from({ length: airdrop.maxInvites }, () => ({ invitee: null, used: false }));
    }
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
    const isMountedRef = { current: true };
    const init = async () => {
      if (chain?.id && chain.id !== CHAIN_ID && switchChain) {
        try {
          await switchChain({ chainId: CHAIN_ID });
        } catch (err) {
          logger.error("Failed to switch chain:", err);
          return;
        }
      }
      if (!isMountedRef.current) return;
      await airdrop.refreshOnChain(account);
      if (!isMountedRef.current) return;
      await airdrop.refreshProof(account);
    };
    init();
    return () => {
      isMountedRef.current = false;
    };
  }, [account, chain?.id, switchChain, airdrop]);

  // Persist slippage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("demo-slippage");
      if (stored) setSlippage(stored);
    } catch (err) {
      logger.warn("Failed to read slippage from localStorage:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("demo-slippage", slippage);
    } catch (err) {
      logger.warn("Failed to write slippage to localStorage:", err);
    }
  }, [slippage]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const connectWallet = async (connectorId?: string) => {
    const connector = connectors.find((c) => c.id === connectorId) ?? connectors.find((c) => c.ready) ?? connectors[0];
    if (!connector) {
      toast.error("No wallet connector available.");
      return;
    }
    const toastId = toast.loading("Connecting wallet…");
    try {
      await connect({ connector, chainId: CHAIN_ID });
      setShowProviderModal(false);
      toast.success("Wallet connected successfully!", { id: toastId });
    } catch (err) {
      logger.error("Wallet connection error:", err);
      const message = err instanceof Error ? err.message : "Unable to connect wallet.";
      toast.error(message, { id: toastId });
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
    if (recipientAddr === ZERO_ADDRESS) {
      toast.error("Cannot send to zero address.");
      return;
    }
    
    if (!(await ensureCorrectChain(chain?.id, switchChain, CHAIN_NAME))) return;
    
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
      clearProofCache(account);
      airdrop.setHasClaimed(true);
      setClaimError(null);
      fireConfettiBurst();
    } catch (err) {
      logger.error("Claim error:", err);
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
    if (!invitesRequired) {
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
      if (existingInviter !== ZERO_ADDRESS) {
        toast.error("That address is already invited.");
        return;
      }
    } catch {
      toast.error("Unable to validate invitee.");
      return;
    }
    
    if (!(await ensureCorrectChain(chain?.id, switchChain, CHAIN_NAME))) return;

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
      toast.loading(`Tx sent: ${hash?.slice(0, 10) ?? 'pending'}…`, { id: toastId });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      toast.success("Invitation created.", { id: toastId });
      setInvitee("");
      await airdrop.refreshOnChain(account);
    } catch (err) {
      logger.error("Invitation error:", err);
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
    if (slotIndex < 0 || slotIndex >= airdrop.invitationSlots.length) {
      toast.error("Invalid slot index.");
      return;
    }
    const slot = airdrop.invitationSlots[slotIndex];
    if (!slot?.invitee) {
      toast.error("Slot is empty; nothing to revoke.");
      return;
    }
    if (!(await ensureCorrectChain(chain?.id, switchChain, CHAIN_NAME))) return;
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
      toast.loading(`Tx sent: ${hash?.slice(0, 10) ?? 'pending'}…`, { id: toastId });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      toast.success("Invitation revoked.", { id: toastId });
      await airdrop.refreshOnChain(account);
    } catch (err) {
      logger.error("Revoke error:", err);
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
    if (!(await ensureCorrectChain(chain?.id, switchChain, CHAIN_NAME))) return;
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
      });
      toast.loading(`Tx sent: ${hash?.slice(0, 10) ?? 'pending'}…`, { id: toastId });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Swap confirmed. DEMO purchased.", { id: toastId });
      await market.refreshReserves(account);
      await airdrop.refreshOnChain(account);
    } catch (err) {
      logger.error("Buy error:", err);
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
    if (!(await ensureCorrectChain(chain?.id, switchChain, CHAIN_NAME))) return;
    try {
      setTrading(true);
      const toastId = toast.loading("Selling DEMO…");
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "sellDemo",
        args: [demoAmount, minEthOut],
        account: account as `0x${string}`,
      });
      toast.loading(`Tx sent: ${hash?.slice(0, 10) ?? 'pending'}…`, { id: toastId });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Swap confirmed. ETH received.", { id: toastId });
      await market.refreshReserves(account);
      await airdrop.refreshOnChain(account);
    } catch (err) {
      logger.error("Sell error:", err);
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
    if (!(await ensureCorrectChain(chain?.id, switchChain, CHAIN_NAME))) return;
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
      });
      toast.loading(`Tx sent: ${hash?.slice(0, 10) ?? 'pending'}…`, { id: toastId });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Swap confirmed. DEMO received.", { id: toastId });
      await market.refreshReserves(account);
      await airdrop.refreshOnChain(account);
    } catch (err) {
      logger.error("Buy error:", err);
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

  const copyToClipboard = async (value: string, key: string) => {
    if (!value) return;
    try {
      await copyToClipboardFallback(value);
      setCopiedKey(key);
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), COPY_FEEDBACK_DURATION);
    } catch (err) {
      logger.warn("Failed to copy to clipboard:", err);
    }
  };

  const copyInviteLink = async () => {
    if (!account) return;
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const inviteUrl = `${baseUrl}?invite=${account}`;
      await copyToClipboardFallback(inviteUrl);
      toast.success("Invite link copied!");
      setCopiedKey("invite-link");
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = setTimeout(() => setCopiedKey((prev) => (prev === "invite-link" ? null : prev)), COPY_FEEDBACK_DURATION);
    } catch (err) {
      logger.warn("Failed to copy invite link:", err);
      toast.error("Failed to copy link");
    }
  };

  const heroStats = {
    claimCountText: airdrop.claimCount !== null ? `${airdrop.claimCount} claimed` : "Checking…",
    freeClaimsText: freeClaimsRemaining !== null
      ? `${freeClaimsRemaining} open claims left before invites lock in.`
      : "Fetch your proof to see your lane.",
    invitesText: `${airdrop.invitesCreated} / ${airdrop.maxInvites} slots used`,
    invitesHint: invitesRequired ? "Invite phase is live; reserve slots before they're gone." : "Invite phase opens after open-claim window fills.",
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
          invitesOpen={invitesRequired}
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
