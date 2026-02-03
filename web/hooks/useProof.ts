import { useCallback, useState } from "react";
import { readContract } from "wagmi/actions";
import { wagmiConfig } from "../lib/wagmi";
import { API_BASE, CONTRACT_ADDRESS } from "../lib/env";
import { ProofResponseSchema } from "../lib/validators";
import { normalizeAddress, getCachedProof, setCachedProof } from "../lib/utils";
import { DEMO_ABI } from "../lib/airdrop";
import type { ProofResponse } from "../lib/types";
import { logger } from "../lib/logger";

export function useProof() {
    const [proof, setProof] = useState<ProofResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isValidated, setIsValidated] = useState(false);

    const fetchProof = useCallback(async (address: string, skipCache = false): Promise<ProofResponse | null> => {
        if (!address) {
            setError("No address provided");
            return null;
        }

        const normalizedAddress = normalizeAddress(address);
        if (!normalizedAddress) {
            setError("Invalid address format");
            return null;
        }

        setIsLoading(true);
        setError(null);
        setProof(null);
        setIsValidated(false);

        try {
            // Check cache first
            if (!skipCache) {
                const cached = getCachedProof(normalizedAddress);
                if (cached) {
                    logger.info("Using cached proof for", normalizedAddress);
                    setProof(cached);
                    setIsLoading(false);
                    
                    // Validate cached proof in background
                    validateProofOnChain(normalizedAddress, cached).then((valid) => {
                        setIsValidated(valid);
                        if (!valid) {
                            setError("Cached proof validation failed - please retry");
                        }
                    });
                    
                    return cached;
                }
            }

            // Fetch from API
            const res = await fetch(`${API_BASE}/proof/${normalizedAddress}`);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Not in airdrop list (${text || res.status})`);
            }

            const data = await res.json();

            // Validate response structure
            const validatedData = ProofResponseSchema.parse(data);

            // Verify the proof is for the correct address
            const proofAddress = normalizeAddress(validatedData.address);
            if (normalizedAddress !== proofAddress) {
                throw new Error(`Proof mismatch: expected ${normalizedAddress}, got ${proofAddress}`);
            }

            // Validate proof on-chain
            const isValid = await validateProofOnChain(normalizedAddress, validatedData);
            if (!isValid) {
                throw new Error("Proof validation failed on-chain");
            }

            setIsValidated(true);
            setProof(validatedData);
            
            // Cache the validated proof
            setCachedProof(normalizedAddress, validatedData);
            
            return validatedData;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch proof";
            setError(errorMessage);
            logger.error("Proof fetch error:", err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearProof = useCallback(() => {
        setProof(null);
        setError(null);
        setIsValidated(false);
    }, []);

    return {
        proof,
        isLoading,
        error,
        isValidated,
        fetchProof,
        clearProof,
    };
}

/**
 * Validate proof on-chain using contract's isEligible function
 */
async function validateProofOnChain(
    address: string,
    proof: ProofResponse
): Promise<boolean> {
    try {
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
        logger.error("On-chain validation error:", error);
        return false;
    }
}
