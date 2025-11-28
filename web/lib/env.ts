import { envSchema } from "./validators";

function validateEnv() {
    try {
        return envSchema.parse({
            NEXT_PUBLIC_API_BASE:
                process.env.NEXT_PUBLIC_API_BASE ?? "http://18.143.177.167:3000",
            NEXT_PUBLIC_CONTRACT_ADDRESS:
                process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
                "0x20E6EaD47195aBE822B6414F507df0EA1876EA34",
            NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111",
            NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Sepolia",
        });
    } catch (error) {
        console.error("❌ Invalid environment variables:", error);
        // Return defaults in case of validation failure to prevent app crash
        return {
            NEXT_PUBLIC_API_BASE: "http://18.143.177.167:3000",
            NEXT_PUBLIC_CONTRACT_ADDRESS: "0x20E6EaD47195aBE822B6414F507df0EA1876EA34",
            NEXT_PUBLIC_CHAIN_ID: "11155111",
            NEXT_PUBLIC_CHAIN_NAME: "Sepolia",
        };
    }
}

const env = validateEnv();

export const API_BASE = env.NEXT_PUBLIC_API_BASE;
export const CONTRACT_ADDRESS = env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const CHAIN_ID = Number(env.NEXT_PUBLIC_CHAIN_ID) as 11155111;
export const CHAIN_NAME = env.NEXT_PUBLIC_CHAIN_NAME;
