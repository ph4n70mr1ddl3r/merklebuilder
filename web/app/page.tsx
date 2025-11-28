'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ZeroAddress, getAddress, isAddress } from "ethers";
import { formatEther, parseEther } from "viem";
import {
  API_BASE,
  CHAIN_ID,
  CHAIN_NAME,
  CONTRACT_ADDRESS,
  DEMO_ABI,
  ProofResponse,
} from "../lib/airdrop";
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain } from "wagmi";
import { writeContract, readContract, sendTransaction } from "wagmi/actions";
import { sepolia } from "wagmi/chains";
import { wagmiConfig } from "../lib/wagmi";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type Tone = "info" | "good" | "bad";

const shorten = (addr?: string | null) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

const formatToken = (value: bigint, digits = 4) => {
  const num = Number(formatEther(value));
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
};

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
  const { connectors, connect, status: connectStatus, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<{ tone: Tone; message: string }>({
    tone: "info",
    message: "Connect your wallet to begin.",
  });
  const [networkLabel, setNetworkLabel] = useState("Not connected");

  const [claimCount, setClaimCount] = useState<number | null>(null);
  const [freeClaims, setFreeClaims] = useState<number>(2);
  const [maxInvites, setMaxInvites] = useState<number>(5);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [invitesCreated, setInvitesCreated] = useState<number>(0);
  const [invitationSlots, setInvitationSlots] = useState<
    { invitee: string | null; used: boolean }[]
  >([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [checkingProof, setCheckingProof] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [invitee, setInvitee] = useState("");
  const [inviting, setInviting] = useState(false);
  const [revokingSlot, setRevokingSlot] = useState<number | null>(null);
  const [recipient, setRecipient] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [reserveEth, setReserveEth] = useState<bigint>(0n);
  const [reserveDemo, setReserveDemo] = useState<bigint>(0n);
  const [demoBalance, setDemoBalance] = useState<bigint>(0n);
  const [buyEthAmount, setBuyEthAmount] = useState("");
  const [sellDemoAmount, setSellDemoAmount] = useState("");
  const [slippage, setSlippage] = useState("1.0");
  const [activeTab, setActiveTab] = useState<"airdrop" | "invites" | "market">("airdrop");
  const [trading, setTrading] = useState(false);
  const [donateAmount, setDonateAmount] = useState("");
  const [donating, setDonating] = useState(false);

  const invitesRequired =
    claimCount !== null ? claimCount >= freeClaims : false;
  const invitesOpen = claimCount !== null ? claimCount >= freeClaims : false;
  const slippageBps = useMemo(() => parseSlippageBps(slippage), [slippage]);
  const freeClaimsRemaining = useMemo(() => {
    if (claimCount === null) return null;
    const remaining = freeClaims - claimCount;
    return remaining > 0 ? remaining : 0;
  }, [claimCount, freeClaims]);
  const canClaim =
    !!proof &&
    !hasClaimed &&
    (!invitesRequired || invitedBy !== null) &&
    !claiming &&
    chain?.id === CHAIN_ID;

  const statusToneClasses = useMemo(
    () => ({
      info: "border-slate-600/60 bg-slate-800/40 text-slate-200",
      good: "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
      bad: "border-red-500/50 bg-red-500/10 text-red-100",
    }),
    []
  );

  useEffect(() => {
    if (chain?.id === CHAIN_ID) {
      setNetworkLabel(`${CHAIN_NAME} (${chain.id})`);
    } else if (chain?.id) {
      setNetworkLabel(`Wrong network (${chain.id})`);
    } else {
      setNetworkLabel("Not connected");
    }
  }, [chain]);

  useEffect(() => {
    if (!account) {
      resetUi();
      setStatus({ tone: "info", message: "Connect your wallet to begin." });
      return;
    }
    setRecipient(account);
    const run = async () => {
      if (chain?.id && chain.id !== CHAIN_ID && switchChain) {
        try {
          await switchChain({ chainId: CHAIN_ID });
        } catch (err: any) {
          setStatus({
            tone: "bad",
            message: "Wrong network. Please switch to Sepolia.",
          });
          return;
        }
      }
      await refreshOnChain(account);
      await refreshProof(account);
    };
    run();
  }, [account, chain, switchChain]);

  useEffect(() => {
    refreshReserves(account);
  }, [account]);

  const switchTab = (tab: "airdrop" | "invites" | "market") => {
    setActiveTab(tab);
    const anchor = document.getElementById("tab-root");
    anchor?.scrollIntoView({ behavior: "smooth" });
  };

  const resetUi = () => {
    setClaimCount(null);
    setHasClaimed(false);
    setInvitedBy(null);
    setInvitesCreated(0);
    setInvitationSlots([]);
    setProof(null);
    setRecipient("");
    setDemoBalance(0n);
  };

  const connectWallet = async (connectorId?: string) => {
    const connector =
      connectors.find((c) => c.id === connectorId) ??
      connectors.find((c) => c.ready) ??
      connectors[0];
    if (!connector) {
      setStatus({
        tone: "bad",
        message: "No wallet connector available.",
      });
      return;
    }
    try {
      setStatus({ tone: "info", message: "Connecting wallet…" });
      await connect({ connector, chainId: CHAIN_ID });
      setShowProviderModal(false);
    } catch (err: any) {
      console.error(err);
      setStatus({
        tone: "bad",
        message: err?.message || "Unable to connect wallet.",
      });
    }
  };

  const disconnectWallet = () => {
    resetUi();
    disconnect();
    setStatus({
      tone: "info",
      message: "Disconnected. Select a wallet provider and connect again.",
    });
  };

  const refreshReserves = async (addr?: string) => {
    const target = addr ?? account;
    try {
      const [reserves, bal] = await Promise.all([
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "getReserves",
        }),
        target
          ? readContract(wagmiConfig, {
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: DEMO_ABI,
              functionName: "balanceOf",
              args: [target as `0x${string}`],
            })
          : Promise.resolve(0n),
      ]);
      const tuple = reserves as readonly [bigint, bigint];
      setReserveEth(BigInt(tuple[0]));
      setReserveDemo(BigInt(tuple[1]));
      if (typeof bal === "bigint") {
        setDemoBalance(bal);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshOnChain = async (addr?: string) => {
    const target = addr ?? account;
    if (!target) return;
    try {
      const [claimed, inviter, created, count, free, max, slots] = await Promise.all([
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
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "invitesCreated",
          args: [target as `0x${string}`],
        }),
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "claimCount",
        }),
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "FREE_CLAIMS",
        }),
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "MAX_INVITES",
        }),
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEMO_ABI,
          functionName: "getInvitations",
          args: [target as `0x${string}`],
        }),
      ]);
      const invitees =
        (Array.isArray((slots as any)[0]) ? ((slots as any)[0] as string[]) : []) || [];
      const used =
        (Array.isArray((slots as any)[1]) ? ((slots as any)[1] as boolean[]) : []) || [];
      const parsedSlots =
        invitees?.map((inv, idx) => ({
          invitee: inv && inv !== ZeroAddress ? inv : null,
          used: Boolean(used?.[idx]),
        })) ?? [];

      setHasClaimed(Boolean(claimed));
      setInvitedBy((inviter as string) === ZeroAddress ? null : (inviter as string));
      setInvitesCreated(Number(created));
      setClaimCount(Number(count));
      setFreeClaims(Number(free));
      setMaxInvites(Number(max));
      setInvitationSlots(parsedSlots);
      await refreshReserves(target);
    } catch (err: any) {
      console.error(err);
      setStatus({
        tone: "bad",
        message: err?.message || "Failed to read on-chain state.",
      });
    }
  };

  const refreshProof = async (addressOverride?: string) => {
    const target = addressOverride || account;
    if (!target) {
      setStatus({ tone: "info", message: "Connect your wallet to fetch proof." });
      return;
    }
    setCheckingProof(true);
    setProof(null);
    try {
      const res = await fetch(`${API_BASE}/proof/${target}`);
      if (!res.ok) {
        const text = await res.text();
        setStatus({
          tone: "bad",
          message: `Not in airdrop list (${text || res.status}).`,
        });
        setProof(null);
        return;
      }
      const data: ProofResponse = await res.json();
      const normalizedTarget = getAddress(target);
      const proofAddress = getAddress(data.address);
      if (normalizedTarget !== proofAddress) {
        setStatus({
          tone: "bad",
          message: `Proof is for ${shorten(proofAddress)}. Connect that wallet to claim.`,
        });
        setProof(null);
        return;
      }

      setProof(data);

      let claimed = hasClaimed;
      let inviterAddr: string | null = invitedBy;
      try {
        const [claimedOnChain, inviterOnChain] = await Promise.all([
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
        claimed = Boolean(claimedOnChain);
        setHasClaimed(claimed);
        inviterAddr =
          (inviterOnChain as string) === ZeroAddress ? null : (inviterOnChain as string);
        setInvitedBy(inviterAddr);
      } catch (innerErr) {
        console.error(innerErr);
      }

      if (claimed) {
        setStatus({
          tone: "info",
          message: "Proof found. This wallet has already claimed.",
        });
      } else if (invitesRequired && !inviterAddr) {
        setStatus({
          tone: "info",
          message: "You are qualified, but you need an invitation to claim right now.",
        });
      } else {
        setStatus({
          tone: "good",
          message: "Proof found. You can claim now.",
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatus({
        tone: "bad",
        message: err?.message || "Failed to fetch proof.",
      });
    } finally {
      setCheckingProof(false);
    }
  };

  const claim = async () => {
    if (!proof || !account) return;
    if (invitesRequired && !invitedBy) {
      setStatus({ tone: "bad", message: "An invitation is required to claim now." });
      return;
    }
    const recipientAddr = recipient.trim() || account;
    if (!isAddress(recipientAddr) || recipientAddr === ZeroAddress) {
      setStatus({ tone: "bad", message: "Enter a valid recipient address." });
      return;
    }
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch (err: any) {
        setStatus({ tone: "bad", message: "Switch to Sepolia to claim." });
        return;
      }
    }
    try {
      setClaiming(true);
      setStatus({ tone: "info", message: "Submitting claim transaction…" });
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "claimTo",
        args: [recipientAddr as `0x${string}`, proof.proof.map((p) => p.hash), proof.proof_flags],
        account: account as `0x${string}`,
      });
      setStatus({
        tone: "info",
        message: `Tx sent: ${hash.slice(0, 10)}… waiting for confirmation.`,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStatus({ tone: "good", message: "Claim confirmed! DEMO minted." });
      setHasClaimed(true);
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      setStatus({
        tone: "bad",
        message: err?.message || "Claim failed.",
      });
    } finally {
      setClaiming(false);
    }
  };

  const createInvite = async () => {
    if (!account) return;
    if (!isAddress(invitee)) {
      setStatus({ tone: "bad", message: "Enter a valid Ethereum address to invite." });
      return;
    }
    if (!invitesOpen) {
      setStatus({
        tone: "bad",
        message: `Invitations unlock after the first ${freeClaims} claims are filled.`,
      });
      return;
    }
    if (!hasEmptySlot) {
      setStatus({ tone: "bad", message: "No free invitation slots left to assign." });
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
        setStatus({ tone: "bad", message: "That address has already claimed." });
        return;
      }
      if (existingInviter !== ZeroAddress) {
        setStatus({ tone: "bad", message: "That address is already invited." });
        return;
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ tone: "bad", message: "Unable to validate invitee." });
      return;
    }
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch (err: any) {
        setStatus({ tone: "bad", message: "Switch to Sepolia to create invites." });
        return;
      }
    }
    try {
      setInviting(true);
      setStatus({ tone: "info", message: "Creating invitation…" });
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "createInvitation",
        args: [target as `0x${string}`],
        account: account as `0x${string}`,
      });
      setStatus({
        tone: "info",
        message: `Tx sent: ${hash.slice(0, 10)}… waiting for confirmation.`,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStatus({ tone: "good", message: "Invitation created." });
      setInvitee("");
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "";
      if (msg.includes("already claimed")) {
        setStatus({ tone: "bad", message: "Invite failed: that address has already claimed." });
      } else if (msg.includes("already invited")) {
        setStatus({ tone: "bad", message: "Invite failed: that address is already invited." });
      } else if (msg.includes("no invites")) {
        setStatus({ tone: "bad", message: "Invite failed: you have no invites left." });
      } else {
        setStatus({
          tone: "bad",
          message: err?.message || "Failed to create invitation.",
        });
      }
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (slotIndex: number) => {
    if (!account) return;
    const slot = invitationSlots[slotIndex];
    if (!slot?.invitee) {
      setStatus({ tone: "bad", message: "Slot is empty; nothing to revoke." });
      return;
    }
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch (err: any) {
        setStatus({ tone: "bad", message: "Switch to Sepolia to revoke." });
        return;
      }
    }
    try {
      setRevokingSlot(slotIndex);
      setStatus({ tone: "info", message: "Revoking invitation…" });
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "revokeInvitation",
        args: [slotIndex],
        account: account as `0x${string}`,
      });
      setStatus({
        tone: "info",
        message: `Tx sent: ${hash.slice(0, 10)}… waiting for confirmation.`,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStatus({ tone: "good", message: "Invitation revoked. Slot freed." });
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      setStatus({
        tone: "bad",
        message: err?.message || "Failed to revoke invitation.",
      });
    } finally {
      setRevokingSlot(null);
    }
  };

  const handleBuy = async () => {
    if (!account) {
      setShowProviderModal(true);
      setStatus({ tone: "info", message: "Connect a wallet to trade." });
      return;
    }
    let amountIn: bigint;
    try {
      amountIn = parseEther(buyEthAmount || "0");
    } catch {
      setStatus({ tone: "bad", message: "Enter a valid ETH amount." });
      return;
    }
    if (amountIn <= 0n) {
      setStatus({ tone: "bad", message: "Amount must be greater than zero." });
      return;
    }
    if (!poolFunded || !poolHasDemo) {
      setStatus({
        tone: "bad",
        message: "Market maker has no liquidity yet. Seed ETH or wait for claims.",
      });
      return;
    }
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch {
        setStatus({ tone: "bad", message: `Switch to ${CHAIN_NAME} to trade.` });
        return;
      }
    }
    try {
      if (slippageBps === null) {
        setStatus({ tone: "bad", message: "Enter a valid slippage tolerance between 0 and 100%." });
        return;
      }
      if (!buyQuote) {
        setStatus({ tone: "bad", message: "Unable to calculate output for that amount." });
        return;
      }
      const minOut = buyQuote - (buyQuote * slippageBps) / 10000n;
      const minOutSafe = minOut > 0n ? minOut : 1n;
      setTrading(true);
      setStatus({ tone: "info", message: "Submitting buy transaction…" });
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "buyDemo",
        args: [minOutSafe],
        account: account as `0x${string}`,
        value: amountIn,
        chainId: CHAIN_ID,
      });
      setStatus({
        tone: "info",
        message: `Tx sent: ${hash.slice(0, 10)}… awaiting confirmation.`,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStatus({ tone: "good", message: "Swap confirmed. DEMO purchased." });
      setBuyEthAmount("");
      await refreshReserves(account);
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      setStatus({ tone: "bad", message: err?.message || "Buy failed." });
    } finally {
      setTrading(false);
    }
  };

  const handleDonate = async () => {
    if (!account) {
      setShowProviderModal(true);
      setStatus({ tone: "info", message: "Connect a wallet to donate." });
      return;
    }
    let amountIn: bigint;
    try {
      amountIn = parseEther(donateAmount || "0");
    } catch {
      setStatus({ tone: "bad", message: "Enter a valid ETH amount." });
      return;
    }
    if (amountIn <= 0n) {
      setStatus({ tone: "bad", message: "Amount must be greater than zero." });
      return;
    }
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch {
        setStatus({ tone: "bad", message: `Switch to ${CHAIN_NAME} to donate.` });
        return;
      }
    }
    try {
      setDonating(true);
      setStatus({ tone: "info", message: "Submitting donation transaction…" });
      const hash = await sendTransaction(wagmiConfig, {
        to: CONTRACT_ADDRESS as `0x${string}`,
        value: amountIn,
        account: account as `0x${string}`,
        chainId: CHAIN_ID,
      });
      setStatus({
        tone: "info",
        message: `Tx sent: ${hash.slice(0, 10)}… awaiting confirmation.`,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStatus({ tone: "good", message: "Donation confirmed. Thanks for seeding the pool!" });
      setDonateAmount("");
      await refreshReserves(account);
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      setStatus({ tone: "bad", message: err?.message || "Donation failed." });
    } finally {
      setDonating(false);
    }
  };

  const handleSell = async () => {
    if (!account) {
      setShowProviderModal(true);
      setStatus({ tone: "info", message: "Connect a wallet to trade." });
      return;
    }
    let amountIn: bigint;
    try {
      amountIn = parseEther(sellDemoAmount || "0");
    } catch {
      setStatus({ tone: "bad", message: "Enter a valid DEMO amount." });
      return;
    }
    if (amountIn <= 0n) {
      setStatus({ tone: "bad", message: "Amount must be greater than zero." });
      return;
    }
    if (amountIn > demoBalance) {
      setStatus({ tone: "bad", message: "You don’t have enough DEMO to sell." });
      return;
    }
    if (!poolFunded || reserveEth === 0n) {
      setStatus({
        tone: "bad",
        message: "Market maker has no ETH liquidity yet.",
      });
      return;
    }
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch {
        setStatus({ tone: "bad", message: `Switch to ${CHAIN_NAME} to trade.` });
        return;
      }
    }
    try {
      if (slippageBps === null) {
        setStatus({ tone: "bad", message: "Enter a valid slippage tolerance between 0 and 100%." });
        return;
      }
      if (!sellQuote) {
        setStatus({ tone: "bad", message: "Unable to calculate output for that amount." });
        return;
      }
      const minOut = sellQuote - (sellQuote * slippageBps) / 10000n;
      const minOutSafe = minOut > 0n ? minOut : 1n;
      setTrading(true);
      setStatus({ tone: "info", message: "Submitting sell transaction…" });
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "sellDemo",
        args: [amountIn, minOutSafe],
        account: account as `0x${string}`,
        chainId: CHAIN_ID,
      });
      setStatus({
        tone: "info",
        message: `Tx sent: ${hash.slice(0, 10)}… awaiting confirmation.`,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStatus({ tone: "good", message: "Swap confirmed. ETH received." });
      setSellDemoAmount("");
      await refreshReserves(account);
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      setStatus({ tone: "bad", message: err?.message || "Sell failed." });
    } finally {
      setTrading(false);
    }
  };

  const proofRows = proof
    ? [
        { label: "Address", value: proof.address },
        { label: "Index", value: `${proof.index + 1} of ${proof.total}` },
        { label: "Leaf", value: proof.leaf },
        { label: "Root", value: proof.root },
        { label: "Proof nodes", value: proof.proof.length.toString() },
      ]
    : [];

  const normalizedSlots = useMemo(() => {
    const base = invitationSlots.slice(0, maxInvites);
    const missing = Math.max(0, maxInvites - base.length);
    return [...base, ...Array.from({ length: missing }, () => ({ invitee: null, used: false }))];
  }, [invitationSlots, maxInvites]);
  const hasEmptySlot = normalizedSlots.some((s) => !s.invitee);
  const poolFunded = reserveEth > 0n;
  const poolHasDemo = reserveDemo > 0n;

  const priceEthPerDemo = useMemo(() => {
    if (!poolFunded || !poolHasDemo) return "—";
    const eth = Number(formatEther(reserveEth));
    const demo = Number(formatEther(reserveDemo));
    if (demo === 0) return "—";
    return (eth / demo).toFixed(6);
  }, [poolFunded, poolHasDemo, reserveEth, reserveDemo]);

  const priceDemoPerEth = useMemo(() => {
    if (!poolFunded || !poolHasDemo) return "—";
    const eth = Number(formatEther(reserveEth));
    if (eth === 0) return "—";
    const demo = Number(formatEther(reserveDemo));
    return (demo / eth).toFixed(2);
  }, [poolFunded, poolHasDemo, reserveEth, reserveDemo]);

  const buyQuote = useMemo(() => {
    if (!poolHasDemo || !poolFunded) return null;
    try {
      const amountIn = parseEther(buyEthAmount || "0");
      if (amountIn <= 0n) return null;
      const out = (amountIn * reserveDemo) / (reserveEth + amountIn);
      return out > 0n ? out : null;
    } catch {
      return null;
    }
  }, [buyEthAmount, poolFunded, poolHasDemo, reserveDemo, reserveEth]);

  const sellQuote = useMemo(() => {
    if (!poolFunded) return null;
    try {
      const amountIn = parseEther(sellDemoAmount || "0");
      if (amountIn <= 0n) return null;
      const out = (amountIn * reserveEth) / (reserveDemo + amountIn);
      return out > 0n ? out : null;
    } catch {
      return null;
    }
  }, [reserveEth, reserveDemo, sellDemoAmount, poolFunded]);

  const buyMinOut = useMemo(() => {
    if (!buyQuote || slippageBps === null) return null;
    const buffer = (buyQuote * slippageBps) / 10000n;
    const out = buyQuote - buffer;
    return out > 0n ? out : 1n;
  }, [buyQuote, slippageBps]);

  const sellMinOut = useMemo(() => {
    if (!sellQuote || slippageBps === null) return null;
    const buffer = (sellQuote * slippageBps) / 10000n;
    const out = sellQuote - buffer;
    return out > 0n ? out : 1n;
  }, [sellQuote, slippageBps]);

  const claimDisabledReason = useMemo(() => {
    if (!account) return "Connect your wallet to claim.";
    if (!proof && !hasClaimed) return "Load your Merkle proof to claim.";
    if (hasClaimed) return "This wallet has already claimed.";
    if (chain?.id !== CHAIN_ID) return `Switch to ${CHAIN_NAME} to claim.`;
    if (invitesRequired && !invitedBy) return "Invitation required to claim now.";
    return null;
  }, [account, chain, hasClaimed, invitesRequired, invitedBy, proof]);

  const nextStep = useMemo(() => {
    if (!account) return "Connect your wallet to get started.";
    if (checkingProof) return "Checking your eligibility…";
    if (claiming) return "Sending your claim transaction…";
    if (inviting) return "Creating an invitation…";
    if (hasClaimed && invitesOpen) return "You’ve claimed. You can now create invitations.";
    if (hasClaimed && !invitesOpen) return "You’ve claimed. Wait for the invite phase to start.";
    if (!hasClaimed && !proof) return "Check status to see if you can claim.";
    if (!hasClaimed && proof && invitesRequired && !invitedBy)
      return "You’re on the list, but still need an invitation.";
    if (!hasClaimed && proof && (!invitesRequired || invitedBy))
      return "You’re eligible. You can send your claim.";
    return "Status ready.";
  }, [
    account,
    checkingProof,
    claiming,
    inviting,
    hasClaimed,
    invitesOpen,
    proof,
    invitesRequired,
    invitedBy,
  ]);

  const copyToClipboard = async (value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-500 blur-[120px] opacity-30" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-emerald-500 blur-[120px] opacity-25" />

      <header className="relative mx-auto max-w-6xl px-6 pt-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
          DEMO on {CHAIN_NAME} · Merkle drop + referrals + AMM
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
          Claim the drop, invite friends, and trade inside one hub
        </h1>
        <p className="mt-4 text-base text-slate-300 md:text-lg">
          Three tracks, one flow: prove eligibility, branch invites, and swap against the contract-owned pool.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-200">
          <button
            onClick={() => switchTab("airdrop")}
            className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"
          >
            Go to Airdrop
          </button>
          <button
            onClick={() => switchTab("invites")}
            className="rounded-full border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 font-semibold text-cyan-100 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5"
          >
            Go to Invites
          </button>
          <button
            onClick={() => switchTab("market")}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 font-semibold text-slate-100 transition hover:-translate-y-0.5"
          >
            Go to Market Maker
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            Contract:{" "}
            <Link
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              className="text-emerald-300 hover:underline"
            >
              {shorten(CONTRACT_ADDRESS)}
            </Link>
          </div>
          <div className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 sm:w-auto">
            Proof API:{" "}
            <span className="break-all font-mono text-emerald-300">{API_BASE}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-left text-sm text-slate-200 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 p-4 shadow-lg shadow-emerald-500/15">
            <p className="text-xs uppercase tracking-wide text-emerald-200">Merkle Airdrop</p>
            <p className="mt-1 text-lg font-semibold text-emerald-50">
              {claimCount !== null ? `${claimCount} claimed` : "Checking…"}
            </p>
            <p className="text-xs text-emerald-100">
              {freeClaimsRemaining !== null ? `${freeClaimsRemaining} free claims left before invites lock in.` : "Fetch your proof to see your lane."}
            </p>
          </div>
          <div className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 p-4 shadow-lg shadow-cyan-500/15">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Referral invites</p>
            <p className="mt-1 text-lg font-semibold text-cyan-50">
              {invitesCreated} / {maxInvites} slots used
            </p>
            <p className="text-xs text-cyan-100">
              {invitesOpen ? "Invite phase is live; reserve slots before they’re gone." : "Invite phase opens after free-claim window fills."}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-4 shadow-lg shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-wide text-slate-200">Market maker</p>
            <p className="mt-1 text-lg font-semibold text-slate-50">
              {poolFunded && poolHasDemo ? `${priceEthPerDemo} ETH / DEMO` : "Waiting for liquidity"}
            </p>
            <p className="text-xs text-slate-200">
              Reserves: {formatToken(reserveEth)} ETH · {formatToken(reserveDemo)} DEMO
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-3 pt-4 md:px-4">
        <div className="glass w-full p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Experience map</p>
              <h3 className="text-lg font-semibold text-slate-50">Pick your lane and dive in</h3>
            </div>
            <button
              onClick={() => setShowHow((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-slate-100 hover:-translate-y-0.5"
            >
              {showHow ? "Hide flow" : "Show flow"}
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Merkle airdrop",
                body: "Prove eligibility, pick a recipient, and mint your 100 DEMO.",
                accent: "from-emerald-400/30 to-emerald-500/20",
                target: "airdrop",
                cta: "Claim flow",
              },
              {
                title: "Referral invites",
                body: "After claiming, reserve up to five invite slots and share them.",
                accent: "from-cyan-400/30 to-blue-500/10",
                target: "invites",
                cta: "Manage invites",
              },
              {
                title: "Market maker",
                body: "Seed the pool, set slippage, and swap ETH ↔ DEMO against reserves.",
                accent: "from-white/15 to-slate-700/40",
                target: "market-maker",
                cta: "Trade panel",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.accent} p-4 shadow-lg shadow-emerald-500/10`}
              >
                <p className="text-sm font-semibold text-slate-50">{card.title}</p>
                <p className="mt-1 text-sm text-slate-300">{card.body}</p>
                <div className={`mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${card.accent} px-3 py-1 text-xs font-semibold text-slate-900`}>
                  <span className="text-slate-900">•</span>
                  <span>{card.cta}</span>
                </div>
                <button
                  onClick={() => switchTab(card.target as "airdrop" | "invites" | "market")}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
                >
                  Jump in →
                </button>
              </div>
            ))}
          </div>
          {showHow && (
            <ol className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-4">
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                1. Connect wallet on {CHAIN_NAME}.
              </li>
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                2. Fetch your proof and confirm eligibility.
              </li>
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                3. Claim (and optionally redirect) your DEMO, unlocking invites.
              </li>
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                4. Seed liquidity or swap with slippage protection.
              </li>
            </ol>
          )}
        </div>
      </section>

      <section id="tab-root" className="mx-auto max-w-6xl px-3 pt-4 md:px-4">
        <div className="glass w-full p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Navigation</p>
              <h3 className="text-lg font-semibold text-slate-50">Choose a track</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Claims: {claimCount !== null ? claimCount : "—"} / {freeClaims}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Invites: {invitesCreated} / {maxInvites}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Pool: {poolFunded && poolHasDemo ? `${priceEthPerDemo} ETH/DEMO` : "Unseeded"}
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {[
              { key: "airdrop", title: "Airdrop", subtitle: "Proof + claim", badge: freeClaimsRemaining !== null ? `${freeClaimsRemaining} free left` : "Check status" },
              { key: "invites", title: "Invites", subtitle: "Referral slots", badge: `${invitesCreated}/${maxInvites} used` },
              { key: "market", title: "Market maker", subtitle: "Donate + swap", badge: poolFunded ? "Live" : "Needs ETH" },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key as "airdrop" | "invites" | "market")}
                  className={clsx(
                    "flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition",
                    isActive
                      ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.2)]"
                      : "border-white/10 bg-white/5 hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{tab.title}</p>
                      <p className="text-xs text-slate-400">{tab.subtitle}</p>
                    </div>
                    <span className={clsx("rounded-full border px-2 py-1 text-[11px]", isActive ? "border-emerald-300 bg-emerald-300/20 text-emerald-100" : "border-white/15 bg-white/10 text-slate-200")}>
                      {tab.badge}
                    </span>
                  </div>
                  {isActive && <span className="text-[11px] text-emerald-200">Active</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {activeTab === "market" && (
      <section id="market-maker" className="mx-auto max-w-6xl px-3 pt-4 md:px-4">
        <div className="glass w-full space-y-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Market maker</p>
              <h3 className="text-xl font-semibold text-slate-50">Seed and swap against the DEMO pool</h3>
              <p className="text-sm text-slate-300">
                Contract-owned constant-product AMM with no LP tokens. Set slippage, donate ETH, and swap both ways.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-100">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">ETH reserve: {formatToken(reserveEth)} </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">DEMO reserve: {formatToken(reserveDemo)} </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Price: {priceEthPerDemo} ETH/DEMO</span>
            </div>
          </div>

          {!poolFunded && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              The pool has no ETH yet. Send a small amount of ETH to the contract to unlock claiming and trading.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Donate ETH to seed the pool</p>
                  <p className="text-xs text-slate-400">
                    Anyone can boost reserves. A simple ETH transfer increases liquidity and unlocks claiming.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  Contract: {shorten(CONTRACT_ADDRESS)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="0.0001"
                  className="w-full flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <button
                  onClick={handleDonate}
                  disabled={donating || !account || chain?.id !== CHAIN_ID || !donateAmount}
                  className="w-full rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto"
                >
                  {donating ? "Sending…" : account ? "Donate ETH" : "Connect to donate"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Slippage tolerance</p>
                  <p className="text-xs text-slate-400">
                    Applied to both buys and sells; swap reverts if output is lower.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {slippageBps !== null ? `${(Number(slippageBps) / 100).toFixed(2)}%` : "Invalid"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  placeholder="1.0"
                  className="w-full flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <div className="space-y-1 text-xs text-slate-300">
                  <p>Min buy out: {buyMinOut ? `${formatToken(buyMinOut)} DEMO` : "—"}</p>
                  <p>Min sell out: {sellMinOut ? `${formatToken(sellMinOut)} ETH` : "—"}</p>
                </div>
              </div>
              {slippageBps === null && (
                <p className="mt-2 text-xs text-amber-200">
                  Enter a percentage between 0 and 100 with up to two decimals.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-slate-100">Pool snapshot</p>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-xs text-slate-400">ETH reserve</span>
                  <span className="font-semibold">{formatToken(reserveEth)} ETH</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-xs text-slate-400">DEMO reserve</span>
                  <span className="font-semibold">{formatToken(reserveDemo)} DEMO</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-xs text-slate-400">Price (ETH per DEMO)</span>
                  <span className="font-semibold">{priceEthPerDemo}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-xs text-slate-400">Price (DEMO per ETH)</span>
                  <span className="font-semibold">{priceDemoPerEth}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Buy DEMO with ETH</p>
                <span className="text-xs text-slate-400">
                  You get {buyQuote ? `${formatToken(buyQuote)} DEMO` : "—"}{" "}
                  {buyMinOut ? `(min ${formatToken(buyMinOut)} DEMO)` : ""}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <input
                  value={buyEthAmount}
                  onChange={(e) => setBuyEthAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <p className="text-xs text-slate-400">
                  Enter ETH to spend. Constant-product curve (no fee); min received uses your slippage tolerance.
                </p>
                <button
                  onClick={handleBuy}
                  disabled={
                    trading ||
                    !account ||
                    !poolFunded ||
                    !poolHasDemo ||
                    slippageBps === null ||
                    !buyQuote ||
                    chain?.id !== CHAIN_ID ||
                    !buyEthAmount
                  }
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {trading ? "Submitting…" : account ? "Buy DEMO" : "Connect to trade"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Sell DEMO for ETH</p>
                <span className="text-xs text-slate-400">
                  You get {sellQuote ? `${formatToken(sellQuote)} ETH` : "—"}{" "}
                  {sellMinOut ? `(min ${formatToken(sellMinOut)} ETH)` : ""}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <input
                  value={sellDemoAmount}
                  onChange={(e) => setSellDemoAmount(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Available: {formatToken(demoBalance)} DEMO</span>
                  <span>Needs pool ETH: {poolFunded ? "Ready" : "Seeded when ETH arrives"}</span>
                </div>
                <button
                  onClick={handleSell}
                  disabled={
                    trading ||
                    !account ||
                    !poolFunded ||
                    reserveEth === 0n ||
                    slippageBps === null ||
                    !sellQuote ||
                    chain?.id !== CHAIN_ID ||
                    !sellDemoAmount
                  }
                  className="w-full rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {trading ? "Submitting…" : account ? "Sell DEMO" : "Connect to trade"}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Pool ownership has no LP tokens. ETH donations to the contract grow the reserves; each claim mints 10 DEMO into the pool.
          </p>
        </div>
      </section>
      )}

      {activeTab === "airdrop" && (
      <section id="airdrop" className="mx-auto max-w-6xl px-3 pt-6 md:px-4">
        <div className="glass w-full space-y-5 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Merkle airdrop</p>
              <h3 className="text-xl font-semibold text-slate-50">Verify, claim, and route your DEMO</h3>
              <p className="text-sm text-slate-300">
                Proof-backed claims unlock invites. Pick a recipient before minting your 100 DEMO.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Free claims left: {freeClaimsRemaining !== null ? freeClaimsRemaining : "—"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Invite phase after: {freeClaims}
              </span>
            </div>
          </div>

          {!account ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-50">Connect to start your claim</p>
                  <p className="text-sm text-slate-300">
                    We’ll fetch your proof, show eligibility, and guide you to the next step.
                  </p>
                </div>
                <button
                  onClick={() => setShowProviderModal(true)}
                  disabled={connectors.length === 0}
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  Connect wallet
                </button>
              </div>
              <div
                className={clsx(
                  "mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                  statusToneClasses[status.tone]
                )}
              >
                <span
                  className={clsx(
                    "mt-1 h-2.5 w-2.5 rounded-full",
                    status.tone === "good" && "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]",
                    status.tone === "bad" && "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]",
                    status.tone === "info" && "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]"
                  )}
                />
                <span className="leading-relaxed break-words">{status.message}</span>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">1) Connect</div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">2) Fetch proof</div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">3) Claim + route tokens</div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">Eligibility & claim</p>
                    <h4 className="text-lg font-semibold text-slate-50">Proof-driven mint</h4>
                    <p className="text-xs text-slate-400">
                      {invitesRequired
                        ? "Invites required after free-claim window. Check proof and inviter first."
                        : "Free-claim window open. Proof + claim mints instantly."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => refreshProof()}
                      disabled={!account || checkingProof}
                      className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {checkingProof ? "Checking…" : "Refresh proof"}
                    </button>
                    <button
                      onClick={disconnectWallet}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div
                  className={clsx(
                    "mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                    statusToneClasses[status.tone]
                  )}
                >
                  <span
                    className={clsx(
                      "mt-1 h-2.5 w-2.5 rounded-full",
                      status.tone === "good" && "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]",
                      status.tone === "bad" && "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]",
                      status.tone === "info" && "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]"
                    )}
                  />
                  <span className="leading-relaxed break-words">{status.message}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs text-slate-200">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    →
                  </span>
                  <span className="font-medium">Next step:</span>
                  <span className="text-slate-100 break-words">{nextStep}</span>
                  {(checkingProof || claiming || inviting) && (
                    <span className="ml-2 h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" />
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Stat label="Claimed" value={hasClaimed ? "Yes" : "No"} />
                  <Stat
                    label="Invitation"
                    value={
                      invitesRequired
                        ? invitedBy
                          ? `Invited by ${shorten(invitedBy)}`
                          : "Required"
                        : "Not required"
                    }
                  />
                  <Stat label="Total claims" value={claimCount !== null ? claimCount.toString() : "—"} />
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Claim output</p>
                      <p className="text-xs text-slate-400">
                        Check your proof and inviter state before minting.
                      </p>
                    </div>
                    <button
                      onClick={claim}
                      disabled={!canClaim}
                      className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {claiming ? "Sending…" : "Send claim"}
                    </button>
                  </div>
                  <div className="mt-3 text-sm text-slate-300">
                    {account && hasClaimed && "You already claimed with this wallet."}
                    {account && !hasClaimed && proof && !invitesRequired && "You can claim with this wallet."}
                    {account && !hasClaimed && proof && invitesRequired && invitedBy && "You are invited and can claim."}
                    {account && !hasClaimed && invitesRequired && !invitedBy && "You are qualified, but you need an invitation to claim right now."}
                    {account && !proof && !checkingProof && !hasClaimed && "Refresh to check your eligibility."}
                  </div>
                  <div className="mt-3 flex w-full flex-wrap items-center gap-2 text-sm text-slate-300">
                    <label className="text-xs uppercase tracking-wide text-slate-400">
                      Send tokens to
                    </label>
                    <input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder={account ?? "0x..."}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500">
                      Default is your connected wallet. You can redirect the 100 DEMO to another address.
                    </p>
                  </div>
                  {claimDisabledReason && (
                    <p className="mt-2 text-xs text-amber-200">{claimDisabledReason}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Wallet + network</p>
                      <p className="text-xs text-slate-400">Stay on {CHAIN_NAME} to transact.</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(account!, "account")}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:-translate-y-0.5"
                    >
                      ⧉
                      {copiedKey === "account" && <span className="text-emerald-300">Copied</span>}
                    </button>
                  </div>
                  <p className="mt-2 break-all font-mono text-sm text-slate-100">{account}</p>
                  <p className="text-xs text-slate-400">{networkLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowProviderModal(true)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:-translate-y-0.5"
                    >
                      Switch wallet
                    </button>
                    <button
                      onClick={() => refreshOnChain(account)}
                      className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:-translate-y-0.5"
                    >
                      Refresh on-chain
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-slate-200">Proof details</p>
                  {proofRows.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">
                      No proof loaded yet. Use “Refresh proof” to pull from the API.
                    </p>
                  ) : (
                    <dl className="mt-3 space-y-2 text-xs text-slate-200">
                      {proofRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                        >
                          <dt className="text-slate-400">{row.label}</dt>
                          <dd className="break-all font-mono text-[11px] text-slate-100">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
                  <p className="text-sm font-semibold text-slate-200">Claim checkpoints</p>
                  <ul className="mt-2 space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                      <span>
                        {poolFunded
                          ? "ETH liquidity present; claims are unlocked."
                          : "Seed the pool with ETH before claiming."}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-cyan-400" />
                      <span>
                        {invitesRequired
                          ? invitedBy
                            ? `Invited by ${shorten(invitedBy)}`
                            : "Invite required once free-claim window is filled."
                          : "No invite required until the free-claim window ends."}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-white/80" />
                      <span>Each claim mints 10 DEMO into the AMM for future swaps.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {activeTab === "invites" && (
      <section id="invites" className="mx-auto max-w-6xl px-3 pt-6 pb-14 md:px-4">
        <div className="glass w-full space-y-5 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Referrals & invites</p>
              <h3 className="text-xl font-semibold text-slate-50">Share access once you’ve claimed</h3>
              <p className="text-sm text-slate-300">
                Create up to {maxInvites} fixed slots. Slots lock once claimed; revoke unused ones anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Invites created: {invitesCreated} / {maxInvites}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Phase: {invitesOpen ? "Open" : "Locked"}
              </span>
            </div>
          </div>

          {!account || !hasClaimed ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-200">Invites unlock after claiming</p>
              <p className="mt-2 text-xs text-slate-400">
                Claim first to view and manage your {maxInvites} invite slots.
              </p>
            </div>
          ) : !invitesOpen ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-200">Invitation phase locked</p>
              <p className="mt-2 text-xs text-slate-400">
                Invites are not available yet. Check back once the invitation phase begins.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-slate-200">Your status</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <InfoRow
                    label="Invited by"
                    value={invitedBy ?? "No inviter"}
                    copyValue={invitedBy ?? undefined}
                    monospace
                    onCopy={invitedBy ? () => copyToClipboard(invitedBy, "invitedBy") : undefined}
                    copied={copiedKey === "invitedBy"}
                  />
                  <InfoRow label="Invites created" value={`${invitesCreated} / ${maxInvites}`} />
                  <InfoRow
                    label="Available slots"
                    value={`${
                      maxInvites -
                      normalizedSlots.filter((s) => s.invitee && s.used).length -
                      normalizedSlots.filter((s) => s.invitee && !s.used).length
                    } open`}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Invite tree pays down five levels; make sure you share with trusted wallets.
                </p>
              </div>

              <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Invitation slots</p>
                    <p className="text-xs text-slate-400">
                      You have {maxInvites} fixed slots. Create uses the next open slot; revoke frees an unused one.
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Summary: {normalizedSlots.filter((s) => s.invitee && s.used).length} used ·{" "}
                      {normalizedSlots.filter((s) => s.invitee && !s.used).length} reserved ·{" "}
                      {maxInvites -
                        normalizedSlots.filter((s) => s.invitee && s.used).length -
                        normalizedSlots.filter((s) => s.invitee && !s.used).length}{" "}
                      open
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => refreshOnChain(account)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:-translate-y-0.5"
                    >
                      Refresh slots
                    </button>
                    <button
                      onClick={() => setShowProviderModal(true)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:-translate-y-0.5"
                    >
                      Switch wallet
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {normalizedSlots.map((slot, idx) => {
                    const isPending = slot.invitee && !slot.used;
                    const isUsed = slot.invitee && slot.used;
                    return (
                      <div
                        key={`slot-${idx}`}
                        className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Slot {idx + 1}</p>
                            <p className="font-semibold text-slate-100">
                              {isUsed ? "Claimed by" : isPending ? "Reserved for" : "Unused"}
                            </p>
                          </div>
                          <span
                            className={clsx(
                              "rounded-full border px-3 py-1 text-xs",
                              isUsed && "border-white/10 bg-white/5 text-slate-300",
                              isPending && "border-amber-300/50 bg-amber-300/10 text-amber-100",
                              !slot.invitee && "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                            )}
                          >
                            {isUsed ? "Used" : isPending ? "Reserved" : "Open"}
                          </span>
                        </div>

                        {slot.invitee && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[13px] text-slate-100 break-all">
                            <span className="break-all">{slot.invitee}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(slot.invitee!, `slot-${idx}`)}
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:-translate-y-0.5"
                              >
                                ⧉
                                {copiedKey === `slot-${idx}` && (
                                  <span className="text-emerald-300">Copied</span>
                                )}
                              </button>
                              {isPending && (
                                <button
                                  onClick={() => revokeInvite(idx)}
                                  disabled={revokingSlot === idx}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300/50 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:-translate-y-0.5 disabled:opacity-50"
                                >
                                  {revokingSlot === idx ? "Revoking…" : "Revoke"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {isPending && (
                          <p className="text-xs text-slate-400 mt-1">Waiting for invitee to claim.</p>
                        )}
                        {isUsed && <p className="text-xs text-slate-400 mt-1">Invite consumed.</p>}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs text-slate-400">Enter an address to assign to the next open slot.</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={invitee}
                      onChange={(e) => setInvitee(e.target.value)}
                      placeholder="0x… invitee"
                      className="w-full flex-1 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                    />
                    <button
                      onClick={createInvite}
                      disabled={!account || !hasClaimed || inviting || !hasEmptySlot || !invitesOpen}
                      className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 sm:w-auto disabled:opacity-50"
                    >
                      {inviting ? "Creating…" : "Create invite"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Requires that you have already claimed. Revoke before a claim to free a slot; claimed invites stay locked.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyValue,
  monospace,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  copyValue?: string;
  monospace?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/60 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={clsx("font-semibold text-slate-100", monospace && "font-mono break-all")}>
          {value}
        </span>
        {copyValue && (
          <button
            onClick={onCopy ?? (() => navigator.clipboard?.writeText(copyValue))}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:-translate-y-0.5"
          >
            ⧉
            {copied && <span className="text-emerald-300">Copied</span>}
          </button>
        )}
      </div>
    </div>
  );
}

function ProviderModal({
  open,
  onClose,
  connectors,
  selectedId,
  onSelect,
  onConnect,
}: {
  open: boolean;
  onClose: () => void;
  connectors: { id: string; name: string; ready?: boolean }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConnect: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Select wallet</p>
            <h3 className="text-xl font-semibold text-slate-50">Choose a provider to connect</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-2 py-1 text-sm text-slate-300 hover:-translate-y-0.5"
          >
            Close
          </button>
        </div>

        {connectors.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            Waiting for wallets (EIP-6963 broadcast). Open your wallet extension.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {connectors.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={clsx(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  selectedId === p.id
                    ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.25)]"
                    : "border-white/10 bg-white/5 hover:-translate-y-0.5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.ready ? "Ready" : "Unavailable"}</p>
                  </div>
                </div>
                <div
                  className={clsx(
                    "h-3 w-3 rounded-full border",
                    selectedId === p.id ? "border-emerald-300 bg-emerald-300" : "border-white/30"
                  )}
                />
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:-translate-y-0.5"
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            disabled={connectors.length === 0}
            className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
