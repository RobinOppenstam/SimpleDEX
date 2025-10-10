// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

contract CreatePairs is Script {
    // TODO: Update these with your deployed addresses after running deploy scripts
    address constant FACTORY = 0x5FbDB2315678afecb367f032d93F642f64180aa3; // Your factory address
    address constant ROUTER = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;  // Your router address

    // Token addresses from DeployTokens.s.sol
    address constant USDC = 0x70e0bA845a1A0F2DA3359C97E0285013525FFC49;
    address constant USDT = 0x4826533B4897376654Bb4d4AD88B7faFD0C98528;
    address constant DAI = 0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf;
    address constant WETH = 0x0E801D84Fa97b50751Dbf25036d067dCf18858bF;
    address constant WBTC = 0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf;
    address constant LINK = 0x9d4454B023096f34B160D6B654540c56A1F81688;
    address constant UNI = 0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00;
    
    struct PairToCreate {
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        string name;
    }
    
    function run() external {
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
            ) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
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