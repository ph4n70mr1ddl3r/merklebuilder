import { envSchema } from "./validators";
import { logger } from "./logger";

// Default values - used in development and as fallbacks
const DEFAULTS = {
    NEXT_PUBLIC_API_BASE: "http://18.143.177.167:3000",
    NEXT_PUBLIC_CONTRACT_ADDRESS: "0x79A01fbb895fd9d821BC1123339f8887B07D9458",
    NEXT_PUBLIC_CHAIN_ID: "11155111",
    NEXT_PUBLIC_CHAIN_NAME: "Sepolia",
    NEXT_PUBLIC_RPC_URL: "https://1rpc.io/sepolia",
};

function validateEnv() {
    try {
        return envSchema.parse({
            NEXT_PUBLIC_API_BASE:
                process.env.NEXT_PUBLIC_API_BASE ?? DEFAULTS.NEXT_PUBLIC_API_BASE,
            NEXT_PUBLIC_CONTRACT_ADDRESS:
                process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
                DEFAULTS.NEXT_PUBLIC_CONTRACT_ADDRESS,
            NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID ?? DEFAULTS.NEXT_PUBLIC_CHAIN_ID,
            NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME ?? DEFAULTS.NEXT_PUBLIC_CHAIN_NAME,
            NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL ?? DEFAULTS.NEXT_PUBLIC_RPC_URL,
        });
    } catch (error) {
        logger.error("❌ Invalid environment variables:", error);
        // Return defaults in case of validation failure to prevent app crash
        return DEFAULTS;
    }
}

const env = validateEnv();

export const API_BASE = env.NEXT_PUBLIC_API_BASE;
export const CONTRACT_ADDRESS = env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const CHAIN_ID = Number(env.NEXT_PUBLIC_CHAIN_ID) as 11155111;
export const CHAIN_NAME = env.NEXT_PUBLIC_CHAIN_NAME;
export const RPC_URL = env.NEXT_PUBLIC_RPC_URL;
