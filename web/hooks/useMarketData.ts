import { useState, useCallback, useEffect, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '../lib/wagmi';
import { CONTRACT_ADDRESS, DEMO_ABI } from '../lib/airdrop';
import { logger } from '../lib/logger';
import { RESERVES_POLL_INTERVAL } from '../lib/constants';

export function useMarketData(account?: string) {
    const [reserveEth, setReserveEth] = useState<bigint>(0n);
    const [reserveDemo, setReserveDemo] = useState<bigint>(0n);
    const [demoBalance, setDemoBalance] = useState<bigint>(0n);
    const [ethBalance, setEthBalance] = useState<bigint>(0n);
    const publicClient = usePublicClient();
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const refreshReserves = useCallback(
        async (addr?: string) => {
            const target = addr ?? account;
            try {
                const [reservesResult, demoBalResult, ethBalResult] = await Promise.allSettled([
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

                if (!isMountedRef.current) return;

                if (reservesResult.status === 'fulfilled') {
                    const tuple = reservesResult.value as readonly [bigint, bigint];
                    setReserveEth(BigInt(tuple[0]));
                    setReserveDemo(BigInt(tuple[1]));
                } else {
                    logger.error("Failed to fetch reserves", reservesResult.reason);
                }

                if (demoBalResult.status === 'fulfilled' && typeof demoBalResult.value === "bigint") {
                    setDemoBalance(demoBalResult.value);
                }

                if (ethBalResult.status === 'fulfilled' && typeof ethBalResult.value === "bigint") {
                    setEthBalance(ethBalResult.value);
                }
            } catch (err) {
                logger.error("Failed to refresh reserves", err);
            }
        },
        [account, publicClient]
    );

    useEffect(() => {
        refreshReserves(account);
        const interval = setInterval(() => {
            refreshReserves(account);
        }, RESERVES_POLL_INTERVAL);
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
