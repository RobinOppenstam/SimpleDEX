# Dual Deployment Guide - Anvil vs Sepolia

## 🎯 Overview

Your SimpleDex now supports **two deployment modes**:

| Mode | Network | Price Feeds | Use Case |
|------|---------|-------------|----------|
| **Anvil** | Local | Static (Mock) | Fast development & testing |
| **Sepolia** | Testnet | Real Chainlink | Live demo & realistic testing |

---

## 📋 Quick Start

### Anvil (Local Development)
```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy everything
cd contracts
./startup.sh
# or
make startup
```

### Sepolia (Testnet)
```bash
# One command deployment
cd contracts
./startup-sepolia.sh
# or
make startup-sepolia
```

---

## ⚙️ Setup

### 1. Environment Variables

Create `/contracts/.env`:

```bash
# ===================================
# Anvil (Local Development)
# ===================================
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://localhost:8545

# ===================================
# Sepolia (Testnet)
# ===================================
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Optional: For contract verification on Etherscan
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Get Sepolia ETH

You need ~0.2 ETH for deployment:
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia
- https://www.alchemy.com/faucets/ethereum-sepolia

---

## 🔄 Deployment Comparison

### Anvil Deployment (startup.sh)

**Steps:**
1. Deploy Factory & Router
2. Deploy Mock Tokens (7 tokens)
3. Deploy **MockV3Aggregator** (static prices)
4. Deploy PriceOracle
5. Deploy TokenFaucet
6. Create 10 trading pairs
7. Add initial liquidity
8. Execute random swaps (optional)

**Characteristics:**
- ✅ Instant deployment (~30 seconds)
- ✅ Free (no real ETH needed)
- ✅ Perfect for testing
- ❌ **Prices never change** (frozen at deployment)
- ❌ Not realistic for demos

**Price Feeds:**
```solidity
// Static prices set at deployment
ETH: $3,400 (never changes)
BTC: $95,000 (never changes)
LINK: $20 (never changes)
// etc...
```

### Sepolia Deployment (startup-sepolia.sh)

**Steps:**
1. Deploy Factory & Router
2. Deploy Mock Tokens (7 tokens)
3. Deploy **DeployRealPriceFeeds** (Chainlink aggregators)
4. Deploy TokenFaucet
5. Create 10 trading pairs
6. Add initial liquidity

**Characteristics:**
- ✅ Real Chainlink price feeds
- ✅ **Prices update automatically** (~1 hour)
- ✅ Realistic for demos
- ✅ Contracts verified on Etherscan
- ❌ Costs ~0.2 ETH
- ❌ Slower deployment (~5 minutes)

**Price Feeds:**
```solidity
// Real Chainlink feeds - update automatically!
ETH: Chainlink ETH/USD (updates every ~1 hour)
BTC: Chainlink BTC/USD (updates every ~1 hour)
LINK: Chainlink LINK/USD (updates every ~1 hour)
// etc...
```

---

## 📊 Price Feed Comparison

### Mock Price Feeds (Anvil)

**Script Used:** `DeployPriceFeeds.s.sol`

**How it works:**
1. Deploys `MockV3Aggregator` contracts
2. Sets prices once at deployment
3. Prices **never change** unless manually updated

**Manual Update:**
```bash
# Update all prices
forge script script/UpdatePriceFeeds.s.sol:UpdatePriceFeeds \
  --sig "updateAll()" \
  --rpc-url http://localhost:8545 \
  --private-key $PRIVATE_KEY \
  --broadcast

# Update ETH price to $3,800
forge script script/UpdatePriceFeeds.s.sol:UpdatePriceFeeds \
  --sig "updateETH(int256)" 380000000000 \
  --rpc-url http://localhost:8545 \
  --private-key $PRIVATE_KEY \
  --broadcast
```

**Pros:**
- ✅ Full control over prices
- ✅ Test edge cases (crashes, pumps)
- ✅ No external dependencies

**Cons:**
- ❌ Requires manual updates
- ❌ Unrealistic for users
- ❌ Easy to forget to update

### Real Chainlink Price Feeds (Sepolia)

**Script Used:** `DeployRealPriceFeeds.s.sol`

**How it works:**
1. Connects to **actual** Chainlink price feed contracts
2. Reads real market data
3. Updates automatically every ~1 hour

**Chainlink Addresses (Sepolia):**
```solidity
ETH/USD:  0x694AA1769357215DE4FAC081bf1f309aDC325306
BTC/USD:  0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43
LINK/USD: 0xc59E3633BAAC79493d908e63626716e204A45EdF
USDC/USD: 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E
DAI/USD:  0x14866185B1962B63C3Ea9E03Bc1da838bab34C19
```

**No Manual Updates Needed!**
- Prices update automatically
- Reflects real market conditions
- More engaging for users

**Pros:**
- ✅ Automatic updates
- ✅ Real market data
- ✅ Professional appearance
- ✅ Realistic user experience

**Cons:**
- ❌ Can't test specific price scenarios easily
- ❌ Requires testnet deployment

---

## 🛠️ Makefile Commands

### Anvil Commands
```bash
make startup              # Full local deployment
make deploy-anvil         # Deploy Factory & Router
make deploy-tokens        # Deploy tokens
make deploy-faucet        # Deploy faucet
make create-pairs         # Create pairs
make add-liquidity        # Add liquidity
make use-faucet           # Claim from faucet
make random-swaps         # Execute test swaps
```

### Sepolia Commands
```bash
make startup-sepolia           # Full Sepolia deployment
make deploy-sepolia            # Deploy Factory & Router
make deploy-tokens-sepolia     # Deploy tokens
make deploy-pricefeeds-sepolia # Deploy REAL price feeds
make deploy-faucet-sepolia     # Deploy faucet
make create-pairs-sepolia      # Create pairs
make add-liquidity-sepolia     # Add liquidity
make use-faucet-sepolia        # Claim from faucet
```

---

## 🎬 Usage Scenarios

### Scenario 1: Local Development
**Use Case:** Developing features, testing contracts

```bash
# Start Anvil
anvil

