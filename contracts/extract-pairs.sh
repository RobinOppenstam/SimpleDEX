#!/bin/bash
# Extract all pair addresses from the DEXFactory contract

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables first
source .env

# Determine chain ID
CHAIN_ID=${1:-31337}
if [ "$CHAIN_ID" = "11155111" ]; then
    NETWORK="Sepolia"
    RPC_URL="$SEPOLIA_RPC_URL"
    PREFIX="SEPOLIA"
else
    NETWORK="Anvil"
    RPC_URL="$RPC_URL"
    PREFIX="ANVIL"
fi

echo -e "${BLUE}=== Extracting Pair Addresses for $NETWORK (Chain ID: $CHAIN_ID) ===${NC}\n"

# Check if factory address exists
if [ -z "$FACTORY_ADDRESS" ]; then
    echo -e "${RED}❌ FACTORY_ADDRESS not found in .env${NC}"
    exit 1
fi

echo "Factory: $FACTORY_ADDRESS"
echo "RPC: $RPC_URL"
echo -e "\nFetching pair addresses...\n"

# Function to get pair address
get_pair() {
    local token_a=$1
    local token_b=$2
    local pair_name=$3

    # Call factory.getPair(tokenA, tokenB)
    local pair_address=$(~/.foundry/bin/cast call $FACTORY_ADDRESS "getPair(address,address)(address)" $token_a $token_b --rpc-url $RPC_URL 2>/dev/null || echo "0x0000000000000000000000000000000000000000")

    if [ "$pair_address" != "0x0000000000000000000000000000000000000000" ]; then
        echo -e "${GREEN}✓${NC} $pair_name: $pair_address" >&2
        echo "$pair_name|$pair_address"
    else
        echo -e "${RED}✗${NC} $pair_name: No pair found" >&2
    fi
}

# Create temporary file for pairs
PAIRS_FILE=$(mktemp)

# Fetch all pair addresses (matching CreatePairs.s.sol)
get_pair "$USDC_ADDRESS" "$USDT_ADDRESS" "mUSDC/mUSDT" >> $PAIRS_FILE
get_pair "$USDC_ADDRESS" "$DAI_ADDRESS" "mUSDC/mDAI" >> $PAIRS_FILE
get_pair "$WETH_ADDRESS" "$USDC_ADDRESS" "mWETH/mUSDC" >> $PAIRS_FILE
get_pair "$WETH_ADDRESS" "$USDT_ADDRESS" "mWETH/mUSDT" >> $PAIRS_FILE
get_pair "$WETH_ADDRESS" "$DAI_ADDRESS" "mWETH/mDAI" >> $PAIRS_FILE
get_pair "$WBTC_ADDRESS" "$USDC_ADDRESS" "mWBTC/mUSDC" >> $PAIRS_FILE
get_pair "$WBTC_ADDRESS" "$WETH_ADDRESS" "mWBTC/mWETH" >> $PAIRS_FILE
get_pair "$LINK_ADDRESS" "$USDC_ADDRESS" "mLINK/mUSDC" >> $PAIRS_FILE
get_pair "$LINK_ADDRESS" "$WETH_ADDRESS" "mLINK/mWETH" >> $PAIRS_FILE
get_pair "$UNI_ADDRESS" "$USDC_ADDRESS" "mUNI/mUSDC" >> $PAIRS_FILE

# Count pairs found
PAIR_COUNT=$(grep -c "|" $PAIRS_FILE || echo "0")

if [ "$PAIR_COUNT" = "0" ]; then
    echo -e "\n${RED}❌ No pairs found. Make sure pairs have been created.${NC}"
    rm $PAIRS_FILE
    exit 1
fi

echo -e "\n${GREEN}✓ Found $PAIR_COUNT pairs${NC}\n"

# Update contracts/.env
echo "# Pair Addresses ($NETWORK - Chain ID $CHAIN_ID)" >> .env
while IFS='|' read -r name address; do
    [ -z "$name" ] && continue
    env_var=$(echo "PAIR_${name}" | sed 's/\//_/g' | sed 's/m//g' | tr '[:lower:]' '[:upper:]')
    echo "${env_var}=${address}" >> .env
    echo "  Added ${env_var}"
done < $PAIRS_FILE

echo -e "\n${GREEN}✓ Updated .env${NC}\n"

# Update frontend/.env.local
FRONTEND_ENV="../dex-frontend/.env.local"

# Remove old pair addresses for this network
if [ -f "$FRONTEND_ENV" ]; then
    grep -v "NEXT_PUBLIC_${PREFIX}_PAIR_" "$FRONTEND_ENV" > "${FRONTEND_ENV}.tmp" || true
    mv "${FRONTEND_ENV}.tmp" "$FRONTEND_ENV"
fi

echo "" >> $FRONTEND_ENV
echo "# $NETWORK Pair Addresses" >> $FRONTEND_ENV
while IFS='|' read -r name address; do
    [ -z "$name" ] && continue
    env_var=$(echo "NEXT_PUBLIC_${PREFIX}_PAIR_${name}" | sed 's/\//_/g' | sed 's/m//g' | tr '[:lower:]' '[:upper:]')
    echo "${env_var}=${address}" >> $FRONTEND_ENV
    echo "  Added ${env_var}"
done < $PAIRS_FILE

echo -e "\n${GREEN}✓ Updated $FRONTEND_ENV${NC}\n"

# Cleanup
rm $PAIRS_FILE

echo -e "${GREEN}✅ Pair addresses extracted and updated successfully!${NC}\n"
echo "Next steps:"
echo "1. Restart frontend: cd dex-frontend && npm run dev"
echo "2. Hard refresh browser (Ctrl+Shift+R)"
