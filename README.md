# SimpleDEX
A decentralized exchange platform with automated market making, multi-hop routing, and real-time price feeds powered by Chainlink oracles.

## What is SimpleDEX?
SimpleDEX is a fully on-chain decentralized exchange (DEX) that enables permissionless token swaps through liquidity pools. Built on Ethereum with a modern Next.js frontend, it provides a complete DeFi trading experience with intelligent routing, live price data, and seamless liquidity provision.

## Key Features

### 🔄 Smart Token Swapping
- **Multi-Hop Routing**: Automatically finds the best path for trades, even through intermediate tokens
- **Direct & Indirect Pairs**: Seamlessly swap between any supported tokens
- **Price Impact Display**: See how your trade affects pool prices
- **Slippage Protection**: Built-in 5% slippage tolerance to protect against frontrunning
- **Real-time Quotes**: Live swap calculations as you type

### 💧 Liquidity Provision
- **Add/Remove Liquidity**: Become a liquidity provider and earn trading fees
- **LP Position Tracking**: Monitor all your liquidity positions in one place
- **Pool Share Display**: View your percentage ownership of each pool
- **Automatic Ratio Calculation**: Smart input fields auto-calculate proportional amounts
- **LP Token Management**: Mint and burn LP tokens representing your pool share

### 📊 Live Market Data
- **Chainlink Price Feeds**: Real-time USD prices for all major assets
- **CoinGecko Integration**: 1-hour and 24-hour price change tracking
- **Industry-Standard APR**: Realistic mock APR/APY for liquidity pools
- **Market Price Display**: Live token prices updated every 15 seconds
- **Pool Analytics**: Real-time reserve information and exchange rates

### 💰 Multi-Token Support
Support for 7 major tokens across 10+ trading pairs:
- **Stablecoins**: mUSDC, mUSDT, mDAI
- **Wrapped Assets**: mWETH, mWBTC
- **DeFi Tokens**: mLINK, mUNI

### 📜 Transaction History
- **Swap History**: Complete record of all your trades
- **Timestamped Transactions**: Track when each swap occurred
- **Transaction Links**: Direct links to blockchain explorers
- **Token Icons**: Visual representation of all assets

### 🎨 Modern Interface
- **Dark Theme**: Beautiful silver/blue gradient design
- **Responsive Layout**: Works seamlessly on desktop and mobile
- **Wallet Integration**: RainbowKit-powered wallet connection
- **Real-time Updates**: Auto-refreshing balances and prices
- **Toast Notifications**: Transaction status updates with detailed feedback

## How It Works

1. **Connect Wallet**: Link your Web3 wallet (MetaMask, Rainbow, etc.)
2. **Get Test Tokens**: Use the faucet to claim free tokens for testing
3. **Swap Tokens**:
   - Select input/output tokens
   - Enter amount
   - Review route and price impact
   - Approve tokens (first time only)
   - Execute swap
4. **Provide Liquidity**:
   - Choose a token pair
   - Enter amounts for both tokens
   - Approve tokens
   - Add liquidity and receive LP tokens
5. **Track Positions**: Monitor your LP positions and swap history
6. **Remove Liquidity**: Burn LP tokens to reclaim your share plus fees

## Project Structure

```
simpleDex/
├── contracts/              # Smart contracts (Solidity + Foundry)
│   ├── src/
│   │   ├── DEXFactory.sol      # Pair creation factory
│   │   ├── DEXRouter.sol       # Swap & liquidity router
│   │   ├── DEXPair.sol         # Liquidity pool (AMM)
│   │   ├── PriceOracle.sol     # Chainlink price aggregator
│   │   ├── TokenFaucet.sol     # Test token distribution
│   │   └── MockERC20.sol       # Mock token implementation
│   ├── script/             # Deployment & setup scripts
│   ├── test/              # Contract test suite
│   ├── startup.sh         # One-command deployment
│   └── Makefile          # Build & deploy commands
│
└── dex-frontend/          # Next.js frontend (TypeScript)
    ├── src/app/
    │   ├── components/         # React components
    │   │   ├── SwapInterface.tsx
    │   │   ├── LiquidityInterface.tsx
    │   │   ├── Market.tsx
    │   │   ├── LPPositions.tsx
    │   │   ├── SwapHistory.tsx
    │   │   ├── PoolInfo.tsx
    │   │   ├── RouteDisplay.tsx
    │   │   └── TokenSelector.tsx
    │   ├── config/            # Token & network configs
    │   ├── hooks/            # React hooks
    │   ├── utils/            # Helper functions
    │   └── page.tsx          # Main app page
    └── public/               # Token icons & assets
```

## Deployed Contracts (Anvil Testnet)

### Core Contracts
| Contract | Address |
|----------|---------|
| **DEXFactory** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| **DEXRouter** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| **PriceOracle** | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| **TokenFaucet** | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |

### Mock Tokens
| Token | Symbol | Address |
|-------|--------|---------|
| **USD Coin** | mUSDC | `0x70e0bA845a1A0F2DA3359C97E0285013525FFC49` |
| **Tether USD** | mUSDT | `0x4826533B4897376654Bb4d4AD88B7faFD0C98528` |
| **Dai Stablecoin** | mDAI | `0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf` |
| **Wrapped Ether** | mWETH | `0x0E801D84Fa97b50751Dbf25036d067dCf18858bF` |
| **Wrapped Bitcoin** | mWBTC | `0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf` |
| **Chainlink** | mLINK | `0x9d4454B023096f34B160D6B654540c56A1F81688` |
| **Uniswap** | mUNI | `0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00` |

