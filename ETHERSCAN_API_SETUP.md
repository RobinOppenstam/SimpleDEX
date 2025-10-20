# Etherscan API Setup Guide

## Why Use Etherscan API?

The Analytics component now uses **Etherscan API** instead of direct RPC queries (`eth_getLogs`) for much better performance:

### Advantages:
- **No block range limits** - Can query all historical events in a single request
- **Faster** - Etherscan has pre-indexed all events in their database
- **Higher rate limits** - Free tier: 5 calls/second, 100,000 calls/day
- **Off-chain indexing** - Etherscan maintains an indexed database, so queries are instant
- **No Alchemy limits** - Bypasses Alchemy's 10-block limit for `eth_getLogs`

### Comparison:

| Method | Block Range Limit | Speed | Free Tier Limits |
|--------|------------------|-------|-----------------|
| **Alchemy RPC** | 10 blocks | Slow (queries blockchain) | 330M compute units/month |
| **Etherscan API** | No limit | Fast (queries database) | 5 calls/sec, 100k calls/day |

## How to Get a Free Etherscan API Key

1. **Go to Etherscan:**
   - Mainnet: https://etherscan.io/apis
   - Sepolia: https://sepolia.etherscan.io/apis (same key works for both)

2. **Create an Account:**
   - Click "Sign Up" or "Register"
   - Verify your email

3. **Generate API Key:**
   - Go to "API Keys" in your account dashboard
   - Click "Add" to create a new API key
   - Give it a name (e.g., "SimpleDex Analytics")
   - Copy the API key

4. **Add to .env.local:**
   ```bash
   NEXT_PUBLIC_ETHERSCAN_API_KEY=YOUR_API_KEY_HERE
   ```

5. **Restart Next.js:**
   ```bash
   # In the dex-frontend directory
   npm run dev
   ```

## How It Works

The Analytics component now uses `fetchAllLogsFromEtherscan()` utility:

```typescript
// Old method (direct RPC, hits Alchemy limits)
const events = await pair.queryFilter(swapFilter, 0);

// New method (Etherscan API, no limits)
const events = await fetchAllLogsFromEtherscan(
  chainId,
  pairAddress,
  [eventSignature],
  0,
  'latest',
  process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
);
```

### What Gets Queried:

1. **Transfer events** - To count LP holders
2. **Swap events** - To calculate volume and swap count

### API Key is Optional:

- Without API key: 1 call/5 seconds (still better than Alchemy)
- With API key: 5 calls/second (highly recommended)

## Testing

Once you add your API key and restart the dev server:

1. Navigate to the **Analytics** tab
2. It should load much faster (30-60 seconds instead of 2-3 minutes)
3. Check the browser console - you should see:
   ```
   [Etherscan] Fetching logs from 0x...
   [Etherscan] Fetched X logs from 0x...
   ```

## Rate Limit Management

The utility automatically handles pagination and rate limits:

- Fetches up to 1000 events per request
- Automatically paginates if there are more events
- Adds 250ms delay between requests to stay under 5 calls/second
- Handles "No records found" gracefully

## Supported Networks

Currently configured for:
- ✅ **Sepolia Testnet** (Chain ID: 11155111)
- ✅ **Ethereum Mainnet** (Chain ID: 1)

To add other networks, edit [dex-frontend/src/app/utils/etherscan.ts:6-9](dex-frontend/src/app/utils/etherscan.ts#L6-L9):

```typescript
const ETHERSCAN_API_URLS: Record<number, string> = {
  11155111: 'https://api-sepolia.etherscan.io/api',
  1: 'https://api.etherscan.io/api',
  // Add more networks here
};
```

## Files Modified

1. **[dex-frontend/src/app/utils/etherscan.ts](dex-frontend/src/app/utils/etherscan.ts)** - New utility for Etherscan API queries
2. **[dex-frontend/src/app/components/Analytics.tsx](dex-frontend/src/app/components/Analytics.tsx)** - Updated to use Etherscan API
3. **[dex-frontend/.env.local](dex-frontend/.env.local)** - Added `NEXT_PUBLIC_ETHERSCAN_API_KEY`

## Troubleshooting

**Error: "Etherscan API not available for chain ID X"**
- Solution: Add the network to `ETHERSCAN_API_URLS` in `etherscan.ts`

**Error: "Max rate limit reached"**
- Solution: Add your API key to `.env.local` to increase from 1 call/5s to 5 calls/s

**Analytics still slow:**
- Check browser console for errors
- Verify API key is in `.env.local`
- Make sure you restarted the dev server after adding the key
- Check that you're on Sepolia network (Anvil/local doesn't support Etherscan API)

## Next Steps

1. Get your free Etherscan API key from https://etherscan.io/apis
2. Add it to `.env.local`
3. Restart your Next.js dev server
4. Test the Analytics page - it should load much faster!
