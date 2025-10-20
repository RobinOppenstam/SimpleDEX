# Testnet Deployment Guide

## 🎯 Pre-Deployment Checklist

### ✅ Security Audit Complete
- [x] Fixed critical minting vulnerability (MockERC20 now has `onlyOwner`)
- [x] All 134 tests passing
- [x] TokenFaucet properly secured with access controls
- [x] Frontend uses faucet contract (no direct minting)

### 📋 Files Ready for Testnet

#### Essential Deployment Scripts (Keep)
- ✅ `script/DeployTokens.s.sol` - Deploy mock ERC20 tokens
- ✅ `script/Deploy.s.sol` - Deploy Factory and Router
- ✅ `script/DeployPriceFeeds.s.sol` - Deploy price oracles
- ✅ `script/DeployFaucet.s.sol` - Deploy token faucet
- ✅ `script/CreatePairs.s.sol` - Create trading pairs
- ✅ `script/AddMultipleLiquidity.s.sol` - Add initial liquidity

#### Utility Scripts (Useful, but optional)
- ⚠️ `script/MintTokensToUser.s.sol` - **OWNER ONLY** - Mint tokens for testing
- ✅ `script/UseFaucet.s.sol` - Test faucet functionality
- ✅ `script/UpdatePriceFeeds.s.sol` - **OWNER ONLY** - Update oracle prices
- ✅ `script/RandomSwaps.s.sol` - Execute test swaps
- ✅ `script/SwapTokens.s.sol` - Execute single swap
- ✅ `script/CheckPool.s.sol` - View pool statistics
- ⚠️ `script/TestConnection.s.sol` - **HAS HARDCODED ADDRESSES** - Test RPC connection
- ✅ `script/AddLiquidity.s.sol` - Add liquidity (single pair)

#### Scripts to Update for Testnet
1. **TestConnection.s.sol** - Update hardcoded addresses
2. **MintTokensToUser.s.sol** - Update hardcoded addresses

---

## 🚀 Deployment Steps

### 1. Environment Setup

Create a `.env.testnet` file (or update `.env`):

```bash
# Testnet Configuration
TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# OR for Arbitrum Sepolia:
# TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Deployer Account (KEEP THIS SECURE!)
DEPLOYER_PRIVATE_KEY=0x...YOUR_PRIVATE_KEY_HERE...

# Chain ID
# Sepolia: 11155111
# Arbitrum Sepolia: 421614
# Base Sepolia: 84532
CHAIN_ID=11155111
```

### 2. Get Testnet ETH

**Ethereum Sepolia:**
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

**Arbitrum Sepolia:**
- https://faucet.quicknode.com/arbitrum/sepolia
- Bridge from Sepolia: https://bridge.arbitrum.io/

**Base Sepolia:**
- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### 3. Deploy Contracts

Run the deployment scripts in order:

```bash
# Set your testnet RPC URL
export RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="0xYOUR_PRIVATE_KEY"

# Step 1: Deploy tokens
forge script script/DeployTokens.s.sol:DeployTokens \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Step 2: Deploy Factory and Router
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Step 3: Extract addresses to .env
python3 ./extract-addresses.py

# Step 4: Deploy Price Feeds
forge script script/DeployPriceFeeds.s.sol:DeployPriceFeeds \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Step 5: Deploy Faucet
forge script script/DeployFaucet.s.sol:DeployFaucet \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Step 6: Create trading pairs
forge script script/CreatePairs.s.sol:CreatePairs \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Step 7: Add liquidity
forge script script/AddMultipleLiquidity.s.sol:AddMultipleLiquidity \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Step 8: Update frontend configuration
python3 ./update-frontend-config.py
```

### 4. Verify Deployment

```bash
# Test connection (update addresses in script first!)
forge script script/TestConnection.s.sol:TestConnection \
  --rpc-url $RPC_URL

# Test faucet
forge script script/UseFaucet.s.sol:UseFaucet \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## 🔐 Security Considerations for Testnet

### Access Control ✅
- **MockERC20.mint()** - Protected with `onlyOwner` modifier
- **TokenFaucet admin functions** - Protected with `onlyOwner` modifier
- **PriceOracle.setPriceFeed()** - Protected with `onlyOwner` modifier

### Owner Responsibilities
The deployer address will be the owner of:
1. All 7 ERC20 tokens (mUSDC, mUSDT, mDAI, mWETH, mWBTC, mLINK, mUNI)
2. TokenFaucet contract
3. PriceOracle contract

**As owner, you can:**
- ✅ Mint additional tokens (use sparingly!)
- ✅ Update faucet limits
- ✅ Update price feeds
- ✅ Withdraw tokens from faucet (emergency)
- ✅ Transfer ownership

**Users CANNOT:**
- ❌ Mint tokens (must use faucet)
- ❌ Bypass faucet cooldowns
- ❌ Update price feeds
- ❌ Modify faucet settings

### Recommended Actions for Production
1. **Transfer ownership to multi-sig** (Gnosis Safe)
2. **Implement timelock** for critical operations
3. **Add supply caps** to prevent infinite inflation
4. **Monitor for suspicious activity**
5. **Set up alerting** for large transfers/mints

---

## 📝 Post-Deployment Tasks

### 1. Update Frontend

```bash
cd dex-frontend

