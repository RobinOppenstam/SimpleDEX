// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

contract CreatePairs is Script {
    struct PairToCreate {
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        string name;
    }

    struct Addresses {
        address factory;
        address router;
        address mUSDC;
        address mUSDT;
        address mDAI;
        address mWETH;
        address mWBTC;
        address mLINK;
        address mUNI;
    }

    function getAddresses() internal view returns (Addresses memory) {
        // Read from environment variables (.env file)
        // Use FACTORY_ADDRESS format to match .env file
        return Addresses({
            factory: vm.envOr("FACTORY_ADDRESS", address(0)),
            router: vm.envOr("ROUTER_ADDRESS", address(0)),
            mUSDC: vm.envOr("USDC_ADDRESS", address(0)),
            mUSDT: vm.envOr("USDT_ADDRESS", address(0)),
            mDAI: vm.envOr("DAI_ADDRESS", address(0)),
            mWETH: vm.envOr("WETH_ADDRESS", address(0)),
            mWBTC: vm.envOr("WBTC_ADDRESS", address(0)),
            mLINK: vm.envOr("LINK_ADDRESS", address(0)),
            mUNI: vm.envOr("UNI_ADDRESS", address(0))
        });
    }

    function validateAddresses(Addresses memory addrs) internal pure {
        require(addrs.factory != address(0), "FACTORY_ADDRESS not set in .env");
        require(addrs.router != address(0), "ROUTER_ADDRESS not set in .env");
        require(addrs.mUSDC != address(0), "USDC_ADDRESS not set in .env");
        require(addrs.mUSDT != address(0), "USDT_ADDRESS not set in .env");
        require(addrs.mDAI != address(0), "DAI_ADDRESS not set in .env");
        require(addrs.mWETH != address(0), "WETH_ADDRESS not set in .env");
        require(addrs.mWBTC != address(0), "WBTC_ADDRESS not set in .env");
        require(addrs.mLINK != address(0), "LINK_ADDRESS not set in .env");
        require(addrs.mUNI != address(0), "UNI_ADDRESS not set in .env");
    }

    function run() external {
        Addresses memory addrs = getAddresses();
        validateAddresses(addrs);

        DEXFactory factory = DEXFactory(addrs.factory);
        DEXRouter router = DEXRouter(addrs.router);

        // Define pairs to create with initial liquidity
        // Amounts designed for testnet: $40k-50k TVL per major pair
        // Price assumptions: ETH=$3,400, BTC=$95,000, LINK=$20, UNI=$12
        PairToCreate[] memory pairs = new PairToCreate[](10);

        // Major stablecoin pairs: $50k TVL each
        pairs[0] = PairToCreate(addrs.mUSDC, addrs.mUSDT, 50000 * 10**18, 50000 * 10**18, "mUSDC/mUSDT");
        pairs[1] = PairToCreate(addrs.mUSDC, addrs.mDAI, 50000 * 10**18, 50000 * 10**18, "mUSDC/mDAI");

        // ETH pairs: ~$40k TVL each (10 ETH + $20k stables)
        pairs[2] = PairToCreate(addrs.mWETH, addrs.mUSDC, 10 * 10**18, 20000 * 10**18, "mWETH/mUSDC");
        pairs[3] = PairToCreate(addrs.mWETH, addrs.mUSDT, 10 * 10**18, 20000 * 10**18, "mWETH/mUSDT");
        pairs[4] = PairToCreate(addrs.mWETH, addrs.mDAI, 10 * 10**18, 20000 * 10**18, "mWETH/mDAI");

        // WBTC pairs: ~$47.5k TVL (0.5 WBTC + $47.5k stables OR 15 ETH)
        pairs[5] = PairToCreate(addrs.mWBTC, addrs.mUSDC, 0.5 * 10**18, 47500 * 10**18, "mWBTC/mUSDC");
        pairs[6] = PairToCreate(addrs.mWBTC, addrs.mWETH, 0.5 * 10**18, 15 * 10**18, "mWBTC/mWETH");

        // LINK pairs: ~$20k TVL
        pairs[7] = PairToCreate(addrs.mLINK, addrs.mUSDC, 1000 * 10**18, 10000 * 10**18, "mLINK/mUSDC");
        pairs[8] = PairToCreate(addrs.mLINK, addrs.mWETH, 1000 * 10**18, 3 * 10**18, "mLINK/mWETH");

        // UNI pair: ~$12k TVL
        pairs[9] = PairToCreate(addrs.mUNI, addrs.mUSDC, 1000 * 10**18, 6000 * 10**18, "mUNI/mUSDC");

        vm.startBroadcast();
        
        console.log("=== Creating Trading Pairs ===\n");
        
        for (uint i = 0; i < pairs.length; i++) {
            PairToCreate memory pair = pairs[i];
            
            console.log("Creating pair:", pair.name);
            
            // Check if pair already exists
            address existingPair = factory.getPair(pair.tokenA, pair.tokenB);
            if (existingPair != address(0)) {
                console.log("Pair already exists at:", existingPair);
                continue;
            }
            
            // Approve tokens
            MockERC20(pair.tokenA).approve(addrs.router, pair.amountA);
            MockERC20(pair.tokenB).approve(addrs.router, pair.amountB);
            
            // Add liquidity (which creates the pair)
            try router.addLiquidity(
                pair.tokenA,
                pair.tokenB,
                pair.amountA,
                pair.amountB,
                0,
                0,
                msg.sender,
                block.timestamp + 1 hours
            ) returns (uint256 /* amountA */, uint256 /* amountB */, uint256 liquidity) {
                address pairAddress = factory.getPair(pair.tokenA, pair.tokenB);
                console.log("  Created at:", pairAddress);
                console.log("  Liquidity:", liquidity / 10**18);
                console.log("");
            } catch Error(string memory reason) {
                console.log("  Failed:", reason);
                console.log("");
            }
        }
        
        console.log("=== Pair Creation Complete ===");
        console.log("Total pairs:", factory.allPairsLength());
        
        vm.stopBroadcast();
    }
}