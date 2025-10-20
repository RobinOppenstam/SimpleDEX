# Frontend Multi-Network Support Guide

## Overview

The SimpleDex frontend now automatically detects and adapts to different networks (Anvil vs Sepolia), providing the correct contract addresses and price feed behavior based on the connected network.

---

## Key Features

### Network Detection
- Automatically detects chain ID from wallet connection
- Supports:
  - **Anvil (31337)**: Local development with static prices
  - **Sepolia (11155111)**: Testnet with real Chainlink price feeds

### Dynamic Configuration
- Contract addresses change based on network
- Price refresh intervals adapt to network:
  - Anvil: No auto-refresh (static prices)
  - Sepolia: 60-second refresh (live Chainlink data)

### User Experience
- Network switcher component shows current network
- Visual indicators for static vs live price feeds
- Warning when on unsupported network

---

## Architecture

### 1. Network Configuration ([networks.ts](dex-frontend/src/app/config/networks.ts))

Central configuration for all supported networks:

```typescript
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  contracts: {
    factory: string;
    router: string;
    priceOracle: string;
    faucet: string;
  };
  features: {
    realPriceFeeds: boolean;     // true = Chainlink, false = static
    priceUpdateInterval: number;  // seconds (0 = no refresh)
  };
}
```

### 2. Network Detection Hook ([useNetwork.ts](dex-frontend/src/hooks/useNetwork.ts))

Custom hook for accessing network information:

```typescript
const { network, chainId, isSupported, isAnvil, isSepolia } = useNetwork();

// network.contracts.factory    -> Network-specific factory address
// network.contracts.router     -> Network-specific router address
// network.contracts.priceOracle -> Network-specific oracle address
// network.contracts.faucet     -> Network-specific faucet address
// network.features.realPriceFeeds -> true/false
// network.features.priceUpdateInterval -> refresh time in seconds
```

### 3. Updated Components

#### Price Fetching ([usePrices.ts](dex-frontend/src/app/hooks/usePrices.ts))
- Automatically uses correct price oracle address
- Respects network refresh interval:
  - Anvil (interval = 0): Fetch once, never refresh
  - Sepolia (interval = 60): Refresh every 60 seconds

```typescript
// Automatically uses network config
const { prices, loading, error, lastUpdate } = usePrices(provider);
```

#### Faucet Component ([Faucet.tsx](dex-frontend/src/app/components/Faucet.tsx))
- Uses network-aware faucet address
- Automatically adapts when switching networks

#### Network Switcher ([NetworkSwitcher.tsx](dex-frontend/src/components/NetworkSwitcher.tsx))
- Displays current network name
- Shows price feed status (static vs live)
- Buttons to switch between supported networks
- Warning for unsupported networks

---

## Environment Setup

### 1. Copy Example File

```bash
cd dex-frontend
cp .env.local.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local`:

```bash
# Default network (31337 for Anvil, 11155111 for Sepolia)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337

# ===================================
# Anvil (Local Development)
# ===================================
NEXT_PUBLIC_ANVIL_RPC_URL=http://127.0.0.1:8545

# Anvil contract addresses (from deployment)
NEXT_PUBLIC_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_ROUTER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x68B1D87F95878fE05B998F19b66F4bAbA5De1aed
NEXT_PUBLIC_FAUCET_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6

# ===================================
# Sepolia (Testnet)
# ===================================
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Sepolia contract addresses (from deployment)
NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS=your_address_here
NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS=your_address_here
NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS=your_address_here
NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS=your_address_here
```

### 3. Auto-Update Addresses

After deploying contracts, run:

```bash
cd ../contracts
python3 update-frontend-config.py
```

This script automatically updates your `.env.local` with deployed addresses.

---

## Usage Workflows

### Scenario 1: Local Development (Anvil)

1. **Start Anvil**:
   ```bash
   anvil
   ```

2. **Deploy contracts** (in separate terminal):
   ```bash
   cd contracts
   ./startup.sh
   ```

3. **Update frontend config**:
   ```bash
   python3 update-frontend-config.py
   ```

4. **Start frontend**:
   ```bash
   cd ../dex-frontend
   npm run dev
   ```

5. **Connect wallet**:
   - Open http://localhost:3000
   - Connect MetaMask to Localhost 8545
   - Frontend automatically detects Anvil (31337)
   - Prices are static (no auto-refresh)

### Scenario 2: Testnet Demo (Sepolia)

1. **Deploy to Sepolia**:
   ```bash
   cd contracts
   ./startup-sepolia.sh
   ```

2. **Update frontend config**:
   ```bash
   python3 update-frontend-config.py
   ```

3. **Start frontend**:
   ```bash
   cd ../dex-frontend
   npm run dev
   ```

4. **Connect wallet**:
   - Open http://localhost:3000
   - Switch MetaMask to Sepolia
   - Frontend automatically detects Sepolia (11155111)
   - Prices update every 60 seconds (real Chainlink)

### Scenario 3: Switch Networks

User can switch networks in two ways:

**Method 1: Through Wallet**
- Change network in MetaMask
- Frontend auto-detects and updates

**Method 2: Through NetworkSwitcher Component**
- Click "Anvil" or "Sepolia" button
- MetaMask prompts network switch
- Frontend updates automatically

---

## Component Integration

