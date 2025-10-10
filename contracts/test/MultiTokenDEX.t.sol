// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";
import "../src/DEXPair.sol";
import "../src/MockERC20.sol";

/**
 * @title MultiTokenDEXTest
 * @notice Comprehensive test suite for multi-token DEX deployment
 * @dev Tests all deployed tokens, pairs, and trading functionality
 */
contract MultiTokenDEXTest is Test {
    DEXFactory factory;
    DEXRouter router;

    // Tokens
    MockERC20 usdc;
    MockERC20 usdt;
    MockERC20 dai;
    MockERC20 weth;
    MockERC20 wbtc;
    MockERC20 link;
    MockERC20 uni;

    // Test accounts
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");

    uint256 constant INITIAL_BALANCE = 1000000 * 10**18;

    function setUp() public {
        // Deploy core contracts
        factory = new DEXFactory();
        router = new DEXRouter(address(factory));

        // Deploy tokens
        usdc = new MockERC20("USD Coin", "USDC", INITIAL_BALANCE);
        usdt = new MockERC20("Tether USD", "USDT", INITIAL_BALANCE);
        dai = new MockERC20("Dai Stablecoin", "DAI", INITIAL_BALANCE);
        weth = new MockERC20("Wrapped Ether", "WETH", INITIAL_BALANCE);
        wbtc = new MockERC20("Wrapped Bitcoin", "WBTC", INITIAL_BALANCE);
        link = new MockERC20("Chainlink", "LINK", INITIAL_BALANCE);
        uni = new MockERC20("Uniswap", "UNI", INITIAL_BALANCE);

        // Distribute tokens to test accounts
        _distributeTokens(alice);
        _distributeTokens(bob);
        _distributeTokens(charlie);

        console.log("=== Setup Complete ===");
        console.log("Factory:", address(factory));
        console.log("Router:", address(router));
        console.log("Tokens deployed and distributed");
    }

    function _distributeTokens(address user) internal {
        uint256 amount = 50000 * 10**18;
        usdc.transfer(user, amount);
        usdt.transfer(user, amount);
        dai.transfer(user, amount);
        weth.transfer(user, amount);
        wbtc.transfer(user, amount);
        link.transfer(user, amount);
        uni.transfer(user, amount);
    }

    // ============================================
    // Test 1: Token Deployment Verification
    // ============================================

    function test_01_TokenDeployment() public {
        console.log("\n=== TEST 1: Token Deployment ===");

        assertEq(usdc.symbol(), "USDC");
        assertEq(usdt.symbol(), "USDT");
        assertEq(dai.symbol(), "DAI");
        assertEq(weth.symbol(), "WETH");
        assertEq(wbtc.symbol(), "WBTC");
        assertEq(link.symbol(), "LINK");
        assertEq(uni.symbol(), "UNI");

        console.log("All tokens deployed with correct symbols");

        // Verify decimals
        assertEq(usdc.decimals(), 18);
        assertEq(usdt.decimals(), 18);

        console.log("Token decimals verified: 18");
    }

    function test_02_TokenDistribution() public {
        console.log("\n=== TEST 2: Token Distribution ===");

        uint256 expectedBalance = 50000 * 10**18;

        assertEq(usdc.balanceOf(alice), expectedBalance);
        assertEq(usdt.balanceOf(bob), expectedBalance);
        assertEq(dai.balanceOf(charlie), expectedBalance);

        console.log("Token distribution verified");
        console.log("Each user has:", expectedBalance / 10**18, "of each token");
    }

    // ============================================
    // Test 3: Stablecoin Pairs (USDC/USDT/DAI)
    // ============================================

    function test_03_StablecoinPair_USDC_USDT() public {
        console.log("\n=== TEST 3: USDC/USDT Pair ===");

        vm.startPrank(alice);

        uint256 amountA = 10000 * 10**18;
        uint256 amountB = 10000 * 10**18;

        usdc.approve(address(router), amountA);
        usdt.approve(address(router), amountB);

        (uint256 actualA, uint256 actualB, uint256 liquidity) = router.addLiquidity(
            address(usdc),
            address(usdt),
            amountA,
            amountB,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Liquidity added:");
        console.log("  USDC:", actualA / 10**18);
        console.log("  USDT:", actualB / 10**18);
        console.log("  LP Tokens:", liquidity / 10**18);

        assertEq(actualA, amountA);
        assertEq(actualB, amountB);
        assertGt(liquidity, 0);

        address pairAddress = factory.getPair(address(usdc), address(usdt));
        assertNotEq(pairAddress, address(0), "Pair should be created");

        console.log("Pair created at:", pairAddress);

        vm.stopPrank();
    }

    function test_04_StablecoinPair_USDC_DAI() public {
        console.log("\n=== TEST 4: USDC/DAI Pair ===");

        vm.startPrank(alice);

        uint256 amountA = 10000 * 10**18;
        uint256 amountB = 10000 * 10**18;

        usdc.approve(address(router), amountA);
        dai.approve(address(router), amountB);

        (uint256 actualA, uint256 actualB, uint256 liquidity) = router.addLiquidity(
            address(usdc),
            address(dai),
            amountA,
            amountB,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Liquidity added:");
        console.log("  USDC:", actualA / 10**18);
        console.log("  DAI:", actualB / 10**18);
        console.log("  LP Tokens:", liquidity / 10**18);

        assertEq(actualA, amountA);
        assertEq(actualB, amountB);

        vm.stopPrank();
    }

    // ============================================
    // Test 5: WETH Pairs
    // ============================================

    function test_05_WETH_USDC_Pair() public {
        console.log("\n=== TEST 5: WETH/USDC Pair ===");

        vm.startPrank(alice);

        uint256 amountWETH = 10 * 10**18;
        uint256 amountUSDC = 30000 * 10**18;

        weth.approve(address(router), amountWETH);
        usdc.approve(address(router), amountUSDC);

        (uint256 actualWETH, uint256 actualUSDC, uint256 liquidity) = router.addLiquidity(
            address(weth),
            address(usdc),
            amountWETH,
            amountUSDC,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Liquidity added:");
        console.log("  WETH:", actualWETH / 10**18);
        console.log("  USDC:", actualUSDC / 10**18);
        console.log("  LP Tokens:", liquidity / 10**18);

        // Verify rate
        uint256 price = (actualUSDC * 10**18) / actualWETH;
        console.log("WETH price:", price / 10**18, "USDC");
        assertEq(price / 10**18, 3000, "WETH price should be 3000 USDC");

        vm.stopPrank();
    }

    function test_06_WETH_Multiple_Pairs() public {
        console.log("\n=== TEST 6: Multiple WETH Pairs ===");

        vm.startPrank(alice);

        // WETH/USDT
        weth.approve(address(router), 10 * 10**18);
        usdt.approve(address(router), 30000 * 10**18);
        router.addLiquidity(
            address(weth),
            address(usdt),
            10 * 10**18,
            30000 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );

        // WETH/DAI
        weth.approve(address(router), 10 * 10**18);
        dai.approve(address(router), 30000 * 10**18);
        router.addLiquidity(
            address(weth),
            address(dai),
            10 * 10**18,
            30000 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );

        console.log("Created WETH/USDT and WETH/DAI pairs");

        // Verify all pairs exist
        assertNotEq(factory.getPair(address(weth), address(usdt)), address(0));
        assertNotEq(factory.getPair(address(weth), address(dai)), address(0));

        vm.stopPrank();
    }

    // ============================================
    // Test 7: WBTC Pairs
    // ============================================

    function test_07_WBTC_USDC_Pair() public {
        console.log("\n=== TEST 7: WBTC/USDC Pair ===");

        vm.startPrank(alice);

        uint256 amountWBTC = 0.5 * 10**18;
        uint256 amountUSDC = 30000 * 10**18;

        wbtc.approve(address(router), amountWBTC);
        usdc.approve(address(router), amountUSDC);

        (uint256 actualWBTC, uint256 actualUSDC, uint256 liquidity) = router.addLiquidity(
            address(wbtc),
            address(usdc),
            amountWBTC,
            amountUSDC,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Liquidity added:");
        console.log("  WBTC:", actualWBTC / 10**18);
        console.log("  USDC:", actualUSDC / 10**18);

        uint256 price = (actualUSDC * 10**18) / actualWBTC;
        console.log("WBTC price:", price / 10**18, "USDC");

        vm.stopPrank();
    }

    function test_08_WBTC_WETH_Pair() public {
        console.log("\n=== TEST 8: WBTC/WETH Pair ===");

        vm.startPrank(alice);

        uint256 amountWBTC = 1 * 10**18;
        uint256 amountWETH = 20 * 10**18;

        wbtc.approve(address(router), amountWBTC);
        weth.approve(address(router), amountWETH);

        (uint256 actualWBTC, uint256 actualWETH, uint256 liquidity) = router.addLiquidity(
            address(wbtc),
            address(weth),
            amountWBTC,
            amountWETH,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Liquidity added:");
        console.log("  WBTC:", actualWBTC / 10**18);
        console.log("  WETH:", actualWETH / 10**18);

        uint256 ratio = (actualWETH * 100) / actualWBTC;
        console.log("WBTC/WETH ratio: 1:", ratio / 100);

        vm.stopPrank();
    }

    // ============================================
    // Test 9: Governance Token Pairs
    // ============================================

    function test_09_LINK_USDC_Pair() public {
        console.log("\n=== TEST 9: LINK/USDC Pair ===");

        vm.startPrank(alice);

        uint256 amountLINK = 1000 * 10**18;
        uint256 amountUSDC = 15000 * 10**18;

        link.approve(address(router), amountLINK);
        usdc.approve(address(router), amountUSDC);

        (uint256 actualLINK, uint256 actualUSDC, uint256 liquidity) = router.addLiquidity(
            address(link),
            address(usdc),
            amountLINK,
            amountUSDC,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Liquidity added:");
        console.log("  LINK:", actualLINK / 10**18);
        console.log("  USDC:", actualUSDC / 10**18);

        uint256 price = (actualUSDC * 10**18) / actualLINK;
        console.log("LINK price:", price / 10**18, "USDC");

        vm.stopPrank();
    }

    function test_10_UNI_USDC_Pair() public {
        console.log("\n=== TEST 10: UNI/USDC Pair ===");

        vm.startPrank(alice);

        uint256 amountUNI = 1000 * 10**18;
        uint256 amountUSDC = 10000 * 10**18;

        uni.approve(address(router), amountUNI);
        usdc.approve(address(router), amountUSDC);

        (uint256 actualUNI, uint256 actualUSDC, uint256 liquidity) = router.addLiquidity(
            address(uni),
            address(usdc),
            amountUNI,
            amountUSDC,
            0,
            0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Liquidity added:");
        console.log("  UNI:", actualUNI / 10**18);
        console.log("  USDC:", actualUSDC / 10**18);

        vm.stopPrank();
    }

    // ============================================
    // Test 11: Swap Functionality
    // ============================================

    function test_11_SwapUSDC_for_USDT() public {
        console.log("\n=== TEST 11: Swap USDC for USDT ===");

        // Alice creates pool
        vm.startPrank(alice);
        usdc.approve(address(router), 10000 * 10**18);
        usdt.approve(address(router), 10000 * 10**18);
        router.addLiquidity(
            address(usdc),
            address(usdt),
            10000 * 10**18,
            10000 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );
        vm.stopPrank();

        // Bob swaps
        vm.startPrank(bob);
        uint256 swapAmount = 1000 * 10**18;
        uint256 usdtBefore = usdt.balanceOf(bob);

        usdc.approve(address(router), swapAmount);

        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(usdt);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            bob,
            block.timestamp + 1 hours
        );

        uint256 usdtReceived = usdt.balanceOf(bob) - usdtBefore;

        console.log("Swapped:", swapAmount / 10**18, "USDC");
        console.log("Received:", usdtReceived / 10**18, "USDT");
        console.log("Rate:", (usdtReceived * 100) / swapAmount, "%");

        assertGt(usdtReceived, 0, "Should receive USDT");
        assertEq(amounts[1], usdtReceived);

        vm.stopPrank();
    }

    function test_12_SwapWETH_for_USDC() public {
        console.log("\n=== TEST 12: Swap WETH for USDC ===");

        // Create pool
        vm.startPrank(alice);
        weth.approve(address(router), 10 * 10**18);
        usdc.approve(address(router), 30000 * 10**18);
        router.addLiquidity(
            address(weth),
            address(usdc),
            10 * 10**18,
            30000 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );
        vm.stopPrank();

        // Bob swaps
        vm.startPrank(bob);
        uint256 swapAmount = 1 * 10**18;

        weth.approve(address(router), swapAmount);

        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(usdc);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            bob,
            block.timestamp + 1 hours
        );

        console.log("Swapped:", swapAmount / 10**18, "WETH");
        console.log("Received:", amounts[1] / 10**18, "USDC");

        vm.stopPrank();
    }

    // ============================================
    // Test 13: Multi-hop Swaps
    // ============================================

    function test_13_MultiHopSwap_USDC_WETH_LINK() public {
        console.log("\n=== TEST 13: Multi-hop Swap: USDC -> WETH -> LINK ===");

        vm.startPrank(alice);

        // Create USDC/WETH pool
        usdc.approve(address(router), 30000 * 10**18);
        weth.approve(address(router), 10 * 10**18);
        router.addLiquidity(
            address(usdc), address(weth),
            30000 * 10**18, 10 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );

        // Create WETH/LINK pool
        weth.approve(address(router), 10 * 10**18);
        link.approve(address(router), 5000 * 10**18);
        router.addLiquidity(
            address(weth), address(link),
            10 * 10**18, 5000 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );

        vm.stopPrank();

        // Bob performs multi-hop swap
        vm.startPrank(bob);

        uint256 swapAmount = 3000 * 10**18;
        usdc.approve(address(router), swapAmount);

        address[] memory path = new address[](3);
        path[0] = address(usdc);
        path[1] = address(weth);
        path[2] = address(link);

        uint256 linkBefore = link.balanceOf(bob);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            bob,
            block.timestamp + 1 hours
        );

        uint256 linkReceived = link.balanceOf(bob) - linkBefore;

        console.log("Swapped:", swapAmount / 10**18, "USDC");
        console.log("Through:", amounts[1] / 10**18, "WETH");
        console.log("Received:", linkReceived / 10**18, "LINK");

        assertGt(linkReceived, 0);

        vm.stopPrank();
    }

    // ============================================
    // Test 14: Liquidity Removal
    // ============================================

    function test_14_RemoveLiquidity() public {
        console.log("\n=== TEST 14: Remove Liquidity ===");

        vm.startPrank(alice);

        // Add liquidity
        usdc.approve(address(router), 10000 * 10**18);
        usdt.approve(address(router), 10000 * 10**18);

        (,, uint256 liquidity) = router.addLiquidity(
            address(usdc),
            address(usdt),
            10000 * 10**18,
            10000 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );

        console.log("LP tokens received:", liquidity / 10**18);

        // Remove half
        address pair = factory.getPair(address(usdc), address(usdt));
        DEXPair(pair).approve(address(router), liquidity / 2);

        uint256 usdcBefore = usdc.balanceOf(alice);
        uint256 usdtBefore = usdt.balanceOf(alice);

        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(usdc),
            address(usdt),
            liquidity / 2,
            0, 0,
            alice,
            block.timestamp + 1 hours
        );

        console.log("Removed liquidity:");
        console.log("  USDC:", amountA / 10**18);
        console.log("  USDT:", amountB / 10**18);

        assertEq(usdc.balanceOf(alice) - usdcBefore, amountA);
        assertEq(usdt.balanceOf(alice) - usdtBefore, amountB);

        vm.stopPrank();
    }

    // ============================================
    // Test 15: Factory Verification
    // ============================================

    function test_15_FactoryPairCount() public {
        console.log("\n=== TEST 15: Factory Verification ===");

        // Create a test pair first
        vm.startPrank(alice);
        usdc.approve(address(router), 1000 * 10**18);
        usdt.approve(address(router), 1000 * 10**18);
        router.addLiquidity(
            address(usdc), address(usdt),
            1000 * 10**18, 1000 * 10**18,
            0, 0, alice, block.timestamp + 1 hours
        );
        vm.stopPrank();

        // Now check total pairs
        uint256 totalPairs = factory.allPairsLength();
        console.log("Total pairs created:", totalPairs);

        assertGt(totalPairs, 0, "Should have at least one pair");
    }

    function test_16_AllPairsExist() public {
        console.log("\n=== TEST 16: Verify All Expected Pairs ===");

        // Create pairs with fresh deployer account (not alice who might be low on tokens)
        // Use smaller amounts to avoid running out
        uint256 smallUSDC = 1000 * 10**18;
        uint256 smallToken = 1000 * 10**18;
        uint256 smallWETH = 1 * 10**18;
        uint256 smallWBTC = 0.1 * 10**18;

        _createPairIfNotExists(address(usdc), address(usdt), smallUSDC, smallToken);
        _createPairIfNotExists(address(usdc), address(dai), smallUSDC, smallToken);
        _createPairIfNotExists(address(weth), address(usdc), smallWETH, 3000 * 10**18);
        _createPairIfNotExists(address(wbtc), address(usdc), smallWBTC, 6000 * 10**18);
        _createPairIfNotExists(address(link), address(usdc), smallToken, 1500 * 10**18);
        _createPairIfNotExists(address(uni), address(usdc), smallToken, smallUSDC);

        // Verify all pairs
        assertNotEq(factory.getPair(address(usdc), address(usdt)), address(0), "USDC/USDT");
        assertNotEq(factory.getPair(address(usdc), address(dai)), address(0), "USDC/DAI");
        assertNotEq(factory.getPair(address(weth), address(usdc)), address(0), "WETH/USDC");
        assertNotEq(factory.getPair(address(wbtc), address(usdc)), address(0), "WBTC/USDC");
        assertNotEq(factory.getPair(address(link), address(usdc)), address(0), "LINK/USDC");
        assertNotEq(factory.getPair(address(uni), address(usdc)), address(0), "UNI/USDC");

        console.log("All expected pairs exist!");
        console.log("Total pairs:", factory.allPairsLength());
    }

    function _createPairIfNotExists(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) internal {
        if (factory.getPair(tokenA, tokenB) != address(0)) return;

        MockERC20(tokenA).approve(address(router), amountA);
        MockERC20(tokenB).approve(address(router), amountB);

        router.addLiquidity(
            tokenA, tokenB,
            amountA, amountB,
            0, 0,
            msg.sender,
            block.timestamp + 1 hours
        );
    }
}
