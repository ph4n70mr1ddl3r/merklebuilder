import { envSchema } from "./validators";
import { logger } from "./logger";

interface EnvConfig {
    NEXT_PUBLIC_API_BASE: string;
    NEXT_PUBLIC_CONTRACT_ADDRESS: string;
    NEXT_PUBLIC_CHAIN_ID: string;
    NEXT_PUBLIC_CHAIN_NAME: string;
    NEXT_PUBLIC_RPC_URL: string;
    NEXT_PUBLIC_BLOCK_EXPLORER_URL?: string;
}

const DEV_DEFAULTS: EnvConfig = {
    NEXT_PUBLIC_API_BASE: "http://localhost:3000",
    NEXT_PUBLIC_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
    NEXT_PUBLIC_CHAIN_ID: "11155111",
    NEXT_PUBLIC_CHAIN_NAME: "Sepolia",
    NEXT_PUBLIC_RPC_URL: "https://1rpc.io/sepolia",
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: "https://sepolia.etherscan.io",
};

function validateEnv(): EnvConfig {
    try {
        const env = envSchema.parse({
            NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
            NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
            NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
            NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME,
            NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
        });
        return {
            ...env,
            NEXT_PUBLIC_BLOCK_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL,
        };
    } catch (error) {
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            logger.error("❌ Invalid environment variables:", error);
            throw new Error("Missing required environment variables. Please check your .env configuration.");
        }
        logger.warn("⚠️  Environment validation failed. Using localhost defaults for development only.");
        logger.warn("   Set up a proper .env.local file for production-like behavior.");
        return DEV_DEFAULTS;
    }
}

const env = validateEnv();

const DEFAULT_CHAIN_ID = 11155111;

function parseChainId(value: string | undefined): number {
    if (!value) return DEFAULT_CHAIN_ID;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_CHAIN_ID;
}

export const CHAIN_ID = parseChainId(env.NEXT_PUBLIC_CHAIN_ID);
export const API_BASE = env.NEXT_PUBLIC_API_BASE;
export const CONTRACT_ADDRESS = env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const CHAIN_NAME = env.NEXT_PUBLIC_CHAIN_NAME;
export const RPC_URL = env.NEXT_PUBLIC_RPC_URL;
export const BLOCK_EXPLORER_URL = env.NEXT_PUBLIC_BLOCK_EXPLORER_URL;
