import { useState } from "react";
import { useAirdrop } from "@/hooks/useAirdrop";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, UserPlus, Trash2, Lock, Unlock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SimpleInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`flex h-10 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
);

export function InviteSection({
    airdrop
}: {
    airdrop: ReturnType<typeof useAirdrop>
}) {
    const [invitee, setInvitee] = useState("");
    const { state, createInvite, revokeInvite, loading, error } = airdrop;
    const { invitationSlots, maxInvites, claimCount, freeClaims, hasClaimed } = state;

    const invitesUnlocked = (claimCount ?? 0) >= freeClaims;
    const canInvite = hasClaimed && invitesUnlocked;

    const handleInvite = async () => {
        try {
            await createInvite(invitee);
            setInvitee("");
        } catch (e) {
            // Error handled in hook
        }
    };

    if (!hasClaimed) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-400" />
                    Invitations
                </CardTitle>
                <CardDescription>
                    Manage your {maxInvites} invitation slots.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!invitesUnlocked ? (
                    <div className="rounded-lg bg-amber-500/10 p-4 border border-amber-500/20 text-amber-200 text-sm flex items-center gap-3">
                        <Lock className="h-5 w-5 flex-shrink-0" />
                        <div>
                            Invitations are currently locked. They will unlock after {freeClaims} total claims.
                            Current claims: {claimCount}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <SimpleInput
                                value={invitee}
                                onChange={(e) => setInvitee(e.target.value)}
                                placeholder="Invitee address (0x...)"
                                disabled={loading}
                            />
                            <Button onClick={handleInvite} loading={loading} disabled={!invitee}>
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        </div>
                        {error && (
                            <div className="text-xs text-red-400">{error}</div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                        Your Slots
                    </h4>
                    <div className="grid gap-2">
                        <AnimatePresence>
                            {Array.from({ length: maxInvites }).map((_, i) => {
                                const slot = invitationSlots[i];
                                const isUsed = slot?.used;
                                const hasInvitee = !!slot?.invitee;

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 text-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${isUsed ? 'bg-emerald-500' : hasInvitee ? 'bg-amber-400' : 'bg-slate-700'}`} />
                                            <span className="font-mono text-slate-300">
                                                {slot?.invitee ? (
                                                    <>
                                                        {slot.invitee.slice(0, 6)}...{slot.invitee.slice(-4)}
                                                        {isUsed && <span className="ml-2 text-xs text-emerald-400">(Claimed)</span>}
                                                    </>
                                                ) : (
                                                    <span className="text-slate-600">Empty Slot {i + 1}</span>
                                                )}
                                            </span>
                                        </div>
                                        {hasInvitee && !isUsed && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                onClick={() => revokeInvite(i)}
                                                loading={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
