import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Eip1193Provider } from "ethers";

export type ProviderSource = "eip6963" | "injected";

export type ProviderOption = {
    id: string;
    name: string;
    rdns?: string;
    icon?: string;
    provider: Eip1193Provider;
    source: ProviderSource;
};

type Eip6963ProviderDetail = {
    info: { uuid: string; name: string; icon: string; rdns: string };
    provider: Eip1193Provider;
};

declare global {
    interface Window {
        ethereum?: any;
    }
}

export function useWallet() {
    const [walletProviders, setWalletProviders] = useState<ProviderOption[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [chainId, setChainId] = useState<bigint | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const seen = new Set<string>();
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
            if (!detail?.info?.uuid || seen.has(detail.info.uuid)) return;
            seen.add(detail.info.uuid);
            setWalletProviders((prev) => {
                if (prev.some((p) => p.id === detail.info.uuid)) return prev;
                return [
                    ...prev,
                    {
                        id: detail.info.uuid,
                        name: detail.info.name,
                        rdns: detail.info.rdns,
                        icon: detail.info.icon,
                        provider: detail.provider,
                        source: "eip6963",
                    },
                ];
            });
            setSelectedProviderId((prev) => prev ?? detail.info.uuid);
        };

        window.addEventListener("eip6963:announceProvider", handler as EventListener);
        window.dispatchEvent(new Event("eip6963:requestProvider"));

        const injected = window.ethereum;
        if (injected) {
            setWalletProviders((prev) => {
                if (prev.some((p) => p.id === "injected")) return prev;
                return [
                    ...prev,
                    {
                        id: "injected",
                        name: "Injected (window.ethereum)",
                        provider: injected,
                        source: "injected",
                    },
                ];
            });
            setSelectedProviderId((prev) => prev ?? "injected");
        }

        return () => {
            window.removeEventListener("eip6963:announceProvider", handler as EventListener);
        };
    }, []);

    const connect = useCallback(async (providerOption?: ProviderOption) => {
        const selected = providerOption?.provider ??
            walletProviders.find((p) => p.id === selectedProviderId)?.provider ??
            walletProviders[0]?.provider;

        if (!selected) throw new Error("No wallet provider found");

        const prov = new BrowserProvider(selected);
        await prov.send("eth_requestAccounts", []);
        const signer = await prov.getSigner();
        const address = await signer.getAddress();
        const network = await prov.getNetwork();

        setProvider(prov);
        setAccount(address);
        setChainId(network.chainId);

        // Listen for changes
        if ((selected as any).on) {
            (selected as any).on("accountsChanged", (accounts: string[]) => {
                if (accounts.length === 0) {
                    disconnect();
                } else {
                    setAccount(accounts[0]);
                }
            });
            (selected as any).on("chainChanged", () => {
                window.location.reload();
            });
        }

        return { provider: prov, account: address, chainId: network.chainId };
    }, [walletProviders, selectedProviderId]);

    const disconnect = useCallback(() => {
        setAccount(null);
        setProvider(null);
        setChainId(null);
    }, []);

    return {
        walletProviders,
        selectedProviderId,
        setSelectedProviderId,
        account,
        provider,
        chainId,
        connect,
        disconnect,
    };
}
