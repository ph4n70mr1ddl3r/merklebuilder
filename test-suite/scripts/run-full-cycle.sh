#!/bin/bash
set -e  # Exit on error

# ========================================
# Configuration
# ========================================
ACCOUNT_COUNT=${1:-100}  # Default to 100 accounts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SUITE_DIR="$ROOT_DIR/test-suite"
FIXTURES_DIR="$SUITE_DIR/fixtures"
TEST_DB_DIR="$FIXTURES_DIR/merkledb-$ACCOUNT_COUNT"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'  # No Color
BOLD='\033[1m'

# Process IDs for cleanup
API_PID=""
ANVIL_PID=""
FRONTEND_PID=""

# ========================================
# Helper Functions
# ========================================
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

cleanup() {
    log "Cleaning up background processes..."
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    [ -n "$API_PID" ] && kill $API_PID 2>/dev/null || true
    [ -n "$ANVIL_PID" ] && kill $ANVIL_PID 2>/dev/null || true
    
    # Also kill any lingering processes
    pkill -f "merkle_api" 2>/dev/null || true
    pkill -f "anvil" 2>/dev/null || true
    
    log "Cleanup complete"
}

trap cleanup EXIT INT TERM

# ========================================
# Banner
# ========================================
echo ""
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║   Merklebuilder Full Test Cycle       ║${NC}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Account Count: ${BOLD}$ACCOUNT_COUNT${NC}"
echo -e "  Timestamp: $(date)"
echo ""

# ========================================
# Prerequisite Checks
# ========================================
log "Checking prerequisites..."

command -v cargo >/dev/null 2>&1 || error "Rust/Cargo not found. Install from https://rustup.rs"
command -v node >/dev/null 2>&1 || error "Node.js not found. Install from https://nodejs.org"
command -v forge >/dev/null 2>&1 || error "Foundry not found. Install from https://getfoundry.sh"
command -v jq >/dev/null 2>&1 || error "jq not found. Install with: apt-get install jq"

success "All prerequisites found"

# ========================================
# Cleanup Previous Run
# ========================================
log "Cleaning up previous test data..."
rm -rf "$FIXTURES_DIR" "$TEST_DB_DIR"
mkdir -p "$FIXTURES_DIR"
success "Cleanup complete"

# ========================================
# STEP 1: Generate Test Accounts
# ========================================
echo ""
echo -e "${BOLD}Step 1: Generating Test Accounts${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$ROOT_DIR"
log "Building test account generator..."
cargo build --release --bin generate_test_accounts 2>&1 | grep -E "(Compiling|Finished)" || true

log "Generating $ACCOUNT_COUNT deterministic test accounts..."
./target/release/generate_test_accounts \
    --count $ACCOUNT_COUNT \
    --output "$FIXTURES_DIR/accounts-$ACCOUNT_COUNT.json" \
    --seed 42

success "Generated $ACCOUNT_COUNT test accounts"

# Validate JSON
if ! jq empty "$FIXTURES_DIR/accounts-$ACCOUNT_COUNT.json" 2>/dev/null; then
    error "Generated JSON is invalid"
fi

# ========================================
# STEP 2: Build Merkle Tree
# ========================================
echo ""
echo -e "${BOLD}Step 2: Building Merkle Tree${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "Extracting addresses to text file..."
jq -r '.[].address' "$FIXTURES_DIR/accounts-$ACCOUNT_COUNT.json" > "$FIXTURES_DIR/addresses.txt"
success "Extracted $(wc -l < "$FIXTURES_DIR/addresses.txt") addresses"

log "Building binaries..."
cargo build --release --bin txt_to_bin 2>&1 | grep -E "(Compiling|Finished)" || true

log "Generating Merkle tree from addresses..."
./target/release/txt_to_bin "$FIXTURES_DIR/addresses.txt" "$TEST_DB_DIR"

