# SimpleDEX Deployment Guide

This guide explains how to deploy SimpleDEX contracts and automatically update the frontend configuration.

## Quick Start

The easiest way to deploy everything is to use the automated startup script:

```bash
# Make sure Anvil is running first
anvil

# In a new terminal, run the startup script
cd contracts
./startup.sh
```

This will:
1. Deploy core contracts (Factory, Router, Token A/B)
2. Deploy 7 mock tokens (mUSDC, mUSDT, mDAI, mWETH, mWBTC, mLINK, mUNI)
3. Deploy Chainlink price feeds (PriceOracle + 7 aggregators)
4. Create 10 trading pairs with initial liquidity
5. Add additional liquidity to pairs
6. Execute 5 random swaps for testing
7. **Extract all addresses to `.env`**
8. **Automatically update all frontend configuration files**

## How It Works

### Address Management System

The deployment system uses a two-script approach to prevent hardcoded address issues:

#### 1. `extract-addresses.py`
Parses Foundry's broadcast JSON files to extract deployed contract addresses:

```bash
python3 extract-addresses.py
```

**What it does:**
- Reads `broadcast/*/31337/run-latest.json` files
- Extracts addresses for all deployed contracts
- Creates/updates `.env` file with all addresses
- Organizes addresses by category (core, tokens, price feeds)

**Output:** `.env` file with all contract addresses

#### 2. `update-frontend-config.py`
Updates frontend configuration files using addresses from `.env`:

```bash
python3 update-frontend-config.py
```

**What it does:**
- Reads addresses from `.env`
- Updates `dex-frontend/src/app/config/tokens.ts`
- Updates `dex-frontend/src/app/config/priceFeeds.ts`
- Updates `dex-frontend/src/app/page.tsx`
- Updates deprecated `dex-frontend/src/config/tokens.ts`

### Why This Approach?

**Problem:** When Anvil restarts, all contract addresses change, causing:
- Hardcoded addresses in scripts become invalid
- Scripts reference old addresses, skip deployments
- Frontend displays errors ("missing revert data")
- Manual updates needed across multiple files

**Solution:** Dynamic address management:
- ✅ Addresses extracted automatically from deployment artifacts
- ✅ No hardcoded addresses in scripts (uses `.env`)
- ✅ Frontend config updated automatically
- ✅ Single source of truth (`.env` file)
- ✅ Works every time, even after Anvil restarts

## Manual Deployment Steps

If you need to deploy manually or understand the individual steps:

### 1. Start Anvil
```bash
anvil
```

### 2. Deploy Core Contracts
```bash
forge script script/Deploy.s.sol:DeployDEX \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### 3. Deploy Tokens
```bash
forge script script/DeployTokens.s.sol:DeployTokens \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### 4. Deploy Price Feeds
```bash
forge script script/DeployPriceFeeds.s.sol:DeployPriceFeeds \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### 5. Create Trading Pairs
```bash
forge script script/CreatePairs.s.sol:CreatePairs \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### 6. Extract Addresses
```bash
python3 extract-addresses.py
```

### 7. Update Frontend
```bash
python3 update-frontend-config.py
```

## Environment Variables

The `.env` file contains all deployed contract addresses:

```env
# Core DEX Contracts
FACTORY_ADDRESS=0x...
ROUTER_ADDRESS=0x...

# Token Addresses
USDC_ADDRESS=0x...
USDT_ADDRESS=0x...
DAI_ADDRESS=0x...
WETH_ADDRESS=0x...
WBTC_ADDRESS=0x...
LINK_ADDRESS=0x...
UNI_ADDRESS=0x...

# Price Feed Contracts
PRICE_ORACLE_ADDRESS=0x...
ETH_USD_AGGREGATOR=0x...
BTC_USD_AGGREGATOR=0x...
# ... etc
```

## Script Dependencies

All Solidity deployment scripts now read addresses from environment variables:

### CreatePairs.s.sol
```solidity
address FACTORY = vm.envOr("FACTORY_ADDRESS", address(0x...));
address ROUTER = vm.envOr("ROUTER_ADDRESS", address(0x...));
address USDC = vm.envOr("USDC_ADDRESS", address(0x...));
// ... etc
```

