# SimpleDex Quick Start

## 🚀 Choose Your Deployment

### Option 1: Anvil (Local - Fast Testing)
```bash
# Terminal 1
anvil

# Terminal 2
cd contracts
./startup.sh
```
- ⚡ 30 seconds
- 💰 Free
- 📊 Static prices (manual updates)

### Option 2: Sepolia (Testnet - Live Demo)
```bash
cd contracts
./startup-sepolia.sh
```
- ⏱️ 5-10 minutes
- 💰 ~0.2 testnet ETH
- 📊 **Real Chainlink prices** (auto-updates!)

---

## 📋 Prerequisites

### Anvil
- Foundry installed ✅
- Nothing else needed!

### Sepolia
1. Add to `.env`:
   ```bash
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   SEPOLIA_PRIVATE_KEY=your_private_key
   ETHERSCAN_API_KEY=your_api_key  # Optional
   ```

2. Get Sepolia ETH (~0.2 ETH):
   - https://sepoliafaucet.com/
   - https://faucet.quicknode.com/

---

## 🎯 Quick Commands

### Anvil
```bash
make startup              # Full deployment
make deploy-faucet        # Deploy faucet only
make use-faucet           # Claim tokens
make random-swaps         # Test swaps
```

### Sepolia
```bash
make startup-sepolia           # Full deployment
make deploy-faucet-sepolia     # Deploy faucet only
make use-faucet-sepolia        # Claim tokens
```

---

## 📊 Price Feeds

### Anvil
- **Static prices** (never change)
- Update manually:
  ```bash
  forge script script/UpdatePriceFeeds.s.sol:UpdatePriceFeeds \
    --sig "updateAll()" \
    --rpc-url http://localhost:8545 \
    --private-key $PRIVATE_KEY \
    --broadcast
  ```

### Sepolia
- **Real Chainlink feeds** (auto-update every ~1 hour)
- No manual updates needed!
- Reflects actual market prices

---

## 🔗 After Deployment

### Update Frontend
```bash
cd contracts
python3 update-frontend-config.py
```

### View Your DEX

**Anvil:**
- Frontend: http://localhost:3000
- Factory: `$FACTORY_ADDRESS` (from `.env`)

**Sepolia:**
- Frontend: http://localhost:3000 (set network to Sepolia)
- Factory: https://sepolia.etherscan.io/address/$FACTORY_ADDRESS
- View verified contracts!

---

## 📖 Full Documentation

- **[DUAL_DEPLOYMENT_GUIDE.md](DUAL_DEPLOYMENT_GUIDE.md)** - Complete guide
- **[TESTNET_DEPLOYMENT.md](TESTNET_DEPLOYMENT.md)** - Detailed Sepolia steps
- **[PRE_TESTNET_SUMMARY.md](PRE_TESTNET_SUMMARY.md)** - Deployment checklist

---

## 🆘 Troubleshooting

### Anvil Issues
- Anvil not running? → `anvil` in separate terminal
- Port in use? → Kill Anvil and restart

### Sepolia Issues
- Out of gas? → Get more Sepolia ETH
- Verification failed? → Add `ETHERSCAN_API_KEY` to `.env`
- RPC issues? → Check your Alchemy/Infura API key

---

**Happy Trading! 🎉**
