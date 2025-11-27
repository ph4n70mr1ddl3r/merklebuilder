import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/Button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog"; // I need to implement Dialog first or use a simple modal
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { shorten } from "@/lib/utils"; // I need to move shorten to utils or keep it here

// I'll implement a simple modal for now or just use the existing logic but cleaner
// Actually, I should implement a Dialog component first if I want to be fancy, 
// but for now I'll stick to a simple implementation or use the one from the plan.
// The plan said "Component to handle wallet connection and provider selection".

// Let's implement a simple dropdown or modal for provider selection.
// Since I don't have a Dialog component yet, I'll create a simple one or just use conditional rendering.

export function WalletConnect() {
    const { walletProviders, account, connect, disconnect, selectedProviderId } = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (account) {
            navigator.clipboard.writeText(account);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (account) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
                    <span className="font-mono text-slate-200">{account.slice(0, 6)}...{account.slice(-4)}</span>
                    <button onClick={handleCopy} className="text-slate-400 hover:text-emerald-300 transition-colors">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                </div>
                <Button variant="outline" size="sm" onClick={disconnect}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <Button onClick={() => setIsOpen(!isOpen)} className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-xl">
                        <div className="mb-2 px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Select Wallet
                        </div>
                        <div className="flex flex-col gap-1">
                            {walletProviders.length > 0 ? (
                                walletProviders.map((provider) => (
                                    <button
                                        key={provider.id}
                                        onClick={() => {
                                            connect(provider);
                                            setIsOpen(false);
                                        }}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition-colors text-left"
                                    >
                                        {provider.icon ? (
                                            <img src={provider.icon} alt={provider.name} className="h-5 w-5" />
                                        ) : (
                                            <div className="h-5 w-5 rounded-full bg-slate-700" />
                                        )}
                                        {provider.name}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-sm text-slate-500">
                                    No wallets detected
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