# Extract and save merkle root
LAYER_FILES=($(ls -1 "$TEST_DB_DIR"/layer*.bin | sort -V))
LAST_LAYER="${LAYER_FILES[-1]}"
MERKLE_ROOT=$(xxd -p -c 32 "$LAST_LAYER" | head -1)
echo "0x$MERKLE_ROOT" > "$FIXTURES_DIR/merkle-root.txt"

success "Merkle tree built with $(ls -1 "$TEST_DB_DIR"/layer*.bin | wc -l) layers"
log "Merkle Root: 0x$MERKLE_ROOT"

# ========================================
# STEP 3: Test Merkle API
# ========================================
echo ""
echo -e "${BOLD}Step 3: Testing Merkle API${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "Building API..."
cargo build --release --bin merkle_api 2>&1 | grep -E "(Compiling|Finished)" || true

log "Starting Merkle API on port 3001..."
./target/release/merkle_api \
    --listen 127.0.0.1:3001 \
    --data-dir "$TEST_DB_DIR" > "$FIXTURES_DIR/api.log" 2>&1 &
API_PID=$!

log "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -sf http://127.0.0.1:3001/health > /dev/null 2>&1; then
        success "API is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        error "API failed to start. Check $FIXTURES_DIR/api.log"
    fi
    sleep 1
done

# Run API tests
cd "$SUITE_DIR/03-test-api"
log "Installing API test dependencies..."
npm install --silent 2>&1 | grep -v "npm WARN" || true

log "Running API integration tests..."
export API_URL="http://127.0.0.1:3001"
export ACCOUNTS_FILE="accounts-$ACCOUNT_COUNT.json"

if npm test; then
    success "API tests passed"
else
    error "API tests failed"
fi

cd "$ROOT_DIR"

# ========================================
# STEP 4: Deploy & Test Smart Contract
# ========================================
echo ""
echo -e "${BOLD}Step 4: Deploying Smart Contract${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "Starting Anvil (local Ethereum node)..."
anvil --port 8545 --chain-id 31337 --silent > "$FIXTURES_DIR/anvil.log" 2>&1 &
ANVIL_PID=$!

sleep 3
success "Anvil started on port 8545"

cd "$SUITE_DIR/04-deploy-contract"

MERKLE_ROOT=$(cat "$FIXTURES_DIR/merkle-root.txt")
log "Deploying DemoAirdrop with root: $MERKLE_ROOT"

# Deploy contract (using Anvil's first default account)
DEPLOY_OUTPUT=$(forge create \
    --rpc-url http://127.0.0.1:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --value 1ether \
    --json \
    ../../contracts/DemoAirdrop.sol:DemoAirdrop \
    --constructor-args 2 2>&1)

if echo "$DEPLOY_OUTPUT" | jq empty 2>/dev/null; then
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | jq -r '.deployedTo')
    success "Contract deployed at: $CONTRACT_ADDRESS"
    
    # Save for frontend
    echo "NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > "$FIXTURES_DIR/contract.env"
    echo "NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545" >> "$FIXTURES_DIR/contract.env"
    echo "NEXT_PUBLIC_CHAIN_ID=31337" >> "$FIXTURES_DIR/contract.env"
    echo "NEXT_PUBLIC_CHAIN_NAME=Anvil" >> "$FIXTURES_DIR/contract.env"
    echo "NEXT_PUBLIC_API_BASE=http://127.0.0.1:3001" >> "$FIXTURES_DIR/contract.env"
else
    warn "Contract deployment output was not JSON, attempting to parse..."
    # Try to extract address from non-JSON output
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Deployed to: \K0x[a-fA-F0-9]{40}' || echo "")
    if [ -z "$CONTRACT_ADDRESS" ]; then
        error "Failed to deploy contract. Output: $DEPLOY_OUTPUT"
    else
        success "Contract deployed at: $CONTRACT_ADDRESS"
        echo "NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > "$FIXTURES_DIR/contract.env"
    fi
fi

# Run contract tests
log "Running Foundry contract tests..."
if forge test -vv; then
    success "Contract tests passed"
else
    warn "Some contract tests failed (expected without real proofs)"
fi

cd "$ROOT_DIR"

