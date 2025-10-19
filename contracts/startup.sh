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
echo -e "${BLUE}[1/5] Deploying core contracts (Factory, Router, Tokens)...${NC}"
forge script script/Deploy.s.sol:DeployDEX --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to deploy core contracts${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Core contracts deployed${NC}"
echo ""

# Step 2: Deploy additional tokens
echo -e "${BLUE}[2/5] Deploying additional tokens (USDC, USDT, DAI, WETH, WBTC, LINK, UNI)...${NC}"
forge script script/DeployTokens.s.sol:DeployTokens --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to deploy tokens${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Additional tokens deployed${NC}"
echo ""

# Step 3: Create trading pairs with initial liquidity
echo -e "${BLUE}[3/5] Creating trading pairs and adding initial liquidity...${NC}"
forge script script/CreatePairs.s.sol:CreatePairs --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to create pairs${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Trading pairs created${NC}"
echo ""

# Step 4: Add additional liquidity to pairs
echo -e "${BLUE}[4/5] Adding additional liquidity to all pairs...${NC}"
forge script script/AddMultipleLiquidity.s.sol:AddMultipleLiquidity --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ Warning: Some liquidity additions may have failed${NC}"
fi
echo -e "${GREEN}✓ Additional liquidity added${NC}"
echo ""

# Step 5: Execute random swaps
echo -e "${BLUE}[5/5] Executing 5 random swaps...${NC}"
forge script script/RandomSwaps.s.sol:RandomSwaps --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to execute swaps${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All 5 random swaps executed successfully${NC}"
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}    SimpleDEX Setup Complete! 🚀${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Contract Addresses:${NC}"
echo -e "Factory: ${GREEN}0x5FbDB2315678afecb367f032d93F642f64180aa3${NC}"
echo -e "Router:  ${GREEN}0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512${NC}"
echo ""
echo -e "${YELLOW}Token Addresses (UPDATED):${NC}"
echo -e "USDC:    ${GREEN}0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9${NC}"
echo -e "USDT:    ${GREEN}0x5FC8d32690cc91D4c39d9d3abcBD16989F875707${NC}"
echo -e "DAI:     ${GREEN}0x0165878A594ca255338adfa4d48449f69242Eb8F${NC}"
echo -e "WETH:    ${GREEN}0xa513E6E4b8f2a923D98304ec87F64353C4D5C853${NC}"
echo -e "WBTC:    ${GREEN}0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6${NC}"
echo -e "LINK:    ${GREEN}0x8A791620dd6260079BF849Dc5567aDC3F2FdC318${NC}"
echo -e "UNI:     ${GREEN}0x610178dA211FEF7D417bC0e6FeD39F05609AD788${NC}"
echo ""
echo -e "${YELLOW}Ready to use! Start your frontend with:${NC}"
echo -e "${GREEN}cd ../dex-frontend && npm run dev${NC}"
echo ""
