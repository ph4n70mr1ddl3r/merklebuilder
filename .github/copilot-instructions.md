# Merklebuilder Copilot Instructions

## Project Overview

**Merklebuilder** is a real Ethereum mainnet airdrop for 64M+ users with:
- **Eligibility**: Users who paid ≥0.004 ETH in gas fees from blocks 0-23M
- **Rust CLI tools**: Generate Merkle tree from 64M+ addresses, serve proofs via HTTP
- **Solidity contract** (`DemoAirdrop.sol`): ERC20 with Merkle-gated minting (100 DEMO), invite system (5 slots), referral rewards (5-level chain), and constant-product AMM
- **Next.js 14 frontend**: Simplified persona-driven UI for claiming, buying, and managing tokens

## Architecture

### Three-Tier System
1. **Rust backend** (`src/`, `src/bin/`): Processes 64M+ Ethereum addresses, generates Merkle tree, serves proofs via HTTP
2. **Smart contract** (`contracts/DemoAirdrop.sol`): ERC20 token with Merkle-gated minting, invite system, and constant-product AMM
3. **Next.js frontend** (`web/`): Persona-driven UI with three user journeys: Claim (eligible), Buy (non-eligible), Manage (post-claim)

### Data Flow & User Journeys
```
64M+ mainnet addresses → txt_to_bin → merkledb/*.bin → merkle_api (HTTP) → Frontend

User Personas:
1. Eligible Claimers (64M+): Connect → Check eligibility → Claim 100 DEMO → Invite friends
2. Non-Eligible Users: Connect → Buy DEMO with ETH (AMM)
3. Post-Claim Users: Manage invites (5 slots) → Sell DEMO → Earn referral rewards
```

## Critical Concepts

### Merkle Proof Format
- **Leaves**: `keccak256(abi.encodePacked(address))` - NO sorting after hashing
- **Branches**: Left/right order preserved (siblings NOT sorted alphabetically)
- **Proof flags**: `bool[] proofFlags` where `true` = sibling is on the LEFT
- **Root**: Hardcoded in contract as `MERKLE_ROOT` constant from `merkledb/layer26.bin`

⚠️ **Common mistake**: The contract does NOT sort sibling hashes. Proofs must include directional flags (`proofFlags`).

### Invite System Mechanics
- First `FREE_CLAIMS` (default: 2) need NO invitation
- After that threshold, claims require `invitedBy[address] != address(0)`
- Invites **cannot be created** until `claimCount >= FREE_CLAIMS`
- Each claimer gets 5 fixed slots (`MAX_INVITES`), tracked in `invitationSlots[inviter][0..4]`
- Referral rewards: 5-level chain paying `1 DEMO` per level

### AMM Integration
- Constant-product formula: `x * y = k`
- Every claim mints `10 DEMO` to contract reserves (`reserveDEMO`)
- AMM requires `reserveETH > 0` (seed via constructor or `receive()`)
- Claims are blocked if `reserveETH == 0`

## Developer Workflows

### Rust: Build and Run
```bash
# Build all binaries (merklebuilder, txt_to_bin, merkle_path, merkle_api)
cargo build --release

# Generate random addresses
cargo run --release -- 100000 addresses.txt

# Convert to Merkle tree
cargo run --release --bin txt_to_bin -- addresses.txt merkledb

# Query proof for an address
cargo run --release --bin merkle_path -- 0x1234...

# Serve HTTP API
cargo run --release --bin merkle_api -- --listen 0.0.0.0:3000 --data-dir merkledb
```

### Next.js: Setup and Development
```bash
cd web
cp .env.example .env.local  # Configure API_BASE, CONTRACT_ADDRESS, CHAIN_ID
npm install
npm run dev                  # Starts on localhost:3000
npm test                     # Run Vitest unit tests
npm run test:ui              # Interactive test UI
```

### Contract Deployment
- Deploy `DemoAirdrop.sol` with `freeClaims_` constructor arg (e.g., 2)
- Send ETH to contract address to seed AMM (`receive()` function)
- Update `MERKLE_ROOT` constant if regenerating tree
- Update `web/.env.local` with new contract address

## Code Conventions

