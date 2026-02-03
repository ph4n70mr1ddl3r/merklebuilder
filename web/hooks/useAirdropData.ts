import { useState, useCallback } from 'react';
import { getAddress, ZeroAddress } from 'ethers';
import { toast } from 'sonner';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '../lib/wagmi';
import { CONTRACT_ADDRESS, DEMO_ABI, API_BASE, ProofResponse } from '../lib/airdrop';
import { shorten } from '../lib/format';
import { logger } from '../lib/logger';

export function useAirdropData(account?: string) {
    const [claimCount, setClaimCount] = useState<number | null>(null);
    const [freeClaims, setFreeClaims] = useState<number>(2);
    const [maxInvites, setMaxInvites] = useState<number>(5);
    const [hasClaimed, setHasClaimed] = useState(false);
    const [invitedBy, setInvitedBy] = useState<string | null>(null);
    const [invitesCreated, setInvitesCreated] = useState<number>(0);
    const [invitationSlots, setInvitationSlots] = useState<{ invitee: string | null; used: boolean }[]>([]);
    const [proof, setProof] = useState<ProofResponse | null>(null);
    const [checkingProof, setCheckingProof] = useState(false);
    const [hasCheckedEligibility, setHasCheckedEligibility] = useState(false);

    const refreshOnChain = useCallback(async (addr?: string) => {
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

            const slotsArray = Array.isArray(slots) ? slots : [];
            const invitees = Array.isArray(slotsArray[0]) ? (slotsArray[0] as string[]) : [];
            const used = Array.isArray(slotsArray[1]) ? (slotsArray[1] as boolean[]) : [];
            const parsedSlots = invitees?.map((inv, idx) => ({
                invitee: inv && inv !== ZeroAddress ? inv : null,
                used: Boolean(used?.[idx]),
            })) ?? [];

            setHasClaimed(Boolean(claimed));
            setInvitedBy(inviter === ZeroAddress ? null : inviter);
            setInvitesCreated(Number(created));
            setClaimCount(Number(count));
            setFreeClaims(Number(free));
            setMaxInvites(Number(max));
            setInvitationSlots(parsedSlots);
        } catch (err) {
            logger.error("Failed to read on-chain state", err);
            toast.error("Failed to refresh chain data");
        }
    }, [account]);

    const refreshProof = useCallback(async (addressOverride?: string, skipCache = false) => {
        const target = addressOverride || account;
        if (!target) {
            toast.info("Connect your wallet to fetch proof.");
            return;
        }

        if (!skipCache) {
            try {
                const cached = localStorage.getItem(`demo-proof-${getAddress(target).toLowerCase()}`);
                if (cached) {
                    const data = JSON.parse(cached);
                    // Handle null cache (not eligible)
                    if (data === null) {
                        setProof(null);
                        setHasCheckedEligibility(true);
                        return;
                    }
                    setProof(data);
                    setHasCheckedEligibility(true);
                    toast.success("Loaded cached eligibility data");
                    refreshOnChain(target);
                    return;
                }
            } catch { }
        }

        setCheckingProof(true);
        setProof(null);
        setHasCheckedEligibility(false);

        try {
            const res = await fetch(`${API_BASE}/proof/${target}`);
            if (!res.ok) {
                toast.error(`Not eligible for airdrop`);
                setProof(null);
                setHasCheckedEligibility(true);
                try {
                    localStorage.setItem(`demo-proof-${getAddress(target).toLowerCase()}`, JSON.stringify(null));
                } catch { }
                return;
            }

            const data: ProofResponse = await res.json();
            const normalizedTarget = getAddress(target);
            const proofAddress = getAddress(data.address);

            if (normalizedTarget !== proofAddress) {
                toast.error(`Proof is for ${shorten(proofAddress)}. Connect that wallet to claim.`);
                setProof(null);
                setHasCheckedEligibility(true);
                return;
            }

            setProof(data);
            setHasCheckedEligibility(true);

            try {
                localStorage.setItem(`demo-proof-${normalizedTarget.toLowerCase()}`, JSON.stringify(data));
            } catch { }

            // Check claim status immediately after fetching proof
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

            const claimed = Boolean(claimedOnChain);
            setHasClaimed(claimed);
            const inviterAddr = inviterOnChain === ZeroAddress ? null : inviterOnChain;
            setInvitedBy(inviterAddr);

                if (claimed) {
                    toast.success("You've already claimed your tokens!");
                } else {
                    toast.success("🎉 You're eligible! You can claim now.");
                }
            } catch (innerErr) {
                logger.error("Failed to check claim status", innerErr);
            }

        } catch (err) {
            logger.error("Failed to fetch proof", err);
            toast.error("Failed to fetch proof.");
        } finally {
            setCheckingProof(false);
        }
    }, [account, refreshOnChain]);

    return {
        claimCount,
        freeClaims,
        maxInvites,
        hasClaimed,
        invitedBy,
        invitesCreated,
        invitationSlots,
        proof,
        checkingProof,
        hasCheckedEligibility,
        refreshOnChain,
        refreshProof,
    };
}
