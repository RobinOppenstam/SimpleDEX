// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXRouter.sol";
import "../src/DEXFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RandomSwaps is Script {
    struct SwapPair {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
    }

    struct Addresses {
        address router;
        address mUSDC;
        address mUSDT;
        address mDAI;
        address mWETH;
        address mWBTC;
        address mLINK;
        address mUNI;
    }

    function getAddresses() internal view returns (Addresses memory) {
        // Read from environment variables (.env file)
        return Addresses({
            router: vm.envOr("ROUTER_ADDRESS", address(0)),
            mUSDC: vm.envOr("USDC_ADDRESS", address(0)),
            mUSDT: vm.envOr("USDT_ADDRESS", address(0)),
            mDAI: vm.envOr("DAI_ADDRESS", address(0)),
            mWETH: vm.envOr("WETH_ADDRESS", address(0)),
            mWBTC: vm.envOr("WBTC_ADDRESS", address(0)),
            mLINK: vm.envOr("LINK_ADDRESS", address(0)),
            mUNI: vm.envOr("UNI_ADDRESS", address(0))
        });
    }

    function validateAddresses(Addresses memory addrs) internal pure {
        require(addrs.router != address(0), "ROUTER_ADDRESS not set in .env");
        require(addrs.mUSDC != address(0), "USDC_ADDRESS not set in .env");
        require(addrs.mUSDT != address(0), "USDT_ADDRESS not set in .env");
        require(addrs.mDAI != address(0), "DAI_ADDRESS not set in .env");
        require(addrs.mWETH != address(0), "WETH_ADDRESS not set in .env");
        require(addrs.mWBTC != address(0), "WBTC_ADDRESS not set in .env");
        require(addrs.mLINK != address(0), "LINK_ADDRESS not set in .env");
        require(addrs.mUNI != address(0), "UNI_ADDRESS not set in .env");
    }

    function run() external {
        Addresses memory addrs = getAddresses();
        validateAddresses(addrs);

        vm.startBroadcast();

        address deployer = msg.sender;
        console.log("Executing random swaps from:", deployer);

        // Define swap pairs with amounts - using only existing pairs
        SwapPair[5] memory swaps = [
            SwapPair(addrs.mWETH, addrs.mUSDC, 10 ether),      // 10 mWETH -> mUSDC (pair exists)
            SwapPair(addrs.mUSDC, addrs.mUSDT, 5000 ether),    // 5000 mUSDC -> mUSDT (pair exists)
            SwapPair(addrs.mUSDC, addrs.mDAI, 3000 ether),     // 3000 mUSDC -> mDAI (pair exists)
            SwapPair(addrs.mWBTC, addrs.mWETH, 1 ether / 10),  // 0.1 mWBTC -> mWETH (pair exists)
            SwapPair(addrs.mLINK, addrs.mUSDC, 100 ether)      // 100 mLINK -> mUSDC (pair exists)
        ];

        for (uint i = 0; i < swaps.length; i++) {
            executeSwap(
                deployer,
                swaps[i].tokenIn,
                swaps[i].tokenOut,
                swaps[i].amountIn,
                addrs.router
            );
        }

        console.log("\n=== All 5 swaps completed successfully! ===");
        vm.stopBroadcast();
    }

    function executeSwap(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address routerAddress
    ) internal {
        _checkBalanceAndApprove(user, tokenIn, tokenOut, amountIn, routerAddress);
        _performSwap(user, tokenIn, tokenOut, amountIn, routerAddress);
    }

    function _checkBalanceAndApprove(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address routerAddress
    ) private {
        IERC20 token = IERC20(tokenIn);
        uint256 balance = token.balanceOf(user);

        console.log("\n--- Executing Swap ---");
        console.log("Token In:", tokenIn);
        console.log("Token Out:", tokenOut);
        console.log("Amount In:", amountIn);
        console.log("User Balance:", balance);

        require(balance >= amountIn, "Insufficient balance");

        token.approve(routerAddress, amountIn);
        console.log("Approved router");
    }

    function _performSwap(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address routerAddress
    ) private {
        DEXRouter router = DEXRouter(routerAddress);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint[] memory amounts = router.getAmountsOut(amountIn, path);
        uint amountOutMin = (amounts[1] * 95) / 100;

        console.log("Expected output:", amounts[1]);
        console.log("Min output (5% slippage):", amountOutMin);

        uint[] memory swappedAmounts = router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            user,
            block.timestamp + 300
        );

        console.log("Swap successful!");
        console.log("Amount In:", swappedAmounts[0]);
        console.log("Amount Out:", swappedAmounts[1]);
    }
}
