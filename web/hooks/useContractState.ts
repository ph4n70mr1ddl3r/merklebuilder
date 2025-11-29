import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ZeroAddress } from "ethers";
import { readContract } from "wagmi/actions";
import { wagmiConfig } from "../lib/wagmi";
import { CONTRACT_ADDRESS } from "../lib/env";
import { DEMO_ABI } from "../lib/airdrop";
import { CONTRACT_POLL_INTERVAL } from "../lib/constants";
import type { ContractState } from "../lib/types";

export function useContractState(account?: string) {
    const fetchContractState = useCallback(async (): Promise<ContractState | null> => {
        if (!account) return null;

        try {
            const [claimed, inviter, created, count, free, max, slots] = await Promise.all([
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "hasClaimed",
                    args: [account as `0x${string}`],
                }),
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "invitedBy",
                    args: [account as `0x${string}`],
                }),
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "invitesCreated",
                    args: [account as `0x${string}`],
                }),
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "claimCount",
                }),
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "FREE_CLAIMS",
                }),
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "MAX_INVITES",
                }),
                readContract(wagmiConfig, {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: DEMO_ABI,
                    functionName: "getInvitations",
                    args: [account as `0x${string}`],
                }),
            ]);

            const invitees =
                (Array.isArray((slots as any)[0]) ? ((slots as any)[0] as string[]) : []) || [];
            const used =
                (Array.isArray((slots as any)[1]) ? ((slots as any)[1] as boolean[]) : []) || [];

            const parsedSlots = invitees.map((inv, idx) => ({
                invitee: inv && inv !== ZeroAddress ? inv : null,
                used: Boolean(used?.[idx]),
            }));

            return {
                hasClaimed: Boolean(claimed),
                invitedBy: (inviter as string) === ZeroAddress ? null : (inviter as string),
                invitesCreated: Number(created),
                claimCount: Number(count),
                freeClaims: Number(free),
                maxInvites: Number(max),
                invitationSlots: parsedSlots,
            };
        } catch (error) {
            console.error("Failed to fetch contract state:", error);
            throw error;
        }
    }, [account]);

    const query = useQuery({
        queryKey: ["contractState", account],
        queryFn: fetchContractState,
        enabled: !!account,
        refetchInterval: CONTRACT_POLL_INTERVAL,
        staleTime: 5000,
    });

    return {
        ...query,
        isFetching: query.isFetching || query.isRefetching,
    };
}
