// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/DEXPair.sol";
import "../src/MockERC20.sol";

contract DEXComprehensiveTest is Test {
    DEXFactory factory;
    DEXRouter router;
    MockERC20 tokenA;
    MockERC20 tokenB;
    DEXPair pair;
    
    address alice = address(0x1);
    address bob = address(0x2);
    address charlie = address(0x3);

    uint256 constant INITIAL_BALANCE = 1000000 * 10**18;

    function setUp() public {
        // Deploy contracts
        factory = new DEXFactory();
        router = new DEXRouter(address(factory));
        
        tokenA = new MockERC20("Token A", "TKA", INITIAL_BALANCE);
        tokenB = new MockERC20("Token B", "TKB", INITIAL_BALANCE);
        
        // Distribute tokens to users
        tokenA.transfer(alice, 100000 * 10**18);
        tokenB.transfer(alice, 100000 * 10**18);
        
        tokenA.transfer(bob, 100000 * 10**18);
        tokenB.transfer(bob, 100000 * 10**18);
        
        tokenA.transfer(charlie, 100000 * 10**18);
        tokenB.transfer(charlie, 100000 * 10**18);
        
        console.log("=== SETUP COMPLETE ===");
        console.log("Factory:", address(factory));
        console.log("Router:", address(router));
        console.log("Token A:", address(tokenA));
        console.log("Token B:", address(tokenB));
        console.log("");
    }
    
    function testComprehensiveDEXWorkflow() public {
        console.log("=================================");
        console.log("COMPREHENSIVE DEX TEST");
        console.log("=================================\n");
        
        // Phase 1: Alice creates the initial pool
        console.log("--- PHASE 1: Alice Creates Initial Pool ---");
        _aliceCreatesPool();
        
        // Phase 2: Bob adds more liquidity
        console.log("\n--- PHASE 2: Bob Adds Liquidity ---");
        _bobAddsLiquidity();
        
        // Phase 3: Charlie performs swaps
        console.log("\n--- PHASE 3: Charlie Performs Swaps ---");
        _charlieSwaps();
        
        // Phase 4: Alice adds more liquidity (pool already exists)
        console.log("\n--- PHASE 4: Alice Adds More Liquidity ---");
        _aliceAddsMoreLiquidity();
        
        // Phase 5: Multiple swaps from different users
        console.log("\n--- PHASE 5: Multiple Users Swap ---");
        _multipleUsersSwap();
        
        // Phase 6: Bob removes partial liquidity
        console.log("\n--- PHASE 6: Bob Removes Partial Liquidity ---");
        _bobRemovesPartialLiquidity();
        
        // Phase 7: Alice removes all her liquidity
        console.log("\n--- PHASE 7: Alice Removes All Liquidity ---");
        _aliceRemovesAllLiquidity();
        
        // Phase 8: Final state check
        console.log("\n--- PHASE 8: Final State Check ---");
        _finalStateCheck();
        
        console.log("\n=================================");
        console.log("ALL TESTS PASSED!");
        console.log("=================================");
    }
    
    function _aliceCreatesPool() internal {
        vm.startPrank(alice);
        
        uint256 amountA = 10000 * 10**18;
        uint256 amountB = 20000 * 10**18;
        
        console.log("Alice's balances before:");
        console.log("Token A:", tokenA.balanceOf(alice) / 10**18);
        console.log("Token B:", tokenB.balanceOf(alice) / 10**18);
        
        // Approve tokens
        console.log("\nApproving tokens...");
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        assertEq(tokenA.allowance(alice, address(router)), amountA, "Token A approval failed");
        assertEq(tokenB.allowance(alice, address(router)), amountB, "Token B approval failed");
        console.log("Approvals confirmed!");
        
        // Add liquidity
        console.log("\nAdding liquidity...");
        (uint256 actualAmountA, uint256 actualAmountB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );
        
        // Get pair address
        address pairAddress = factory.getPair(address(tokenA), address(tokenB));
        pair = DEXPair(pairAddress);
        
        console.log("\nLiquidity added successfully!");
        console.log("Pair created at:", pairAddress);
        console.log("Amount A added:", actualAmountA / 10**18);
        console.log("Amount B added:", actualAmountB / 10**18);
        console.log("LP tokens received:", liquidity / 10**18);
        
        // Verify balances
        assertEq(actualAmountA, amountA, "Wrong amount A added");
        assertEq(actualAmountB, amountB, "Wrong amount B added");
        assertGt(liquidity, 0, "No LP tokens received");
        
        console.log("\nAlice's balances after:");
        console.log("Token A:", tokenA.balanceOf(alice) / 10**18);
        console.log("Token B:", tokenB.balanceOf(alice) / 10**18);
        console.log("LP Tokens:", pair.balanceOf(alice) / 10**18);
        
        vm.stopPrank();
    }
    
    function _bobAddsLiquidity() internal {
        vm.startPrank(bob);
        
        uint256 amountA = 5000 * 10**18;
        uint256 amountB = 10000 * 10**18;
        
        console.log("Bob's balances before:");
        console.log("Token A:", tokenA.balanceOf(bob) / 10**18);
        console.log("Token B:", tokenB.balanceOf(bob) / 10**18);
        
        // Approve tokens
        console.log("\nApproving tokens...");
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        console.log("Approvals confirmed!");
        
        // Add liquidity to existing pool
        console.log("\nAdding liquidity to existing pool...");
        (uint256 actualAmountA, uint256 actualAmountB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            amountA * 95 / 100,  // 5% slippage tolerance
            amountB * 95 / 100,
            bob,
            block.timestamp + 1 hours
        );
        
        console.log("\nLiquidity added successfully!");
        console.log("Amount A added:", actualAmountA / 10**18);
        console.log("Amount B added:", actualAmountB / 10**18);
        console.log("LP tokens received:", liquidity / 10**18);
        
        // Verify pool state
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        console.log("\nPool reserves after Bob's addition:");
        console.log("Reserve A:", uint256(reserve0) / 10**18);
        console.log("Reserve B:", uint256(reserve1) / 10**18);
        
        console.log("\nBob's balances after:");
        console.log("Token A:", tokenA.balanceOf(bob) / 10**18);
        console.log("Token B:", tokenB.balanceOf(bob) / 10**18);
        console.log("LP Tokens:", pair.balanceOf(bob) / 10**18);
        
        vm.stopPrank();
    }
    
    function _charlieSwaps() internal {
        vm.startPrank(charlie);
        
        console.log("Charlie's balances before swap:");
        console.log("Token A:", tokenA.balanceOf(charlie) / 10**18);
        console.log("Token B:", tokenB.balanceOf(charlie) / 10**18);
        
        // First swap: A -> B
        uint256 swapAmount1 = 1000 * 10**18;
        console.log("\nSwapping", swapAmount1 / 10**18, "Token A for Token B...");
        
        tokenA.approve(address(router), swapAmount1);
        
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        
        uint256[] memory expectedAmounts = router.getAmountsOut(swapAmount1, path);
        console.log("Expected to receive:", expectedAmounts[1] / 10**18, "Token B");
        
        uint256[] memory amounts = router.swapExactTokensForTokens(
            swapAmount1,
            0,
            path,
            charlie,
            block.timestamp + 1 hours
        );
        
        console.log("Swap successful!");
        console.log("Actual received:", amounts[1] / 10**18, "Token B");
        
        // Second swap: B -> A
        uint256 swapAmount2 = 500 * 10**18;
        console.log("\nSwapping", swapAmount2 / 10**18, "Token B for Token A...");
        
        tokenB.approve(address(router), swapAmount2);
        
        address[] memory path2 = new address[](2);
        path2[0] = address(tokenB);
        path2[1] = address(tokenA);
        
        uint256[] memory amounts2 = router.swapExactTokensForTokens(
            swapAmount2,
            0,
            path2,
            charlie,
            block.timestamp + 1 hours
        );
        
        console.log("Swap successful!");
        console.log("Received:", amounts2[1] / 10**18, "Token A");
        
        console.log("\nCharlie's balances after swaps:");
        console.log("Token A:", tokenA.balanceOf(charlie) / 10**18);
        console.log("Token B:", tokenB.balanceOf(charlie) / 10**18);
        
        vm.stopPrank();
    }
    
    function _aliceAddsMoreLiquidity() internal {
        vm.startPrank(alice);

        // Get current pool ratio to add proportional liquidity
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        address token0 = pair.token0();

        uint256 reserveA = address(tokenA) == token0 ? uint256(reserve0) : uint256(reserve1);
        uint256 reserveB = address(tokenA) == token0 ? uint256(reserve1) : uint256(reserve0);

        console.log("Current pool reserves:");
        console.log("Reserve A:", reserveA / 10**18);
        console.log("Reserve B:", reserveB / 10**18);

        uint256 amountA = 3000 * 10**18;
        uint256 amountB = (amountA * reserveB) / reserveA;

        console.log("\nAlice adding more liquidity...");
        console.log("Amount A:", amountA / 10**18);
        console.log("Amount B:", amountB / 10**18);

        uint256 lpBalanceBefore = pair.balanceOf(alice);

        // Approve and add liquidity with 10% slippage tolerance
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);

        (uint256 actualAmountA, uint256 actualAmountB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            amountA * 90 / 100,
            amountB * 90 / 100,
            alice,
            block.timestamp + 1 hours
        );

        uint256 lpBalanceAfter = pair.balanceOf(alice);

        console.log("\nAdditional liquidity added!");
        console.log("Amount A added:", actualAmountA / 10**18);
        console.log("Amount B added:", actualAmountB / 10**18);
        console.log("Additional LP tokens:", liquidity / 10**18);
        console.log("Total LP tokens:", lpBalanceAfter / 10**18);
        console.log("LP increase:", (lpBalanceAfter - lpBalanceBefore) / 10**18);

        vm.stopPrank();
    }
    
    function _multipleUsersSwap() internal {
        // Alice swaps
        vm.startPrank(alice);
        uint256 aliceSwap = 500 * 10**18;
        tokenA.approve(address(router), aliceSwap);
        
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        
        router.swapExactTokensForTokens(aliceSwap, 0, path, alice, block.timestamp + 1 hours);
        console.log("Alice swapped", aliceSwap / 10**18, "Token A");
        vm.stopPrank();
        
        // Bob swaps
        vm.startPrank(bob);
        uint256 bobSwap = 750 * 10**18;
        tokenB.approve(address(router), bobSwap);
        
        address[] memory path2 = new address[](2);
        path2[0] = address(tokenB);
        path2[1] = address(tokenA);
        
        router.swapExactTokensForTokens(bobSwap, 0, path2, bob, block.timestamp + 1 hours);
        console.log("Bob swapped", bobSwap / 10**18, "Token B");
        vm.stopPrank();
        
        // Charlie swaps again
        vm.startPrank(charlie);
        uint256 charlieSwap = 300 * 10**18;
        tokenA.approve(address(router), charlieSwap);
        router.swapExactTokensForTokens(charlieSwap, 0, path, charlie, block.timestamp + 1 hours);
        console.log("Charlie swapped", charlieSwap / 10**18, "Token A");
        vm.stopPrank();
        
        // Show pool state
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        console.log("\nPool state after multiple swaps:");
        console.log("Reserve A:", uint256(reserve0) / 10**18);
        console.log("Reserve B:", uint256(reserve1) / 10**18);
    }
    
    function _bobRemovesPartialLiquidity() internal {
        vm.startPrank(bob);
        
        uint256 bobLPBalance = pair.balanceOf(bob);
        uint256 removeAmount = bobLPBalance / 2; // Remove 50%
        
        console.log("Bob's LP balance:", bobLPBalance / 10**18);
        console.log("Removing 50%:", removeAmount / 10**18);
        
        uint256 tokenABefore = tokenA.balanceOf(bob);
        uint256 tokenBBefore = tokenB.balanceOf(bob);
        
        // Approve LP tokens
        pair.approve(address(router), removeAmount);
        
        // Remove liquidity
        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            removeAmount,
            0,
            0,
            bob,
            block.timestamp + 1 hours
        );
        
        uint256 tokenAAfter = tokenA.balanceOf(bob);
        uint256 tokenBAfter = tokenB.balanceOf(bob);
        
        console.log("\nLiquidity removed!");
        console.log("Received Token A:", amountA / 10**18);
        console.log("Received Token B:", amountB / 10**18);
        console.log("Token A gained:", (tokenAAfter - tokenABefore) / 10**18);
        console.log("Token B gained:", (tokenBAfter - tokenBBefore) / 10**18);
        console.log("Remaining LP tokens:", pair.balanceOf(bob) / 10**18);
        
        assertGt(amountA, 0, "Should receive Token A");
        assertGt(amountB, 0, "Should receive Token B");
        assertEq(pair.balanceOf(bob), bobLPBalance - removeAmount, "LP balance incorrect");
        
        vm.stopPrank();
    }
    
    function _aliceRemovesAllLiquidity() internal {
        vm.startPrank(alice);
        
        uint256 aliceLPBalance = pair.balanceOf(alice);
        console.log("Alice's total LP balance:", aliceLPBalance / 10**18);
        console.log("Removing all liquidity...");
        
        uint256 tokenABefore = tokenA.balanceOf(alice);
        uint256 tokenBBefore = tokenB.balanceOf(alice);
        
        // Approve LP tokens
        pair.approve(address(router), aliceLPBalance);
        
        // Remove all liquidity
        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            aliceLPBalance,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );
        
        uint256 tokenAAfter = tokenA.balanceOf(alice);
        uint256 tokenBAfter = tokenB.balanceOf(alice);
        
        console.log("\nAll liquidity removed!");
        console.log("Received Token A:", amountA / 10**18);
        console.log("Received Token B:", amountB / 10**18);
        console.log("Token A total:", (tokenAAfter - tokenABefore) / 10**18);
        console.log("Token B total:", (tokenBAfter - tokenBBefore) / 10**18);
        console.log("Remaining LP tokens:", pair.balanceOf(alice) / 10**18);
        
        assertGt(amountA, 0, "Should receive Token A");
        assertGt(amountB, 0, "Should receive Token B");
        assertEq(pair.balanceOf(alice), 0, "Should have no LP tokens left");
        
        vm.stopPrank();
    }
    
    function _finalStateCheck() internal view {
        console.log("=== FINAL STATE ===");
        
        // Pool state
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        uint256 totalSupply = pair.totalSupply();
        
        console.log("\nPool State:");
        console.log("Reserve A:", uint256(reserve0) / 10**18);
        console.log("Reserve B:", uint256(reserve1) / 10**18);
        console.log("Total LP Supply:", totalSupply / 10**18);
        
        // User balances
        console.log("\nAlice Final Balances:");
        console.log("Token A:", tokenA.balanceOf(alice) / 10**18);
        console.log("Token B:", tokenB.balanceOf(alice) / 10**18);
        console.log("LP Tokens:", pair.balanceOf(alice) / 10**18);
        
        console.log("\nBob Final Balances:");
        console.log("Token A:", tokenA.balanceOf(bob) / 10**18);
        console.log("Token B:", tokenB.balanceOf(bob) / 10**18);
        console.log("LP Tokens:", pair.balanceOf(bob) / 10**18);
        
        console.log("\nCharlie Final Balances:");
        console.log("Token A:", tokenA.balanceOf(charlie) / 10**18);
        console.log("Token B:", tokenB.balanceOf(charlie) / 10**18);
        console.log("LP Tokens:", pair.balanceOf(charlie) / 10**18);
        
        // Assertions
        assertTrue(reserve0 > 0, "Pool should have Token A reserves");
        assertTrue(reserve1 > 0, "Pool should have Token B reserves");
        assertTrue(totalSupply > 0, "Pool should have LP tokens");
        
        // Verify only Bob has LP tokens remaining
        assertEq(pair.balanceOf(alice), 0, "Alice should have no LP tokens");
        assertGt(pair.balanceOf(bob), 0, "Bob should have LP tokens");
        assertEq(pair.balanceOf(charlie), 0, "Charlie should have no LP tokens");
    }
    
    // Additional test for edge cases
    function testMultipleApprovalsAndReapprovals() public {
        vm.startPrank(alice);
        
        console.log("\n=== TESTING MULTIPLE APPROVALS ===");
        
        // First approval
        tokenA.approve(address(router), 1000 * 10**18);
        assertEq(tokenA.allowance(alice, address(router)), 1000 * 10**18);
        console.log("First approval: 1000 tokens");
        
        // Increase approval
        tokenA.approve(address(router), 5000 * 10**18);
        assertEq(tokenA.allowance(alice, address(router)), 5000 * 10**18);
        console.log("Increased approval to: 5000 tokens");
        
        // Use some allowance
        address pairAddress = factory.createPair(address(tokenA), address(tokenB));
        tokenB.approve(address(router), 10000 * 10**18);
        
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 * 10**18,
            2000 * 10**18,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );
        
        uint256 remainingAllowance = tokenA.allowance(alice, address(router));
        console.log("Remaining allowance after use:", remainingAllowance / 10**18);
        assertEq(remainingAllowance, 4000 * 10**18, "Allowance should be reduced");
        
        // Re-approve
        tokenA.approve(address(router), 10000 * 10**18);
        assertEq(tokenA.allowance(alice, address(router)), 10000 * 10**18);
        console.log("Re-approved: 10000 tokens");
        
        vm.stopPrank();
    }
    
    function testLiquidityMathPrecision() public {
        vm.startPrank(alice);
        
        console.log("\n=== TESTING LIQUIDITY MATH PRECISION ===");
        
        // Create pool with initial liquidity
        tokenA.approve(address(router), 100 * 10**18);
        tokenB.approve(address(router), 200 * 10**18);
        
        address pairAddress = factory.createPair(address(tokenA), address(tokenB));
        DEXPair testPair = DEXPair(pairAddress);
        
        (,, uint256 liquidity1) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            100 * 10**18,
            200 * 10**18,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );
        
        console.log("Initial LP tokens:", liquidity1 / 10**18);
        
        vm.stopPrank();
        
        // Bob adds proportional liquidity
        vm.startPrank(bob);
        tokenA.approve(address(router), 50 * 10**18);
        tokenB.approve(address(router), 100 * 10**18);
        
        (,, uint256 liquidity2) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            50 * 10**18,
            100 * 10**18,
            0,
            0,
            bob,
            block.timestamp + 1 hours
        );
        
        console.log("Bob's LP tokens:", liquidity2 / 10**18);
        
        // Verify proportionality
        // Bob added 50% of what Alice added, should get 50% of LP tokens
        uint256 expectedRatio = (liquidity2 * 2 * 100) / liquidity1;
        console.log("Ratio (should be ~100):", expectedRatio);
        
        assertTrue(expectedRatio >= 99 && expectedRatio <= 101, "Liquidity ratio should be proportional");
        
        vm.stopPrank();
    }
}