# Deploy everything
./startup.sh

# Test your feature
forge test -vvv

# Update prices if needed
forge script script/UpdatePriceFeeds.s.sol:UpdatePriceFeeds \
  --sig "simulateCrash()" \
  --rpc-url http://localhost:8545 \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Scenario 2: Demo for Investors
**Use Case:** Show realistic DEX with live prices

```bash
# Deploy to Sepolia
./startup-sepolia.sh

# Share your frontend URL
# Prices will update automatically!
# Show verified contracts on Etherscan
```

### Scenario 3: User Testing
**Use Case:** Let real users test your DEX

```bash
# Deploy to Sepolia
./startup-sepolia.sh

# Update frontend config
python3 update-frontend-config.py

# Users can:
# 1. Get Sepolia ETH from faucet
# 2. Claim tokens from your faucet
# 3. Trade with real price data
# 4. See prices update over time
```

---

## 📁 File Differences

### Anvil Setup
```
contracts/
├── startup.sh                    # Anvil deployment
├── script/
│   ├── DeployPriceFeeds.s.sol   # MOCK price feeds (static)
│   └── UpdatePriceFeeds.s.sol   # Manual price updates
```

### Sepolia Setup
```
contracts/
├── startup-sepolia.sh                # Sepolia deployment
├── script/
│   └── DeployRealPriceFeeds.s.sol   # REAL Chainlink feeds (auto-update)
```

---

## 🔍 Verification

### After Anvil Deployment
```bash
# Check prices (static)
cast call $PRICE_ORACLE_ADDRESS \
  "getPriceInUSD(address,uint256,uint8)" \
  $WETH_ADDRESS 1000000000000000000 18 \
  --rpc-url http://localhost:8545

# Result: Always $3,400 (unless manually updated)
```

### After Sepolia Deployment
```bash
# Check prices (real)
cast call $PRICE_ORACLE_ADDRESS \
  "getPriceInUSD(address,uint256,uint8)" \
  $WETH_ADDRESS 1000000000000000000 18 \
  --rpc-url $SEPOLIA_RPC_URL

# Result: Current market price (updates automatically)
```

---

## 🚨 Important Notes

### Anvil
- ⚠️ **Prices are frozen** at deployment time
- ⚠️ Use `UpdatePriceFeeds.s.sol` to change prices manually
- ⚠️ Not suitable for long-running demos
- ✅ Perfect for quick testing

### Sepolia
- ⚠️ Costs real testnet ETH (~0.2 ETH)
- ⚠️ Deployment takes 5-10 minutes
- ⚠️ Can't easily test specific price scenarios
- ✅ Best for demos and user testing
- ✅ Prices update automatically

---

## 🔄 Switching Between Networks

### From Anvil to Sepolia
```bash
# 1. Deploy to Sepolia
./startup-sepolia.sh

# 2. Update frontend
python3 update-frontend-config.py

# 3. Update your .env.local in frontend
# Change RPC_URL to Sepolia
# Change CHAIN_ID to 11155111
```

### From Sepolia to Anvil
```bash
# 1. Start Anvil
anvil

# 2. Deploy locally
./startup.sh

# 3. Update frontend
python3 update-frontend-config.py

# 4. Update your .env.local in frontend
# Change RPC_URL to http://localhost:8545
# Change CHAIN_ID to 31337
```

---

## 💡 Best Practices

### For Development
1. Use **Anvil** for daily development
2. Test with static prices first
3. Manually test price changes with `UpdatePriceFeeds.s.sol`
4. Run full test suite locally

### For Demos
1. Deploy to **Sepolia** before demo
2. Let it run for a few hours
3. Show automatic price updates
4. Point to verified contracts on Etherscan

### For Production
1. Use **real mainnet** Chainlink feeds
2. Same pattern as Sepolia
3. Test thoroughly on testnet first
4. Consider using multiple price feed sources

---

## 📚 Additional Resources

### Chainlink Price Feeds
- Sepolia: https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet
- Arbitrum Sepolia: https://docs.chain.link/data-feeds/price-feeds/addresses?network=arbitrum&page=1#arbitrum-sepolia
- Base Sepolia: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1#base-sepolia

### Testnet Faucets
- Sepolia: https://sepoliafaucet.com/
- Alchemy: https://www.alchemy.com/faucets/ethereum-sepolia
- QuickNode: https://faucet.quicknode.com/

---

## ✅ Summary

| Feature | Anvil | Sepolia |
|---------|-------|---------|
| **Deployment Time** | 30 seconds | 5-10 minutes |
| **Cost** | Free | ~0.2 ETH |
| **Price Updates** | Manual | Automatic |
| **Realism** | Low | High |
| **Best For** | Development | Demos/Testing |
| **Startup Command** | `./startup.sh` | `./startup-sepolia.sh` |

**Choose Anvil** for fast iteration and testing.
**Choose Sepolia** for realistic demos and user testing.

---

**You now have the best of both worlds! 🎉**