### Rust
- **Progress bars**: Use `indicatif` for long operations (see `src/main.rs` and `txt_to_bin.rs`)
- **Binary structure**: Addresses are 20 bytes, hashes are 32 bytes, no padding
- **Error handling**: Return `Result<T, Box<dyn Error>>` or custom error types
- **Layer files**: Named `layerXX.bin` where `layer00.bin` = leaves, final layer = root

### TypeScript/Next.js
- **Types**: Centralized in `web/lib/types.ts`, validated with Zod schemas in `validators.ts`
- **Environment**: All env vars validated via `lib/env.ts` (uses Zod)
- **Hooks**: React Query for contract state (`useContractState`, `useMarketReserves`), custom hooks for proofs (`useProof`)
- **Toasts**: Use Sonner (`toast.success()`, `toast.error()`) - NO inline status messages
- **Wagmi v3**: Use `readContract(wagmiConfig, ...)` and `writeContract(wagmiConfig, ...)` patterns
- **ABI**: Defined in `lib/airdrop.ts` as `DEMO_ABI` using `parseAbi()`

### Solidity
- **Version**: `^0.8.24`
- **No SafeMath**: Built-in overflow checks enabled
- **Reentrancy**: `nonReentrant` modifier on AMM functions
- **Gas optimization**: Use `unchecked` blocks where safe (see `_transfer`)

## Integration Points

### Rust ↔ Frontend
- **REST API**: `GET /proof/<address>` returns JSON with `{ address, index, leaf, root, proof: [], proof_flags: [] }`
- **CORS**: Enabled via `tower-http` with `CorsLayer::permissive()`
- **Error codes**: 400 (bad request), 404 (address not found), 500 (internal error)

### Frontend ↔ Contract
- **Proof submission**: Convert API's `proof` (hex strings) to `bytes32[]`, `proof_flags` to `bool[]`
- **Address normalization**: Use `ethers.getAddress()` to checksum before API calls
- **Polling**: Contract state refreshes every `CONTRACT_POLL_INTERVAL` (30s default)
- **Transaction flow**: Proof fetch → validation → `claim()` → toast confirmation → state refresh

## Testing

### Rust
- No test suite currently - manual testing via binaries
- Verify Merkle root matches contract constant after `txt_to_bin`

### TypeScript
- **Vitest**: Run with `npm test` in `web/`
- **Coverage**: 26 tests covering validators, formatters, and utilities
- **Test files**: `__tests__/format.test.ts`, `__tests__/validators.test.ts`
- **Setup**: `vitest.setup.ts` configures jsdom and testing-library matchers

## Key Files

### Merkle Tree Logic
- `src/merkle.rs`: Core proof generation, binary search, layer traversal
- `src/bin/txt_to_bin.rs`: Address parsing, sorting, tree building
- `src/bin/merkle_api.rs`: HTTP server with Axum, CORS, JSON responses

### Contract
- `contracts/DemoAirdrop.sol`: Lines 1-100 (ERC20), 100-200 (airdrop/invites), 200-302 (AMM)

### Frontend Core
- `web/hooks/useContractState.ts`: Single source of truth for on-chain state
- `web/lib/validators.ts`: Zod schemas for all external data (API, user input, env)
- `web/app/components/AirdropPanel.tsx`: Claim flow UI
- `web/app/components/InvitesPanel.tsx`: Invite creation/revocation UI
- `web/app/components/MarketPanel.tsx`: AMM swap interface

## Common Pitfalls

1. **Proof validation fails**: Ensure `proofFlags` match sibling positions (left=true, right=false)
2. **Invite errors**: Can't create invites until `claimCount >= FREE_CLAIMS`
3. **AMM blocked**: Contract reverts if `reserveETH == 0` - seed with ETH first
4. **Address mismatches**: Always normalize addresses via `getAddress()` before API calls
5. **BigInt support**: TypeScript target must be ES2020+ for Wagmi/ethers BigInt handling
6. **Slot exhaustion**: Each user has only 5 invite slots - no dynamic expansion

## External Dependencies

- **Sepolia testnet**: Default deployment target (chain ID 11155111)
- **MetaMask**: Primary wallet connector
- **Proof API**: Runs on `http://18.143.177.167:3000` (production) or `localhost:3000` (dev)
- **Contract**: `0x79A01fbb895fd9d821BC1123339f8887B07D9458` (Sepolia)
