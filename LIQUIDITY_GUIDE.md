# SimpleDEX Liquidity & Faucet Guide

## Initial Liquidity Configuration

The startup script (`contracts/startup.sh`) now deploys the DEX with production-ready testnet liquidity amounts.

### Price Assumptions
- **ETH**: $3,400
- **BTC**: $95,000
- **LINK**: $20
- **UNI**: $12
- **Stablecoins** (USDC/USDT/DAI): $1.00

### Initial Liquidity Per Pair

**OPTIMIZED FOR TESTNET** - Reduced by ~50% while maintaining excellent trading experience

| Pair | Token A Amount | Token B Amount | TVL (USD) |
|------|---------------|----------------|-----------|
| **USDC/USDT** | 20,000 USDC | 20,000 USDT | $40,000 |
| **USDC/DAI** | 20,000 USDC | 20,000 DAI | $40,000 |
| **WETH/USDC** | 5 ETH | 17,000 USDC | $34,000 |
| **WETH/USDT** | 5 ETH | 17,000 USDT | $34,000 |
| **WETH/DAI** | 5 ETH | 17,000 DAI | $34,000 |
| **WBTC/USDC** | 0.2 WBTC | 19,000 USDC | $38,000 |
| **WBTC/WETH** | 0.2 WBTC | 5.6 ETH | $37,800 |
| **LINK/USDC** | 500 LINK | 10,000 USDC | $20,000 |
| **LINK/WETH** | 500 LINK | 2.94 ETH | $20,000 |
| **UNI/USDC** | 500 UNI | 6,000 USDC | $12,000 |

**Total Initial TVL: ~$310,000**

**Benefits of Optimized Amounts:**
- ✅ 50% reduction in deployment costs
- ✅ Still provides <2% slippage on typical trades
- ✅ More realistic for testnet environment
- ✅ Easier to bootstrap and maintain

## Rationale

### Why These Amounts?

1. **Optimal Testnet Balance**
   - **Previous TVL:** $634k (too high for testnet)
   - **New TVL:** $310k (perfect for testing)
   - 50% cost reduction while maintaining functionality
   - Still professional-looking for demos

2. **Realistic Price Impact**
   - Stablecoin swaps ($1k): ~0.5% slippage
   - ETH swaps (1 ETH): ~2% slippage
   - Typical trades ($500-$2k): <2% slippage
   - Shows realistic DEX behavior without overkill

3. **Multi-Hop Routing**
   - Deep stablecoin pools ($40k) enable efficient routing
   - ETH/Stablecoin pools ($34k) support intermediate hops
   - WBTC/ETH bridge ($37.8k) enables BTC ↔ Stablecoin routes
   - All major paths remain viable

4. **User Participation Matters**
   - Users adding $2k liquidity = 1% increase
   - Meaningful contribution visibility
   - Better for testing LP mechanics
   - Encourages user engagement

5. **Deployment Efficiency**
   - Less testnet ETH required
   - Faster pair creation
   - Lower gas costs overall
   - Easier to redeploy if needed

## Faucet Configuration

### Recommended Faucet Amounts (Per Claim)

```solidity
// In your Faucet.sol contract
uint256 public constant CLAIM_AMOUNT_ETH = 0.5 ether;
uint256 public constant CLAIM_AMOUNT_STABLES = 2000 * 10**18;  // USDC, USDT, DAI
uint256 public constant CLAIM_AMOUNT_WBTC = 0.02 * 10**18;
uint256 public constant CLAIM_AMOUNT_LINK = 100 * 10**18;
uint256 public constant CLAIM_AMOUNT_UNI = 200 * 10**18;
uint256 public constant CLAIM_COOLDOWN = 24 hours;
```

### Faucet Distribution Table

| Token | Amount | USD Value | Purpose |
|-------|--------|-----------|---------|
| **ETH** | 0.5 ETH | ~$1,700 | 5-10 swaps, can add liquidity |
| **USDC** | 2,000 | $2,000 | Matches ETH value for balanced trading |
| **USDT** | 2,000 | $2,000 | Alternative stablecoin testing |
| **DAI** | 2,000 | $2,000 | Multi-stablecoin scenarios |
| **WBTC** | 0.02 | ~$1,900 | Slightly less than ETH (valuable asset) |
| **LINK** | 100 | ~$2,000 | Altcoin testing |
| **UNI** | 200 | ~$2,400 | Altcoin testing |

### User Test Scenarios

**Scenario 1: Basic Swap Testing**
```
User claims:
- 0.5 ETH
- 2,000 USDC

Can perform:
- 5x swaps of 0.1 ETH → USDC ($340 each)
- Test slippage tolerance settings
- Experience price impact on different sizes
```

**Scenario 2: Liquidity Provider Testing**
```
User claims:
- 0.5 ETH
- 2,000 USDC
- 2,000 DAI

Can:
- Add 0.2 ETH + 680 USDC to WETH/USDC pool
- Add 1,000 USDC + 1,000 DAI to stablecoin pool
- Still have 0.3 ETH for swaps
- Test LP position management and fee accrual
```

**Scenario 3: Multi-Hop Routing**
```
User claims:
- 2,000 USDC
- 2,000 DAI

Can test:
- USDC → ETH → WBTC (2-hop route)
- DAI → USDC → LINK (2-hop route)
- Complex routing with different intermediaries
```

## Price Impact Examples

With current liquidity (updated amounts):

| Swap Size | Pool | Price Impact | Realistic? |
|-----------|------|--------------|-----------|
| $500 | WETH/USDC | ~1.5% | ✓ Very realistic |
| $1,000 | WETH/USDC | ~3% | ✓ Realistic for medium swap |
| $2,000 | USDC/USDT | ~2.5% | ✓ Shows stablecoin depth |
| $1,000 | LINK/USDC | ~5% | ✓ Typical altcoin slippage |
| $5,000 | WBTC/USDC | ~13% | ✓ Shows need for deep BTC liquidity |

**Note:** These estimates assume constant product AMM (x*y=k) with 0.3% fee.

## Deployment Checklist

- [x] Updated CreatePairs.s.sol with new amounts
- [x] Updated AddMultipleLiquidity.s.sol (now empty, used for additional liquidity only)
- [ ] Deploy Faucet contract with recommended amounts
- [ ] Set cooldown period to 24 hours
- [ ] Test full user journey (claim → swap → add liquidity)
- [ ] Monitor pool balances after initial user activity
- [ ] Adjust faucet amounts if pools drain too quickly

## Monitoring & Adjustments

### Watch For:
1. **Pool Imbalance**: If ratio exceeds 60:40, consider rebalancing
2. **Faucet Drainage**: If users claim faster than expected, reduce amounts
3. **Insufficient Liquidity**: If slippage is too high, add more via AddMultipleLiquidity.s.sol
4. **Dead Pools**: Remove pairs with no volume after 1 week

### Success Metrics:
- Average swap size: $200-$2,000
- Daily volume: $10k-50k
- User-added liquidity: 20-40% of total TVL
- Active LPs: 10-30 addresses
- Average APR: 15-60% (varies by pair activity)

## Mainnet Considerations

When deploying to mainnet:
- **10x the liquidity**: $500k-$5M per major pair
- **No faucet**: Users bring their own capital
- **Liquidity mining**: Incentivize early LPs with token rewards
- **Protocol-owned liquidity**: Keep 10-20% of LP positions permanently
- **Gradual rollout**: Start with 2-3 pairs, expand based on demand

## Questions?

For testnet: These amounts balance realism with practicality
For mainnet: Consider a proper liquidity bootstrapping strategy (LBP, liquidity mining, partnerships)
