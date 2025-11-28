import { describe, it, expect } from 'vitest';
import {
    addressSchema,
    amountSchema,
    slippageSchema,
    envSchema
} from '../lib/validators';

describe('validators', () => {
    describe('addressSchema', () => {
        it('should validate correct Ethereum address', () => {
            const result = addressSchema.safeParse('0x20E6EaD47195aBE822B6414F507df0EA1876EA34');
            expect(result.success).toBe(true);
        });

        it('should reject invalid address format', () => {
            const result = addressSchema.safeParse('0x123');
            expect(result.success).toBe(false);
        });

        it('should reject non-hex characters', () => {
            const result = addressSchema.safeParse('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG');
            expect(result.success).toBe(false);
        });
    });

    describe('amountSchema', () => {
        it('should validate positive integers', () => {
            const result = amountSchema.safeParse('100');
            expect(result.success).toBe(true);
        });

        it('should validate positive decimals', () => {
            const result = amountSchema.safeParse('0.5');
            expect(result.success).toBe(true);
        });

        it('should reject negative numbers', () => {
            const result = amountSchema.safeParse('-1');
            expect(result.success).toBe(false);
        });

        it('should reject zero', () => {
            const result = amountSchema.safeParse('0');
            expect(result.success).toBe(false);
        });

        it('should reject non-numeric strings', () => {
            const result = amountSchema.safeParse('abc');
            expect(result.success).toBe(false);
        });
    });

    describe('slippageSchema', () => {
        it('should validate valid slippage (1.0)', () => {
            const result = slippageSchema.safeParse('1.0');
            expect(result.success).toBe(true);
        });

        it('should validate valid slippage (0.5)', () => {
            const result = slippageSchema.safeParse('0.5');
            expect(result.success).toBe(true);
        });

        it('should validate maximum slippage (100)', () => {
            const result = slippageSchema.safeParse('100');
            expect(result.success).toBe(true);
        });

        it('should reject slippage > 100', () => {
            const result = slippageSchema.safeParse('101');
            expect(result.success).toBe(false);
        });

        it('should reject invalid format', () => {
            const result = slippageSchema.safeParse('1.234');
            expect(result.success).toBe(false);
        });
    });

    describe('envSchema', () => {
        it('should validate correct environment variables', () => {
            const result = envSchema.safeParse({
                NEXT_PUBLIC_API_BASE: 'http://localhost:3000',
                NEXT_PUBLIC_CONTRACT_ADDRESS: '0x20E6EaD47195aBE822B6414F507df0EA1876EA34',
                NEXT_PUBLIC_CHAIN_ID: '11155111',
                NEXT_PUBLIC_CHAIN_NAME: 'Sepolia',
                NEXT_PUBLIC_RPC_URL: 'https://1rpc.io/sepolia',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid API URL', () => {
            const result = envSchema.safeParse({
                NEXT_PUBLIC_API_BASE: 'not-a-url',
                NEXT_PUBLIC_CONTRACT_ADDRESS: '0x20E6EaD47195aBE822B6414F507df0EA1876EA34',
                NEXT_PUBLIC_CHAIN_ID: '11155111',
                NEXT_PUBLIC_CHAIN_NAME: 'Sepolia',
                NEXT_PUBLIC_RPC_URL: 'https://1rpc.io/sepolia',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid contract address', () => {
            const result = envSchema.safeParse({
                NEXT_PUBLIC_API_BASE: 'http://localhost:3000',
                NEXT_PUBLIC_CONTRACT_ADDRESS: '0x123',
                NEXT_PUBLIC_CHAIN_ID: '11155111',
                NEXT_PUBLIC_CHAIN_NAME: 'Sepolia',
                NEXT_PUBLIC_RPC_URL: 'https://1rpc.io/sepolia',
            });
            expect(result.success).toBe(false);
        });
    });
});
