#!/bin/bash

# Update frontend configuration files with contract addresses from .env
# This ensures the frontend always has the correct deployed addresses

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
FRONTEND_DIR="$SCRIPT_DIR/../dex-frontend"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Updating Frontend Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    echo -e "${YELLOW}Run ./extract-addresses.sh first to generate .env${NC}"
    exit 1
fi

# Load environment variables
source "$ENV_FILE"

# Check required variables
if [ -z "$FACTORY_ADDRESS" ] || [ -z "$ROUTER_ADDRESS" ]; then
    echo -e "${RED}Error: Required addresses not found in .env${NC}"
    echo -e "${YELLOW}Make sure FACTORY_ADDRESS and ROUTER_ADDRESS are set${NC}"
    exit 1
fi

echo -e "${YELLOW}Loaded addresses from .env${NC}"
echo ""

# Update tokens.ts
TOKENS_FILE="$FRONTEND_DIR/src/app/config/tokens.ts"
echo -e "${BLUE}[1/4] Updating $TOKENS_FILE${NC}"

if [ -f "$TOKENS_FILE" ]; then
    # Create a temporary file with updated addresses
    sed -i.bak \
        -e "s/address: '0x[a-fA-F0-9]\{40\}',  *\/\/ mUSDC/address: '${USDC_ADDRESS}',  \/\/ mUSDC/" \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ mUSDT/address: '${USDT_ADDRESS}', \/\/ mUSDT/" \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ mDAI/address: '${DAI_ADDRESS}', \/\/ mDAI/" \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ mWETH/address: '${WETH_ADDRESS}', \/\/ mWETH/" \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ mWBTC/address: '${WBTC_ADDRESS}', \/\/ mWBTC/" \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ mLINK/address: '${LINK_ADDRESS}', \/\/ mLINK/" \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ mUNI/address: '${UNI_ADDRESS}', \/\/ mUNI/" \
        "$TOKENS_FILE"

    # More robust replacement for token addresses in the TOKENS object
    cat > /tmp/tokens_update.txt << EOF
// Main token registry - Updated with latest Anvil deployment
export const TOKENS: Record<string, Token> = {
  mUSDC: {
    address: '${USDC_ADDRESS}',
    symbol: 'mUSDC',
    name: 'Mock USD Coin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDC.png',
  },
  mUSDT: {
    address: '${USDT_ADDRESS}',
    symbol: 'mUSDT',
    name: 'Mock Tether USD',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDT.png',
  },
  mDAI: {
    address: '${DAI_ADDRESS}',
    symbol: 'mDAI',
    name: 'Mock Dai Stablecoin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/DAI.png',
  },
  mWETH: {
    address: '${WETH_ADDRESS}',
    symbol: 'mWETH',
    name: 'Mock Wrapped Ether',
    decimals: 18,
    logoURI: '/WETH.png',
  },
  mWBTC: {
    address: '${WBTC_ADDRESS}',
    symbol: 'mWBTC',
    name: 'Mock Wrapped Bitcoin',
    decimals: 18,
    logoURI: '/bitcoin.png',
  },
  mLINK: {
    address: '${LINK_ADDRESS}',
    symbol: 'mLINK',
    name: 'Mock Chainlink',
    decimals: 18,
    logoURI: '/LINK.png',
  },
  mUNI: {
    address: '${UNI_ADDRESS}',
    symbol: 'mUNI',
    name: 'Mock Uniswap',
    decimals: 18,
    logoURI: '/UNI.png',
  },
};
EOF

    # Replace the TOKENS section
    awk '
    /^\/\/ Main token registry/ { print; p=1; next }
    /^};$/ && p { print; getline < "/tmp/tokens_update.txt"; while ((getline line < "/tmp/tokens_update.txt") > 0) print line; close("/tmp/tokens_update.txt"); p=0; next }
    !p
    ' "$TOKENS_FILE" > "$TOKENS_FILE.tmp" && mv "$TOKENS_FILE.tmp" "$TOKENS_FILE"

    echo -e "${GREEN}✓ Updated tokens.ts${NC}"
else
    echo -e "${YELLOW}⚠ tokens.ts not found, skipping${NC}"
fi

# Update priceFeeds.ts
PRICE_FEEDS_FILE="$FRONTEND_DIR/src/app/config/priceFeeds.ts"
echo -e "${BLUE}[2/4] Updating $PRICE_FEEDS_FILE${NC}"

if [ -f "$PRICE_FEEDS_FILE" ]; then
    cat > /tmp/pricefeeds_update.txt << EOF
// Price Oracle Configuration

