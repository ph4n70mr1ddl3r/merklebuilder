'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  BrowserProvider,
  Contract,
  ZeroAddress,
  getAddress,
  isAddress,
} from "ethers";
import {
  API_BASE,
  CHAIN_ID,
  CHAIN_NAME,
  CONTRACT_ADDRESS,
  DEMO_ABI,
  ProofResponse,
} from "../lib/airdrop";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type Tone = "info" | "good" | "bad";
type ProviderSource = "eip6963" | "injected";

type ProviderOption = {
  id: string;
  name: string;
  rdns?: string;
  icon?: string;
  provider: any;
  source: ProviderSource;
};

type Eip6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: any;
};

const shorten = (addr?: string | null) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

const hexChainId = `0x${CHAIN_ID.toString(16)}`;

export default function HomePage() {
  const [status, setStatus] = useState<{ tone: Tone; message: string }>({
    tone: "info",
    message: "Connect your wallet to begin.",
  });
  const [walletProviders, setWalletProviders] = useState<ProviderOption[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
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

  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [checkingProof, setCheckingProof] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [invitee, setInvitee] = useState("");
  const [inviting, setInviting] = useState(false);
  const [revokingSlot, setRevokingSlot] = useState<number | null>(null);
  const [lookup, setLookup] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipient, setRecipient] = useState("");

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
    !!contract &&
    !claiming;
  const proofNeeded = !hasClaimed;

  const statusToneClasses = useMemo(
    () => ({
      info: "border-slate-600/60 bg-slate-800/40 text-slate-200",
      good: "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
      bad: "border-red-500/50 bg-red-500/10 text-red-100",
    }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = new Set<string>();
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
      if (!detail?.info?.uuid || seen.has(detail.info.uuid)) return;
      seen.add(detail.info.uuid);
      setWalletProviders((prev) => {
        if (prev.some((p) => p.id === detail.info.uuid)) return prev;
        return [
          ...prev,
          {
            id: detail.info.uuid,
            name: detail.info.name,
            rdns: detail.info.rdns,
            icon: detail.info.icon,
            provider: detail.provider,
            source: "eip6963",
          },
        ];
      });
      setSelectedProviderId((prev) => prev ?? detail.info.uuid);
    };

    window.addEventListener("eip6963:announceProvider", handler as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const injected = (window as any).ethereum;
    if (injected) {
      setWalletProviders((prev) => {
        if (prev.some((p) => p.id === "injected")) return prev;
        return [
          ...prev,
          {
            id: "injected",
            name: "Injected (window.ethereum)",
            provider: injected,
            source: "injected",
          },
        ];
      });
      setSelectedProviderId((prev) => prev ?? "injected");
    }

    return () => {
      window.removeEventListener("eip6963:announceProvider", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const current =
      walletProviders.find((p) => p.id === selectedProviderId)?.provider ??
      walletProviders[0]?.provider;
    if (!current?.on) return;
    const handler = (accounts: string[]) => {
      resetConnection();
      if (!accounts || accounts.length === 0) {
        setStatus({ tone: "bad", message: "Wallet disconnected." });
      } else {
        setStatus({
          tone: "info",
          message: "Wallet switched. Connect again to load status for the new account.",
        });
      }
    };
    const chainHandler = () => window.location.reload();
    current.on("accountsChanged", handler);
    current.on("chainChanged", chainHandler);
    return () => {
      if (current?.removeListener) {
        current.removeListener("accountsChanged", handler);
        current.removeListener("chainChanged", chainHandler);
      } else if (current?.off) {
        current.off("accountsChanged", handler);
        current.off("chainChanged", chainHandler);
      }
    };
  }, [walletProviders, selectedProviderId]);

  const resetConnection = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setHasClaimed(false);
    setInvitedBy(null);
    setInvitesCreated(0);
    setProof(null);
    setRecipient("");
  };

  const disconnectWallet = () => {
    resetConnection();
    setStatus({
      tone: "info",
      message: "Disconnected. Select a wallet provider and connect again.",
    });
  };

  const ensureNetwork = async (prov: BrowserProvider) => {
    const net = await prov.getNetwork();
    if (net.chainId === BigInt(CHAIN_ID)) {
      setNetworkLabel(`${CHAIN_NAME} (${net.chainId.toString()})`);
      return;
    }

    try {
      await prov.send("wallet_switchEthereumChain", [{ chainId: hexChainId }]);
    } catch (switchErr: any) {
      if (switchErr?.code === 4902) {
        await prov.send("wallet_addEthereumChain", [
          {
            chainId: hexChainId,
            chainName: CHAIN_NAME,
            nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ]);
      } else {
        throw switchErr;
      }
    }

    const finalNet = await prov.getNetwork();
    setNetworkLabel(`${CHAIN_NAME} (${finalNet.chainId.toString()})`);
  };

  const connectWallet = async () => {
    setShowProviderModal(false);
    const selected =
      walletProviders.find((p) => p.id === selectedProviderId)?.provider ??
      walletProviders[0]?.provider;

    if (!selected) {
      setStatus({
        tone: "bad",
        message: "No wallet provider found. Open a wallet that supports EIP-6963.",
      });
      return;
    }

    try {
      setStatus({ tone: "info", message: "Connecting wallet…" });
      const prov = new BrowserProvider(selected);
      await prov.send("eth_requestAccounts", []);
      await ensureNetwork(prov);
      const signer = await prov.getSigner();
      const address = await signer.getAddress();

      const code = await prov.getCode(CONTRACT_ADDRESS);
      if (!code || code === "0x") {
        setAccount(address);
        setProvider(prov);
        setContract(null);
        setStatus({
          tone: "bad",
          message: `No contract found at ${shorten(
            CONTRACT_ADDRESS
          )}. Check your .env settings or deployment.`,
        });
        return;
      }

      const ctr = new Contract(CONTRACT_ADDRESS, DEMO_ABI, signer);
      try {
        await ctr.claimCount();
      } catch (probeErr: any) {
        console.error("Contract probe failed", probeErr);
        setAccount(address);
        setProvider(prov);
        setContract(null);
        setStatus({
          tone: "bad",
          message:
            "Connected, but the contract at the configured address does not match the expected ABI. Check the address/chain.",
        });
        return;
      }

      setProvider(prov);
      setContract(ctr);
      setAccount(address);
      setRecipient(address);
      setStatus({ tone: "good", message: "Wallet connected. Fetching proof…" });
      await refreshOnChain(address, ctr);
      await refreshProof(address, ctr);
    } catch (err: any) {
      console.error(err);
      setStatus({
        tone: "bad",
        message: err?.message || "Unable to connect wallet.",
      });
    }
  };

  const refreshOnChain = async (addr?: string, ctr?: Contract | null) => {
    if (!addr && !account) return;
    const target = addr ?? account;
    const liveContract = ctr ?? contract;
    if (!target || !liveContract) return;
    try {
      const [claimed, inviter, created, count, free, max, slots] = await Promise.all([
        liveContract.hasClaimed(target),
        liveContract.invitedBy(target),
        liveContract.invitesCreated(target),
        liveContract.claimCount(),
        liveContract.FREE_CLAIMS(),
        liveContract.MAX_INVITES(),
        liveContract.getInvitations(target),
      ]);
      setHasClaimed(Boolean(claimed));
      setInvitedBy(inviter === ZeroAddress ? null : inviter);
      setInvitesCreated(Number(created));
      setClaimCount(Number(count));
      setFreeClaims(Number(free));
      setMaxInvites(Number(max));
      const invitees =
        (slots && (slots as any).invitees ? ((slots as any).invitees as string[]) : undefined) ??
        (Array.isArray(slots?.[0]) ? (slots[0] as string[]) : []);
      const used =
        (slots && (slots as any).used ? ((slots as any).used as boolean[]) : undefined) ??
        (Array.isArray(slots?.[1]) ? (slots[1] as boolean[]) : []);
      const parsedSlots =
        invitees?.map((inv, idx) => ({
          invitee: inv && inv !== ZeroAddress ? inv : null,
          used: Boolean(used?.[idx]),
        })) ?? [];
      setInvitationSlots(parsedSlots);
    } catch (err: any) {
      console.error(err);
      const callFailed =
        err?.code === "CALL_EXCEPTION" ||
        err?.code === "BAD_DATA" ||
        err?.data === "0x";
      setStatus({
        tone: "bad",
        message: callFailed
          ? "Unable to read contract state. Is the contract deployed at this address?"
          : err?.message || "Failed to read on-chain state.",
      });
      setContract(null);
    }
  };

  const refreshProof = async (addressOverride?: string, ctr?: Contract | null) => {
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

      const liveContract = ctr ?? contract;
      let claimed = hasClaimed;
      let inviterAddr: string | null = invitedBy;
      if (liveContract) {
        const [claimedOnChain, inviterOnChain] = await Promise.all([
          liveContract.hasClaimed(target),
          liveContract.invitedBy(target),
        ]);
        claimed = Boolean(claimedOnChain);
        setHasClaimed(claimed);
        inviterAddr = inviterOnChain === ZeroAddress ? null : inviterOnChain;
        setInvitedBy(inviterAddr);
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
    if (!contract || !proof || !account) return;
    if (invitesRequired && !invitedBy) {
      setStatus({ tone: "bad", message: "An invitation is required to claim now." });
      return;
    }
    const recipientAddr = recipient.trim() || account;
    if (!isAddress(recipientAddr) || recipientAddr === ZeroAddress) {
      setStatus({ tone: "bad", message: "Enter a valid recipient address." });
      return;
    }
    try {
      setClaiming(true);
      setStatus({ tone: "info", message: "Submitting claim transaction…" });
      const tx = await contract.claimTo(
        recipientAddr,
        proof.proof.map((p) => p.hash),
        proof.proof_flags
      );
      setStatus({
        tone: "info",
        message: `Tx sent: ${tx.hash.slice(0, 10)}… waiting for confirmation.`,
      });
      await tx.wait();
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
    if (!contract || !account) return;
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
    try {
      setInviting(true);
      setStatus({ tone: "info", message: "Creating invitation…" });
      const tx = await contract.createInvitation(invitee);
      setStatus({
        tone: "info",
        message: `Tx sent: ${tx.hash.slice(0, 10)}… waiting for confirmation.`,
      });
      await tx.wait();
      setStatus({ tone: "good", message: "Invitation created." });
      setInvitee("");
      await refreshOnChain(account);
    } catch (err: any) {
      console.error(err);
      setStatus({
        tone: "bad",
        message: err?.message || "Failed to create invitation.",
      });
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (slotIndex: number) => {
    if (!contract || !account) return;
    const slot = invitationSlots[slotIndex];
    if (!slot?.invitee) {
      setStatus({ tone: "bad", message: "Slot is empty; nothing to revoke." });
      return;
    }
    try {
      setRevokingSlot(slotIndex);
      setStatus({ tone: "info", message: "Revoking invitation…" });
      const tx = await contract.revokeInvitation(slotIndex);
      setStatus({
        tone: "info",
        message: `Tx sent: ${tx.hash.slice(0, 10)}… waiting for confirmation.`,
      });
      await tx.wait();
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
    if (invitesRequired && !invitedBy) return "Invitation required to claim now.";
    if (!contract) return "Contract unavailable; reconnect wallet.";
    return null;
  }, [account, contract, hasClaimed, invitesRequired, invitedBy, proof]);

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
        <p className="mt-3 text-lg text-slate-300 md:text-xl">
          Fetch your Merkle proof from the REST API, submit a claim on-chain, and
          share up to five invitations once you&apos;ve claimed.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-300">
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
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            Proof API: <span className="font-mono text-emerald-300">{API_BASE}</span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-14 pt-8 md:flex-row">
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
                    disabled={walletProviders.length === 0}
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
            <div className="glass w-full p-6 md:w-2/3">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">
                      Wallet
                    </p>
                    <p className="text-lg font-semibold">
                      {account ? shorten(account) : "Not connected"}
                    </p>
                    <p className="text-sm text-slate-400">{networkLabel}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowProviderModal(true)}
                      disabled={walletProviders.length === 0}
                      className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {account ? "Switch wallet" : "Connect wallet"}
                    </button>
                    <button
                      onClick={() => refreshProof()}
                      disabled={!account}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:opacity-40"
                    >
                      Refresh proof
                    </button>
                    <button
                      onClick={disconnectWallet}
                      disabled={!account}
                      className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:opacity-40"
                    >
                      Disconnect
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

                <div className="grid gap-3 md:grid-cols-3">
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
                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {checkingProof ? "Checking…" : "Refresh status"}
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
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {claiming ? "Claiming…" : "Claim 100 DEMO"}
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
                    Default is your connected wallet. You can redirect the claim to another address.
                  </p>
                </div>
              </div>
            </div>
          </div>
            </div>

            <div className="glass w-full space-y-6 p-6 md:w-1/3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">
              Invitations
            </p>
            <h3 className="text-xl font-semibold">Share access after you claim</h3>
            <p className="mt-2 text-sm text-slate-400">
              Once you have claimed, you can create up to {maxInvites} invitations. Invitations open when the invite phase starts.
            </p>
            {!invitesOpen && (
              <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Early-claim phase active. Invites unlock soon.
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
                  <InfoRow label="Invited by" value={invitedBy ? shorten(invitedBy) : "No inviter"} />
                  <InfoRow label="Invites created" value={`${invitesCreated} / ${maxInvites}`} />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-slate-200">Invitation slots</p>
                <p className="mt-1 text-xs text-slate-400">
                  You have {maxInvites} fixed slots. Create uses the next open slot; revoke frees an unused one.
                </p>

                <div className="mt-3 grid gap-2">
                  {normalizedSlots.map((slot, idx) => {
                    const isPending = slot.invitee && !slot.used;
                    const isUsed = slot.invitee && slot.used;
                    return (
                      <div
                        key={`slot-${idx}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm"
                      >
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Slot {idx + 1}</p>
                          <p className="font-semibold text-slate-100">
                            {isUsed
                              ? `Claimed by ${shorten(slot.invitee)}`
                              : isPending
                              ? `Reserved for ${shorten(slot.invitee)}`
                              : "Unused"}
                          </p>
                          {isPending && (
                            <p className="text-xs text-slate-400">Waiting for invitee to claim.</p>
                          )}
                          {isUsed && <p className="text-xs text-slate-400">Invite consumed.</p>}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {isPending && (
                            <button
                              onClick={() => revokeInvite(idx)}
                              disabled={!account || revokingSlot === idx}
                              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:opacity-50"
                            >
                              {revokingSlot === idx ? "Revoking…" : "Revoke"}
                            </button>
                          )}
                          {isUsed && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                              Used
                            </span>
                          )}
                          {!slot.invitee && (
                            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                              Open
                            </span>
                          )}
                        </div>
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
                      className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
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

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-slate-200">How it works</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-300">
              <li>1. Connect wallet on {CHAIN_NAME}.</li>
              <li>2. Fetch your Merkle proof from the API.</li>
              <li>3. Claim on-chain (proof required while claimable).</li>
              <li>4. After claiming, share up to {maxInvites} invites and earn referral rewards automatically.</li>
            </ol>
          </div>
          </div>
          </>
        )}
      </main>
      <ProviderModal
        open={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        providers={walletProviders}
        selectedId={selectedProviderId ?? walletProviders[0]?.id ?? null}
        onSelect={(id) => setSelectedProviderId(id)}
        onConnect={connectWallet}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/60 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function ProviderModal({
  open,
  onClose,
  providers,
  selectedId,
  onSelect,
  onConnect,
}: {
  open: boolean;
  onClose: () => void;
  providers: ProviderOption[];
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

        {providers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            Waiting for wallets (EIP-6963 broadcast). Open your wallet extension.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {providers.map((p) => (
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
                  {p.icon && (
                    <img src={p.icon} alt={p.name} className="h-8 w-8 rounded-full border border-white/10" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p.source === "eip6963" && p.rdns ? p.rdns : "Injected provider"}
                    </p>
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
            disabled={providers.length === 0}
            className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
