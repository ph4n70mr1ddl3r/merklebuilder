import { z } from "zod";
import { isAddress } from "ethers";

export const envSchema = z.object({
    NEXT_PUBLIC_API_BASE: z.string().url(),
    NEXT_PUBLIC_CONTRACT_ADDRESS: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address format"),
    NEXT_PUBLIC_CHAIN_ID: z.string().regex(/^\d+$/, "Chain ID must be a number"),
    NEXT_PUBLIC_CHAIN_NAME: z.string().min(1, "Chain name is required"),
});

export const addressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format")
    .refine((addr) => {
        try {
            return isAddress(addr);
        } catch {
            return false;
        }
    }, "Invalid address checksum");

export const amountSchema = z
    .string()
    .regex(/^\d+\.?\d*$/, "Invalid number format")
    .refine((val) => {
        const num = parseFloat(val);
        return num > 0;
    }, "Amount must be greater than zero");

export const slippageSchema = z
    .string()
    .regex(/^(\d{1,3})(?:\.(\d{0,2}))?$/, "Invalid slippage format")
    .refine((val) => {
        const match = val.match(/^(\d{1,3})(?:\.(\d{0,2}))?$/);
        if (!match) return false;
        const whole = Number(match[1]);
        return whole <= 100;
    }, "Slippage must be between 0 and 100");

export const ProofResponseSchema = z.object({
    address: z.string(),
    index: z.number(),
    total: z.number(),
    leaf: z.string(),
    root: z.string(),
    proof: z.array(
        z.object({
            hash: z.string(),
            side: z.enum(["left", "right"]).optional(),
            level: z.number().optional(),
            sibling_index: z.number().optional(),
        })
    ),
    proof_flags: z.array(z.boolean()),
});
