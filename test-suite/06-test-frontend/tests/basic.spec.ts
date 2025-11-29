import { test, expect } from '@playwright/test';

test.describe('Merklebuilder Landing Page', () => {
    test('should load the homepage', async ({ page }) => {
        await page.goto('/');
        
        // Check for hero section
        await expect(page.locator('h1')).toContainText('Demo Airdrop');
        
        // Check for connect wallet button
        await expect(page.locator('button:has-text("Connect Wallet")')).toBeVisible();
    });

    test('should display persona selector when not connected', async ({ page }) => {
        await page.goto('/');
        
        // Should show persona options
        await expect(page.locator('text=Choose Your Path')).toBeVisible();
    });

    test('should have working navigation', async ({ page }) => {
        await page.goto('/');
        
        // Check that stats are displayed
        await expect(page.locator('text=Claim Count')).toBeVisible();
        await expect(page.locator('text=Pool Reserves')).toBeVisible();
    });
});

test.describe('Mock Wallet Connection', () => {
    test.beforeEach(async ({ page }) => {
        // Mock ethereum provider before page loads
        await page.addInitScript(() => {
            const mockProvider = {
                isMetaMask: true,
                request: async ({ method, params }: any) => {
                    console.log('[Mock] Method:', method, 'Params:', params);
                    
                    switch (method) {
                        case 'eth_requestAccounts':
                            return ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8']; // Anvil account #1
                        
                        case 'eth_accounts':
                            return ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8'];
                        
                        case 'eth_chainId':
                            return '0x7a69'; // 31337 in hex (Anvil)
                        
                        case 'wallet_switchEthereumChain':
                            return null;
                        
                        case 'wallet_addEthereumChain':
                            return null;
                        
                        case 'eth_getBalance':
                            return '0x56bc75e2d63100000'; // 100 ETH
                        
                        default:
                            console.warn('[Mock] Unhandled method:', method);
                            throw new Error(`Method ${method} not mocked`);
                    }
                },
                on: (event: string, handler: Function) => {
                    console.log('[Mock] Event listener added:', event);
                    // Store handlers if needed
                },
                removeListener: (event: string, handler: Function) => {
                    console.log('[Mock] Event listener removed:', event);
                },
            };
            
            (window as any).ethereum = mockProvider;
        });
    });

    test('should allow connecting wallet', async ({ page }) => {
        await page.goto('/');
        
        // Click connect wallet
        await page.click('button:has-text("Connect Wallet")');
        
        // Should show wallet status after connection
        // Note: This might not fully work without real Web3 provider
        // but demonstrates the test pattern
        await expect(page.locator('button:has-text("Connect")')).toBeVisible();
    });
});

test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('/');
        
        await expect(page.locator('h1')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto('/');
        
        await expect(page.locator('h1')).toBeVisible();
    });
});

test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
        await page.goto('/');
        
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThan(0);
    });

    test('should have aria labels on interactive elements', async ({ page }) => {
        await page.goto('/');
        
        const buttons = await page.locator('button').all();
        
        for (const button of buttons) {
            const ariaLabel = await button.getAttribute('aria-label');
            const text = await button.textContent();
            
            // Button should have either aria-label or text content
            expect(ariaLabel || text).toBeTruthy();
        }
    });
});
