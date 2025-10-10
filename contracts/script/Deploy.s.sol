// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

contract DeployDEX is Script {
    function run() external {
        vm.startBroadcast();
        
        // Deploy Factory
        DEXFactory factory = new DEXFactory();
        console.log("Factory deployed at:", address(factory));
        
        // Deploy Router
        DEXRouter router = new DEXRouter(address(factory));
        console.log("Router deployed at:", address(router));
        
        // Deploy test tokens (optional)
        MockERC20 tokenA = new MockERC20("Token A", "TKA", 1000000 * 10**18);
        console.log("Token A deployed at:", address(tokenA));
        
        MockERC20 tokenB = new MockERC20("Token B", "TKB", 1000000 * 10**18);
        console.log("Token B deployed at:", address(tokenB));
        
        vm.stopBroadcast();
    }
}