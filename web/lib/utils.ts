import { getAddress } from "ethers";
import type { ProofResponse } from "./types";

/**
 * Normalize an Ethereum address to checksummed format
 * Returns null for invalid addresses
 */
export function normalizeAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;
  try {
    return getAddress(trimmed);
  } catch {
    return null;
  }
}

/**
 * Proof caching utilities using localStorage
 */
const PROOF_CACHE_PREFIX = "merkle_proof_";
const PROOF_CACHE_VERSION = "v1";
const PROOF_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedProof {
  proof: ProofResponse;
  timestamp: number;
  version: string;
}

export function getCachedProof(address: string): ProofResponse | null {
  if (typeof window === "undefined") return null;
  const normalized = normalizeAddress(address);
  if (!normalized) return null;

  try {
    const key = `${PROOF_CACHE_PREFIX}${normalized.toLowerCase()}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const data: CachedProof = JSON.parse(cached);
    
    if (data.version !== PROOF_CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    const age = Date.now() - data.timestamp;
    if (age > PROOF_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return data.proof;
  } catch {
    return null;
  }
}

export function setCachedProof(address: string, proof: ProofResponse): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeAddress(address);
  if (!normalized) return;

  const key = `${PROOF_CACHE_PREFIX}${normalized.toLowerCase()}`;
  const data: CachedProof = {
    proof,
    timestamp: Date.now(),
    version: PROOF_CACHE_VERSION,
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      clearProofCache();
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Silently fail - caching is optional
      }
    }
  }
}

export function clearProofCache(address?: string): void {
  if (typeof window === "undefined") return;
  if (address) {
    const normalized = normalizeAddress(address);
    if (normalized) {
      const key = `${PROOF_CACHE_PREFIX}${normalized.toLowerCase()}`;
      localStorage.removeItem(key);
    }
  } else {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(PROOF_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}
