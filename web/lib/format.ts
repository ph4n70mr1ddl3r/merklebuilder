import { formatEther } from "viem";

export const shorten = (addr?: string | null) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

export const formatToken = (value: bigint, digits = 4) => {
  const num = Number(formatEther(value));
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
};
