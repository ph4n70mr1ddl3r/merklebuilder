import { parseAbi } from "viem";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://18.143.177.167:3000";
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x20E6EaD47195aBE822B6414F507df0EA1876EA34";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Sepolia";

export const DEMO_ABI = parseAbi([
  "function claim(bytes32[] proof, bool[] proofFlags)",
  "function claimTo(address recipient, bytes32[] proof, bool[] proofFlags)",
  "function hasClaimed(address) view returns (bool)",
  "function invitedBy(address) view returns (address)",
  "function invitesCreated(address) view returns (uint8)",
  "function createInvitation(address invitee)",
  "function revokeInvitation(uint8 slot)",
  "function getInvitations(address inviter) view returns (address[5] invitees, bool[5] used)",
  "function getReserves() view returns (uint256 ethReserve, uint256 demoReserve)",
  "function previewBuy(uint256 amountIn) view returns (uint256 amountOut)",
  "function previewSell(uint256 amountIn) view returns (uint256 amountOut)",
  "function buyDemo(uint256 minAmountOut) payable returns (uint256 amountOut)",
  "function sellDemo(uint256 amountIn, uint256 minAmountOut) returns (uint256 amountOut)",
  "function balanceOf(address) view returns (uint256)",
  "function claimCount() view returns (uint256)",
  "function FREE_CLAIMS() view returns (uint256)",
  "function MAX_INVITES() view returns (uint8)",
  "function REFERRAL_REWARD() view returns (uint256)",
  "function CLAIM_AMOUNT() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function isEligible(address account, bytes32[] proof, bool[] proofFlags) view returns (bool)",
]);

export type ProofNode = {
  hash: string;
  side?: "left" | "right";
  level?: number;
  sibling_index?: number;
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
