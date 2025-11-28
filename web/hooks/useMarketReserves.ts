import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { readContract } from "wagmi/actions";
import { wagmiConfig } from "../lib/wagmi";
import { CONTRACT_ADDRESS } from "../lib/env";
import { DEMO_ABI } from "../lib/airdrop";
import { RESERVES_POLL_INTERVAL } from "../lib/constants";
import type { MarketReserves } from "../lib/types";

export function useMarketReserves(account?: string) {
    const fetchReserves = useCallback(async (): Promise<MarketReserves & { demoBalance: bigint }> => {
        try {
            const [reserves, bal] = await Promise.all([
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "getReserves",
                }),
                account
                    ? readContract(wagmiConfig, {
                        address: CONTRACT_ADDRESS as `0x${string}`,
                        abi: DEMO_ABI,
                        functionName: "balanceOf",
                        args: [account as `0x${string}`],
                    })
                    : Promise.resolve(0n),
            ]);

            const tuple = reserves as readonly [bigint, bigint];
            return {
                reserveEth: BigInt(tuple[0]),
                reserveDemo: BigInt(tuple[1]),
                demoBalance: typeof bal === "bigint" ? bal : 0n,
            };
        } catch (error) {
            console.error("Failed to fetch reserves:", error);
            throw error;
        }
    }, [account]);

    return useQuery({
        queryKey: ["marketReserves", account],
        queryFn: fetchReserves,
        refetchInterval: RESERVES_POLL_INTERVAL,
        staleTime: 3000,
    });
}
