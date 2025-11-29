# 🚀 Quick Start Guide - Test Infrastructure

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Rust
cargo --version
# If not: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Check Node.js (v18+)
node --version
# If not: https://nodejs.org

# Check Foundry
forge --version
# If not: curl -L https://foundry.paradigm.xyz | bash && foundryup

# Check jq (JSON processor)
jq --version
# If not: sudo apt-get install jq (or brew install jq on macOS)
```

## 5-Minute Test Run

### Step 1: Build Everything (one-time)

```bash
cd /home/riddler/merklebuilder

# Build Rust binaries
cargo build --release

# This compiles:
# - generate_test_accounts (NEW)
# - txt_to_bin
# - merkle_path  
# - merkle_api
```

### Step 2: Run Small Test

```bash
# Run full test cycle with 10 accounts (~30 seconds)
./test-suite/scripts/run-small.sh

# Watch the magic happen:
# ✓ Generates 10 test accounts
# ✓ Builds Merkle tree
# ✓ Starts API server
# ✓ Runs 15 API tests
# ✓ Starts Anvil blockchain
# ✓ Deploys contract
# ✓ Runs 20+ contract tests
# ✓ Builds frontend
# ✓ Runs frontend tests
```

### Step 3: Inspect Results

```bash
# View test accounts
cat test-suite/fixtures/accounts-10.json | head -20

# View Merkle root
cat test-suite/fixtures/merkle-root.txt

# View contract address
cat test-suite/fixtures/contract.env

# View API logs
cat test-suite/fixtures/api.log

# View all generated files
ls -lh test-suite/fixtures/
```

### Step 4: Cleanup

```bash
# Remove all test artifacts
./test-suite/scripts/cleanup.sh

# Verify cleanup
ls test-suite/fixtures/  # Should be empty or not exist
```

## Understanding the Output

When you run the test cycle, you'll see:

```bash
╔════════════════════════════════════════╗
║   Merklebuilder Full Test Cycle        ║
╚════════════════════════════════════════╝

  Account Count: 10
  Timestamp: 2025-11-29 10:05:37

[10:05:37] Checking prerequisites...
✓ All prerequisites found

[10:05:38] Cleaning up previous test data...
✓ Cleanup complete

Step 1: Generating Test Accounts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[10:05:39] Building test account generator...
[10:05:40] Generating 10 deterministic test accounts...
✓ Generated 10 test accounts

Step 2: Building Merkle Tree
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[10:05:41] Extracting addresses to text file...
✓ Extracted 10 addresses
[10:05:41] Generating Merkle tree from addresses...
✓ Merkle tree built with 4 layers
Merkle Root: 0x1234...abcd

Step 3: Testing Merkle API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[10:05:42] Starting Merkle API on port 3001...
✓ API is ready
[10:05:43] Running API integration tests...
✓ API tests passed (15/15)

Step 4: Deploying Smart Contract
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[10:05:44] Starting Anvil (local Ethereum node)...
✓ Anvil started on port 8545
[10:05:47] Deploying DemoAirdrop...
✓ Contract deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
[10:05:48] Running Foundry contract tests...
✓ Contract tests passed (20/20)

Step 5: Generating Proofs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[10:05:49] Generating proofs for first 10 accounts...
✓ Generated 10 proofs

Step 6: Testing Frontend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[10:05:50] Building frontend...
✓ Frontend built successfully
[10:05:52] Running frontend unit tests...
✓ Frontend unit tests passed (26/26)

╔════════════════════════════════════════╗
║     ✓ Full Test Cycle Complete!       ║
╚════════════════════════════════════════╝

Test Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Accounts Generated: 10
  🌳 Merkle Root: 0x1234...abcd
  📝 Contract Address: 0x5FbD...0aa3
  🔗 API Endpoint: http://127.0.0.1:3001
  🌐 Frontend: http://localhost:3000

Services Running:
  • API: PID 12345
  • Anvil: PID 12346

Press Ctrl+C to stop all services and exit...
```

## Common Commands

### Run Tests at Different Scales

```bash
# Edge cases (1-3 accounts)
./test-suite/scripts/run-full-cycle.sh 1
./test-suite/scripts/run-full-cycle.sh 2
./test-suite/scripts/run-full-cycle.sh 3

# Small (quick test)
./test-suite/scripts/run-small.sh             # 10 accounts, ~30s

# Medium (realistic)
./test-suite/scripts/run-medium.sh            # 1,000 accounts, ~1min

# Large (stress test)
./test-suite/scripts/run-large.sh             # 100,000 accounts, ~3min

# Custom
./test-suite/scripts/run-full-cycle.sh 500   # Any number
```

### Run Individual Components

```bash
# Just generate accounts
./target/release/generate_test_accounts \
    --count 50 \
    --output my-accounts.json \
    --seed 42

# Just build tree
./target/release/txt_to_bin my-addresses.txt my-merkledb/

# Just run API tests (assumes API running)
cd test-suite/03-test-api
npm install
API_URL=http://127.0.0.1:3001 npm test

# Just run contract tests
cd test-suite/04-deploy-contract
forge test -vv

# Just run frontend tests
cd test-suite/06-test-frontend
npm install
npm test
```

### View Logs & Debug

```bash
# API logs
tail -f test-suite/fixtures/api.log

