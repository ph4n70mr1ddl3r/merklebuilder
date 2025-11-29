import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const FIXTURES_DIR = join(process.cwd(), '..', 'fixtures');

describe('Merkle API Integration Tests', () => {
    let testAccounts: Array<{ address: string; private_key: string }>;
    
    beforeAll(() => {
        // Load test accounts
        const accountsFile = process.env.ACCOUNTS_FILE || 'accounts-100.json';
        const accountsPath = join(FIXTURES_DIR, accountsFile);
        testAccounts = JSON.parse(readFileSync(accountsPath, 'utf-8'));
    });

    describe('Health Check', () => {
        it('should respond to /health endpoint', async () => {
            const res = await fetch(`${API_URL}/health`);
            expect(res.ok).toBe(true);
            
            const data = await res.json();
            expect(data.status).toBe('ok');
        });
    });

    describe('Proof Endpoint', () => {
        it('should return valid proof for eligible address', async () => {
            const account = testAccounts[0];
            const res = await fetch(`${API_URL}/proof/${account.address}`);
            
            expect(res.ok).toBe(true);
            expect(res.headers.get('content-type')).toContain('application/json');
            
            const proof = await res.json();
            
            // Validate proof structure
            expect(proof).toHaveProperty('address');
            expect(proof).toHaveProperty('index');
            expect(proof).toHaveProperty('total');
            expect(proof).toHaveProperty('leaf');
            expect(proof).toHaveProperty('root');
            expect(proof).toHaveProperty('proof');
            expect(proof).toHaveProperty('proof_flags');
            
            // Validate types
            expect(proof.address.toLowerCase()).toBe(account.address.toLowerCase());
            expect(typeof proof.index).toBe('number');
            expect(typeof proof.total).toBe('number');
            expect(typeof proof.leaf).toBe('string');
            expect(typeof proof.root).toBe('string');
            expect(Array.isArray(proof.proof)).toBe(true);
            expect(Array.isArray(proof.proof_flags)).toBe(true);
            
            // Validate proof and flags have same length
            expect(proof.proof.length).toBe(proof.proof_flags.length);
            
            // Validate hex format
            expect(proof.leaf).toMatch(/^0x[0-9a-fA-F]{64}$/);
            expect(proof.root).toMatch(/^0x[0-9a-fA-F]{64}$/);
            
            // Each proof element should be 32-byte hex
            proof.proof.forEach((p: any) => {
                expect(p.hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
                expect(['left', 'right']).toContain(p.side);
            });
            
            // Each flag should be boolean
            proof.proof_flags.forEach((flag: any) => {
                expect(typeof flag).toBe('boolean');
            });
        });

        it('should return consistent proofs for same address', async () => {
            const account = testAccounts[0];
            
            const res1 = await fetch(`${API_URL}/proof/${account.address}`);
            const proof1 = await res1.json();
            
            const res2 = await fetch(`${API_URL}/proof/${account.address}`);
            const proof2 = await res2.json();
            
            expect(proof1.leaf).toBe(proof2.leaf);
            expect(proof1.root).toBe(proof2.root);
            expect(proof1.index).toBe(proof2.index);
            expect(JSON.stringify(proof1.proof)).toBe(JSON.stringify(proof2.proof));
        });

        it('should work with different address formats (with/without 0x)', async () => {
            const account = testAccounts[0];
            const addressWithout0x = account.address.replace('0x', '');
            
            const res = await fetch(`${API_URL}/proof/${addressWithout0x}`);
            expect(res.ok).toBe(true);
            
            const proof = await res.json();
            expect(proof.address.toLowerCase()).toBe(account.address.toLowerCase());
        });

        it('should return 404 for non-eligible address', async () => {
            const fakeAddress = '0x0000000000000000000000000000000000000001';
            const res = await fetch(`${API_URL}/proof/${fakeAddress}`);
            
            expect(res.status).toBe(404);
            
            const error = await res.json();
            expect(error).toHaveProperty('error');
            expect(error.error).toContain('not found');
        });

        it('should return 400 for invalid address format', async () => {
            const invalidAddress = 'not-an-address';
            const res = await fetch(`${API_URL}/proof/${invalidAddress}`);
            
            expect(res.status).toBe(400);
            
            const error = await res.json();
            expect(error).toHaveProperty('error');
        });

        it('should return proofs for all test accounts', async () => {
            // Test first 10 accounts
            const accountsToTest = testAccounts.slice(0, Math.min(10, testAccounts.length));
            
            const results = await Promise.all(
                accountsToTest.map(async (account) => {
                    const res = await fetch(`${API_URL}/proof/${account.address}`);
                    return { account, ok: res.ok };
                })
            );
            
            const allSuccess = results.every(r => r.ok);
            expect(allSuccess).toBe(true);
        });
    });

    describe('CORS', () => {
        it('should allow CORS requests', async () => {
            const res = await fetch(`${API_URL}/health`, {
                method: 'OPTIONS'
            });
            
            const corsHeader = res.headers.get('access-control-allow-origin');
            expect(corsHeader).toBeTruthy();
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed addresses gracefully', async () => {
            const malformed = ['0xZZZ', 'hello', 'not-an-address'];
            
            for (const addr of malformed) {
                const res = await fetch(`${API_URL}/proof/${encodeURIComponent(addr)}`);
                expect([400, 404, 500]).toContain(res.status);
                
                // Only try to parse JSON if response has content
                if (res.headers.get('content-type')?.includes('application/json')) {
                    const error = await res.json();
                    expect(error).toHaveProperty('error');
                }
            }
        });
    });
});
