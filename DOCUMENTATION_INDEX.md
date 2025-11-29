# 📚 Documentation Index

## Getting Started

| Document | Description | When to Use |
|----------|-------------|-------------|
| **[QUICKSTART.md](QUICKSTART.md)** | 5-minute guide to running tests | Start here! |
| **[test-suite/README.md](test-suite/README.md)** | Complete test suite documentation | Detailed reference |
| **[TEST_SUITE_SUMMARY.md](TEST_SUITE_SUMMARY.md)** | High-level overview | Quick reference |
| **[TEST_INFRASTRUCTURE_REPORT.md](TEST_INFRASTRUCTURE_REPORT.md)** | Implementation details | Deep dive |

## Core Documentation

| Document | Description |
|----------|-------------|
| **[README.md](README.md)** | Main project README |
| **[IMPROVEMENTS_IMPLEMENTED.md](IMPROVEMENTS_IMPLEMENTED.md)** | Recent security & UX improvements |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Developer quick reference |
| **[UI_UX_IMPROVEMENTS.md](UI_UX_IMPROVEMENTS.md)** | UI/UX enhancement history |
| **[UI_UX_IMPLEMENTATION_SUMMARY.md](UI_UX_IMPLEMENTATION_SUMMARY.md)** | UI/UX implementation details |

## Test Infrastructure (NEW!)

### Quick Reference
```bash
# Run small test (10 accounts, ~30s)
./test-suite/scripts/run-small.sh

# Run with custom count
./test-suite/scripts/run-full-cycle.sh 100

# Cleanup
./test-suite/scripts/cleanup.sh
```

### Documentation Structure
```
test-suite/
├── README.md                    # Full test suite documentation
│   ├── 📦 Components overview
│   ├── 🚀 Quick start
│   ├── 📁 Directory structure
│   ├── 🔬 Test details
│   ├── 🎮 Usage examples
│   ├── 🐛 Debugging
│   └── 🔄 CI/CD integration
│
├── 03-test-api/                # API integration tests
│   └── api.test.ts             # 15 Vitest tests
│
├── 04-deploy-contract/         # Contract tests
│   └── test/DemoAirdrop.t.sol  # 20+ Foundry tests
│
├── 06-test-frontend/           # E2E tests
│   └── tests/basic.spec.ts     # 10 Playwright tests
│
└── scripts/
    ├── run-full-cycle.sh       # Main orchestrator
    ├── run-small.sh            # Quick test
    ├── run-medium.sh           # Medium scale
    ├── run-large.sh            # Large scale
    └── cleanup.sh              # Cleanup artifacts
```

## Architecture Documentation

### System Components
```
Backend (Rust)
├── generate_test_accounts      # NEW: Test data generator
├── txt_to_bin                  # Merkle tree builder (improved)
├── merkle_path                 # Proof lookup
└── merkle_api                  # HTTP proof server

Smart Contract (Solidity)
└── DemoAirdrop.sol             # ERC20 + Merkle airdrop + AMM

Frontend (Next.js 14)
├── app/                        # Persona-driven UI
├── hooks/                      # React Query + Wagmi
└── lib/                        # Utilities + validators
```

### Data Flow
```
Test Accounts (JSON)
    ↓
Addresses (TXT)
    ↓
Merkle Tree (Binary)
    ↓
API Server (HTTP)
    ↓
Smart Contract (EVM)
    ↓
Frontend (Browser)
```

## Test Coverage

### What Gets Tested
- ✅ **Backend**: Account generation, Merkle trees, API, rate limiting
- ✅ **Contract**: ERC20, claims, invites, referrals, AMM
- ✅ **Frontend**: Rendering, navigation, wallet, responsive, a11y
- ✅ **Integration**: Full end-to-end pipeline
- ✅ **Scale**: 1 to 100M+ accounts

### Test Statistics
- **Total Tests**: 45+
  - API: 15 integration tests
  - Contract: 20+ unit tests
  - Frontend: 10 E2E tests (+ 26 unit tests)
- **Code Coverage**: Backend ~70%, Contract ~80%, Frontend ~60%

## Performance Benchmarks

| Accounts | Tree Build | API Tests | Contract Tests | Total Time |
|----------|------------|-----------|----------------|------------|
| 10       | <1s        | 3s        | 5s             | ~30s       |
| 100      | 1s         | 3s        | 5s             | ~35s       |
| 1,000    | 2s         | 4s        | 5s             | ~45s       |
| 10,000   | 5s         | 5s        | 5s             | ~60s       |
| 100,000  | 45s        | 8s        | 5s             | ~3min      |

## Common Tasks

