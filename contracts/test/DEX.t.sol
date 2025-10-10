// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/DEXPair.sol";
import "../src/MockERC20.sol";

contract DEXTest is Test {
    DEXFactory factory;
    DEXRouter router;
    MockERC20 tokenA;
    MockERC20 tokenB;
    
    address user1 = address(0x1);
    address user2 = address(0x2);
    
    function setUp() public {
        factory = new DEXFactory();
        router = new DEXRouter(address(factory));
        
        tokenA = new MockERC20("Token A", "TKA", 1000000 * 10**18);
        tokenB = new MockERC20("Token B", "TKB", 1000000 * 10**18);
        
        tokenA.transfer(user1, 100000 * 10**18);
        tokenB.transfer(user1, 100000 * 10**18);
        tokenA.transfer(user2, 100000 * 10**18);
        tokenB.transfer(user2, 100000 * 10**18);
    }
    
    function testCreatePair() public {
        address pair = factory.createPair(address(tokenA), address(tokenB));
        assertEq(factory.getPair(address(tokenA), address(tokenB)), pair);
        assertEq(factory.allPairsLength(), 1);
    }
    
    function testAddLiquidity() public {
        vm.startPrank(user1);
        
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        (uint256 actualAmountA, uint256 actualAmountB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            user1,
            block.timestamp + 1 hours
        );
        
        assertGt(liquidity, 0);
        assertEq(actualAmountA, amountA);
        assertEq(actualAmountB, amountB);
        
        vm.stopPrank();
    }
    
    function testSwap() public {
        vm.startPrank(user1);
        
        uint256 amountA = 10000 * 10**18;
        uint256 amountB = 20000 * 10**18;
        
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            user1,
            block.timestamp + 1 hours
        );
        
        vm.stopPrank();
        
        vm.startPrank(user2);
        
        uint256 swapAmount = 100 * 10**18;
        tokenA.approve(address(router), swapAmount);
        
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        
        uint256 balanceBefore = tokenB.balanceOf(user2);
        
        router.swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            user2,
            block.timestamp + 1 hours
        );
        
        uint256 balanceAfter = tokenB.balanceOf(user2);
        assertGt(balanceAfter, balanceBefore);
        
        vm.stopPrank();
    }
    
    function testRemoveLiquidity() public {
        vm.startPrank(user1);
        
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);
        
        (,, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            user1,
            block.timestamp + 1 hours
        );
        
        address pair = factory.getPair(address(tokenA), address(tokenB));
        IERC20(pair).approve(address(router), liquidity);
        
        router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liquidity,
            0,
            0,
            user1,
            block.timestamp + 1 hours
        );
        
        vm.stopPrank();
    }
}