// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

contract CreatePairs is Script {
    // These will be read from environment or use deployed addresses
    address FACTORY = 0x4C2F7092C2aE51D986bEFEe378e50BD4dB99C901; // Updated Anvil factory
    address ROUTER = 0x7A9Ec1d04904907De0ED7b6839CcdD59c3716AC9;  // Updated Anvil router

    // Token addresses - will be dynamically set
    address USDC;
    address USDT;
    address DAI;
    address WETH;
    address WBTC;
    address LINK;
    address UNI;

    struct PairToCreate {
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        string name;
    }

    function run() external {
        // Try to load addresses from environment
        USDC = vm.envOr("USDC", address(0x86A2EE8FAf9A840F7a2c64CA3d51209F9A02081D));
        USDT = vm.envOr("USDT", address(0xA4899D35897033b927acFCf422bc745916139776));
        DAI = vm.envOr("DAI", address(0xf953b3A269d80e3eB0F2947630Da976B896A8C5b));
        WETH = vm.envOr("WETH", address(0xAA292E8611aDF267e563f334Ee42320aC96D0463));
        WBTC = vm.envOr("WBTC", address(0x5c74c94173F05dA1720953407cbb920F3DF9f887));
        LINK = vm.envOr("LINK", address(0x720472c8ce72c2A2D711333e064ABD3E6BbEAdd3));
        UNI = vm.envOr("UNI", address(0xe8D2A1E88c91DCd5433208d4152Cc4F399a7e91d));

        DEXFactory factory = DEXFactory(FACTORY);
        DEXRouter router = DEXRouter(ROUTER);

        // Define pairs to create with initial liquidity
        // Reduced amounts to avoid running out of tokens
        PairToCreate[] memory pairs = new PairToCreate[](10);

        pairs[0] = PairToCreate(USDC, USDT, 5000 * 10**18, 5000 * 10**18, "USDC/USDT");
        pairs[1] = PairToCreate(USDC, DAI, 5000 * 10**18, 5000 * 10**18, "USDC/DAI");
        pairs[2] = PairToCreate(WETH, USDC, 5 * 10**18, 15000 * 10**18, "WETH/USDC");
        pairs[3] = PairToCreate(WETH, USDT, 5 * 10**18, 15000 * 10**18, "WETH/USDT");
        pairs[4] = PairToCreate(WETH, DAI, 5 * 10**18, 15000 * 10**18, "WETH/DAI");
        pairs[5] = PairToCreate(WBTC, USDC, 0.5 * 10**18, 30000 * 10**18, "WBTC/USDC");
        pairs[6] = PairToCreate(WBTC, WETH, 0.5 * 10**18, 10 * 10**18, "WBTC/WETH");
        pairs[7] = PairToCreate(LINK, USDC, 500 * 10**18, 7500 * 10**18, "LINK/USDC");
        pairs[8] = PairToCreate(LINK, WETH, 500 * 10**18, 2.5 * 10**18, "LINK/WETH");
        pairs[9] = PairToCreate(UNI, USDC, 500 * 10**18, 5000 * 10**18, "UNI/USDC");

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
            MockERC20(pair.tokenA).approve(ROUTER, pair.amountA);
            MockERC20(pair.tokenB).approve(ROUTER, pair.amountB);
            
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