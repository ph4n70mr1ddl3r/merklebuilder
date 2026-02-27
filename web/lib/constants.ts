// Slippage calculation constants
export const SLIPPAGE_BASIS_POINTS = 10000n; // 100.00% = 10000 basis points
export const MAX_SLIPPAGE_BPS = 10000n; // 100%
export const MAX_SLIPPAGE_PERCENT = 100;
export const SLIPPAGE_BPS_MULTIPLIER = 100;
export const DECIMAL_PLACES = 2;

export function parseSlippageBps(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,3})(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  if (isNaN(whole) || whole > MAX_SLIPPAGE_PERCENT) return null;
  const frac = match[2] ?? "";
  const padded = (frac + "00").slice(0, DECIMAL_PLACES);
  const fractionalValue = Number(padded);
  if (isNaN(fractionalValue)) return null;
  const bps = BigInt(whole * SLIPPAGE_BPS_MULTIPLIER + fractionalValue);
  if (bps > MAX_SLIPPAGE_BPS) return null;
  return bps;
}

// Transaction polling intervals
export const CONTRACT_POLL_INTERVAL = 10000; // 10 seconds
export const RESERVES_POLL_INTERVAL = 5000; // 5 seconds

// UI constants
export const COPY_FEEDBACK_DURATION = 1200; // milliseconds
export const TOAST_DURATION = 5000; // milliseconds
export const INPUT_DEBOUNCE_MS = 150;

// Default values
export const DEFAULT_SLIPPAGE = "1.0"; // 1% slippage
export const MIN_OUTPUT_SAFE = 1n; // Minimum output to prevent 0

// API constants
export const API_TIMEOUT_MS = 10000; // 10 seconds
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
