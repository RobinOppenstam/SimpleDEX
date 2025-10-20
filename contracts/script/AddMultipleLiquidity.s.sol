// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

/**
 * @title AddMultipleLiquidity
 * @notice Script to add liquidity to multiple trading pairs
 * @dev Use this to add additional liquidity to existing pairs or create new ones
 */
contract AddMultipleLiquidity is Script {
    struct LiquidityPair {
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

        // Define pairs to add ADDITIONAL liquidity to (if needed)
        // Note: Initial liquidity is added in CreatePairs.s.sol
        // Use this script to add more liquidity to existing pairs
        LiquidityPair[] memory pairs = new LiquidityPair[](0);

        // Example: Uncomment to add more liquidity to existing pairs
        // pairs[0] = LiquidityPair({
        //     tokenA: addrs.mUSDC,
        //     tokenB: addrs.mUSDT,
        //     amountA: 10000 * 10**18,
        //     amountB: 10000 * 10**18,
        //     name: "mUSDC/mUSDT"
        // });

        vm.startBroadcast();

        console.log("=== Adding Liquidity to Pairs ===\n");

        for (uint i = 0; i < pairs.length; i++) {
            LiquidityPair memory pair = pairs[i];

            console.log("Processing:", pair.name);

            // Check current balances
            uint256 balanceA = MockERC20(pair.tokenA).balanceOf(msg.sender);
            uint256 balanceB = MockERC20(pair.tokenB).balanceOf(msg.sender);

            if (balanceA < pair.amountA) {
                console.log("  Insufficient balance for token A");
                console.log("  Required:", pair.amountA / 10**18);
                console.log("  Available:", balanceA / 10**18);
                continue;
            }

            if (balanceB < pair.amountB) {
                console.log("  Insufficient balance for token B");
                console.log("  Required:", pair.amountB / 10**18);
                console.log("  Available:", balanceB / 10**18);
                continue;
            }

            // Check if pair exists
            address pairAddress = factory.getPair(pair.tokenA, pair.tokenB);
            if (pairAddress != address(0)) {
                // Get current reserves
                (uint112 reserve0, uint112 reserve1,) = DEXPair(pairAddress).getReserves();
                console.log("  Pair exists with reserves:");
                console.log("    Reserve0:", uint256(reserve0) / 10**18);
                console.log("    Reserve1:", uint256(reserve1) / 10**18);
            } else {
                console.log("  Creating new pair...");
            }

            // Approve tokens
            MockERC20(pair.tokenA).approve(addrs.router, pair.amountA);
            MockERC20(pair.tokenB).approve(addrs.router, pair.amountB);

            // Add liquidity (10% slippage tolerance)
            try router.addLiquidity(
                pair.tokenA,
                pair.tokenB,
                pair.amountA,
                pair.amountB,
                pair.amountA * 90 / 100,
                pair.amountB * 90 / 100,
                msg.sender,
                block.timestamp + 1 hours
            ) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
                console.log("  Success!");
                console.log("    Added A:", amountA / 10**18);
                console.log("    Added B:", amountB / 10**18);
                console.log("    LP tokens:", liquidity / 10**18);

                // Get pair address
                pairAddress = factory.getPair(pair.tokenA, pair.tokenB);
                console.log("    Pair at:", pairAddress);
                console.log("");
            } catch Error(string memory reason) {
                console.log("  Failed:", reason);
                console.log("");
            } catch {
                console.log("  Failed: Unknown error");
                console.log("");
            }
        }

        console.log("=== Liquidity Addition Complete ===");
        console.log("Total pairs:", factory.allPairsLength());

        vm.stopBroadcast();
    }
}
