// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DEXRouter.sol";
import "../src/MockERC20.sol";

contract AddLiquidity is Script {
    // UPDATE THESE
    address constant ROUTER = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
    address constant TOKEN_A = 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0;
    address constant TOKEN_B = 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9;
    
    function run() external {
        uint256 privateKey = vm.envUint("ANVIL_PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        // CONFIGURE YOUR AMOUNTS HERE
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;

        MockERC20 tokenA = MockERC20(TOKEN_A);
        MockERC20 tokenB = MockERC20(TOKEN_B);
        DEXRouter router = DEXRouter(ROUTER);

        console.log("Adding liquidity...");
        console.log("Token A amount:", amountA / 10**18);
        console.log("Token B amount:", amountB / 10**18);

        // Approve
        tokenA.approve(ROUTER, amountA);
        tokenB.approve(ROUTER, amountB);

        // Add liquidity
        (uint256 actualA, uint256 actualB, uint256 liquidity) = router.addLiquidity(
            TOKEN_A,
            TOKEN_B,
            amountA,
            amountB,
            amountA * 95 / 100,
            amountB * 95 / 100,
            msg.sender,
            block.timestamp + 1 hours
        );

        console.log("Success!");
        console.log("Added Token A:", actualA / 10**18);
        console.log("Added Token B:", actualB / 10**18);
        console.log("LP tokens received:", liquidity / 10**18);

        vm.stopBroadcast();
    }
}