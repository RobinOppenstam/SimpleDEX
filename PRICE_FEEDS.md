# Price Feed Configuration

## Overview

SimpleDEX uses different price feed strategies depending on the network:

### Anvil (Local Development - Chain ID 31337)
- **Type**: Mock static prices
- **Update Frequency**: Never (static)
- **Implementation**: MockV3Aggregator contracts with fixed prices

### Sepolia (Testnet - Chain ID 11155111)
- **Type**: Real Chainlink oracles + Fallback for unavailable feeds
- **Update Frequency**: ~1 hour (Chainlink updates)
- **Implementation**: Real Chainlink aggregators

## Supported Tokens on Sepolia

| Token | Chainlink Feed Available | Price Source |
|-------|-------------------------|--------------|
| mUSDC | ✅ Yes | Chainlink USDC/USD |
| mUSDT | ✅ Yes | Chainlink USDC/USD (USDT not available, using USDC) |
| mDAI | ✅ Yes | Chainlink DAI/USD |
| mWETH | ✅ Yes | Chainlink ETH/USD |
| mWBTC | ✅ Yes | Chainlink BTC/USD |
| mLINK | ✅ Yes | Chainlink LINK/USD |
| mUNI | ❌ No | Frontend fallback ($12.00) |

## UNI Token Special Handling

Since Chainlink doesn't provide a UNI/USD price feed on Sepolia testnet, the frontend implements a graceful fallback:

### How it Works

1. Frontend attempts to fetch price from PriceOracle contract
2. Contract reverts with `PriceFeedNotSet` error (0x7e68a045)
3. Frontend detects this specific error
4. Frontend applies fallback price of **$12.00** for UNI

### Implementation Details

The fallback is implemented in `usePrices.ts`:

```typescript
catch (err: any) {
  const isPriceFeedNotSet = err?.data === '0x7e68a045' ||
                             err?.message?.includes('0x7e68a045');

  if (isPriceFeedNotSet) {
    const fallbackPrices: Record<string, number> = {
      mUNI: 12.00,  // UNI token fallback price
    };
    newPrices[symbol] = fallbackPrices[symbol] || 0;
  }
}
```

### Why This Approach?

1. **Testnet Limitations**: Chainlink only provides feeds for major tokens on testnets
2. **User Experience**: Users can still test UNI swaps without errors
3. **Maintainable**: Easy to add more fallback prices if needed
4. **Clear Logging**: Console shows when fallback prices are used

## Chainlink Feed Addresses (Sepolia)

```
ETH/USD:  0x694AA1769357215DE4FAC081bf1f309aDC325306
BTC/USD:  0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43
LINK/USD: 0xc59E3633BAAC79493d908e63626716e204A45EdF
USDC/USD: 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E
DAI/USD:  0x14866185B1962B63C3Ea9E03Bc1da838bab34C19
```

Source: [Chainlink Data Feeds - Sepolia](https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet)

## Adding More Tokens

To add a new token with Chainlink feed:

1. Add Chainlink feed address to `DeployRealPriceFeeds.s.sol`
2. Deploy token contract and update `.env`
3. Run `update-frontend-config.py` to sync addresses
4. Create pairs with `CreatePairs.s.sol`

To add a token without Chainlink feed:

1. Deploy token contract
2. Add fallback price in `usePrices.ts`
3. Update token list in `tokens.ts`
4. Create pairs

## Testing Price Feeds

### Check Current Prices

```bash
# In frontend console
# Prices should log like:
[usePrices] mUSDC: $1.00 (raw: 100000000, decimals: 8)
[usePrices] mUNI: Using fallback price $12.00 (no Chainlink feed available)
```

### Verify on Sepolia

1. Switch to Sepolia network in MetaMask
2. Open browser console (F12)
3. Navigate to Market or Swap tab
4. Check console logs for price updates

## Troubleshooting

### Error: "PriceFeedNotSet" for token
- **Cause**: Token doesn't have a Chainlink feed configured
- **Solution**: Add fallback price in `usePrices.ts` or deploy MockV3Aggregator

### Prices showing $0.00
- **Cause**: Network not properly connected or RPC issue
- **Solution**: Check MetaMask connection and RPC endpoint

### Prices not updating
- **Cause**: Chainlink feeds update every ~1 hour, or refresh interval too long
- **Solution**: Wait for next update or manually refresh with the refresh button
