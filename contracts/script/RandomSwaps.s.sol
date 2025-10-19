// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXRouter.sol";
import "../src/DEXFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RandomSwaps is Script {
    // Deployed contract addresses
    address constant FACTORY = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address constant ROUTER = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;

    // Token addresses - updated with latest deployment
    address constant USDC = 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9;
    address constant USDT = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707;
    address constant DAI = 0x0165878A594ca255338adfa4d48449f69242Eb8F;
    address constant WETH = 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853;
    address constant WBTC = 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6;
    address constant LINK = 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318;
    address constant UNI = 0x610178dA211FEF7D417bC0e6FeD39F05609AD788;

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
