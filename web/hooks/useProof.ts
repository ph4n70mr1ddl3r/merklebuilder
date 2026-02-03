import { useCallback, useState } from "react";
import { readContract } from "wagmi/actions";
import { wagmiConfig } from "../lib/wagmi";
import { API_BASE, CONTRACT_ADDRESS } from "../lib/env";
import { ProofResponseSchema } from "../lib/validators";
import { normalizeAddress, getCachedProof, setCachedProof } from "../lib/utils";
import { DEMO_ABI } from "../lib/airdrop";
import type { ProofResponse } from "../lib/types";
import { logger } from "../lib/logger";

const API_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;

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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

        try {
            // Check cache first
            if (!skipCache) {
                const cached = getCachedProof(normalizedAddress);
                if (cached) {
                    logger.info("Using cached proof for", normalizedAddress);
                    setProof(cached);
                    setIsLoading(false);

                    clearTimeout(timeoutId);

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

            let lastError: Error | null = null;

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const res = await fetch(`${API_BASE}/proof/${normalizedAddress}`, {
                        signal: controller.signal,
                    });

                    if (!res.ok) {
                        const text = await res.text();
                        throw new Error(`Not in airdrop list (${text || res.status})`);
                    }

                    const rawData = await res.text();
                    const data = JSON.parse(rawData);

                    // Validate response structure
                    const validatedData = ProofResponseSchema.parse(data);

                    const proofAddress = normalizeAddress(validatedData.address);
                    if (normalizedAddress !== proofAddress) {
                        throw new Error(`Proof mismatch: expected ${normalizedAddress}, got ${proofAddress}`);
                    }

                    const isValid = await validateProofOnChain(normalizedAddress, validatedData);
                    if (!isValid) {
                        throw new Error("Proof validation failed on-chain");
                    }

                    setIsValidated(true);
                    setProof(validatedData);
                    setCachedProof(normalizedAddress, validatedData);
                    return validatedData;
                } catch (fetchErr) {
                    lastError = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr));
                    if (attempt < MAX_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * RETRY_DELAY_BASE_MS));
                    }
                }
            }

            const errorMessage = lastError?.message || "Failed to fetch proof";
            if (lastError?.name === 'AbortError') {
                setError('Request timeout - please try again');
            } else {
                setError(errorMessage);
            }
            logger.error("Proof fetch error after retries:", lastError);
            return null;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch proof";
            setError(errorMessage);
            logger.error("Proof fetch error:", err);
            return null;
        } finally {
            clearTimeout(timeoutId);
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
        const isValidHashFormat = /^0x[a-fA-F0-9]{64}$/.test(proof.leaf) &&
            proof.proof.every(p => /^0x[a-fA-F0-9]{64}$/.test(p.hash));
        if (!isValidHashFormat) {
            throw new Error("Invalid hash format in proof");
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
        logger.error("On-chain validation error:", error);
        return false;
    }
}
