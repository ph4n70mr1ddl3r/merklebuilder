import { useCallback, useState } from "react";
import { getAddress } from "ethers";
import { API_BASE } from "../lib/env";
import { ProofResponseSchema } from "../lib/validators";
import type { ProofResponse } from "../lib/types";

export function useProof() {
    const [proof, setProof] = useState<ProofResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProof = useCallback(async (address: string): Promise<ProofResponse | null> => {
        if (!address) {
            setError("No address provided");
            return null;
        }

        setIsLoading(true);
        setError(null);
        setProof(null);

        try {
            const res = await fetch(`${API_BASE}/proof/${address}`);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Not in airdrop list (${text || res.status})`);
            }

            const data = await res.json();

            // Validate response structure
            const validatedData = ProofResponseSchema.parse(data);

            // Verify the proof is for the correct address
            const normalizedTarget = getAddress(address);
            const proofAddress = getAddress(validatedData.address);

            if (normalizedTarget !== proofAddress) {
                throw new Error(`Proof mismatch: expected ${normalizedTarget}, got ${proofAddress}`);
            }

            setProof(validatedData);
            return validatedData;
        } catch (err: any) {
            const errorMessage = err?.message || "Failed to fetch proof";
            setError(errorMessage);
            console.error("Proof fetch error:", err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearProof = useCallback(() => {
        setProof(null);
        setError(null);
    }, []);

    return {
        proof,
        isLoading,
        error,
        fetchProof,
        clearProof,
    };
}
