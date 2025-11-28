import { describe, it, expect } from 'vitest';
import { shorten, formatToken } from '../lib/format';
import { parseEther } from 'viem';

describe('format utilities', () => {
    describe('shorten', () => {
        it('should shorten Ethereum addresses correctly', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            expect(shorten(address)).toBe('0x1234…5678');
        });

        it('should handle null addresses', () => {
            expect(shorten(null)).toBe('');
        });

        it('should handle undefined addresses', () => {
            expect(shorten(undefined)).toBe('');
        });

        it('should handle empty strings', () => {
            expect(shorten('')).toBe('');
        });
    });

    describe('formatToken', () => {
        it('should format 1 ETH correctly', () => {
            expect(formatToken(parseEther('1'))).toBe('1');
        });

        it('should format 0.5 ETH correctly', () => {
            expect(formatToken(parseEther('0.5'))).toBe('0.5');
        });

        it('should format large numbers with separators', () => {
            const result = formatToken(parseEther('1000000'));
            expect(result).toContain('1,000,000');
        });

        it('should respect custom digit precision', () => {
            const result = formatToken(parseEther('1.123456789'), 2);
            expect(result).toBe('1.12');
        });

        it('should handle zero', () => {
            expect(formatToken(0n)).toBe('0');
        });

        it('should handle very small amounts', () => {
            const result = formatToken(parseEther('0.0001'));
            expect(result).toBe('0.0001');
        });
    });
});
