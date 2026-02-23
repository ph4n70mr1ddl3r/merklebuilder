import { readContract } from "wagmi/actions";
import { wagmiConfig } from "./wagmi";
import { CONTRACT_ADDRESS, DEMO_ABI } from "./airdrop";
import type { ProofResponse } from "./types";
import { logger } from "./logger";

export async function validateProofOnChain(address: string, proof: ProofResponse): Promise<boolean> {
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
        const errorDetails = error instanceof Error ? error.message : String(error);
        logger.error("On-chain validation error:", { error: errorDetails, address });
        return false;
    }
}
