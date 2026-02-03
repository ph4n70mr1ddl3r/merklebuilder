import { parseAbi } from "viem";

// Re-export types from centralized types file
export type { ProofNode, ProofResponse } from "./types";

// Re-export environment variables from validated env
export { API_BASE, CONTRACT_ADDRESS, CHAIN_ID, CHAIN_NAME } from "./env";

export const DEMO_ABI = parseAbi([
  "function claim(bytes32[] proof, bool[] proofFlags) external",
  "function claimTo(address recipient, bytes32[] proof, bool[] proofFlags) external",
  "function hasClaimed(address) external view returns (bool)",
  "function invitedBy(address) external view returns (address)",
  "function invitesCreated(address) external view returns (uint8)",
  "function createInvitation(address invitee) external",
  "function revokeInvitation(uint8 slot) external",
  "function getInvitations(address inviter) external view returns (address[5] invitees, bool[5] used)",
  "function getReserves() external view returns (uint256 ethReserve, uint256 demoReserve)",
  "function previewBuy(uint256 amountIn) external view returns (uint256 amountOut)",
  "function previewSell(uint256 amountIn) external view returns (uint256 amountOut)",
  "function buyDemo(uint256 minAmountOut) external payable returns (uint256 amountOut)",
  "function sellDemo(uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)",
  "function balanceOf(address) external view returns (uint256)",
  "function claimCount() external view returns (uint256)",
  "function FREE_CLAIMS() external view returns (uint256)",
  "function MAX_INVITES() external view returns (uint8)",
  "function REFERRAL_REWARD() external view returns (uint256)",
  "function CLAIM_AMOUNT() external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function isEligible(address account, bytes32[] proof, bool[] proofFlags) external view returns (bool)",
]);
