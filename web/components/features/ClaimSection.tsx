import { useState } from "react";
import { useAirdrop } from "@/hooks/useAirdrop";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input"; // Need to implement Input or use standard input
import { Label } from "@/components/ui/Label"; // Need to implement Label or use standard label
import { CheckCircle2, AlertCircle, ArrowRight, Gift } from "lucide-react";
import { motion } from "framer-motion";

// Simple Input component since I didn't create it yet
const SimpleInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`flex h-10 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
);

export function ClaimSection({
    airdrop,
    account
}: {
    airdrop: ReturnType<typeof useAirdrop>,
    account: string
}) {
    const [recipient, setRecipient] = useState(account);
    const { state, proof, loading, error, fetchProof, claim } = airdrop;

    const handleClaim = async () => {
        try {
            await claim(recipient);
        } catch (e) {
            // Error handled in hook
        }
    };

    if (state.hasClaimed) {
        return (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="h-6 w-6" />
                        <CardTitle>Tokens Claimed</CardTitle>
                    </div>
                    <CardDescription className="text-emerald-200/60">
                        You have successfully claimed your DEMO tokens.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Claim Airdrop</CardTitle>
                <CardDescription>
                    Check your eligibility and claim your tokens.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!proof ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
                            <Gift className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                            <p className="text-sm text-slate-400">
                                Check if your wallet is eligible for the airdrop.
                            </p>
                        </div>
                        <Button
                            onClick={fetchProof}
                            loading={loading}
                            className="w-full"
                        >
                            Check Eligibility
                        </Button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20">
                            <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-semibold">Eligible!</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-slate-400">Amount:</div>
                                <div className="text-slate-200 font-mono">1 DEMO</div>
                                <div className="text-slate-400">Proof Index:</div>
                                <div className="text-slate-200 font-mono">{proof.index}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">
                                Recipient Address
                            </label>
                            <SimpleInput
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder="0x..."
                            />
                            <p className="text-xs text-slate-500">
                                Defaults to your connected wallet.
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <Button
                            onClick={handleClaim}
                            loading={loading}
                            className="w-full"
                        >
                            Claim Tokens
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}
