import { useState, useCallback, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '../lib/wagmi';
import { CONTRACT_ADDRESS, DEMO_ABI } from '../lib/airdrop';
import { logger } from '../lib/logger';

export function useMarketData(account?: string) {
    const [reserveEth, setReserveEth] = useState<bigint>(0n);
    const [reserveDemo, setReserveDemo] = useState<bigint>(0n);
    const [demoBalance, setDemoBalance] = useState<bigint>(0n);
    const [ethBalance, setEthBalance] = useState<bigint>(0n);
    const publicClient = usePublicClient();

    const refreshReserves = useCallback(
        async (addr?: string) => {
            const target = addr ?? account;
            try {
                const [reserves, demoBal, ethBal] = await Promise.all([
                    readContract(wagmiConfig, {
                        address: CONTRACT_ADDRESS as `0x${string}`,
                        abi: DEMO_ABI,
                        functionName: "getReserves",
                    }),
                    target
                        ? readContract(wagmiConfig, {
                            address: CONTRACT_ADDRESS as `0x${string}`,
                            abi: DEMO_ABI,
                            functionName: "balanceOf",
                            args: [target as `0x${string}`],
                        })
                        : Promise.resolve(0n),
                    target && publicClient
                        ? publicClient.getBalance({ address: target as `0x${string}` })
                        : Promise.resolve(0n),
                ]);

                const tuple = reserves as readonly [bigint, bigint];
                setReserveEth(BigInt(tuple[0]));
                setReserveDemo(BigInt(tuple[1]));

                if (typeof demoBal === "bigint") {
                    setDemoBalance(demoBal);
                }
                if (typeof ethBal === "bigint") {
                    setEthBalance(ethBal);
                }
            } catch (err) {
                logger.error("Failed to refresh reserves", err);
            }
        },
        [account, publicClient]
    );

    // Auto-refresh every 15s
    useEffect(() => {
        refreshReserves(account);
        const interval = setInterval(() => {
            refreshReserves(account);
        }, 15000);
        return () => clearInterval(interval);
    }, [account, refreshReserves]);

    return {
        reserveEth,
        reserveDemo,
        demoBalance,
        ethBalance,
        refreshReserves,
    };
}