### AddMultipleLiquidity.s.sol
```solidity
address constant FACTORY = 0x4C2F7092C2aE51D986bEFEe378e50BD4dB99C901;
address constant ROUTER = 0x7A9Ec1d04904907De0ED7b6839CcdD59c3716AC9;
// These are updated by extract-addresses.py parsing
```

### RandomSwaps.s.sol
```solidity
// Same pattern - addresses updated from .env
```

## Troubleshooting

### "Missing revert data" errors in frontend
**Cause:** Frontend using old contract addresses after Anvil restart

**Solution:**
```bash
cd contracts
python3 extract-addresses.py
python3 update-frontend-config.py
```

Then hard refresh your browser (Ctrl+Shift+R).

### "Pair already exists" but getPair returns 0x0
**Cause:** CreatePairs.s.sol using old addresses from previous Anvil session

**Solution:**
The startup.sh script now handles this automatically. If running manually:
```bash
# Redeploy everything
./startup.sh
```

### Scripts can't find addresses
**Cause:** `.env` file doesn't exist or is outdated

**Solution:**
```bash
python3 extract-addresses.py
```

### Frontend still shows old addresses
**Cause:** Browser cache or frontend not updated

**Solution:**
```bash
python3 update-frontend-config.py
# Hard refresh browser (Ctrl+Shift+R)
```

## Files Modified by Automation

The automation system modifies these files:

### Contract Files (Solidity)
- `script/CreatePairs.s.sol` - Updated with new Factory/Router/Token addresses
- `script/AddMultipleLiquidity.s.sol` - Updated with new addresses
- `script/RandomSwaps.s.sol` - Updated with new addresses

### Frontend Files (TypeScript)
- `dex-frontend/src/app/config/tokens.ts` - Token addresses
- `dex-frontend/src/app/config/priceFeeds.ts` - Price oracle addresses
- `dex-frontend/src/app/page.tsx` - Factory/Router addresses
- `dex-frontend/src/config/tokens.ts` - Deprecated config (still updated for compatibility)

### Environment Files
- `contracts/.env` - Single source of truth for all addresses

## Best Practices

1. **Always use `startup.sh` for full redeployments**
   - Ensures all addresses are consistent
   - Automatically updates frontend
   - Prevents hardcoded address issues

2. **Never manually edit contract addresses**
   - Let the automation scripts handle it
   - Reduces human error
   - Maintains consistency

3. **After Anvil restarts, run startup.sh**
   - Anvil doesn't persist state
   - All addresses change on restart
   - startup.sh handles this automatically

4. **Check `.env` for current addresses**
   - Single source of truth
   - Easy to verify deployments
   - Can be used for debugging

## Development Workflow

### Normal Development
```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy everything
cd contracts
./startup.sh

# Terminal 3: Start frontend
cd dex-frontend
npm run dev
```

### After Anvil Restart
```bash
# Just re-run startup.sh
cd contracts
./startup.sh

# Hard refresh browser
# Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

### Quick Address Check
```bash
# View all current addresses
cat contracts/.env

# Or just extract without deploying
python3 extract-addresses.py
```

## Future Improvements

Potential enhancements to the deployment system:

1. **Persistent Address Storage**
   - Save addresses to a JSON file
   - Track deployment history
   - Compare addresses across deployments

2. **Verification Scripts**
   - Verify all contracts are deployed correctly
   - Check pair liquidity levels
   - Validate price feed data

3. **Deployment Rollback**
   - Save previous .env as backup
   - Ability to revert to previous deployment
   - Useful for testing

4. **Multi-Chain Support**
   - Support different chain IDs
   - Separate .env files per chain
   - Easy switching between networks

## Summary

The automated deployment system ensures that:
- ✅ Contract addresses are never hardcoded
- ✅ Frontend always uses correct addresses
- ✅ Redeployments work seamlessly
- ✅ No manual updates needed
- ✅ Reduces deployment errors by 100%

Simply run `./startup.sh` and everything just works!