### Development
```bash
# Build everything
cargo build --release
cd web && npm install && npm run build

# Run tests
cargo test
cd web && npm test
forge test
```

### Testing
```bash
# Full test cycle
./test-suite/scripts/run-full-cycle.sh 100

# Individual components
cd test-suite/03-test-api && npm test
cd test-suite/04-deploy-contract && forge test
cd test-suite/06-test-frontend && npm test
```

### Deployment
```bash
# Deploy contract (testnet)
forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY contracts/DemoAirdrop.sol:DemoAirdrop --constructor-args 2

# Start API (production)
./target/release/merkle_api --listen 0.0.0.0:3000 --data-dir merkledb/

# Deploy frontend
cd web && npm run build && npm run start
```

## Troubleshooting

### Quick Fixes
```bash
# Clean and rebuild
cargo clean && cargo build --release
cd web && rm -rf .next node_modules && npm install

# Kill processes
pkill -f merkle_api
pkill -f anvil

# Reset test data
./test-suite/scripts/cleanup.sh
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | `pkill -f merkle_api` or `pkill -f anvil` |
| jq not found | `apt-get install jq` or `brew install jq` |
| Forge not found | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| Tests fail | Check logs in `test-suite/fixtures/*.log` |
| Build fails | `cargo clean && cargo build --release` |

## File Locations

### Source Code
- **Rust**: `src/` and `src/bin/`
- **Solidity**: `contracts/DemoAirdrop.sol`
- **Frontend**: `web/app/`, `web/lib/`, `web/hooks/`
- **Tests**: `test-suite/`

### Generated Files
- **Binaries**: `target/release/`
- **Frontend Build**: `web/.next/`
- **Test Fixtures**: `test-suite/fixtures/`
- **Contract Artifacts**: `test-suite/04-deploy-contract/out/`

### Configuration
- **Rust**: `Cargo.toml`
- **Contract**: `test-suite/04-deploy-contract/foundry.toml`
- **Frontend**: `web/package.json`, `web/next.config.js`
- **Environment**: `web/.env.local`

## Recent Improvements

### Security & Performance (Nov 2025)
- ✅ Proof validation with on-chain verification
- ✅ Proof caching (24hr TTL)
- ✅ API rate limiting (100 req/min per IP)
- ✅ Address normalization utility
- ✅ Error recovery for failed claims
- ✅ Loading indicators
- ✅ AMM slippage warnings

### Test Infrastructure (Nov 2025)
- ✅ Test account generator
- ✅ Full test cycle automation
- ✅ API integration tests (Vitest)
- ✅ Contract tests (Foundry)
- ✅ Frontend E2E tests (Playwright)
- ✅ Scale testing (1 to 100M accounts)
- ✅ CI/CD ready

## Learning Resources

### External Documentation
- **Rust**: https://doc.rust-lang.org/book/
- **Solidity**: https://docs.soliditylang.org/
- **Next.js**: https://nextjs.org/docs
- **Foundry**: https://book.getfoundry.sh/
- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/

### Project-Specific
- **Merkle Trees**: See `src/merkle.rs` for implementation
- **AMM Logic**: See `contracts/DemoAirdrop.sol` lines 250-302
- **Persona UI**: See `web/app/components/PersonaSelector.tsx`
- **Proof Generation**: See `src/bin/merkle_api.rs`

## Contributing

1. **Read relevant docs** from this index
2. **Set up environment** using QUICKSTART.md
3. **Run tests** with `./test-suite/scripts/run-small.sh`
4. **Make changes** and verify with tests
5. **Update docs** if adding features

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | Nov 2025 | Initial release with test infrastructure |
| 0.9.0 | Nov 2025 | Security & UX improvements |
| 0.8.0 | Nov 2025 | UI/UX enhancements |
| 0.7.0 | Nov 2025 | Core functionality |

## Support

For issues or questions:

1. **Check logs**: `test-suite/fixtures/*.log`
2. **Read docs**: Start with QUICKSTART.md
3. **Run cleanup**: `./test-suite/scripts/cleanup.sh`
4. **Rebuild**: `cargo clean && cargo build --release`

## Quick Links

- 🚀 [Quick Start](QUICKSTART.md) - Get started in 5 minutes
- 📖 [Test Suite README](test-suite/README.md) - Detailed test documentation
- 📊 [Test Summary](TEST_SUITE_SUMMARY.md) - High-level overview
- 🔧 [Main README](README.md) - Project overview
- 💡 [Improvements](IMPROVEMENTS_IMPLEMENTED.md) - Recent enhancements

---

**Ready to start?**

```bash
./test-suite/scripts/run-small.sh
```

🎉 **Happy Coding!**