# Anvil logs
tail -f test-suite/fixtures/anvil.log

# All logs
ls test-suite/fixtures/*.log

# Test a specific proof
curl http://127.0.0.1:3001/proof/0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | python3 -m json.tool
```

## Troubleshooting

### "Port already in use"
```bash
# Kill existing processes
pkill -f merkle_api
pkill -f anvil

# Or find and kill specific PIDs
lsof -i :3001  # Find API
lsof -i :8545  # Find Anvil
kill <PID>
```

### "jq: command not found"
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y jq

# macOS
brew install jq

# Or use Python as alternative
cat file.json | python3 -m json.tool
```

### "forge: command not found"
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc  # or ~/.zshrc
foundryup
forge --version
```

### Tests Fail

1. **Check logs**: `cat test-suite/fixtures/*.log`
2. **Clean and retry**: `./test-suite/scripts/cleanup.sh && ./test-suite/scripts/run-small.sh`
3. **Rebuild**: `cargo clean && cargo build --release`
4. **Check ports**: `lsof -i :3001 :8545 :3000`

## What Each Test Does

### API Tests (15 tests)
- ✅ Health endpoint responds
- ✅ Returns valid proofs for eligible addresses
- ✅ Proofs are consistent across requests
- ✅ Handles addresses with/without 0x prefix
- ✅ Returns 404 for non-eligible addresses
- ✅ Returns 400 for invalid format
- ✅ All test accounts get proofs
- ✅ Rate limiting enforces limits
- ✅ Rate limit headers present
- ✅ CORS headers set correctly
- ✅ Handles malformed addresses gracefully
- ✅ Validates proof structure (address, index, leaf, root, proof, flags)
- ✅ Validates hex formats
- ✅ Validates proof and flags arrays match
- ✅ Error responses include error field

### Contract Tests (20+ tests)
- ✅ Deployment initialization correct
- ✅ Receives ETH increases reserves
- ✅ Cannot claim without valid proof
- ✅ Cannot claim twice
- ✅ Cannot claim if pool not funded
- ✅ Cannot create invite before claiming
- ✅ Cannot invite self
- ✅ Cannot invite zero address
- ✅ PreviewBuy calculates correctly
- ✅ PreviewSell calculates correctly
- ✅ BuyDemo updates reserves
- ✅ SellDemo reverts without balance
- ✅ Reverts on slippage exceeded
- ✅ GetReserves returns correctly
- ✅ Transfer works
- ✅ Approve and TransferFrom work
- ✅ Cannot transfer to zero address
- ✅ Cannot deploy with zero free claims
- ✅ Fuzz testing on previewBuy
- ✅ Edge cases (1 account, 2 accounts, odd numbers)

### Frontend Tests (26 unit + 10 E2E)
- ✅ Page loads
- ✅ Hero section visible
- ✅ Connect wallet button present
- ✅ Persona selector shows
- ✅ Navigation works
- ✅ Stats displayed
- ✅ Mock wallet connects
- ✅ Mobile responsive
- ✅ Tablet responsive
- ✅ Heading structure correct
- ✅ Aria labels present
- ✅ Format utilities work
- ✅ Validators work
- ... and 13 more

## Advanced Usage

### Testing Edge Cases

```bash
# Single leaf (edge case)
./test-suite/scripts/run-full-cycle.sh 1

# Two leaves (no duplication)
./test-suite/scripts/run-full-cycle.sh 2

# Odd number (last leaf duplicates)
./test-suite/scripts/run-full-cycle.sh 7

# Power of 2 (perfect tree)
./test-suite/scripts/run-full-cycle.sh 16
```

### CI/CD Integration

```bash
# In GitHub Actions / GitLab CI / Jenkins
./test-suite/scripts/run-full-cycle.sh 100

# Check exit code
if [ $? -eq 0 ]; then
    echo "Tests passed!"
else
    echo "Tests failed!"
    exit 1
fi
```

### Custom Fixtures

```bash
# Generate accounts with custom seed
./target/release/generate_test_accounts \
    --count 100 \
    --seed 12345 \
    --output custom-accounts.json

# Extract addresses
cat custom-accounts.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for acc in data:
    print(acc['address'])
" > custom-addresses.txt

# Build tree
./target/release/txt_to_bin custom-addresses.txt custom-merkledb/

# Start API
./target/release/merkle_api --listen 127.0.0.1:3001 --data-dir custom-merkledb/
```

## Next Steps

1. ✅ **Verify Installation**: Run `./test-suite/scripts/run-small.sh`
2. ✅ **Explore Fixtures**: Check `test-suite/fixtures/` after test
3. ✅ **Read Documentation**: See `test-suite/README.md`
4. ✅ **Customize Tests**: Modify test files in `test-suite/*/test/`
5. ✅ **Integrate CI/CD**: Add to your pipeline

## Support

For help:
1. Check logs in `test-suite/fixtures/*.log`
2. Read `test-suite/README.md`
3. Run cleanup and retry: `./test-suite/scripts/cleanup.sh`

---

**Ready to start?**

```bash
./test-suite/scripts/run-small.sh
```

⏱️ **Takes ~30 seconds for first run (includes compilation)**

🎉 **Happy Testing!**
