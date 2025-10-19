// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXRouter.sol";
import "../src/DEXFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RandomSwaps is Script {
    // Deployed contract addresses
    address constant FACTORY = 0x4C2F7092C2aE51D986bEFEe378e50BD4dB99C901;
    address constant ROUTER = 0x7A9Ec1d04904907De0ED7b6839CcdD59c3716AC9;

    // Token addresses - updated with latest deployment
    address constant USDC = 0x86A2EE8FAf9A840F7a2c64CA3d51209F9A02081D;
    address constant USDT = 0xA4899D35897033b927acFCf422bc745916139776;
    address constant DAI = 0xf953b3A269d80e3eB0F2947630Da976B896A8C5b;
    address constant WETH = 0xAA292E8611aDF267e563f334Ee42320aC96D0463;
    address constant WBTC = 0x5c74c94173F05dA1720953407cbb920F3DF9f887;
    address constant LINK = 0x720472c8ce72c2A2D711333e064ABD3E6BbEAdd3;
    address constant UNI = 0xe8D2A1E88c91DCd5433208d4152Cc4F399a7e91d;

    struct SwapPair {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
    }

    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;
        console.log("Executing random swaps from:", deployer);

        // Define swap pairs with amounts - using only existing pairs
        SwapPair[5] memory swaps = [
            SwapPair(WETH, USDC, 10 ether),      // 10 WETH -> USDC (pair exists)
            SwapPair(USDC, USDT, 5000 ether),    // 5000 USDC -> USDT (pair exists)
            SwapPair(USDC, DAI, 3000 ether),     // 3000 USDC -> DAI (pair exists)
            SwapPair(WBTC, WETH, 1 ether / 10),  // 0.1 WBTC -> WETH (pair exists)
            SwapPair(LINK, USDC, 100 ether)      // 100 LINK -> USDC (pair exists)
        ];

        for (uint i = 0; i < swaps.length; i++) {
            executeSwap(
                deployer,
                swaps[i].tokenIn,
                swaps[i].tokenOut,
                swaps[i].amountIn
            );
        }

        console.log("\n=== All 5 swaps completed successfully! ===");
        vm.stopBroadcast();
    }

    function executeSwap(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal {
        DEXRouter router = DEXRouter(ROUTER);
        IERC20 token = IERC20(tokenIn);

        // Check balance
        uint256 balance = token.balanceOf(user);
        console.log("\n--- Executing Swap ---");
        console.log("Token In:", tokenIn);
        console.log("Token Out:", tokenOut);
        console.log("Amount In:", amountIn);
        console.log("User Balance:", balance);

        require(balance >= amountIn, "Insufficient balance");

        // Approve router
        token.approve(ROUTER, amountIn);
        console.log("Approved router");

        // Build path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        // Get expected output
        uint[] memory amounts = router.getAmountsOut(amountIn, path);
        uint amountOutMin = (amounts[1] * 95) / 100; // 5% slippage

        console.log("Expected output:", amounts[1]);
        console.log("Min output (5% slippage):", amountOutMin);

        // Execute swap
        uint deadline = block.timestamp + 300;
        uint[] memory swappedAmounts = router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            user,
            deadline
        );

        console.log("Swap successful!");
        console.log("Amount In:", swappedAmounts[0]);
        console.log("Amount Out:", swappedAmounts[1]);
    }
}
