import { envSchema } from "./validators";
import { logger } from "./logger";

function validateEnv() {
    try {
        const env = envSchema.parse({
            NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
            NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
            NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
            NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME,
            NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
        });
        return env;
    } catch (error) {
        logger.error("❌ Invalid environment variables:", error);
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            throw new Error("Missing required environment variables. Please check your .env configuration.");
        }
        logger.error("⚠️  Using localhost defaults for development only.");
        return {
            NEXT_PUBLIC_API_BASE: "http://localhost:3000",
            NEXT_PUBLIC_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
            NEXT_PUBLIC_CHAIN_ID: "11155111",
            NEXT_PUBLIC_CHAIN_NAME: "Sepolia",
            NEXT_PUBLIC_RPC_URL: "https://1rpc.io/sepolia",
        };
    }
}

const env = validateEnv();

export const API_BASE = env.NEXT_PUBLIC_API_BASE;
export const CONTRACT_ADDRESS = env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const CHAIN_ID = Number(env.NEXT_PUBLIC_CHAIN_ID) as 11155111;
export const CHAIN_NAME = env.NEXT_PUBLIC_CHAIN_NAME;
export const RPC_URL = env.NEXT_PUBLIC_RPC_URL;
