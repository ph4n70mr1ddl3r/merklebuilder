# Quick Reference: Improvements Implementation

## New Features at a Glance

### 🔒 Security Enhancements

#### 1. Proof Validation (Frontend)
```typescript
// Automatically validates proofs on-chain before use
const { proof, isValidated } = useProof();
await fetchProof(address); // Now validates with contract.isEligible()
```

#### 2. Rate Limiting (API)
```bash
# API now limits to 2 req/sec per IP with burst of 10
# Approximately 100-120 requests per minute per IP
curl http://localhost:3000/proof/0x... # Returns 429 if limit exceeded
```

#### 3. Address Normalization
```typescript
import { normalizeAddress } from '../lib/utils';

// Always returns checksummed address or null
const addr = normalizeAddress('0xabc...'); // '0xABc...' (checksummed)
```

---

### 🚀 Performance & UX

#### 4. Proof Caching
```typescript
// Proofs cached for 24 hours in localStorage
import { getCachedProof, setCachedProof, clearProofCache } from '../lib/utils';

const cached = getCachedProof(address); // Returns cached proof or null
setCachedProof(address, proof);         // Stores validated proof
clearProofCache();                      // Clear all cached proofs
```

**Cache Keys**: `merkle_proof_<lowercase_address>`

#### 5. Error Recovery
```tsx
// New props on SimplifiedClaimPanel
<SimplifiedClaimPanel
  claimError={errorMessage}     // Display persistent error
  onRetryClaim={handleRetry}    // Retry without re-fetching proof
  isFetchingState={isLoading}   // Show loading indicator
/>
```

#### 6. Loading Indicators
```typescript
// useContractState now exposes isFetching
const { data, isFetching } = useContractState(account);

// isFetching = true during background 30s polling
```

---

### 💱 AMM Improvements

#### 7. Swap Size Warnings
The EnhancedMarketPanel now calculates and displays:

- **Price Impact**: How much trade moves the price
- **Swap Size**: Trade size as % of pool reserves

**Thresholds**:
```typescript
// Swap Size Warnings
>10% of reserves: 🚨 Red alert - "Very large trade!"
5-10% of reserves: ⚠️ Amber - "Large trade warning"
1-5% of reserves:  ℹ️ Blue - Information

// Price Impact Warnings  
>10%: ⚠️ "High impact! Consider smaller trade"
5-10%: ⚡ "Moderate impact"
1-5%: ℹ️ Information
```

---

## File Changes Summary

### Backend (Rust)
- ✏️ `Cargo.toml` - Added tower, tower_governor
- ✏️ `src/bin/merkle_api.rs` - Rate limiting middleware

### Frontend (TypeScript)
- ✏️ `web/lib/utils.ts` - Address normalization, proof caching
- ✏️ `web/hooks/useProof.ts` - Validation, caching integration
- ✏️ `web/hooks/useContractState.ts` - Exposed isFetching
- ✏️ `web/app/components/SimplifiedClaimPanel.tsx` - Error recovery, loading states
- ✏️ `web/app/components/EnhancedMarketPanel.tsx` - Swap size warnings
- ✏️ `web/app/page.tsx` - Wired up new props

---

## API Changes

### Rate Limiting Response
```bash
# When limit exceeded:
HTTP/1.1 429 Too Many Requests
x-ratelimit-limit: 2
x-ratelimit-remaining: 0
x-ratelimit-reset: 1234567890
```

### Proof Endpoint (Unchanged)
```bash
GET /proof/:address

# Response (same as before)
{
  "address": "0x...",
  "index": 123,
  "proof": [...],
  "proof_flags": [...]
}
```

---

## Configuration

### Rate Limiting (Rust)
Located in `src/bin/merkle_api.rs`:
```rust
let governor_config = Arc::new(
    GovernorConfigBuilder::default()
        .per_second(2)      // Change rate here
        .burst_size(10)     // Change burst here
        .finish()
        .expect("Failed to build rate limiter config"),
);
```

### Proof Cache TTL (Frontend)
Located in `web/lib/utils.ts`:
```typescript
const PROOF_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PROOF_CACHE_VERSION = "v1"; // Increment to invalidate all caches
```

---

## Testing

### Unit Tests
```bash
cd web && npm test
# All 26 tests pass (format + validators)
```

### Manual Testing

#### Test Rate Limiting
```bash
# Start API
./target/release/merkle_api --listen 0.0.0.0:3000 --data-dir merkledb

# Rapid fire requests (should see 429 after ~10)
for i in {1..15}; do 
  curl -w "\n%{http_code}\n" http://localhost:3000/proof/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
done
```

#### Test Proof Caching
1. Open browser DevTools → Application → Local Storage
2. Check eligibility for an address
3. Verify `merkle_proof_<address>` key exists
4. Refresh page and check again (should use cache)

#### Test Error Recovery
1. Trigger a claim failure (e.g., no ETH for gas)
2. Verify error message persists
3. Click "Retry" button
4. Verify claim attempted without re-fetching proof

---

## Rollback Plan

If issues arise, revert to previous version:

```bash
# Backend
git checkout HEAD~1 -- Cargo.toml src/bin/merkle_api.rs
cargo build --release --bin merkle_api

# Frontend
git checkout HEAD~1 -- web/lib/utils.ts web/hooks/useProof.ts web/app/components/
cd web && npm run build
```

---

## Monitoring

### Metrics to Track

1. **Rate Limit 429s**: Monitor for legitimate users hitting limits
2. **Cache Hit Rate**: Check localStorage usage statistics
3. **Claim Retry Usage**: Track onRetryClaim calls
4. **Swap Size Distribution**: Monitor trades >5% of reserves

### Logs to Check

- API: "Rate limit: 100 requests per minute per IP"
- Frontend: "Using cached proof for <address>"
- Frontend: "On-chain validation error" (proof validation failures)

---

## Support

For issues with:
- **Rate limiting**: Adjust `per_second` and `burst_size` in merkle_api.rs
- **Cache issues**: Clear localStorage or increment `PROOF_CACHE_VERSION`
- **Proof validation failures**: Check contract ABI matches deployed version

---

**Last Updated**: 2025-11-29  
**Version**: 1.0
