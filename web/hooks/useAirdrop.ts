import { useState, useCallback } from "react";
import { Contract, ZeroAddress, getAddress, isAddress, BrowserProvider } from "ethers";
import {
    API_BASE,
    CONTRACT_ADDRESS,
    DEMO_ABI,
    ProofResponse,
} from "../lib/airdrop";

export type InvitationSlot = {
    invitee: string | null;
    used: boolean;
};

export type AirdropState = {
    claimCount: number | null;
    freeClaims: number;
    maxInvites: number;
    hasClaimed: boolean;
    invitedBy: string | null;
    invitesCreated: number;
    invitationSlots: InvitationSlot[];
};

export function useAirdrop(provider: BrowserProvider | null, account: string | null) {
    const [state, setState] = useState<AirdropState>({
        claimCount: null,
        freeClaims: 2,
        maxInvites: 5,
        hasClaimed: false,
        invitedBy: null,
        invitesCreated: 0,
        invitationSlots: [],
    });
    const [proof, setProof] = useState<ProofResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getContract = useCallback(async () => {
        if (!provider) return null;
        const signer = await provider.getSigner();
        return new Contract(CONTRACT_ADDRESS, DEMO_ABI, signer);
    }, [provider]);

    const refreshState = useCallback(async () => {
        if (!provider || !account) return;
        try {
            const contract = await getContract();
            if (!contract) return;

            const [claimed, inviter, created, count, free, max, slots] = await Promise.all([
                contract.hasClaimed(account),
                contract.invitedBy(account),
                contract.invitesCreated(account),
                contract.claimCount(),
                contract.FREE_CLAIMS(),
                contract.MAX_INVITES(),
                contract.getInvitations(account),
            ]);

            const invitees =
                (slots && (slots as any).invitees ? ((slots as any).invitees as string[]) : undefined) ??
                (Array.isArray(slots?.[0]) ? (slots[0] as string[]) : []);
            const used =
                (slots && (slots as any).used ? ((slots as any).used as boolean[]) : undefined) ??
                (Array.isArray(slots?.[1]) ? (slots[1] as boolean[]) : []);

            const parsedSlots =
                invitees?.map((inv, idx) => ({
                    invitee: inv && inv !== ZeroAddress ? inv : null,
                    used: Boolean(used?.[idx]),
                })) ?? [];

            setState({
                claimCount: Number(count),
                freeClaims: Number(free),
                maxInvites: Number(max),
                hasClaimed: Boolean(claimed),
                invitedBy: inviter === ZeroAddress ? null : inviter,
                invitesCreated: Number(created),
                invitationSlots: parsedSlots,
            });
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to refresh state");
        }
    }, [provider, account, getContract]);

    const fetchProof = useCallback(async () => {
        if (!account) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/proof/${account}`);
            if (!res.ok) {
                setProof(null);
                throw new Error("Not in airdrop list");
            }
            const data: ProofResponse = await res.json();
            const normalizedTarget = getAddress(account);
            const proofAddress = getAddress(data.address);

            if (normalizedTarget !== proofAddress) {
                throw new Error("Proof address mismatch");
            }
            setProof(data);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to fetch proof");
            setProof(null);
        } finally {
            setLoading(false);
        }
    }, [account]);

    const claim = useCallback(async (recipient: string) => {
        if (!proof || !account) return;
        setLoading(true);
        setError(null);
        try {
            const contract = await getContract();
            if (!contract) throw new Error("Contract not available");

            const tx = await contract.claimTo(
                recipient,
                proof.proof.map((p) => p.hash),
                proof.proof_flags
            );
            await tx.wait();
            await refreshState();
            return tx;
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Claim failed");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [proof, account, getContract, refreshState]);

    const createInvite = useCallback(async (invitee: string) => {
        if (!account) return;
        setLoading(true);
        setError(null);
        try {
            const contract = await getContract();
            if (!contract) throw new Error("Contract not available");

            const tx = await contract.createInvitation(invitee);
            await tx.wait();
            await refreshState();
            return tx;
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Invite failed");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [account, getContract, refreshState]);

    const revokeInvite = useCallback(async (slotIndex: number) => {
        if (!account) return;
        setLoading(true);
        setError(null);
        try {
            const contract = await getContract();
            if (!contract) throw new Error("Contract not available");

            const tx = await contract.revokeInvitation(slotIndex);
            await tx.wait();
            await refreshState();
            return tx;
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Revoke failed");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [account, getContract, refreshState]);

    return {
        state,
        proof,
        loading,
        error,
        refreshState,
        fetchProof,
        claim,
        createInvite,
        revokeInvite,
    };
}