### Adding Network Awareness to New Components

```typescript
import { useNetwork } from '@/hooks/useNetwork';

function MyComponent() {
  const { network, isSupported, isAnvil, isSepolia } = useNetwork();

  if (!isSupported) {
    return <div>Please connect to Anvil or Sepolia</div>;
  }

  // Use network-specific contract addresses
  const factoryAddress = network.contracts.factory;
  const routerAddress = network.contracts.router;

  // Adapt behavior based on network
  if (network.features.realPriceFeeds) {
    // Show "Live prices" indicator
  } else {
    // Show "Static prices (testing)" indicator
  }

  return <div>Connected to {network.name}</div>;
}
```

---

## Price Feed Behavior

### Anvil (Static Prices)

```typescript
features: {
  realPriceFeeds: false,
  priceUpdateInterval: 0  // No auto-refresh
}
```

**Behavior:**
- Prices fetched once on component mount
- No periodic updates
- Prices remain constant unless manually updated via `UpdatePriceFeeds.s.sol`
- Perfect for fast testing

**Example Prices:**
- ETH: $3,400 (frozen)
- BTC: $95,000 (frozen)
- LINK: $20 (frozen)

### Sepolia (Real Chainlink)

```typescript
features: {
  realPriceFeeds: true,
  priceUpdateInterval: 60  // Refresh every 60 seconds
}
```

**Behavior:**
- Prices fetched from real Chainlink aggregators
- Auto-refresh every 60 seconds
- Reflects actual market conditions
- Updates automatically (Chainlink updates ~hourly)

**Example Prices:**
- ETH: $3,421.15 (live)
- BTC: $96,832.42 (live)
- LINK: $21.33 (live)

---

## Troubleshooting

### "Unsupported Network" Warning

**Cause:** Wallet connected to network other than Anvil (31337) or Sepolia (11155111)

**Fix:**
1. Switch MetaMask to Anvil or Sepolia
2. Or use NetworkSwitcher component to switch

### Contract Addresses Not Found

**Cause:** `.env.local` not configured

**Fix:**
```bash
# Option 1: Copy example
cp .env.local.example .env.local

# Option 2: Auto-update from deployment
cd contracts
python3 update-frontend-config.py
```

### Prices Not Updating

**On Anvil:**
- Expected behavior (static prices)
- Use `UpdatePriceFeeds.s.sol` to manually update

**On Sepolia:**
- Check console logs for errors
- Verify `NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS` is set
- Chainlink updates every ~1 hour, frontend refreshes every 60s

### Network Switch Not Working

**Fix:**
1. Approve network switch in MetaMask
2. Ensure network is added to MetaMask
3. Check console for errors

---

## Advanced Configuration

### Custom Refresh Interval

Override network default:

```typescript
// Force 30-second refresh regardless of network
const { prices } = usePrices(provider, 30000);  // milliseconds
```

### Add New Network

Edit [networks.ts](dex-frontend/src/app/config/networks.ts):

```typescript
export const NETWORKS: Record<number, NetworkConfig> = {
  // ... existing networks ...

  42161: {  // Arbitrum One
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || '',
    // ... rest of config ...
  },
};
```

Update `.env.local`:
```bash
NEXT_PUBLIC_ARBITRUM_RPC_URL=your_rpc_url
NEXT_PUBLIC_ARBITRUM_FACTORY_ADDRESS=your_address
# ... etc
```

---

## File Reference

### Core Files

| File | Purpose |
|------|---------|
| [networks.ts](dex-frontend/src/app/config/networks.ts) | Network configuration and addresses |
| [useNetwork.ts](dex-frontend/src/hooks/useNetwork.ts) | Network detection hook |
| [NetworkSwitcher.tsx](dex-frontend/src/components/NetworkSwitcher.tsx) | UI component for network switching |
| [usePrices.ts](dex-frontend/src/app/hooks/usePrices.ts) | Price fetching with network awareness |
| [.env.local.example](dex-frontend/.env.local.example) | Environment variable template |

### Updated Components

| Component | Changes |
|-----------|---------|
| [Faucet.tsx](dex-frontend/src/app/components/Faucet.tsx) | Uses network-aware faucet address |
| [page.tsx](dex-frontend/src/app/page.tsx) | Displays NetworkSwitcher |

---

## Best Practices

### For Development
1. Use Anvil for rapid iteration
2. Static prices are fine for most testing
3. Switch to Sepolia before demos

### For Demos
1. Deploy to Sepolia beforehand
2. Let it run for an hour to see price updates
3. Point to verified contracts on Etherscan

### For Production
1. Use mainnet Chainlink feeds (same pattern as Sepolia)
2. Test thoroughly on testnet first
3. Consider shorter refresh intervals (15-30s)

---

## Summary

| Feature | Anvil | Sepolia |
|---------|-------|---------|
| **Chain ID** | 31337 | 11155111 |
| **Price Feeds** | Static (MockV3Aggregator) | Real (Chainlink) |
| **Auto-Refresh** | No (0s) | Yes (60s) |
| **Best For** | Development & Testing | Demos & User Testing |
| **Setup Time** | 30 seconds | 5-10 minutes |
| **Cost** | Free | ~0.2 testnet ETH |

The frontend now seamlessly adapts to both networks, providing the best experience for development and demos!
