import { parseAbi } from "viem";

// Re-export types from centralized types file
export type { ProofNode, ProofResponse } from "./types";

// Re-export environment variables from validated env
export { API_BASE, CONTRACT_ADDRESS, CHAIN_ID, CHAIN_NAME } from "./env";

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
