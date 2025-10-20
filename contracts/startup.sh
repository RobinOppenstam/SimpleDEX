#!/bin/bash

# Add Foundry to PATH if not already there
export PATH="$HOME/.foundry/bin:$PATH"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    SimpleDEX Startup Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if Anvil is running
if ! pgrep -x "anvil" > /dev/null; then
    echo -e "${RED}Error: Anvil is not running!${NC}"
    echo -e "${YELLOW}Please start Anvil first with: anvil${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Anvil detected${NC}"
echo ""

# Navigate to contracts directory
cd "$(dirname "$0")"

# Step 1: Deploy core contracts
echo -e "${BLUE}[1/6] Deploying core contracts (Factory, Router, Tokens)...${NC}"
forge script script/Deploy.s.sol:DeployDEX --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to deploy core contracts${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Core contracts deployed${NC}"
echo ""

# Step 2: Deploy additional tokens
echo -e "${BLUE}[2/6] Deploying additional tokens (mUSDC, mUSDT, mDAI, mWETH, mWBTC, mLINK, mUNI)...${NC}"
forge script script/DeployTokens.s.sol:DeployTokens --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to deploy tokens${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Additional tokens deployed${NC}"
echo ""

# Step 3: Extract addresses to .env (BEFORE deploying price feeds)
echo -e "${BLUE}[3/8] Extracting contract addresses to .env...${NC}"
python3 ./extract-addresses.py
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to extract addresses${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Addresses extracted to .env${NC}"
echo ""

# Step 4: Deploy Chainlink Price Feeds
echo -e "${BLUE}[4/8] Deploying Chainlink Price Feeds (Oracle + 7 Aggregators)...${NC}"
forge script script/DeployPriceFeeds.s.sol:DeployPriceFeeds --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to deploy price feeds${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Price feeds deployed (ETH: \$3,400, BTC: \$95,000, LINK: \$20, UNI: \$12)${NC}"
echo ""

# Step 5: Deploy Token Faucet
echo -e "${BLUE}[5/10] Deploying Token Faucet with rate limits...${NC}"
forge script script/DeployFaucet.s.sol:DeployFaucet --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to deploy faucet${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Token faucet deployed (24hr cooldown, limits: 2000 USD stables, 0.5 WETH, 0.1 WBTC, 200 LINK, 500 UNI)${NC}"
echo ""

# Step 6: Create trading pairs with initial liquidity
echo -e "${BLUE}[6/10] Creating trading pairs and adding initial liquidity...${NC}"
forge script script/CreatePairs.s.sol:CreatePairs --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to create pairs${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Trading pairs created${NC}"
echo ""

# Step 7: Add additional liquidity to pairs
echo -e "${BLUE}[7/10] Adding additional liquidity to all pairs...${NC}"
forge script script/AddMultipleLiquidity.s.sol:AddMultipleLiquidity --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ Warning: Some liquidity additions may have failed${NC}"
fi
echo -e "${GREEN}✓ Additional liquidity added${NC}"
echo ""

# Step 8: Execute random swaps
echo -e "${BLUE}[8/10] Executing 5 random swaps...${NC}"
forge script script/RandomSwaps.s.sol:RandomSwaps --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to execute swaps${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All 5 random swaps executed successfully${NC}"
echo ""

# Step 9: Update .env again with all final addresses including price feeds and faucet
echo -e "${BLUE}[9/10] Updating .env with all contract addresses...${NC}"
python3 ./extract-addresses.py
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to extract addresses${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All addresses extracted to .env${NC}"
echo ""

# Step 10: Update frontend configuration
echo -e "${BLUE}[10/10] Updating frontend configuration files...${NC}"
python3 ./update-frontend-config.py
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to update frontend config${NC}"
    exit 1
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}    SimpleDEX Setup Complete! 🚀${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Hard refresh your browser (Ctrl+Shift+R)"
echo -e "  2. Start your frontend: ${GREEN}cd ../dex-frontend && npm run dev${NC}"
echo ""
echo -e "${YELLOW}All addresses have been automatically updated in:${NC}"
echo -e "  - contracts/.env"
echo -e "  - dex-frontend/src/app/config/tokens.ts"
echo -e "  - dex-frontend/src/app/config/priceFeeds.ts"
echo -e "  - dex-frontend/src/app/page.tsx"
echo ""
