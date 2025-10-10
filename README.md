# SimpleDEX

A decentralized exchange (DEX) built with Solidity and Next.js, featuring multi-token trading pairs and automated market making.

## Features

- 🔄 **Token Swapping**: Swap between multiple ERC20 tokens with automatic price calculation
- 💧 **Liquidity Pools**: Add and remove liquidity to earn trading fees
- 📊 **Multiple Trading Pairs**: Support for 7 tokens (USDC, USDT, DAI, WETH, WBTC, LINK, UNI)
- 📈 **Pool Analytics**: Real-time pool information and exchange rates
- 💼 **LP Position Tracking**: View your liquidity provider positions
- 📜 **Swap History**: Track all your past swaps with timestamps
- 🎨 **Modern UI**: Beautiful, responsive interface with token icons

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### 1. Start Anvil

In terminal 1:
```bash
cd contracts
anvil
```

### 2. Run Startup Script

In terminal 2:
```bash
cd contracts
make startup
```

This single command will:
- ✅ Deploy all contracts (Factory, Router, Tokens)
- ✅ Create 10+ trading pairs
- ✅ Add liquidity to all pairs
- ✅ Execute 5 random swaps for testing

### 3. Start Frontend

In terminal 3:
```bash
cd dex-frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
simpleDex/
├── contracts/              # Solidity smart contracts
│   ├── src/               # Contract source files
│   │   ├── DEXFactory.sol # Factory contract
│   │   ├── DEXRouter.sol  # Router contract
│   │   └── DEXPair.sol    # Pair contract
│   ├── script/            # Deployment scripts
│   │   ├── Deploy.s.sol           # Deploy core contracts
│   │   ├── DeployTokens.s.sol     # Deploy tokens
│   │   ├── CreatePairs.s.sol      # Create pairs
│   │   ├── AddMultipleLiquidity.s.sol # Add liquidity
│   │   └── RandomSwaps.s.sol      # Execute random swaps
│   ├── test/              # Contract tests
│   ├── startup.sh         # Complete startup script
│   └── Makefile          # Build commands
│
└── dex-frontend/          # Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── components/      # React components
    │   │   │   ├── SwapInterface.tsx
    │   │   │   ├── LiquidityInterface.tsx
    │   │   │   ├── LPPositions.tsx
    │   │   │   ├── SwapHistory.tsx
    │   │   │   ├── PoolInfo.tsx
    │   │   │   └── TokenSelector.tsx
    │   │   ├── config/         # Configuration
    │   │   │   └── tokens.ts   # Token definitions
    │   │   └── page.tsx        # Main page
    │   └── types/
    └── public/            # Static assets (token icons)
```

## Available Commands

### Contracts (in `/contracts` directory)

```bash
# Complete startup (recommended)
make startup

# Individual steps
make deploy-anvil        # Deploy core contracts
make deploy-tokens       # Deploy additional tokens
make create-pairs        # Create trading pairs
make add-liquidity       # Add liquidity to pairs
make random-swaps        # Execute random swaps

# Testing
make test               # Run all tests
make test-gas          # Run tests with gas report

# Build
make build             # Compile contracts
make clean             # Clean build artifacts
```

## Deployed Contracts (Anvil)

| Contract | Address |
|----------|---------|
| Factory | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| Router | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |

## Tokens

| Token | Symbol | Address |
|-------|--------|---------|
| USD Coin | USDC | `0x70e0bA845a1A0F2DA3359C97E0285013525FFC49` |
| Tether USD | USDT | `0x4826533B4897376654Bb4d4AD88B7faFD0C98528` |
| Dai Stablecoin | DAI | `0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf` |
| Wrapped Ether | WETH | `0x0E801D84Fa97b50751Dbf25036d067dCf18858bF` |
| Wrapped Bitcoin | WBTC | `0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf` |
| Chainlink | LINK | `0x9d4454B023096f34B160D6B654540c56A1F81688` |
| Uniswap | UNI | `0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00` |

## Trading Pairs

The DEX supports the following trading pairs:
- WETH/USDC
- WETH/USDT
- WETH/DAI
- WBTC/WETH
- WBTC/USDC
- USDC/USDT
- USDC/DAI
- LINK/USDC
- UNI/USDC
- And more...

## Features

### Swap Interface
- Select any token pair from the dropdown
- Real-time price calculation
- Swap direction toggle with arrow button
- Balance display for selected tokens
- Slippage protection (5%)

### Liquidity Interface
- Add liquidity to any token pair
- Automatic proportional calculation for existing pools
- Token direction toggle
- LP token balance display
- Remove liquidity functionality

### LP Positions
- View all your liquidity positions
- Pool share percentage
- Your pooled token amounts
- Total pool reserves
- LP token balance

### Swap History
- Complete history of all your swaps
- Timestamps for each transaction
- Token icons and amounts
- Exchange rates
- Transaction hash links

### Pool Information Sidebar
- Automatically updates based on selected tokens in Swap/Liquidity interface
- Real-time pool reserves
- Exchange rates
- Total LP token supply
- Active pool count

## Development

### Running Tests

```bash
cd contracts
forge test -vvv
```

### Test Coverage

```bash
forge coverage
```

### Formatting

```bash
make format
```

## Architecture

### Smart Contracts

- **DEXFactory**: Creates and tracks trading pairs
- **DEXRouter**: Handles swaps and liquidity operations with safety checks
- **DEXPair**: Individual liquidity pool implementing constant product formula (x*y=k)

### Frontend

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Ethers.js v6**: Blockchain interactions
- **Tailwind CSS**: Styling
- **Token Icons**: PNG images for all supported tokens

## Security Features

- ✅ Slippage protection on swaps (5%)
- ✅ Deadline checks for time-sensitive operations
- ✅ ReentrancyGuard on critical functions
- ✅ Token sorting for consistent pair addresses
- ✅ Minimum liquidity lock (1000 wei)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
