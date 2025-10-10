// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

contract SwapTokens is Script {
    // UPDATE THESE
    address constant ROUTER = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
    address constant TOKEN_A = 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0;
    address constant TOKEN_B = 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9;
    
    function run() external {
        uint256 privateKey = vm.envUint("ANVIL_PRIVATE_KEY");
        address user = vm.addr(privateKey);
        
        // CONFIGURE YOUR SWAP HERE
        uint256 amountIn = 100 * 10**18;  // Amount of Token A to swap
        
        vm.startBroadcast(privateKey);
        
        MockERC20 tokenA = MockERC20(TOKEN_A);
        MockERC20 tokenB = MockERC20(TOKEN_B);
        DEXRouter router = DEXRouter(ROUTER);
        
        // Setup path
        address[] memory path = new address[](2);
        path[0] = TOKEN_A;
        path[1] = TOKEN_B;
        
        // Get expected output
        uint256[] memory expectedAmounts = router.getAmountsOut(amountIn, path);
        
        console.log("Swapping tokens...");
        console.log("Input:", amountIn / 10**18, "Token A");
        console.log("Expected output:", expectedAmounts[1] / 10**18, "Token B");
        
        // Check balances before
        uint256 tokenABefore = tokenA.balanceOf(user);
        uint256 tokenBBefore = tokenB.balanceOf(user);
        
        // Approve
        tokenA.approve(ROUTER, amountIn);
        
        // Perform swap
        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            expectedAmounts[1] * 95 / 100,  // 5% slippage tolerance
            path,
            user,
            block.timestamp + 1 hours
        );
        
        // Check balances after
        uint256 tokenAAfter = tokenA.balanceOf(user);
        uint256 tokenBAfter = tokenB.balanceOf(user);
        
        console.log("\nSwap successful!");
        console.log("Token A spent:", (tokenABefore - tokenAAfter) / 10**18);
        console.log("Token B received:", (tokenBAfter - tokenBBefore) / 10**18);
        console.log("Effective price:", ((tokenBAfter - tokenBBefore) * 10**18) / (tokenABefore - tokenAAfter) / 10**18);
        
        vm.stopBroadcast();
    }
}