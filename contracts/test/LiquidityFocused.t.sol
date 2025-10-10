// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/DEXPair.sol";
import "../src/MockERC20.sol";

/**
 * @title LiquidityFocusedTest
 * @notice Focused tests on liquidity operations with multiple users
 */
contract LiquidityFocusedTest is Test {
    DEXFactory factory;
    DEXRouter router;
    MockERC20 tokenA;
    MockERC20 tokenB;
    DEXPair pair;
    
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");
    
    function setUp() public {
        factory = new DEXFactory();
        router = new DEXRouter(address(factory));
        
        tokenA = new MockERC20("Token A", "TKA", 1000000 * 10**18);
        tokenB = new MockERC20("Token B", "TKB", 1000000 * 10**18);
        
        // Fund users
        tokenA.transfer(alice, 50000 * 10**18);
        tokenB.transfer(alice, 100000 * 10**18);
        
        tokenA.transfer(bob, 50000 * 10**18);
        tokenB.transfer(bob, 100000 * 10**18);
        
        tokenA.transfer(charlie, 50000 * 10**18);
        tokenB.transfer(charlie, 100000 * 10**18);
    }
    
    function test_01_InitialLiquidityProvision() public {
        console.log("\n=== TEST 1: Initial Liquidity Provision ===");
        
        vm.startPrank(alice);
        
        uint256 amountA = 10000 * 10**18;
        uint256 amountB = 20000 * 10**18;
        
        // Approve
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        // Add liquidity
        (uint256 actualA, uint256 actualB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );
        
        pair = DEXPair(factory.getPair(address(tokenA), address(tokenB)));
        
        console.log("Alice added liquidity:");
        console.log("  Token A:", actualA / 10**18);
        console.log("  Token B:", actualB / 10**18);
        console.log("  LP Tokens:", liquidity / 10**18);
        
        assertEq(actualA, amountA);
        assertEq(actualB, amountB);
        assertGt(liquidity, 0);
        assertEq(pair.balanceOf(alice), liquidity);
        
        vm.stopPrank();
    }
    
    function test_02_SecondUserAddsLiquidity() public {
        // Setup initial pool
        test_01_InitialLiquidityProvision();
        
        console.log("\n=== TEST 2: Second User Adds Liquidity ===");
        
        vm.startPrank(bob);
        
        uint256 amountA = 5000 * 10**18;
        uint256 amountB = 10000 * 10**18;
        
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        uint256 bobLPBefore = pair.balanceOf(bob);
        
        (uint256 actualA, uint256 actualB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            bob,
            block.timestamp + 1 hours
        );
        
        console.log("Bob added liquidity:");
        console.log("  Token A:", actualA / 10**18);
        console.log("  Token B:", actualB / 10**18);
        console.log("  LP Tokens:", liquidity / 10**18);
        
        assertEq(actualA, amountA);
        assertEq(actualB, amountB);
        assertGt(pair.balanceOf(bob), bobLPBefore);
        
        (uint112 r0, uint112 r1,) = pair.getReserves();
        console.log("Pool reserves:");
        console.log("  Token A:", uint256(r0) / 10**18);
        console.log("  Token B:", uint256(r1) / 10**18);
        
        vm.stopPrank();
    }
    
    function test_03_ThirdUserAddsLiquidity() public {
        // Setup
        test_02_SecondUserAddsLiquidity();
        
        console.log("\n=== TEST 3: Third User Adds Liquidity ===");
        
        vm.startPrank(charlie);
        
        uint256 amountA = 2500 * 10**18;
        uint256 amountB = 5000 * 10**18;
        
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        (uint256 actualA, uint256 actualB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            charlie,
            block.timestamp + 1 hours
        );
        
        console.log("Charlie added liquidity:");
        console.log("  Token A:", actualA / 10**18);
        console.log("  Token B:", actualB / 10**18);
        console.log("  LP Tokens:", liquidity / 10**18);
        
        uint256 totalSupply = pair.totalSupply();
        console.log("Total LP supply:", totalSupply / 10**18);
        
        assertGt(liquidity, 0);
        assertEq(pair.balanceOf(charlie), liquidity);
        
        vm.stopPrank();
    }
    
    function test_04_MultipleApprovals() public {
        console.log("\n=== TEST 4: Multiple Approvals ===");
        
        vm.startPrank(alice);
        
        // First approval
        tokenA.approve(address(router), 1000 * 10**18);
        console.log("First approval: 1000 TKA");
        assertEq(tokenA.allowance(alice, address(router)), 1000 * 10**18);
        
        // Second approval (overwrites)
        tokenA.approve(address(router), 5000 * 10**18);
        console.log("Second approval: 5000 TKA");
        assertEq(tokenA.allowance(alice, address(router)), 5000 * 10**18);
        
        // Use some
        tokenB.approve(address(router), 10000 * 10**18);
        factory.createPair(address(tokenA), address(tokenB));
        
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
        
        uint256 remaining = tokenA.allowance(alice, address(router));
        console.log("Remaining allowance:", remaining / 10**18);
        assertEq(remaining, 4000 * 10**18);
        
        vm.stopPrank();
    }
    
    function test_05_PartialLiquidityRemoval() public {
        // Setup
        test_03_ThirdUserAddsLiquidity();
        
        console.log("\n=== TEST 5: Partial Liquidity Removal ===");
        
        vm.startPrank(bob);
        
        uint256 lpBalance = pair.balanceOf(bob);
        uint256 removeAmount = lpBalance / 2;
        
        console.log("Bob's LP balance:", lpBalance / 10**18);
        console.log("Removing 50%:", removeAmount / 10**18);
        
        pair.approve(address(router), removeAmount);
        
        uint256 tokenABefore = tokenA.balanceOf(bob);
        uint256 tokenBBefore = tokenB.balanceOf(bob);
        
        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            removeAmount,
            0,
            0,
            bob,
            block.timestamp + 1 hours
        );
        
        console.log("Received:");
        console.log("  Token A:", amountA / 10**18);
        console.log("  Token B:", amountB / 10**18);
        console.log("Remaining LP:", pair.balanceOf(bob) / 10**18);
        
        assertEq(tokenA.balanceOf(bob) - tokenABefore, amountA);
        assertEq(tokenB.balanceOf(bob) - tokenBBefore, amountB);
        assertEq(pair.balanceOf(bob), lpBalance - removeAmount);
        
        vm.stopPrank();
    }
    
    function test_06_FullLiquidityRemoval() public {
        // Setup
        test_05_PartialLiquidityRemoval();
        
        console.log("\n=== TEST 6: Full Liquidity Removal ===");
        
        vm.startPrank(alice);
        
        uint256 lpBalance = pair.balanceOf(alice);
        console.log("Alice's LP balance:", lpBalance / 10**18);
        console.log("Removing 100%");
        
        pair.approve(address(router), lpBalance);
        
        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            lpBalance,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );
        
        console.log("Received:");
        console.log("  Token A:", amountA / 10**18);
        console.log("  Token B:", amountB / 10**18);
        console.log("Remaining LP:", pair.balanceOf(alice));
        
        assertGt(amountA, 0);
        assertGt(amountB, 0);
        assertEq(pair.balanceOf(alice), 0);
        
        vm.stopPrank();
    }
    
    function test_07_ReAddLiquidityAfterRemoval() public {
        // Setup
        test_06_FullLiquidityRemoval();
        
        console.log("\n=== TEST 7: Re-add Liquidity After Removal ===");
        
        vm.startPrank(alice);
        
        uint256 amountA = 5000 * 10**18;
        uint256 amountB = 10000 * 10**18;
        
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        (uint256 actualA, uint256 actualB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );
        
        console.log("Alice re-added liquidity:");
        console.log("  Token A:", actualA / 10**18);
        console.log("  Token B:", actualB / 10**18);
        console.log("  New LP Tokens:", liquidity / 10**18);
        
        assertGt(liquidity, 0);
        assertEq(pair.balanceOf(alice), liquidity);
        
        vm.stopPrank();
    }
    
    function test_08_MultipleUsersRemoveLiquidity() public {
        // Setup
        test_07_ReAddLiquidityAfterRemoval();
        
        console.log("\n=== TEST 8: Multiple Users Remove Liquidity ===");
        
        // Bob removes remaining liquidity
        vm.startPrank(bob);
        uint256 bobLP = pair.balanceOf(bob);
        if (bobLP > 0) {
            pair.approve(address(router), bobLP);
            (uint256 bobA, uint256 bobB) = router.removeLiquidity(
                address(tokenA),
                address(tokenB),
                bobLP,
                0,
                0,
                bob,
                block.timestamp + 1 hours
            );
            console.log("Bob removed TKA:", bobA / 10**18);
            console.log("Bob removed TKB:", bobB / 10**18);
        }
        vm.stopPrank();
        
        // Charlie removes all
        vm.startPrank(charlie);
        uint256 charlieLP = pair.balanceOf(charlie);
        pair.approve(address(router), charlieLP);
        (uint256 charlieA, uint256 charlieB) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            charlieLP,
            0,
            0,
            charlie,
            block.timestamp + 1 hours
        );
        console.log("Charlie removed TKA:", charlieA / 10**18);
        console.log("Charlie removed TKB:", charlieB / 10**18);
        vm.stopPrank();
        
        // Verify pool still has Alice's liquidity
        (uint112 r0, uint112 r1,) = pair.getReserves();
        console.log("\nRemaining pool reserves:");
        console.log("  Token A:", uint256(r0) / 10**18);
        console.log("  Token B:", uint256(r1) / 10**18);
        
        assertGt(uint256(r0), 0, "Pool should still have reserves");
        assertGt(uint256(r1), 0, "Pool should still have reserves");
    }
    
    function test_09_FinalStateVerification() public {
        // Setup
        test_08_MultipleUsersRemoveLiquidity();
        
        console.log("\n=== TEST 9: Final State Verification ===");
        
        // Check LP balances
        uint256 aliceLP = pair.balanceOf(alice);
        uint256 bobLP = pair.balanceOf(bob);
        uint256 charlieLP = pair.balanceOf(charlie);
        
        console.log("Final LP balances:");
        console.log("  Alice:", aliceLP / 10**18);
        console.log("  Bob:", bobLP / 10**18);
        console.log("  Charlie:", charlieLP / 10**18);
        
        // Check reserves
        (uint112 r0, uint112 r1,) = pair.getReserves();
        console.log("\nFinal pool reserves:");
        console.log("  Token A:", uint256(r0) / 10**18);
        console.log("  Token B:", uint256(r1) / 10**18);
        
        // Check total supply
        uint256 totalSupply = pair.totalSupply();
        console.log("Total LP supply:", totalSupply / 10**18);
        
        // Verify invariants
        assertGt(aliceLP, 0, "Alice should have LP tokens");
        assertEq(bobLP, 0, "Bob should have no LP tokens");
        assertEq(charlieLP, 0, "Charlie should have no LP tokens");
        assertEq(aliceLP + bobLP + charlieLP + 1000, totalSupply, "LP supply should match (minus minimum liquidity)");
    }
}