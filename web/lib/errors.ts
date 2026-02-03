/**
 * Error handling utilities for better UX
 */

export const ERROR_MESSAGES = {
  USER_DENIED: "You rejected the transaction. Click to try again.",
  INSUFFICIENT_GAS: "Not enough ETH for gas fees. Add funds to your wallet.",
  NETWORK_ERROR: "Network connection issue. Check your internet and retry.",
  API_DOWN: "Eligibility service unavailable. Please try again in a moment.",
  ALREADY_CLAIMED: "This wallet has already claimed. Try a different wallet.",
  INVALID_PROOF: "Merkle proof validation failed. Try refreshing your eligibility.",
  POOL_NOT_FUNDED: "Market maker needs ETH liquidity. Cannot trade yet.",
  SLIPPAGE_EXCEEDED: "Price moved too much. Increase slippage tolerance and retry.",
  INSUFFICIENT_BALANCE: "Not enough tokens in your wallet for this trade.",
  INVITE_REQUIRED: "An invitation is required to claim. Ask a friend who claimed.",
  NO_SLOTS: "All invitation slots are full. Revoke unused invitations first.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

/**
 * Parse Web3 error and return user-friendly message
 */
export function parseWeb3Error(error: Error | { message?: string } | string): string {
  const message =
    (error as Error)?.message?.toLowerCase() ||
    (error as { message?: string })?.message?.toLowerCase() ||
    String(error).toLowerCase() ||
    '';
  
  // User rejected transaction
  if (message.includes('user rejected') || message.includes('user denied')) {
    return ERROR_MESSAGES.USER_DENIED;
  }
  
  // Insufficient gas
  if (message.includes('insufficient funds') || message.includes('gas required exceeds')) {
    return ERROR_MESSAGES.INSUFFICIENT_GAS;
  }
  
  // Network errors
  if (message.includes('network') || message.includes('timeout') || message.includes('failed to fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  // Already claimed
  if (message.includes('already claimed') || message.includes('claimed')) {
    return ERROR_MESSAGES.ALREADY_CLAIMED;
  }
  
  // Slippage errors
  if (message.includes('slippage') || message.includes('price') || message.includes('insufficient output')) {
    return ERROR_MESSAGES.SLIPPAGE_EXCEEDED;
  }
  
  // Balance errors
  if (message.includes('insufficient balance') || message.includes('exceeds balance')) {
    return ERROR_MESSAGES.INSUFFICIENT_BALANCE;
  }
  
  // Proof errors
  if (message.includes('proof') || message.includes('merkle')) {
    return ERROR_MESSAGES.INVALID_PROOF;
  }
  
  // Invite errors
  if (message.includes('invitation') || message.includes('invited')) {
    return ERROR_MESSAGES.INVITE_REQUIRED;
  }
  
  // Pool errors
  if (message.includes('pool') || message.includes('reserve')) {
    return ERROR_MESSAGES.POOL_NOT_FUNDED;
  }
  
  // Fallback to original message if we can't parse it
  return error?.message || error?.toString() || 'Transaction failed. Please try again.';
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerUrl(txHash: string, chainId: number): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    5: 'https://goerli.etherscan.io',
  };
  
  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
}
