// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";

contract DeployTokens is Script {
    function run() external {
        vm.startBroadcast();
        
        // Deploy a variety of mock tokens with different characteristics
        MockERC20 usdc = new MockERC20("Mock USD Coin", "mUSDC", 1000000 * 10**18);
        console.log("mUSDC deployed at:", address(usdc));

        MockERC20 usdt = new MockERC20("Mock Tether USD", "mUSDT", 1000000 * 10**18);
        console.log("mUSDT deployed at:", address(usdt));

        MockERC20 dai = new MockERC20("Mock Dai Stablecoin", "mDAI", 1000000 * 10**18);
        console.log("mDAI deployed at:", address(dai));

        MockERC20 weth = new MockERC20("Mock Wrapped Ether", "mWETH", 100000 * 10**18);
        console.log("mWETH deployed at:", address(weth));

        MockERC20 wbtc = new MockERC20("Mock Wrapped Bitcoin", "mWBTC", 10000 * 10**18);
        console.log("mWBTC deployed at:", address(wbtc));

        MockERC20 link = new MockERC20("Mock Chainlink", "mLINK", 500000 * 10**18);
        console.log("mLINK deployed at:", address(link));

        MockERC20 uni = new MockERC20("Mock Uniswap", "mUNI", 500000 * 10**18);
        console.log("mUNI deployed at:", address(uni));
        
        // Output addresses in a format easy to copy to frontend
        console.log("\n=== Copy these to your frontend config ===");
        console.log("mUSDC:", address(usdc));
        console.log("mUSDT:", address(usdt));
        console.log("mDAI:", address(dai));
        console.log("mWETH:", address(weth));
        console.log("mWBTC:", address(wbtc));
        console.log("mLINK:", address(link));
        console.log("mUNI:", address(uni));
        
        vm.stopBroadcast();
    }
}