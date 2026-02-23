import { useState, useCallback, useEffect, useRef } from 'react';
import { getAddress, ZeroAddress } from 'ethers';
import { toast } from 'sonner';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '../lib/wagmi';
import { CONTRACT_ADDRESS, DEMO_ABI, API_BASE, ProofResponse } from '../lib/airdrop';
import { shorten } from '../lib/format';
import { logger } from '../lib/logger';
import { getCachedProof, setCachedProof, normalizeAddress } from '../lib/utils';
import { ProofResponseSchema } from '../lib/validators';

type GetInvitationsResult = [string[], boolean[]];
const API_TIMEOUT_MS = 10000;

async function validateProofOnChain(address: string, proof: ProofResponse): Promise<boolean> {
    try {
        const isValidHashFormat = /^0x[a-fA-F0-9]{64}$/.test(proof.leaf) &&
            proof.proof.every(p => /^0x[a-fA-F0-9]{64}$/.test(p.hash));
        if (!isValidHashFormat) {
            return false;
        }

        const proofHashes = proof.proof.map((p) => p.hash as `0x${string}`);
        const proofFlags = proof.proof_flags;

        const isEligible = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: DEMO_ABI,
            functionName: "isEligible",
            args: [address as `0x${string}`, proofHashes, proofFlags],
        });

        return Boolean(isEligible);
    } catch (error) {
        logger.error("On-chain validation error:", { error, address });
        return false;
    }
}

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
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

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

            if (!isMountedRef.current) return;

            const slotsArray = Array.isArray(slots) ? slots : [];
            const result = slotsArray as GetInvitationsResult;
            const invitees = Array.isArray(result[0]) ? result[0] : [];
            const used = Array.isArray(result[1]) ? result[1] : [];
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
            if (isMountedRef.current) {
                toast.error("Failed to refresh chain data");
            }
        }
    }, [account]);

    const refreshProof = useCallback(async (addressOverride?: string, skipCache = false) => {
        const target = addressOverride || account;
        if (!target) {
            toast.info("Connect your wallet to fetch proof.");
            return;
        }

        const normalizedTarget = normalizeAddress(target);
        if (!normalizedTarget) {
            toast.error("Invalid address format");
            return;
        }

        if (!skipCache) {
            const cached = getCachedProof(normalizedTarget);
            if (cached) {
                try {
                    const isValid = await validateProofOnChain(normalizedTarget, cached);
                    if (!isMountedRef.current) return;
                    
                    if (isValid) {
                        setProof(cached);
                        setHasCheckedEligibility(true);
                        toast.success("Loaded cached eligibility data");
                        refreshOnChain(target);
                        return;
                    } else {
                        logger.warn("Cached proof failed validation, fetching fresh");
                    }
                } catch (error) {
                    logger.warn("Failed to validate cached proof", error);
                }
            }
        }

        if (!isMountedRef.current) return;
        setCheckingProof(true);
        setProof(null);
        setHasCheckedEligibility(false);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

        try {
            const res = await fetch(`${API_BASE}/proof/${target}`, {
                signal: controller.signal,
            });
            
            if (!isMountedRef.current) return;
            
            if (!res.ok) {
                toast.error(`Not eligible for airdrop`);
                setProof(null);
                setHasCheckedEligibility(true);
                return;
            }

            const rawData = await res.text();
            const data = JSON.parse(rawData);
            const validatedData = ProofResponseSchema.parse(data);

            const proofAddress = normalizeAddress(validatedData.address);
            if (normalizedTarget !== proofAddress) {
                toast.error(`Proof is for ${shorten(proofAddress ?? '')}. Connect that wallet to claim.`);
                setProof(null);
                setHasCheckedEligibility(true);
                return;
            }

            const isValid = await validateProofOnChain(normalizedTarget, validatedData);
            if (!isMountedRef.current) return;
            
            if (!isValid) {
                toast.error("Proof validation failed on-chain");
                setProof(null);
                setHasCheckedEligibility(true);
                return;
            }

            setProof(validatedData);
            setHasCheckedEligibility(true);
            setCachedProof(normalizedTarget, validatedData);

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

                if (!isMountedRef.current) return;

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
            if (!isMountedRef.current) return;
            if (err instanceof Error && err.name === 'AbortError') {
                toast.error("Request timeout - please try again");
            } else {
                logger.error("Failed to fetch proof", err);
                toast.error("Failed to fetch proof.");
            }
        } finally {
            clearTimeout(timeoutId);
            if (isMountedRef.current) {
                setCheckingProof(false);
            }
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
