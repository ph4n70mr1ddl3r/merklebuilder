# Merklebuilder

Command-line helpers for working with Ethereum address lists and building Merkle tree data from them. The workspace provides three binaries:

- `merklebuilder` (default) generates random Ethereum addresses to a text file.
- `txt_to_bin` ingests a text list of addresses, sorts/dedups them, writes `addresses.bin`, and builds Merkle layers under `merkledb/`.
- `merkle_path` looks up an address and prints its Merkle proof steps from the generated layer files.

## Prerequisites
- Rust toolchain with `cargo` installed.
- Optional but recommended: run in `--release` mode for large datasets.

## Build
```bash
cargo build --release
```
Artifacts land in `target/release/`.

## Generate a text file of addresses
```bash
cargo run --release -- <count> <output_txt>
# Example: cargo run --release -- 100000 addresses.txt
```
- Writes one checksummed address per line to the given text file.

## Convert a text list into Merkle data
```bash
cargo run --release --bin txt_to_bin -- <input_txt> [output_dir]
# Example: cargo run --release --bin txt_to_bin -- addresses.txt merkledb
```
- Accepts lines containing 20-byte Ethereum addresses, with or without a `0x` prefix.
- Empty lines are ignored; addresses are sorted and deduplicated.
- Outputs:
  - `addresses.bin`: 20-byte entries in sorted order.
  - `layerXX.bin` files: Merkle tree levels (`layer00.bin` is the leaves, final file holds the root).
- Prints the Merkle root hash when finished.

## Print a Merkle path for an address
```bash
cargo run --release --bin merkle_path -- <address>
# Example: cargo run --release --bin merkle_path -- 0x1234abcd...
```
- Looks for the address inside `merkledb/addresses.bin` (or the directory you passed to `txt_to_bin` if you override it before running).
- Reports the index in the leaf set and each sibling hash needed to reconstruct the root.

## Serve Merkle proofs over HTTP
```bash
cargo run --release --bin merkle_api -- --listen 0.0.0.0:3000 --data-dir merkledb
```
- Serves a small REST API backed by the generated `merkledb/` files.
- `GET /health` returns `{ "status": "ok" }`.
- `GET /proof/<address>` returns JSON with the leaf index, total count, lookup steps, leaf/root hashes, proof nodes (`side`, `level`, `sibling_index`, `hash`), and `proof_flags` (true when the sibling is on the left, ready for the demo contract).
- Defaults to `merkledb/` as the data directory and `127.0.0.1:3000` for listening; override with `--data-dir` and `--listen`.

## Smart contract (Demo Airdrop)
- Contract: `contracts/DemoAirdrop.sol` (ERC20 + Merkle airdrop, name: Demo Airdrop, symbol: DEMO).
- Merkle root (from `merkledb/layer26.bin`): `0x1361d28feffb65b743ef4da53ffc43a8695f103a14aceff0de7ed6178ace5197`.
- Leaves are `keccak256(abi.encodePacked(address))`. Branches preserve left/right order (no sorting), so proofs need sibling-direction flags.
- Constructor takes `freeClaims_` (number of claims that require no invitation); set to `2` for dev, raise for production. After that threshold, an invitation is mandatory and invitations cannot be created until the free-claims window is filled.
- Claiming mints `1 DEMO` to the claimer: `claim(bytes32[] proof, bool[] proofFlags)`, where `proofFlags[i]` is `true` when `proof[i]` is the left sibling for that step.
- You can pre-check off-chain/on-chain with `isEligible(address, proof, proofFlags)`.
- Invitation slots: each claimer has five fixed slots; `createInvitation(address)` fills the next open slot (only after `freeClaims_` are taken), `revokeInvitation(uint8 slot)` frees an unused slot (before the invitee claims), and `getInvitations(address)` returns slot state (invitee + whether the slot was consumed by a claim).

## Airdrop frontend
- Open `frontend/index.html` directly in a browser (or serve the folder with `python -m http.server 8000`). It connects to MetaMask, fetches proofs from the REST API (e.g., `http://18.143.177.167:3000/proof/<address>`), and calls the deployed Sepolia contract at `0x1366C315E19bE0fE682d37C6b912B3936bc16B7a`.
- You can hit the lookup field to inspect any address; claiming requires the connected wallet to match the proof address. The API now sends permissive CORS headers so the static page can fetch it from any origin.

## Notes
- The default output directory for Merkle data is `merkledb/` (git-ignored).
- For large inputs, prefer `--release` to keep progress bars responsive.

## Next.js + Tailwind frontend (new)
A Next.js/Tailwind app lives under `web/` with wallet connect, proof lookup from the REST API, invite creation, and claim submission.

### Run locally
```bash
cd web
cp .env.example .env.local # adjust API/contract addresses if needed
npm install
npm run dev
```
- Defaults to Sepolia: contract `0x1366C315E19bE0fE682d37C6b912B3936bc16B7a` and proof API `http://18.143.177.167:3000`.
- After claiming you can mint up to five invitations; claims after the first 100 require an invite plus a valid Merkle proof.
