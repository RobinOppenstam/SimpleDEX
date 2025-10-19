// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

contract CreatePairs is Script {
    // These will be read from environment or use deployed addresses
    address FACTORY = 0x5FbDB2315678afecb367f032d93F642f64180aa3; // Default Anvil factory
    address ROUTER = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;  // Default Anvil router

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
        USDC = vm.envOr("USDC", address(0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9));
        USDT = vm.envOr("USDT", address(0x5FC8d32690cc91D4c39d9d3abcBD16989F875707));
        DAI = vm.envOr("DAI", address(0x0165878A594ca255338adfa4d48449f69242Eb8F));
        WETH = vm.envOr("WETH", address(0xa513E6E4b8f2a923D98304ec87F64353C4D5C853));
        WBTC = vm.envOr("WBTC", address(0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6));
        LINK = vm.envOr("LINK", address(0x8A791620dd6260079BF849Dc5567aDC3F2FdC318));
        UNI = vm.envOr("UNI", address(0x610178dA211FEF7D417bC0e6FeD39F05609AD788));

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