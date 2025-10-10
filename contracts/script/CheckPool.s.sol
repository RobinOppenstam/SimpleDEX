// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXFactory.sol";
import "../src/DEXPair.sol";
import "../src/MockERC20.sol";

contract CheckPool is Script {
    // UPDATE THESE
    address constant FACTORY = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address constant TOKEN_A = 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0;
    address constant TOKEN_B = 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9;
    
    function run() external view {
        DEXFactory factory = DEXFactory(FACTORY);
        MockERC20 tokenA = MockERC20(TOKEN_A);
        MockERC20 tokenB = MockERC20(TOKEN_B);
        
        console.log("=================================");
        console.log("Pool Information");
        console.log("=================================");
        
        // Get pair address
        address pairAddress = factory.getPair(TOKEN_A, TOKEN_B);
        
        if (pairAddress == address(0)) {
            console.log("No pool exists for this pair!");
            console.log("Create one by adding liquidity");
            return;
        }
        
        console.log("Pair Address:", pairAddress);
        console.log("\nToken Information:");
        console.log("Token A:", TOKEN_A);
        console.log("Token A Symbol:", tokenA.symbol());
        console.log("Token B:", TOKEN_B);
        console.log("Token B Symbol:", tokenB.symbol());
        
        // Get reserves
        DEXPair pair = DEXPair(pairAddress);
        (uint112 reserve0, uint112 reserve1, uint32 timestamp) = pair.getReserves();
        
        console.log("\nPool Reserves:");
        console.log("Reserve Token A:", uint256(reserve0) / 10**18, "tokens");
        console.log("Reserve Token B:", uint256(reserve1) / 10**18, "tokens");
        console.log("Last Update:", timestamp);
        
        // Calculate prices
        if (reserve0 > 0 && reserve1 > 0) {
            console.log("\nPrices:");
            uint256 priceAinB = (uint256(reserve1) * 10**18) / uint256(reserve0);
            uint256 priceBinA = (uint256(reserve0) * 10**18) / uint256(reserve1);
            console.log("1 Token A =", priceAinB / 10**15, "/ 1000 Token B");
            console.log("1 Token B =", priceBinA / 10**15, "/ 1000 Token A");
        }
        
        // Total supply
        uint256 totalSupply = pair.totalSupply();
        console.log("\nLP Token Supply:", totalSupply / 10**18, "LP tokens");
        
        // Calculate pool value (in Token A terms)
        if (reserve0 > 0) {
            uint256 poolValueInA = uint256(reserve0) * 2;
            console.log("Total Pool Value:", poolValueInA / 10**18, "Token A equivalent");
        }
        
        console.log("=================================");
    }
}