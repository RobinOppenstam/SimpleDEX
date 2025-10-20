#!/bin/bash

# SimpleDEX Sepolia Testnet Deployment Script
# This script deploys the full DEX to Sepolia testnet with REAL Chainlink price feeds

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}║        SimpleDEX Sepolia Testnet Deployment       ║${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo ""

# Load environment variables
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env with:"
    echo "  SEPOLIA_RPC_URL=your_rpc_url"
    echo "  SEPOLIA_PRIVATE_KEY=your_private_key"
    exit 1
fi

source .env

# Check required variables
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}Error: SEPOLIA_RPC_URL not set in .env${NC}"
    exit 1
fi

if [ -z "$SEPOLIA_PRIVATE_KEY" ]; then
    echo -e "${RED}Error: SEPOLIA_PRIVATE_KEY not set in .env${NC}"
    exit 1
fi

# Check if Etherscan API key is set (optional but recommended)
if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo -e "${YELLOW}Warning: ETHERSCAN_API_KEY not set. Contracts won't be verified.${NC}"
    echo -e "${YELLOW}Get one at: https://etherscan.io/apis${NC}"
    VERIFY_FLAG=""
else
    VERIFY_FLAG="--verify --etherscan-api-key $ETHERSCAN_API_KEY"
fi

echo -e "${GREEN}✓ Configuration loaded${NC}"
echo -e "  RPC: ${SEPOLIA_RPC_URL:0:50}..."
echo -e "  Chain: Sepolia (11155111)"
echo ""

# Function to run a deployment step
run_step() {
    local step_num=$1
    local total_steps=$2
    local description=$3
    local script=$4
    local extra_args=$5

    echo -e "${BLUE}[${step_num}/${total_steps}] ${description}...${NC}"

    # Run deployment without verification (verification can be flaky)
    if forge script $script \
        --rpc-url $SEPOLIA_RPC_URL \
        --private-key $SEPOLIA_PRIVATE_KEY \
        --broadcast \
        $extra_args; then
        echo -e "${GREEN}✓ Step ${step_num} complete${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Step ${step_num} failed!${NC}"
        echo -e "${YELLOW}Check the error above and fix before continuing${NC}"
        exit 1
    fi
}

# Confirm deployment
echo -e "${YELLOW}⚠️  You are about to deploy to Sepolia testnet${NC}"
echo -e "${YELLOW}⚠️  This will cost real testnet ETH${NC}"
echo ""
read -p "Continue? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi
echo ""

# Step 1: Deploy Factory and Router
run_step 1 9 "Deploying Factory and Router" "script/Deploy.s.sol:DeployDEX"

# Step 2: Deploy Tokens
run_step 2 9 "Deploying Mock Tokens (mUSDC, mUSDT, mDAI, mWETH, mWBTC, mLINK, mUNI)" "script/DeployTokens.s.sol:DeployTokens"

# Step 3: Extract addresses
echo -e "${BLUE}[3/9] Extracting contract addresses to .env...${NC}"
python3 ./extract-addresses.py 11155111  # Pass Sepolia chain ID
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Step 3 complete${NC}"
    echo ""
else
    echo -e "${RED}✗ Address extraction failed!${NC}"
    exit 1
fi

# Reload .env to get new addresses
source .env

# Step 4: Deploy REAL Chainlink Price Feeds
echo -e "${BLUE}[4/9] Deploying PriceOracle with REAL Chainlink feeds...${NC}"
echo -e "${GREEN}  This will use live price data that updates automatically!${NC}"
run_step 4 9 "Deploying Real Price Feeds" "script/DeployRealPriceFeeds.s.sol:DeployRealPriceFeeds"

# Step 5: Extract addresses again (including oracle)
echo -e "${BLUE}[5/9] Updating .env with PriceOracle address...${NC}"
python3 ./extract-addresses.py 11155111  # Pass Sepolia chain ID
source .env
echo -e "${GREEN}✓ Step 5 complete${NC}"
echo ""

# Step 6: Deploy Token Faucet
run_step 6 9 "Deploying Token Faucet (24h cooldown)" "script/DeployFaucet.s.sol:DeployFaucet"

# Step 7: Extract faucet address
echo -e "${BLUE}[7/9] Updating .env with Faucet address...${NC}"
python3 ./extract-addresses.py 11155111  # Pass Sepolia chain ID
source .env
echo -e "${GREEN}✓ Step 7 complete${NC}"
echo ""

# Step 8: Create Trading Pairs
run_step 8 9 "Creating 10 trading pairs" "script/CreatePairs.s.sol:CreatePairs"

# Step 9: Add Initial Liquidity
run_step 9 9 "Adding initial liquidity to all pairs" "script/AddMultipleLiquidity.s.sol:AddMultipleLiquidity"

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ SimpleDEX deployed successfully to Sepolia!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Deployed Contracts:${NC}"
echo -e "  Factory:     ${GREEN}$FACTORY_ADDRESS${NC}"
echo -e "  Router:      ${GREEN}$ROUTER_ADDRESS${NC}"
echo -e "  PriceOracle: ${GREEN}$PRICE_ORACLE_ADDRESS${NC}"
echo -e "  Faucet:      ${GREEN}$FAUCET_ADDRESS${NC}"
echo ""

echo -e "${YELLOW}View on Etherscan:${NC}"
echo -e "  Factory:     https://sepolia.etherscan.io/address/$FACTORY_ADDRESS"
echo -e "  Router:      https://sepolia.etherscan.io/address/$ROUTER_ADDRESS"
echo -e "  PriceOracle: https://sepolia.etherscan.io/address/$PRICE_ORACLE_ADDRESS"
echo -e "  Faucet:      https://sepolia.etherscan.io/address/$FAUCET_ADDRESS"
echo ""

# Auto-update frontend configuration
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Updating Frontend Configuration            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -f "update-frontend-config.py" ]; then
    echo -e "${GREEN}Running update-frontend-config.py (Sepolia mode)...${NC}"
    python3 update-frontend-config.py sepolia
    echo ""
else
    echo -e "${YELLOW}⚠ update-frontend-config.py not found. Skipping frontend update.${NC}"
    echo -e "${YELLOW}  Manually run: python3 ./update-frontend-config.py sepolia${NC}"
    echo ""
fi

echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. View your DEX on Sepolia"
echo -e "     Factory Pairs: https://sepolia.etherscan.io/address/$FACTORY_ADDRESS#readContract"
echo ""
echo -e "  2. (Optional) Verify contracts manually:"
echo -e "     ${GREEN}make verify-sepolia${NC}"
echo ""
echo -e "  3. Test the faucet:"
echo -e "     ${GREEN}forge script script/UseFaucet.s.sol:UseFaucet --rpc-url \$SEPOLIA_RPC_URL --private-key \$SEPOLIA_PRIVATE_KEY --broadcast${NC}"
echo ""
echo -e "${YELLOW}⚡ Price Feeds:${NC}"
echo -e "  Your DEX is using REAL Chainlink price feeds!"
echo -e "  Prices update automatically every ~1 hour"
echo -e "  No manual updates needed"
echo ""
echo -e "${YELLOW}Note: Contract verification was skipped for faster deployment.${NC}"
echo -e "${YELLOW}Contracts work without verification, but verification helps with transparency.${NC}"
echo ""
echo -e "${GREEN}Happy trading on Sepolia! 🚀${NC}"
