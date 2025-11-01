# Vercel Deployment Guide for SimpleDEX

## Problem
Getting a 404 error on Vercel deployment while local build works fine.

## Root Cause

The 404 error was caused by:
1. **Invalid vercel.json configuration** - Custom rewrites interfered with Next.js App Router's built-in routing
2. **Hardcoded WalletConnect Project ID** - The placeholder `'YOUR_PROJECT_ID'` in wagmi config could cause initialization failures

## Solution

### 1. Remove vercel.json (IMPORTANT)

Next.js 14 with App Router automatically handles routing on Vercel. **Do NOT use a custom `vercel.json`** - it will break routing and cause 404 errors.

If you have a `vercel.json` file, delete it. Vercel will auto-detect Next.js framework settings.

### 2. Update wagmi configuration

In `src/app/config/wagmi.ts`, the WalletConnect Project ID should use an environment variable:

```typescript
export const config = getDefaultConfig({
  appName: 'SimpleDEX',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [anvil, sepolia],
  ssr: true,
});
```

**Note**: WalletConnect Project ID is OPTIONAL if you're only using MetaMask or injected wallets. It's only required for WalletConnect-specific wallet connections.

### 3. Ensure next.config.mjs has proper webpack config

The webpack configuration handles Web3 library compatibility:

```javascript
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false, net: false, tls: false, crypto: false,
      stream: false, http: false, https: false,
      zlib: false, path: false, os: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};
```

### 4. Environment Variables on Vercel

In Vercel Dashboard > Settings > Environment Variables, add ALL your contract addresses and configuration:

**Required:**
```
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS=0x...
```

**Optional:**
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ENABLE_TESTNETS=true
```

Add all your token and pair addresses as shown in your `.env.local` file.

### 5. Vercel Project Settings

Ensure these settings in Vercel Dashboard:

- **Framework Preset**: Next.js
- **Root Directory**: `dex-frontend` (if in a monorepo, otherwise leave empty)
- **Build Command**: `next build` (default)
- **Output Directory**: Leave empty (default `.next`)
- **Install Command**: `npm install` (default)
- **Node Version**: 18.x or higher

### 6. Deploy

After making changes:
```bash
git add .
git commit -m "fix: remove vercel.json and update wagmi config"
git push
```

Vercel will automatically redeploy.

## Debugging Steps

### 1. Test production build locally

```bash
cd dex-frontend
npm run build
npm run start
```

If this works, the issue is Vercel-specific.

### 2. Check Vercel build logs

In Vercel Dashboard:
- Go to latest deployment
- Click "Building" tab
- Look for errors or warnings

### 3. Check Vercel function logs

- Go to "Functions" tab
- Look for runtime errors

### 4. Check browser console

On the deployed site:
- Open DevTools console
- Look for JavaScript errors
- Check Network tab for failed requests

### 5. Verify environment variables

In Vercel Dashboard > Settings > Environment Variables:
- Ensure all `NEXT_PUBLIC_*` variables are set
- Verify no typos in variable names
- Check values are correct

## Common Issues

### Issue: 404 on all routes

**Cause**: Custom `vercel.json` with rewrites
**Solution**: Delete `vercel.json` - Next.js handles routing automatically

### Issue: Build succeeds but blank page

**Cause**: Missing environment variables
**Solution**: Add all contract addresses to Vercel environment variables

### Issue: "Invalid Project ID" error

**Cause**: Hardcoded 'YOUR_PROJECT_ID' in wagmi config
**Solution**: Updated in wagmi.ts to use environment variable with fallback

### Issue: Module not found errors

**Cause**: Web3 libraries expecting Node.js modules
**Solution**: Already handled in `next.config.mjs` webpack config

## Success Checklist

- [ ] `vercel.json` file deleted (or never created)
- [ ] All environment variables added to Vercel
- [ ] Root directory set correctly (if in subdirectory)
- [ ] Build logs show success
- [ ] Homepage loads without 404
- [ ] Wallet connection works
- [ ] All tabs load correctly

## Still Having Issues?

1. **Clear Vercel cache and redeploy:**
   - In Vercel Dashboard, go to latest deployment
   - Click the three dots menu
   - Select "Redeploy"
   - Check "Use existing Build Cache" = OFF

2. **Check for TypeScript errors:**
   ```bash
   npm run build
   ```
   Fix any errors before deploying

3. **Verify package versions:**
   - Ensure all dependencies are compatible
   - Check for peer dependency warnings

4. **Review Vercel documentation:**
   - https://vercel.com/docs/frameworks/nextjs