### Chainlink Price Feeds (Mock)
- **BTC/USD**: Real-time Bitcoin pricing
- **ETH/USD**: Real-time Ethereum pricing
- **USDC/USD**: Stablecoin peg monitoring
- **LINK/USD**: Chainlink token pricing
- **UNI/USD**: Uniswap token pricing (fallback)

## Getting Started

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) - Ethereum development toolkit
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Quick Start (3 Commands)

**Terminal 1** - Start local blockchain:
```bash
cd contracts
anvil
```

**Terminal 2** - Deploy contracts & setup pools:
```bash
cd contracts
make startup
```

This single command:
- ✅ Deploys all core contracts (Factory, Router, Oracle, Faucet)
- ✅ Deploys 7 mock tokens with price feeds
- ✅ Creates 10+ trading pairs
- ✅ Seeds initial liquidity across all pairs
- ✅ Executes test swaps to verify functionality

**Terminal 3** - Launch frontend:
```bash
cd dex-frontend
npm install
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** 🚀

### Getting Test Tokens

1. Connect your wallet to the app
2. Navigate to the "Faucet" tab
3. Click "Claim Tokens" to receive:
   - 10,000 mUSDC
   - 10,000 mUSDT
   - 10,000 mDAI
   - 5 mWETH
   - 0.5 mWBTC
   - 100 mLINK
   - 100 mUNI

## Development Commands

### Contracts (`/contracts` directory)

```bash
# Complete setup (recommended)
make startup              # Deploy everything + create pairs + add liquidity

# Individual deployment steps
make deploy-anvil         # Deploy core contracts only
make deploy-tokens        # Deploy mock tokens
make create-pairs         # Create trading pairs
make add-liquidity        # Add initial liquidity
make random-swaps         # Execute test swaps

# Testing & verification
make test                 # Run test suite
make test-gas            # Run tests with gas report
forge coverage           # Check test coverage

# Build & clean
make build               # Compile contracts
make clean              # Remove artifacts
make format             # Format Solidity code
```

### Frontend (`/dex-frontend` directory)

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## Supported Trading Pairs

SimpleDEX supports **10+ active trading pairs**:

### Major Pairs
- mWETH/mUSDC
- mWETH/mUSDT
- mWETH/mDAI
- mWBTC/mWETH
- mWBTC/mUSDC

### Stablecoin Pairs
- mUSDC/mUSDT
- mUSDC/mDAI
- mUSDT/mDAI

### DeFi Token Pairs
- mLINK/mUSDC
- mUNI/mUSDC

*Multi-hop routing enables swaps between any two tokens, even without direct pairs.*

## Technology Stack

### Smart Contracts
- **Solidity** 0.8.20 - Contract language
- **Foundry** - Development framework
- **OpenZeppelin** - Security-audited contract libraries
- **Chainlink** - Decentralized price oracles

### Frontend
- **Next.js** 14 - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI
- **Ethers.js** v6 - Blockchain interactions

### Infrastructure
- **Anvil** - Local Ethereum node (development)
- **Sepolia** - Ethereum testnet (deployment ready)

## Architecture

### Constant Product AMM
SimpleDEX uses the proven **x × y = k** formula:
- Ensures liquidity at all price levels
- Price determined by pool ratio
- Minimal price impact for balanced trades
- Resistant to manipulation

### Multi-Hop Routing Algorithm
When no direct pair exists between tokens A and C:
1. Algorithm searches for intermediate token B
2. Calculates optimal path: A → B → C
3. Compares gas cost vs. price improvement
4. Executes multi-hop swap in single transaction
5. Visual route display shows full swap path

### Price Oracle Integration
- **Chainlink Aggregators**: Fetch real-world asset prices
- **Fallback Mechanisms**: Default prices for tokens without feeds
- **Update Intervals**: 15-second refresh for live data
- **CoinGecko API**: Historical price change tracking

## Security Features

✅ **Slippage Protection**: 5-10% tolerance prevents sandwich attacks  
✅ **Deadline Checks**: Time-bound transactions expire if not mined  
✅ **ReentrancyGuard**: Prevents reentrancy attacks on critical functions  
✅ **Token Sorting**: Deterministic pair addresses (CREATE2-compatible)  
✅ **Minimum Liquidity Lock**: 1000 wei locked forever to prevent division by zero  
✅ **Approval Required**: Two-step token approval flow  
✅ **Input Validation**: Comprehensive checks on all user inputs  
✅ **Safe Math**: Solidity 0.8.x built-in overflow protection  

## Live Features

### Real-time Updates
- Token balances refresh after every transaction
- Pool reserves update on new blocks
- Price feeds poll every 15 seconds
- Swap history updates instantly

### Smart Routing
- Automatically detects direct vs. multi-hop routes
- Displays full swap path with token icons
- Shows hop count and intermediate tokens
- Optimizes for best execution price

### LP Position Management
- View all active positions in one dashboard
- Track pool share percentage
- Monitor pooled token amounts
- Calculate total position value in USD
- One-click liquidity removal

## Roadmap

- [ ] Deploy to Sepolia testnet
- [ ] Implement concentrated liquidity (v3 style)
- [ ] Add token whitelisting for permissionless listings
- [ ] Integrate real Chainlink oracles on testnet
- [ ] Add limit orders via keeper network
- [ ] Implement flash swaps
- [ ] Add governance token ($SDEX)
- [ ] Launch mainnet version

## Testing

### Run Test Suite
```bash
cd contracts
forge test -vvv
```

### Coverage Report
```bash
forge coverage
```

### Gas Optimization
```bash
make test-gas
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- Inspired by Uniswap V2
- Built with Foundry by Paradigm
- UI components from shadcn/ui
- Price data from Chainlink & CoinGecko

---

**Built with ❤️ by the SimpleDEX team**
