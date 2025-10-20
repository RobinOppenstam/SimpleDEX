-include .env

.PHONY: all test clean deploy-anvil deploy-sepolia

all: clean install build

# Clean the repo
clean:
	forge clean

# Install dependencies
install:
	forge install

# Build contracts
build:
	forge build

# Run tests
test:
	forge test -vvv

# Run tests with gas report
test-gas:
	forge test --gas-report

# Start Anvil
anvil:
	anvil

# Full startup: Deploy everything and execute random swaps
startup:
	@./startup.sh

# Deploy to Anvil
deploy-anvil:
	@forge script script/Deploy.s.sol:DeployDEX --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Deploy multi-token setup
deploy-tokens:
	@forge script script/DeployTokens.s.sol:DeployTokens --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Create trading pairs
create-pairs:
	@forge script script/CreatePairs.s.sol:CreatePairs --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Add liquidity to pairs
add-liquidity:
	@forge script script/AddMultipleLiquidity.s.sol:AddMultipleLiquidity --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Deploy Token Faucet
deploy-faucet:
	@forge script script/DeployFaucet.s.sol:DeployFaucet --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Use the faucet to claim tokens
use-faucet:
	@forge script script/UseFaucet.s.sol:UseFaucet --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Execute random swaps
random-swaps:
	@forge script script/RandomSwaps.s.sol:RandomSwaps --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Mint tokens to a user address (default: Anvil account #1) [Deprecated - use faucet instead]
# Usage: make mint-tokens USER_ADDRESS=0xYourAddress
mint-tokens:
	@forge script script/MintTokensToUser.s.sol:MintTokensToUser --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Complete multi-token deployment (all steps)
deploy-multi-token: deploy-tokens create-pairs
	@echo "✅ Multi-token DEX setup complete!"

# Deploy to Sepolia
deploy-sepolia:
	@forge script script/Deploy.s.sol:DeployDEX --rpc-url ${SEPOLIA_RPC_URL} --private-key ${PRIVATE_KEY} --broadcast --verify

# Format code
format:
	forge fmt

# Check formatting
format-check:
	forge fmt --check