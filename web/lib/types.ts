type ProofNode = {
    hash: string;
    side?: "left" | "right";
    level?: number;
    sibling_index?: number;
};

export type InvitationSlot = {
    invitee: string | null;
    used: boolean;
};

export type ProofResponse = {
    address: string;
    index: number;
    total: number;
    leaf: string;
    root: string;
    proof: ProofNode[];
    proof_flags: boolean[];
};

export type ContractState = {
    claimCount: number | null;
    freeClaims: number;
    maxInvites: number;
    hasClaimed: boolean;
    invitedBy: string | null;
    invitesCreated: number;
    invitationSlots: InvitationSlot[];
};
