import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Eip1193Provider } from "ethers";
import { CHAIN_ID, CHAIN_NAME } from "../lib/env";

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

interface EIP1193ProviderWithEvents extends Eip1193Provider {
    on(event: string, handler: (...args: unknown[]) => void): void;
    removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
    interface Window {
        ethereum?: EIP1193ProviderWithEvents;
    }
}

export function useWallet() {
    const [walletProviders, setWalletProviders] = useState<ProviderOption[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [chainId, setChainId] = useState<bigint | null>(null);
    const providerRef = useRef<EIP1193ProviderWithEvents | null>(null);
    const handlersRef = useRef<{
        accountsChanged?: (...args: unknown[]) => void;
        chainChanged?: (...args: unknown[]) => void;
    }>({});

    const cleanupListeners = useCallback(() => {
        if (providerRef.current?.removeListener) {
            if (handlersRef.current.accountsChanged) {
                providerRef.current.removeListener("accountsChanged", handlersRef.current.accountsChanged);
            }
            if (handlersRef.current.chainChanged) {
                providerRef.current.removeListener("chainChanged", handlersRef.current.chainChanged);
            }
        }
        providerRef.current = null;
        handlersRef.current = {};
    }, []);

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
            cleanupListeners();
        };
    }, [cleanupListeners]);

    const disconnect = useCallback(() => {
        cleanupListeners();
        setAccount(null);
        setProvider(null);
        setChainId(null);
    }, [cleanupListeners]);

    const connect = useCallback(async (providerOption?: ProviderOption) => {
        const selected = providerOption?.provider ??
            walletProviders.find((p) => p.id === selectedProviderId)?.provider ??
            walletProviders[0]?.provider;

        if (!selected) throw new Error("No wallet provider found");

        cleanupListeners();

        const prov = new BrowserProvider(selected);
        await prov.send("eth_requestAccounts", []);
        const signer = await prov.getSigner();
        const address = await signer.getAddress();
        const network = await prov.getNetwork();

        if (network.chainId !== BigInt(CHAIN_ID)) {
            throw new Error(`Wrong network. Please switch to ${CHAIN_NAME} (Chain ID: ${CHAIN_ID})`);
        }

        setProvider(prov);
        setAccount(address);
        setChainId(network.chainId);

        const providerWithEvents = selected as EIP1193ProviderWithEvents;
        if (providerWithEvents.on) {
            providerRef.current = providerWithEvents;
            const handleAccountsChanged: (...args: unknown[]) => void = (args) => {
                const accounts = args as string[];
                if (accounts.length === 0) {
                    disconnect();
                } else {
                    setAccount(accounts[0]);
                }
            };
            const handleChainChanged: (...args: unknown[]) => void = () => {
                window.location.reload();
            };
            handlersRef.current.accountsChanged = handleAccountsChanged;
            handlersRef.current.chainChanged = handleChainChanged;
            providerWithEvents.on("accountsChanged", handleAccountsChanged);
            providerWithEvents.on("chainChanged", handleChainChanged);
        }

        return { provider: prov, account: address, chainId: network.chainId };
    }, [walletProviders, selectedProviderId, cleanupListeners, disconnect]);

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
