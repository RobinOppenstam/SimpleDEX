// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";

contract DeployTokens is Script {
    function run() external {
        vm.startBroadcast();
        
        // Deploy a variety of tokens with different characteristics
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 1000000 * 10**18);
        console.log("USDC deployed at:", address(usdc));
        
        MockERC20 usdt = new MockERC20("Tether USD", "USDT", 1000000 * 10**18);
        console.log("USDT deployed at:", address(usdt));
        
        MockERC20 dai = new MockERC20("Dai Stablecoin", "DAI", 1000000 * 10**18);
        console.log("DAI deployed at:", address(dai));
        
        MockERC20 weth = new MockERC20("Wrapped Ether", "WETH", 100000 * 10**18);
        console.log("WETH deployed at:", address(weth));
        
        MockERC20 wbtc = new MockERC20("Wrapped Bitcoin", "WBTC", 10000 * 10**18);
        console.log("WBTC deployed at:", address(wbtc));
        
        MockERC20 link = new MockERC20("Chainlink", "LINK", 500000 * 10**18);
        console.log("LINK deployed at:", address(link));
        
        MockERC20 uni = new MockERC20("Uniswap", "UNI", 500000 * 10**18);
        console.log("UNI deployed at:", address(uni));
        
        // Output addresses in a format easy to copy to frontend
        console.log("\n=== Copy these to your frontend config ===");
        console.log("USDC:", address(usdc));
        console.log("USDT:", address(usdt));
        console.log("DAI:", address(dai));
        console.log("WETH:", address(weth));
        console.log("WBTC:", address(wbtc));
        console.log("LINK:", address(link));
        console.log("UNI:", address(uni));
        
        vm.stopBroadcast();
    }
}