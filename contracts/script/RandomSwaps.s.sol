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

    // Token addresses
    address constant USDC = 0x70e0bA845a1A0F2DA3359C97E0285013525FFC49;
    address constant USDT = 0x4826533B4897376654Bb4d4AD88B7faFD0C98528;
    address constant DAI = 0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf;
    address constant WETH = 0x0E801D84Fa97b50751Dbf25036d067dCf18858bF;
    address constant WBTC = 0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf;
    address constant LINK = 0x9d4454B023096f34B160D6B654540c56A1F81688;
    address constant UNI = 0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00;

    struct SwapPair {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
    }

    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;
        console.log("Executing random swaps from:", deployer);

        // Define swap pairs with amounts
        SwapPair[5] memory swaps = [
            SwapPair(WETH, USDC, 10 ether),      // 10 WETH -> USDC
            SwapPair(USDC, USDT, 5000 ether),    // 5000 USDC -> USDT
            SwapPair(USDT, DAI, 3000 ether),     // 3000 USDT -> DAI
            SwapPair(WETH, WBTC, 15 ether),      // 15 WETH -> WBTC
            SwapPair(LINK, USDC, 100 ether)      // 100 LINK -> USDC
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