# Update .env.local with testnet values
cat > .env.local << EOF
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Contract addresses (from deployment)
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_FAUCET_ADDRESS=0x...
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x...

# Token addresses
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...
# ... etc
EOF

# Rebuild and restart
npm run build
npm run start
```

### 2. Verify Contracts on Etherscan

If auto-verification failed during deployment:

```bash
forge verify-contract \
  --chain-id 11155111 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(string,string,uint256)" "Mock USD Coin" "mUSDC" "1000000000000000000000000") \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --compiler-version v0.8.30 \
  0xYOUR_CONTRACT_ADDRESS \
  src/MockERC20.sol:MockERC20
```

### 3. Test Everything

**Manual Testing:**
1. Connect MetaMask to testnet
2. Navigate to your frontend
3. Use faucet to claim tokens (should work with 24h cooldown)
4. Try swapping tokens
5. Try adding/removing liquidity
6. Check price oracle values

**Script Testing:**
```bash
# Test random swaps
forge script script/RandomSwaps.s.sol:RandomSwaps \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Check pool stats
forge script script/CheckPool.s.sol:CheckPool \
  --rpc-url $RPC_URL
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Insufficient funds for intrinsic transaction cost"
**Solution:** Get more testnet ETH from faucets

### Issue 2: "Nonce too high"
**Solution:** Reset your MetaMask account or use correct nonce in script

### Issue 3: "Contract size exceeds 24576 bytes"
**Solution:** Enable optimizer in `foundry.toml`:
```toml
[profile.default]
optimizer = true
optimizer_runs = 200
```

### Issue 4: "Environment variable not found"
**Solution:** Run `python3 extract-addresses.py` after each deployment step

### Issue 5: Faucet claims fail with "CooldownNotExpired"
**Solution:** This is expected! Users must wait 24 hours between claims

### Issue 6: Cannot mint tokens
**Solution:** Only the owner can mint. Non-owners should use the faucet.

---

## 📊 Cost Estimates (Sepolia)

Approximate gas costs for full deployment:

| Operation | Gas Used | Est. Cost (5 gwei) |
|-----------|----------|-------------------|
| Deploy 7 Tokens | ~5M | 0.025 ETH |
| Deploy Factory & Router | ~3M | 0.015 ETH |
| Deploy Price Feeds | ~4M | 0.020 ETH |
| Deploy Faucet | ~1.5M | 0.0075 ETH |
| Create 10 Pairs | ~4M | 0.020 ETH |
| Add Liquidity | ~3M | 0.015 ETH |
| **TOTAL** | **~20M** | **~0.1 ETH** |

**Recommendation:** Have at least **0.2 ETH** on testnet for deployment + operations

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] All contracts deployed successfully
- [ ] All contracts verified on Etherscan
- [ ] Faucet has been funded with tokens
- [ ] At least 10 trading pairs created
- [ ] Initial liquidity added to all pairs
- [ ] Frontend connected to correct network
- [ ] Frontend displays correct contract addresses
- [ ] Users can claim tokens from faucet
- [ ] Users can perform swaps
- [ ] Users can add/remove liquidity
- [ ] Price oracle shows correct prices
- [ ] Cooldown timer works in frontend
- [ ] Non-owners cannot mint tokens
- [ ] Owner can perform admin operations

---

## 📚 Additional Resources

### Documentation
- Foundry Book: https://book.getfoundry.sh/
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts/
- Chainlink Price Feeds: https://docs.chain.link/data-feeds

### Testnet Tools
- Sepolia Etherscan: https://sepolia.etherscan.io/
- Arbitrum Sepolia Explorer: https://sepolia.arbiscan.io/
- Tenderly (Debugging): https://dashboard.tenderly.co/

### Support
- Foundry Telegram: https://t.me/foundry_rs
- Ethereum Stack Exchange: https://ethereum.stackexchange.com/

---

## ⚠️ Important Notes

1. **This is a TESTNET deployment** - Do not use real funds
2. **MockERC20 tokens have no real value** - They're for testing only
3. **Keep your private key secure** - Even on testnet
4. **Testnet networks can reset** - Be prepared to redeploy
5. **Gas prices vary** - Budget accordingly
6. **Rate limits exist** - Some RPCs have request limits

---

## 🔄 Redeployment

If you need to redeploy (e.g., testnet reset):

```bash
# Clean old deployment files
rm -rf broadcast/
rm -rf .env

# Start fresh with deployment steps above
```

---

**Good luck with your testnet deployment! 🚀**

For questions or issues, refer to the security audit report and documentation.