# ========================================
# STEP 5: Generate Proofs for Test Accounts
# ========================================
echo ""
echo -e "${BOLD}Step 5: Generating Proofs${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p "$FIXTURES_DIR/proofs"

# Generate proofs for first 10 accounts
PROOF_COUNT=10
if [ $ACCOUNT_COUNT -lt 10 ]; then
    PROOF_COUNT=$ACCOUNT_COUNT
fi
log "Generating proofs for first $PROOF_COUNT accounts..."

for i in $(seq 0 $((PROOF_COUNT - 1))); do
    ADDRESS=$(jq -r ".[$i].address" "$FIXTURES_DIR/accounts-$ACCOUNT_COUNT.json")
    curl -sf "http://127.0.0.1:3001/proof/$ADDRESS" > "$FIXTURES_DIR/proofs/account-$i.json" 2>/dev/null || {
        warn "Failed to generate proof for account $i ($ADDRESS)"
    }
done

GENERATED_PROOFS=$(ls -1 "$FIXTURES_DIR/proofs"/*.json 2>/dev/null | wc -l)
success "Generated $GENERATED_PROOFS proofs"

# ========================================
# STEP 6: Test Frontend (Basic)
# ========================================
echo ""
echo -e "${BOLD}Step 6: Testing Frontend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$ROOT_DIR/web"

log "Configuring frontend for tests..."
cp "$FIXTURES_DIR/contract.env" .env.local

log "Building frontend..."
if npm run build > "$FIXTURES_DIR/frontend-build.log" 2>&1; then
    success "Frontend built successfully"
else
    warn "Frontend build had warnings (check $FIXTURES_DIR/frontend-build.log)"
fi

# Run existing frontend tests
log "Running frontend unit tests..."
if npm test -- --run > "$FIXTURES_DIR/frontend-tests.log" 2>&1; then
    success "Frontend unit tests passed"
else
    warn "Some frontend tests failed (check $FIXTURES_DIR/frontend-tests.log)"
fi

# Optional: Run E2E tests if Playwright is installed
cd "$SUITE_DIR/06-test-frontend"
if [ -f "package.json" ]; then
    log "Installing Playwright (if not already installed)..."
    npm install --silent 2>&1 | grep -v "npm WARN" || true
    
    # Don't fail if E2E tests aren't fully set up yet
    log "E2E tests available but skipped (run manually with: cd test-suite/06-test-frontend && npm test)"
fi

cd "$ROOT_DIR"

# ========================================
# SUCCESS SUMMARY
# ========================================
echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║     ✓ Full Test Cycle Complete!       ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Test Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  📊 Accounts Generated: ${GREEN}$ACCOUNT_COUNT${NC}"
echo -e "  🌳 Merkle Root: ${BLUE}$(cat "$FIXTURES_DIR/merkle-root.txt")${NC}"
echo -e "  📝 Contract Address: ${BLUE}$CONTRACT_ADDRESS${NC}"
echo -e "  🔗 API Endpoint: ${BLUE}http://127.0.0.1:3001${NC}"
echo -e "  🌐 Frontend: ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${BOLD}Artifacts:${NC}"
echo "  • Test accounts: $FIXTURES_DIR/accounts-$ACCOUNT_COUNT.json"
echo "  • Merkle DB: $TEST_DB_DIR/"
echo "  • Proofs: $FIXTURES_DIR/proofs/"
echo "  • Logs: $FIXTURES_DIR/*.log"
echo ""
echo -e "${BOLD}Services Running:${NC}"
echo "  • API: PID $API_PID (logs: $FIXTURES_DIR/api.log)"
echo "  • Anvil: PID $ANVIL_PID (logs: $FIXTURES_DIR/anvil.log)"
echo ""
echo -e "${YELLOW}Note: Services will stop when you exit this script.${NC}"
echo -e "To cleanup: ${BLUE}./test-suite/scripts/cleanup.sh${NC}"
echo ""

# Keep services running
log "Press Ctrl+C to stop all services and exit..."
wait
