#!/bin/bash
# Cleanup all test artifacts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUITE_DIR="$SCRIPT_DIR/.."

echo "Cleaning up test artifacts..."

# Remove fixtures
rm -rf "$SUITE_DIR/fixtures"

# Remove build artifacts
rm -rf "$SUITE_DIR/04-deploy-contract/out"
rm -rf "$SUITE_DIR/04-deploy-contract/cache"

# Stop any running processes
pkill -f "merkle_api" 2>/dev/null || true
pkill -f "anvil" 2>/dev/null || true

echo "✓ Cleanup complete"
