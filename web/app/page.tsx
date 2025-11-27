'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ZeroAddress, getAddress, isAddress } from "ethers";
import {
  API_BASE,
  CHAIN_ID,
  CHAIN_NAME,
  CONTRACT_ADDRESS,
  DEMO_ABI,
  ProofResponse,
} from "../lib/airdrop";
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain } from "wagmi";
import { writeContract, readContract } from "wagmi/actions";
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

  const invitesRequired =
    claimCount !== null ? claimCount >= freeClaims : false;
  const invitesOpen = claimCount !== null ? claimCount >= freeClaims : false;
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

  const resetUi = () => {
    setClaimCount(null);
    setHasClaimed(false);
    setInvitedBy(null);
    setInvitesCreated(0);
    setInvitationSlots([]);
    setProof(null);
    setRecipient("");
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

      <header className="relative mx-auto max-w-5xl px-6 pt-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
          DEMO Merkle Airdrop · {CHAIN_NAME}
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
          Claim your DEMO with proof and invites
        </h1>
        <p className="mt-3 text-base text-slate-300 md:text-lg">
          Submit your claim and manage invitations once you&apos;re eligible.
        </p>
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
      </header>

      <section className="mx-auto max-w-6xl px-3 pt-4 md:px-4">
        <div className="glass w-full p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">How it works</p>
              <h3 className="text-lg font-semibold text-slate-50">Claim and invite</h3>
            </div>
            <button
              onClick={() => setShowHow((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-slate-100 hover:-translate-y-0.5"
            >
              {showHow ? "Hide steps" : "Show steps"}
            </button>
          </div>
          {showHow && (
            <ol className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-4">
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                1. Connect wallet on {CHAIN_NAME}.
              </li>
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                2. Check status to see if you can claim.
              </li>
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                3. Send your claim if eligible; choose where tokens go.
              </li>
              <li className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                4. After claiming, create invites when the invite phase opens.
              </li>
            </ol>
          )}
        </div>
      </section>

      <main className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 px-3 pb-14 pt-4 lg:grid-cols-2 lg:gap-6 lg:px-4">
        {!account ? (
          <div className="glass w-full p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">
                    Wallet
                  </p>
                  <p className="text-lg font-semibold">Not connected</p>
                  <p className="text-sm text-slate-400">Connect to view your status.</p>
                </div>
                <div className="flex gap-3">
                    <button
                      onClick={() => setShowProviderModal(true)}
                      disabled={connectors.length === 0}
                      className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      Connect wallet
                    </button>
                </div>
              </div>

              <div
                className={clsx(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
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
                <span className="leading-relaxed">{status.message}</span>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-slate-200">How it works</p>
                <ol className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>1. Connect wallet on {CHAIN_NAME}.</li>
                  <li>2. Refresh status to check if you can claim.</li>
                  <li>3. Claim on-chain if eligible.</li>
                  <li>4. After claiming, share invites when the invite phase starts.</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="glass w-full p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">
                      Wallet
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold font-mono text-slate-50 break-all">
                        {account ?? "Not connected"}
                      </p>
                      {account && (
                        <button
                          onClick={() => copyToClipboard(account, "account")}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-emerald-100 hover:-translate-y-0.5"
                        >
                          ⧉
                          {copiedKey === "account" && <span className="text-emerald-300">Copied</span>}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{networkLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowProviderModal(true)}
                      disabled={connectors.length === 0}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 sm:w-auto disabled:opacity-60"
                    >
                      {account ? "Switch wallet" : "Connect wallet"}
                    </button>
                    <button
                      onClick={() => refreshProof()}
                      disabled={!account}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-100 transition hover:-translate-y-0.5 sm:w-auto disabled:opacity-40"
                    >
                      Check status
                    </button>
                    <button
                      onClick={disconnectWallet}
                      disabled={!account}
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-semibold text-slate-100 transition hover:-translate-y-0.5 sm:w-auto disabled:opacity-40"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div
                    className={clsx(
                      "flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm",
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
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs text-slate-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                      →
                    </span>
                    <span className="font-medium">Next step:</span>
                    <span className="text-slate-100 break-words">{nextStep}</span>
                    {(checkingProof || claiming || inviting) && (
                      <span className="ml-2 h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" />
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                  <Stat
                    label="Total claims"
                    value={claimCount !== null ? claimCount.toString() : "—"}
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Eligibility
                      </p>
                      <p className="text-xs text-slate-400">
                        Connect your wallet to check if you can claim.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => refreshProof()}
                        disabled={!account || checkingProof}
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 sm:w-auto disabled:opacity-50"
                      >
                        {checkingProof ? "Checking…" : "Check status"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-slate-300">
                    {account && hasClaimed && "You already claimed with this wallet."}
                    {account && !hasClaimed && proof && !invitesRequired && "You can claim with this wallet."}
                    {account && !hasClaimed && proof && invitesRequired && invitedBy && "You are invited and can claim."}
                    {account && !hasClaimed && invitesRequired && !invitedBy && "You are qualified, but you need an invitation to claim right now."}
                    {account && !proof && !checkingProof && !hasClaimed && "Refresh to check your eligibility."}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={claim}
                      disabled={!canClaim}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 sm:w-auto disabled:opacity-50"
                    >
                      {claiming ? "Sending…" : "Send claim"}
                    </button>
                    {claimDisabledReason && (
                      <p className="text-xs text-amber-200">{claimDisabledReason}</p>
                )}
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
              </div>
            </div>
          </div>
            </div>

            <div className="glass w-full space-y-6 p-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">
              Invitations
            </p>
            <h3 className="text-xl font-semibold">Share access after you claim</h3>
            <p className="mt-2 text-sm text-slate-400">
              Once you have claimed, you can create up to {maxInvites} invitations. The invite phase controls when invites are available.
            </p>
            {!invitesOpen && (
              <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Invite phase has not started yet.
              </p>
            )}
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
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-slate-200">Your status</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <InfoRow
                    label="Invited by"
                    value={invitedBy ?? "No inviter"}
                    copyValue={invitedBy ?? undefined}
                    monospace
                    onCopy={
                      invitedBy ? () => copyToClipboard(invitedBy, "invitedBy") : undefined
                    }
                    copied={copiedKey === "invitedBy"}
                  />
                  <InfoRow label="Invites created" value={`${invitesCreated} / ${maxInvites}`} />
                </div>
              </div>

	              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
	                <p className="text-sm font-semibold text-slate-200">Invitation slots</p>
	                <p className="mt-1 text-xs text-slate-400">
	                  You have {maxInvites} fixed slots. Create uses the next open slot; revoke frees an unused one.
	                </p>
	                <p className="mt-2 text-xs text-slate-300">
	                  Summary:{" "}
	                  {normalizedSlots.filter((s) => s.invitee && s.used).length} used ·{" "}
	                  {normalizedSlots.filter((s) => s.invitee && !s.used).length} reserved ·{" "}
	                  {maxInvites -
	                    normalizedSlots.filter((s) => s.invitee && s.used).length -
	                    normalizedSlots.filter((s) => s.invitee && !s.used).length}{" "}
	                  open
	                </p>

                <div className="mt-3 grid gap-2">
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
                          <div className="mt-2 flex items-center gap-2 font-mono text-[13px] text-slate-100 break-all">
                            <span>{slot.invitee}</span>
                            <button
                              onClick={() => copyToClipboard(slot.invitee!, `slot-${idx}`)}
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:-translate-y-0.5"
                            >
                              ⧉
                              {copiedKey === `slot-${idx}` && (
                                <span className="text-emerald-300">Copied</span>
                              )}
                            </button>
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
                    Requires that you have already claimed. Invites unlock when the invite phase starts. Revoke before a claim to free a slot; claimed invites stay locked.
                  </p>
                </div>
              </div>
            </>
	          )}
	          </div>
	          </>
	        )}
	      </main>
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
