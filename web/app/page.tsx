'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { ZeroAddress, getAddress, isAddress } from "ethers";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import { API_BASE, CHAIN_ID, CHAIN_NAME, CONTRACT_ADDRESS, DEMO_ABI, ProofResponse } from "../lib/airdrop";
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain } from "wagmi";
import { writeContract, readContract, sendTransaction } from "wagmi/actions";
import { wagmiConfig } from "../lib/wagmi";
import { Hero } from "./components/Hero";
import { TabKey, TabNav } from "./components/TabNav";
import { MarketPanel } from "./components/MarketPanel";
import { AirdropPanel } from "./components/AirdropPanel";
import { InvitesPanel } from "./components/InvitesPanel";
import { ProviderModal } from "./components/ProviderModal";
import { formatToken, shorten } from "../lib/format";
import { addressSchema, amountSchema } from "../lib/validators";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type Tone = "info" | "good" | "bad";

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

  // Status for backward compatibility with components
  const [status, setStatus] = useState<{ tone: "info" | "good" | "bad"; message: string }>({
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
  const [activeTab, setActiveTab] = useState<TabKey>("airdrop");
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

  const resetUi = useCallback(() => {
    setClaimCount(null);
    setHasClaimed(false);
    setInvitedBy(null);
    setInvitesCreated(0);
    setInvitationSlots([]);
    setProof(null);
    setRecipient("");
    setDemoBalance(0n);
  }, []);

  const refreshReserves = useCallback(
    async (addr?: string) => {
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
    },
    [account]
  );

  const refreshOnChain = useCallback(
    async (addr?: string) => {
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
    },
    [account, refreshReserves]
  );

  const refreshProof = useCallback(
    async (addressOverride?: string) => {
      const target = addressOverride || account;
      if (!target) {
        toast.info("Connect your wallet to fetch proof.");
        setStatus({ tone: "info", message: "Connect your wallet to fetch proof." });
        return;
      }
      setCheckingProof(true);
      setProof(null);
      try {
        const res = await fetch(`${API_BASE}/proof/${target}`);
        if (!res.ok) {
          const text = await res.text();
          toast.error(`Not in airdrop list (${text || res.status})`);
          setStatus({ tone: "bad", message: `Not in airdrop list (${text || res.status}).` });
          setProof(null);
          return;
        }
        const data: ProofResponse = await res.json();
        const normalizedTarget = getAddress(target);
        const proofAddress = getAddress(data.address);
        if (normalizedTarget !== proofAddress) {
          toast.error(`Proof is for ${shorten(proofAddress)}. Connect that wallet to claim.`);
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
          toast.info("Proof found. This wallet has already claimed.");
          setStatus({
            tone: "info",
            message: "Proof found. This wallet has already claimed.",
          });
        } else if (invitesRequired && !inviterAddr) {
          toast.warning("You are qualified, but you need an invitation to claim right now.");
          setStatus({
            tone: "info",
            message: "You are qualified, but you need an invitation to claim right now.",
          });
        } else {
          toast.success("Proof found. You can claim now.");
          setStatus({
            tone: "good",
            message: "Proof found. You can claim now.",
          });
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to fetch proof.");
        setStatus({
          tone: "bad",
          message: err?.message || "Failed to fetch proof.",
        });
      } finally {
        setCheckingProof(false);
      }
    },
    [account, hasClaimed, invitesRequired, invitedBy]
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
  }, [account, chain, refreshOnChain, refreshProof, resetUi, switchChain]);

  useEffect(() => {
    refreshReserves(account);
  }, [account, refreshReserves]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedTab = window.localStorage.getItem("demo-active-tab");
      if (storedTab === "airdrop" || storedTab === "invites" || storedTab === "market") {
        setActiveTab(storedTab);
      }
      const storedSlip = window.localStorage.getItem("demo-slippage");
      if (storedSlip) setSlippage(storedSlip);
      const storedBuy = window.localStorage.getItem("demo-buy-eth");
      if (storedBuy) setBuyEthAmount(storedBuy);
      const storedSell = window.localStorage.getItem("demo-sell-demo");
      if (storedSell) setSellDemoAmount(storedSell);
    } catch (err) {
      console.error("Failed to load saved UI state", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("demo-active-tab", activeTab);
    } catch { }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("demo-slippage", slippage);
      window.localStorage.setItem("demo-buy-eth", buyEthAmount);
      window.localStorage.setItem("demo-sell-demo", sellDemoAmount);
    } catch { }
  }, [slippage, buyEthAmount, sellDemoAmount]);

  const switchTab = (tab: "airdrop" | "invites" | "market") => {
    setActiveTab(tab);
    const anchor = document.getElementById("tab-root");
    anchor?.scrollIntoView({ behavior: "smooth" });
  };

  const connectWallet = async (connectorId?: string) => {
    const connector =
      connectors.find((c) => c.id === connectorId) ??
      connectors.find((c) => c.ready) ??
      connectors[0];
    if (!connector) {
      toast.error("No wallet connector available.");
      setStatus({ tone: "bad", message: "No wallet connector available." });
      return;
    }
    try {
      toast.loading("Connecting wallet…");
      setStatus({ tone: "info", message: "Connecting wallet…" });
      await connect({ connector, chainId: CHAIN_ID });
      setShowProviderModal(false);
      toast.dismiss();
      toast.success("Wallet connected successfully!");
    } catch (err: any) {
      console.error(err);
      toast.dismiss();
      toast.error(err?.message || "Unable to connect wallet.");
      setStatus({
        tone: "bad",
        message: err?.message || "Unable to connect wallet.",
      });
    }
  };

  const disconnectWallet = () => {
    resetUi();
    disconnect();
    toast.info("Disconnected. Connect again when ready.");
    setStatus({
      tone: "info",
      message: "Disconnected. Select a wallet provider and connect again.",
    });
  };

  const claim = async () => {
    if (!proof || !account) return;
    if (invitesRequired && !invitedBy) {
      toast.error("An invitation is required to claim now.");
      setStatus({ tone: "bad", message: "An invitation is required to claim now." });
      return;
    }
    
    const recipientAddr = recipient.trim() || account;
    
    // Validate address
    const validation = addressSchema.safeParse(recipientAddr);
    if (!validation.success) {
      toast.error("Enter a valid recipient address.");
      setStatus({ tone: "bad", message: "Enter a valid recipient address." });
      return;
    }
    
    if (recipientAddr === ZeroAddress) {
      toast.error("Cannot send to zero address.");
      setStatus({ tone: "bad", message: "Enter a valid recipient address." });
      return;
    }
    
    if (chain?.id !== CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CHAIN_ID });
      } catch (err: any) {
        toast.error("Switch to Sepolia to claim.");
        setStatus({ tone: "bad", message: "Switch to Sepolia to claim." });
        return;
      }
    }
    
    try {
      setClaiming(true);
      const toastId = toast.loading("Submitting claim transaction…");
      setStatus({ tone: "info", message: "Submitting claim transaction…" });
      
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DEMO_ABI,
        functionName: "claimTo",
        args: [recipientAddr as `0x${string}`, proof.proof.map((p) => p.hash) as `0x${string}`[], proof.proof_flags],
        account: account as `0x${string}`,
      });
      
      toast.loading(`Tx sent: ${hash.slice(0, 10)}… waiting for confirmation.`, { id: toastId });
      setStatus({
        tone: "info",
        message: `Tx sent: ${hash.slice(0, 10)}… waiting for confirmation.`,
      });
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      
      toast.success("Claim confirmed! DEMO minted.", { id: toastId });
      setStatus({ tone: "good", message: "Claim confirmed! DEMO minted." });
      setHasClaimed(true);
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Claim failed.");
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

  const donateDisabledReason = useMemo(() => {
    if (!account) return "Connect your wallet to donate.";
    if (chain?.id !== CHAIN_ID) return `Switch to ${CHAIN_NAME} to donate.`;
    if (!donateAmount) return "Enter an ETH amount.";
    return null;
  }, [account, chain, donateAmount]);

  const buyDisabledReason = useMemo(() => {
    if (!account) return "Connect your wallet to trade.";
    if (chain?.id !== CHAIN_ID) return `Switch to ${CHAIN_NAME} to trade.`;
    if (!poolFunded || !poolHasDemo) return "Liquidity isn’t live yet.";
    if (!buyEthAmount) return "Enter an ETH amount.";
    if (slippageBps === null) return "Set a valid slippage percentage.";
    if (!buyQuote) return "Amount too low for a quote.";
    return null;
  }, [account, chain, poolFunded, poolHasDemo, buyEthAmount, slippageBps, buyQuote]);

  const sellDisabledReason = useMemo(() => {
    if (!account) return "Connect your wallet to trade.";
    if (chain?.id !== CHAIN_ID) return `Switch to ${CHAIN_NAME} to trade.`;
    if (!sellDemoAmount) return "Enter a DEMO amount.";
    if (!poolFunded || reserveEth === 0n) return "Pool needs ETH liquidity first.";
    if (slippageBps === null) return "Set a valid slippage percentage.";
    if (!sellQuote) return "Amount too low for a quote.";
    return null;
  }, [account, chain, sellDemoAmount, poolFunded, reserveEth, slippageBps, sellQuote]);

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

  const heroStats = {
    claimCountText: claimCount !== null ? `${claimCount} claimed` : "Checking…",
    freeClaimsText:
      freeClaimsRemaining !== null
        ? `${freeClaimsRemaining} free claims left before invites lock in.`
        : "Fetch your proof to see your lane.",
    invitesText: `${invitesCreated} / ${maxInvites} slots used`,
    invitesHint: invitesOpen ? "Invite phase is live; reserve slots before they’re gone." : "Invite phase opens after free-claim window fills.",
    marketText: poolFunded && poolHasDemo ? `${priceEthPerDemo} ETH / DEMO` : "Waiting for liquidity",
    reserveText: `Reserves: ${formatToken(reserveEth)} ETH · ${formatToken(reserveDemo)} DEMO`,
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-500 blur-[120px] opacity-20" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-emerald-500 blur-[120px] opacity-20" />

      <Hero
        chainName={CHAIN_NAME}
        contractAddress={CONTRACT_ADDRESS}
        apiBase={API_BASE}
        onPrimary={() => switchTab("airdrop")}
        onSecondary={() => switchTab("market")}
        stats={heroStats}
      />

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
                target: "market",
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

      <TabNav
        activeTab={activeTab}
        onChange={(tab) => switchTab(tab)}
        claimCount={claimCount}
        freeClaims={freeClaims}
        freeClaimsRemaining={freeClaimsRemaining}
        invitesCreated={invitesCreated}
        maxInvites={maxInvites}
        poolFunded={poolFunded}
        poolHasDemo={poolHasDemo}
        priceEthPerDemo={priceEthPerDemo}
        reserveEth={reserveEth}
        reserveDemo={reserveDemo}
        hasClaimed={hasClaimed}
      />

      {activeTab === "market" && (
        <MarketPanel
          contractAddress={CONTRACT_ADDRESS}
          reserveEth={reserveEth}
          reserveDemo={reserveDemo}
          priceEthPerDemo={priceEthPerDemo}
          priceDemoPerEth={priceDemoPerEth}
          poolFunded={poolFunded}
          poolHasDemo={poolHasDemo}
          buyQuote={buyQuote}
          sellQuote={sellQuote}
          buyMinOut={buyMinOut}
          sellMinOut={sellMinOut}
          buyEthAmount={buyEthAmount}
          setBuyEthAmount={setBuyEthAmount}
          sellDemoAmount={sellDemoAmount}
          setSellDemoAmount={setSellDemoAmount}
          donateAmount={donateAmount}
          setDonateAmount={setDonateAmount}
          slippage={slippage}
          setSlippage={setSlippage}
          slippageBps={slippageBps}
          handleDonate={handleDonate}
          handleBuy={handleBuy}
          handleSell={handleSell}
          donateDisabledReason={donateDisabledReason}
          buyDisabledReason={buyDisabledReason}
          sellDisabledReason={sellDisabledReason}
          account={account}
          trading={trading}
          donating={donating}
          demoBalance={demoBalance}
        />
      )}

      {activeTab === "airdrop" && (
        <AirdropPanel
          account={account}
          connectors={connectors}
          checkingProof={checkingProof}
          claimCount={claimCount}
          freeClaims={freeClaims}
          freeClaimsRemaining={freeClaimsRemaining}
          invitesRequired={invitesRequired}
          poolFunded={poolFunded}
          invitesOpen={invitesOpen}
          invitedBy={invitedBy}
          hasClaimed={hasClaimed}
          proof={proof}
          proofRows={proofRows}
          status={status}
          nextStep={nextStep}
          claimDisabledReason={claimDisabledReason}
          recipient={recipient}
          setRecipient={setRecipient}
          refreshProof={() => refreshProof()}
          disconnectWallet={disconnectWallet}
          claim={claim}
          claiming={claiming}
          inviting={inviting}
          networkLabel={networkLabel}
          copyToClipboard={copyToClipboard}
          copiedKey={copiedKey}
          setShowProviderModal={setShowProviderModal}
          refreshOnChain={refreshOnChain}
        />
      )}

      {activeTab === "invites" && (
        <InvitesPanel
          account={account}
          hasClaimed={hasClaimed}
          invitesOpen={invitesOpen}
          invitedBy={invitedBy}
          maxInvites={maxInvites}
          invitesCreated={invitesCreated}
          normalizedSlots={normalizedSlots}
          invitee={invitee}
          setInvitee={setInvitee}
          createInvite={createInvite}
          refreshOnChain={refreshOnChain}
          setShowProviderModal={setShowProviderModal}
          copyToClipboard={copyToClipboard}
          copiedKey={copiedKey}
          revokingSlot={revokingSlot}
          revokeInvite={revokeInvite}
          inviting={inviting}
          hasEmptySlot={hasEmptySlot}
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
