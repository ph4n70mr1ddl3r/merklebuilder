#!/bin/bash
# Fund the DemoAirdrop contract on Sepolia with ETH

CONTRACT_ADDRESS="0x79A01fbb895fd9d821BC1123339f8887B07D9458"
RPC_URL="https://1rpc.io/sepolia"

# Check if amount is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/fund-contract.sh <amount_in_eth> [private_key]"
    echo "Example: ./scripts/fund-contract.sh 0.1"
    echo ""
    echo "If private_key is not provided, you'll be prompted to enter it securely."
    exit 1
fi

AMOUNT="$1"

# Get private key
if [ -z "$2" ]; then
    echo "Enter your private key (it won't be displayed):"
    read -s PRIVATE_KEY
else
    PRIVATE_KEY="$2"
fi

echo ""
echo "Funding contract at: $CONTRACT_ADDRESS"
echo "Amount: $AMOUNT ETH"
echo "Network: Sepolia"
echo ""

# Send ETH to contract
cast send "$CONTRACT_ADDRESS" \
  --value "${AMOUNT}ether" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully funded contract with $AMOUNT ETH!"
    echo ""
    echo "Check reserves:"
    cast call "$CONTRACT_ADDRESS" "getReserves()(uint256,uint256)" --rpc-url "$RPC_URL"
else
    echo ""
    echo "❌ Failed to fund contract"
    exit 1
fi
