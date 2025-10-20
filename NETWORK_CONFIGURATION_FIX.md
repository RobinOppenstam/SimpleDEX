# Network Configuration Fix

## Problem

The frontend was using hardcoded Anvil contract addresses even when connected to Sepolia, causing errors like:

```
Error: could not decode result data (value="0x", info={ "method": "allPairsLength" })
```

This happened because the contracts were trying to call Anvil addresses on the Sepolia network.

## Root Cause

In [src/app/page.tsx](dex-frontend/src/app/page.tsx#L21-L26), contract addresses were hardcoded:

```typescript
// WRONG - Hardcoded Anvil addresses
const CONTRACTS = {
  ROUTER: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',  // Anvil
  FACTORY: '0x5fbdb2315678afecb367f032d93f642f64180aa3', // Anvil
};
```

## Solution

Updated `page.tsx` to use network-aware addresses from the network configuration:

```typescript
// CORRECT - Network-aware addresses
const { network } = useNetwork();

const CONTRACTS = {
  ROUTER: network?.contracts.router || '',
  FACTORY: network?.contracts.factory || '',
};
```

Now the contracts automatically switch based on the connected network:

### Anvil (Chain ID 31337)
- Factory: `0x5fbdb2315678afecb367f032d93f642f64180aa3`
- Router: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`

### Sepolia (Chain ID 11155111)
- Factory: `0x41d62f3860d6de2f1683e010d1dba3f48ee85701`
- Router: `0x433d747e1d7545d81040b16c5b119659c6f66567`

## What This Fixes

✅ **Analytics tab** - Can now fetch pair data from correct factory
✅ **Swapping** - Router calls go to correct network
✅ **Liquidity** - Factory queries use correct address
✅ **LP Positions** - Can fetch user positions correctly
✅ **All contract interactions** - Network-aware

## Testing

1. **Restart frontend:**
   ```bash
   cd dex-frontend
   npm run dev
   ```

2. **Test on Sepolia:**
   - Switch to Sepolia in MetaMask
   - Open Analytics tab - should show pair statistics
   - Try a swap - should work correctly
   - Check console - no more "0x" decode errors

3. **Test on Anvil (if running):**
   - Start Anvil: `cd contracts && ./startup.sh`
   - Switch to Anvil (localhost:8545)
   - All features should work with Anvil contracts

## Related Files

- [src/app/page.tsx](dex-frontend/src/app/page.tsx#L41-L45) - Main fix
- [src/hooks/useNetwork.ts](dex-frontend/src/hooks/useNetwork.ts) - Network detection
- [src/app/config/networks.ts](dex-frontend/src/app/config/networks.ts) - Network configs
- [.env.local](dex-frontend/.env.local) - Contract addresses

## Previous Network-Aware Updates

This completes the network-aware configuration that was started earlier:

1. ✅ Token addresses (tokens.ts)
2. ✅ Price feeds (usePrices.ts)
3. ✅ All components (SwapInterface, LiquidityInterface, etc.)
4. ✅ **Contract addresses (page.tsx)** ← This fix

Now **everything** is network-aware! 🎉
