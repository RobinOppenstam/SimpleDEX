# SimpleDEX Setup Guide

## 🚀 Quick Start

### Prerequisites
- Anvil running: `anvil` (in a separate terminal)
- Node.js installed
- MetaMask browser extension

### 1. Deploy Contracts
```bash
cd contracts
make startup
```

This will:
- Deploy Factory & Router contracts
- Deploy 7 ERC20 tokens (USDC, USDT, DAI, WETH, WBTC, LINK, UNI)
- Create 10 trading pairs with liquidity
- Execute test swaps

### 2. Mint Tokens to Your Wallet

**Option A: Use your MetaMask address**
```bash
USER_ADDRESS=0xYourMetaMaskAddress make mint-tokens
```

**Option B: Import Anvil test account**
- Import this private key into MetaMask:
  ```
  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  ```
- This account has all tokens already

**Option C: Mint to Anvil account #1**
```bash
make mint-tokens
```

### 3. Configure MetaMask

**Add Anvil Network:**
- Network Name: `Anvil Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency Symbol: `ETH`

### 4. Start Frontend
```bash
cd dex-frontend
npm install  # First time only
npm run dev
```

Visit: http://localhost:3000

## 📋 Contract Addresses

### Core Contracts
- **Factory:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Router:** `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

### Tokens
- **USDC:** `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- **USDT:** `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- **DAI:** `0x0165878A594ca255338adfa4d48449f69242Eb8F`
- **WETH:** `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- **WBTC:** `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
- **LINK:** `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`
- **UNI:** `0x610178dA211FEF7D417bC0e6FeD39F05609AD788`

## 🎮 Available Commands

### Contract Deployment
```bash
make startup           # Full deployment (recommended)
make deploy-anvil      # Deploy core contracts only
make deploy-tokens     # Deploy tokens only
make create-pairs      # Create trading pairs
make add-liquidity     # Add liquidity to pairs
```

### Token Management
```bash
make mint-tokens                                    # Mint to default account
USER_ADDRESS=0x123... make mint-tokens             # Mint to specific address
```

### Testing
```bash
make test              # Run all tests
make test-gas          # Run tests with gas report
```

## 🐛 Troubleshooting

### No Balances Showing
**Problem:** Frontend shows 0 balance for all tokens

**Solution:** Mint tokens to your wallet address
```bash
USER_ADDRESS=0xYourAddress make mint-tokens
```

### MetaMask Not Connecting
**Problem:** Can't connect to Anvil

**Solutions:**
1. Make sure Anvil is running (`anvil`)
2. Add Anvil network to MetaMask (Chain ID: 31337)
3. Clear MetaMask activity data for localhost networks
4. Restart Anvil and redeploy with `make startup`

### Transactions Failing
**Problem:** All transactions fail in MetaMask

**Solutions:**
1. Reset MetaMask account (Settings → Advanced → Clear activity tab data)
2. Make sure you're on Anvil network (Chain ID 31337)
3. Make sure you have ETH for gas (Anvil accounts start with 10,000 ETH)

### Pools Not Showing
**Problem:** No pools visible in frontend

**Solutions:**
1. Check browser console for errors
2. Verify contracts are deployed: `make startup`
3. Refresh the page
4. Make sure you're connected to the right network

## 🔄 Restarting from Scratch

If you need to start over:

1. Stop Anvil (Ctrl+C)
2. Start Anvil again: `anvil`
3. Redeploy everything: `cd contracts && make startup`
4. Mint tokens to your wallet: `USER_ADDRESS=0x... make mint-tokens`
5. Clear MetaMask activity data (Settings → Advanced)
6. Refresh frontend

## 📚 Anvil Test Accounts

These accounts are pre-funded with 10,000 ETH:

**Account #0 (Deployer):**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

**Account #1:**
- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

**Account #2:**
- Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- Private Key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

## 🎯 Features

- ✅ Swap tokens with automatic routing
- ✅ Add/Remove liquidity
- ✅ View pool statistics
- ✅ Track LP positions
- ✅ View swap history
- ✅ Analytics dashboard
- ✅ Multi-hop routing (up to 3 hops)
- ✅ Slippage protection
- ✅ Protocol fees (0.05%) + LP fees (0.30%)

## 🚀 Next Steps: Deploy to Testnet

See the main [README.md](README.md) for testnet deployment instructions.