export const PRICE_ORACLE_ADDRESS = '${PRICE_ORACLE_ADDRESS}';

// Individual aggregator addresses (for direct queries if needed)
export const AGGREGATORS = {
  mWETH: '${ETH_USD_AGGREGATOR}',
  mWBTC: '${BTC_USD_AGGREGATOR}',
  mLINK: '${LINK_USD_AGGREGATOR}',
  mUNI: '${UNI_USD_AGGREGATOR}',
  mUSDC: '${USDC_USD_AGGREGATOR}',
  mUSDT: '${USDT_USD_AGGREGATOR}',
  mDAI: '${DAI_USD_AGGREGATOR}',
};
EOF

    # Replace the configuration section
    awk '
    /^\/\/ Price Oracle Configuration/ { getline < "/tmp/pricefeeds_update.txt"; while ((getline line < "/tmp/pricefeeds_update.txt") > 0) print line; close("/tmp/pricefeeds_update.txt"); skip=1; next }
    /^\/\/ Price Oracle ABI/ { skip=0 }
    !skip
    ' "$PRICE_FEEDS_FILE" > "$PRICE_FEEDS_FILE.tmp" && mv "$PRICE_FEEDS_FILE.tmp" "$PRICE_FEEDS_FILE"

    echo -e "${GREEN}✓ Updated priceFeeds.ts${NC}"
else
    echo -e "${YELLOW}⚠ priceFeeds.ts not found, skipping${NC}"
fi

# Update page.tsx
PAGE_FILE="$FRONTEND_DIR/src/app/page.tsx"
echo -e "${BLUE}[3/4] Updating $PAGE_FILE${NC}"

if [ -f "$PAGE_FILE" ]; then
    # Update the CONTRACTS object
    sed -i.bak \
        -e "s/ROUTER: '0x[a-fA-F0-9]\{40\}'/ROUTER: '${ROUTER_ADDRESS}'/" \
        -e "s/FACTORY: '0x[a-fA-F0-9]\{40\}'/FACTORY: '${FACTORY_ADDRESS}'/" \
        -e "s/TOKEN_A: '0x[a-fA-F0-9]\{40\}'/TOKEN_A: '${TOKEN_A_ADDRESS}'/" \
        -e "s/TOKEN_B: '0x[a-fA-F0-9]\{40\}'/TOKEN_B: '${TOKEN_B_ADDRESS}'/" \
        "$PAGE_FILE"

    echo -e "${GREEN}✓ Updated page.tsx${NC}"
else
    echo -e "${YELLOW}⚠ page.tsx not found, skipping${NC}"
fi

# Update deprecated tokens config
DEPRECATED_TOKENS_FILE="$FRONTEND_DIR/src/config/tokens.ts"
echo -e "${BLUE}[4/4] Updating $DEPRECATED_TOKENS_FILE${NC}"

if [ -f "$DEPRECATED_TOKENS_FILE" ]; then
    sed -i.bak \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ Token A/address: '${TOKEN_A_ADDRESS}', \/\/ Token A/" \
        -e "s/address: '0x[a-fA-F0-9]\{40\}', *\/\/ Token B/address: '${TOKEN_B_ADDRESS}', \/\/ Token B/" \
        -e "s/ROUTER: '0x[a-fA-F0-9]\{40\}'/ROUTER: '${ROUTER_ADDRESS}'/" \
        -e "s/FACTORY: '0x[a-fA-F0-9]\{40\}'/FACTORY: '${FACTORY_ADDRESS}'/" \
        "$DEPRECATED_TOKENS_FILE"

    echo -e "${GREEN}✓ Updated deprecated config/tokens.ts${NC}"
else
    echo -e "${YELLOW}⚠ config/tokens.ts not found, skipping${NC}"
fi

# Clean up backup files
rm -f "$TOKENS_FILE.bak" "$PRICE_FEEDS_FILE.bak" "$PAGE_FILE.bak" "$DEPRECATED_TOKENS_FILE.bak" 2>/dev/null || true
rm -f /tmp/tokens_update.txt /tmp/pricefeeds_update.txt 2>/dev/null || true

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Frontend configuration updated!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Contract Addresses:${NC}"
echo -e "  Factory:     ${GREEN}${FACTORY_ADDRESS}${NC}"
echo -e "  Router:      ${GREEN}${ROUTER_ADDRESS}${NC}"
echo -e "  PriceOracle: ${GREEN}${PRICE_ORACLE_ADDRESS}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Hard refresh your browser (Ctrl+Shift+R)"
echo -e "  2. The frontend will automatically use the new addresses"
echo ""
