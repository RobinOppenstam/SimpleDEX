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
    // Deployed contract addresses
    address constant FACTORY = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address constant ROUTER = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;

    // Token addresses
    address constant USDC = 0x70e0bA845a1A0F2DA3359C97E0285013525FFC49;
    address constant USDT = 0x4826533B4897376654Bb4d4AD88B7faFD0C98528;
    address constant DAI = 0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf;
    address constant WETH = 0x0E801D84Fa97b50751Dbf25036d067dCf18858bF;
    address constant WBTC = 0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf;
    address constant LINK = 0x9d4454B023096f34B160D6B654540c56A1F81688;
    address constant UNI = 0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00;

    struct LiquidityPair {
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        string name;
    }

    function run() external {
        DEXFactory factory = DEXFactory(FACTORY);
        DEXRouter router = DEXRouter(ROUTER);

        // Define pairs to add liquidity to
        LiquidityPair[] memory pairs = new LiquidityPair[](7);

        // Stablecoin pairs (1:1 ratio)
        pairs[0] = LiquidityPair({
            tokenA: USDC,
            tokenB: USDT,
            amountA: 5000 * 10**18,
            amountB: 5000 * 10**18,
            name: "USDC/USDT"
        });

        pairs[1] = LiquidityPair({
            tokenA: USDC,
            tokenB: DAI,
            amountA: 5000 * 10**18,
            amountB: 5000 * 10**18,
            name: "USDC/DAI"
        });

        // WETH pairs ($3000 per WETH)
        pairs[2] = LiquidityPair({
            tokenA: WETH,
            tokenB: USDC,
            amountA: 5 * 10**18,
            amountB: 15000 * 10**18,
            name: "WETH/USDC"
        });

        pairs[3] = LiquidityPair({
            tokenA: WETH,
            tokenB: USDT,
            amountA: 5 * 10**18,
            amountB: 15000 * 10**18,
            name: "WETH/USDT"
        });

        // WBTC pairs ($60000 per WBTC, 20 WETH per WBTC)
        pairs[4] = LiquidityPair({
            tokenA: WBTC,
            tokenB: USDC,
            amountA: 0.5 * 10**18,
            amountB: 30000 * 10**18,
            name: "WBTC/USDC"
        });

        pairs[5] = LiquidityPair({
            tokenA: LINK,
            tokenB: USDC,
            amountA: 1000 * 10**18,
            amountB: 15000 * 10**18,
            name: "LINK/USDC"
        });

        pairs[6] = LiquidityPair({
            tokenA: UNI,
            tokenB: USDC,
            amountA: 1000 * 10**18,
            amountB: 10000 * 10**18,
            name: "UNI/USDC"
        });

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
            MockERC20(pair.tokenA).approve(ROUTER, pair.amountA);
            MockERC20(pair.tokenB).approve(ROUTER, pair.amountB);

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
