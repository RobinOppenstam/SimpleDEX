// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TokenFaucet.sol";
import "../src/MockERC20.sol";

contract TokenFaucetTest is Test {
    TokenFaucet public faucet;
    MockERC20 public usdc;
    MockERC20 public weth;
    MockERC20 public wbtc;
    MockERC20 public link;

    address public owner;
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    // Token limits matching requirements
    uint256 constant STABLECOIN_LIMIT = 2000 * 10**18;
    uint256 constant WETH_LIMIT = 0.5 * 10**18;
    uint256 constant WBTC_LIMIT = 0.1 * 10**18;
    uint256 constant LINK_LIMIT = 200 * 10**18;

    // Events
    event TokenDripped(address indexed user, address indexed token, uint256 amount);
    event TokenLimitUpdated(address indexed token, uint256 newLimit);
    event TokenAdded(address indexed token, uint256 limit);
    event TokenRemoved(address indexed token);
    event TokensWithdrawn(address indexed token, uint256 amount, address indexed to);

    function setUp() public {
        owner = address(this);

        // Set block timestamp to a reasonable value (avoids edge cases with timestamp 0/1)
        // Use Unix timestamp for January 1, 2024
        vm.warp(1704067200);

        // Deploy faucet
        faucet = new TokenFaucet();

        // Deploy tokens
        usdc = new MockERC20("Mock USDC", "mUSDC", 1000000 * 10**18);
        weth = new MockERC20("Mock WETH", "mWETH", 100000 * 10**18);
        wbtc = new MockERC20("Mock WBTC", "mWBTC", 10000 * 10**18);
        link = new MockERC20("Mock LINK", "mLINK", 100000 * 10**18);

        // Add tokens to faucet
        faucet.addToken(address(usdc), STABLECOIN_LIMIT);
        faucet.addToken(address(weth), WETH_LIMIT);
        faucet.addToken(address(wbtc), WBTC_LIMIT);
        faucet.addToken(address(link), LINK_LIMIT);

        // Fund faucet
        usdc.transfer(address(faucet), 100000 * 10**18);
        weth.transfer(address(faucet), 100 * 10**18);
        wbtc.transfer(address(faucet), 10 * 10**18);
        link.transfer(address(faucet), 10000 * 10**18);
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR & OWNERSHIP TESTS
    //////////////////////////////////////////////////////////////*/

    function testConstructorSetsOwner() public view {
        assertEq(faucet.owner(), owner);
    }

    function testCooldownPeriod() public view {
        assertEq(faucet.COOLDOWN_PERIOD(), 24 hours);
    }

    /*//////////////////////////////////////////////////////////////
                        ADD TOKEN TESTS
    //////////////////////////////////////////////////////////////*/

    function testAddToken() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 10000 * 10**18);

        vm.expectEmit(true, false, false, true);
        emit TokenAdded(address(newToken), 1000 * 10**18);

        faucet.addToken(address(newToken), 1000 * 10**18);

        assertTrue(faucet.isTokenSupported(address(newToken)));
        assertEq(faucet.tokenLimits(address(newToken)), 1000 * 10**18);
    }

    function testAddTokenWithZeroAddress() public {
        vm.expectRevert(TokenFaucet.InvalidTokenAddress.selector);
        faucet.addToken(address(0), 1000 * 10**18);
    }

    function testAddTokenWithZeroLimit() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 10000 * 10**18);

        vm.expectRevert(TokenFaucet.InvalidLimit.selector);
        faucet.addToken(address(newToken), 0);
    }

    function testAddTokenAlreadySupported() public {
        vm.expectRevert(TokenFaucet.TokenAlreadySupported.selector);
        faucet.addToken(address(usdc), 1000 * 10**18);
    }

    function testAddTokenByNonOwner() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 10000 * 10**18);

        vm.prank(user1);
        vm.expectRevert();
        faucet.addToken(address(newToken), 1000 * 10**18);
    }

    /*//////////////////////////////////////////////////////////////
                        REMOVE TOKEN TESTS
    //////////////////////////////////////////////////////////////*/

    function testRemoveToken() public {
        vm.expectEmit(true, false, false, false);
        emit TokenRemoved(address(usdc));

        faucet.removeToken(address(usdc));

        assertFalse(faucet.isTokenSupported(address(usdc)));
        assertEq(faucet.tokenLimits(address(usdc)), 0);
    }

    function testRemoveTokenNotSupported() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 10000 * 10**18);

        vm.expectRevert(abi.encodeWithSelector(TokenFaucet.TokenNotSupported.selector, address(newToken)));
        faucet.removeToken(address(newToken));
    }

    function testRemoveTokenByNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        faucet.removeToken(address(usdc));
    }

    /*//////////////////////////////////////////////////////////////
                        UPDATE LIMIT TESTS
    //////////////////////////////////////////////////////////////*/

    function testUpdateTokenLimit() public {
        uint256 newLimit = 5000 * 10**18;

        vm.expectEmit(true, false, false, true);
        emit TokenLimitUpdated(address(usdc), newLimit);

        faucet.updateTokenLimit(address(usdc), newLimit);

        assertEq(faucet.tokenLimits(address(usdc)), newLimit);
    }

    function testUpdateTokenLimitWithZero() public {
        vm.expectRevert(TokenFaucet.InvalidLimit.selector);
        faucet.updateTokenLimit(address(usdc), 0);
    }

    function testUpdateTokenLimitForUnsupportedToken() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 10000 * 10**18);

        vm.expectRevert(abi.encodeWithSelector(TokenFaucet.TokenNotSupported.selector, address(newToken)));
        faucet.updateTokenLimit(address(newToken), 1000 * 10**18);
    }

    function testUpdateTokenLimitsByNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        faucet.updateTokenLimit(address(usdc), 1000 * 10**18);
    }

    function testUpdateTokenLimitsBatch() public {
        address[] memory tokens = new address[](2);
        uint256[] memory limits = new uint256[](2);

        tokens[0] = address(usdc);
        tokens[1] = address(weth);
        limits[0] = 3000 * 10**18;
        limits[1] = 1 * 10**18;

        faucet.updateTokenLimits(tokens, limits);

        assertEq(faucet.tokenLimits(address(usdc)), 3000 * 10**18);
        assertEq(faucet.tokenLimits(address(weth)), 1 * 10**18);
    }

    function testUpdateTokenLimitsBatchMismatchedArrays() public {
        address[] memory tokens = new address[](2);
        uint256[] memory limits = new uint256[](3);

        tokens[0] = address(usdc);
        tokens[1] = address(weth);
        limits[0] = 3000 * 10**18;
        limits[1] = 1 * 10**18;
        limits[2] = 500 * 10**18;

        vm.expectRevert("Array length mismatch");
        faucet.updateTokenLimits(tokens, limits);
    }

    /*//////////////////////////////////////////////////////////////
                        DRIP TESTS
    //////////////////////////////////////////////////////////////*/

    function testDripFirstTime() public {
        uint256 balanceBefore = usdc.balanceOf(user1);

        vm.expectEmit(true, true, false, true);
        emit TokenDripped(user1, address(usdc), STABLECOIN_LIMIT);

        vm.prank(user1);
        faucet.drip(address(usdc));

        uint256 balanceAfter = usdc.balanceOf(user1);
        assertEq(balanceAfter - balanceBefore, STABLECOIN_LIMIT);
    }

    function testDripMultipleTokens() public {
        vm.startPrank(user1);

        faucet.drip(address(usdc));
        faucet.drip(address(weth));
        faucet.drip(address(wbtc));
        faucet.drip(address(link));

        vm.stopPrank();

        assertEq(usdc.balanceOf(user1), STABLECOIN_LIMIT);
        assertEq(weth.balanceOf(user1), WETH_LIMIT);
        assertEq(wbtc.balanceOf(user1), WBTC_LIMIT);
        assertEq(link.balanceOf(user1), LINK_LIMIT);
    }

    function testDripBeforeCooldownExpires() public {
        vm.startPrank(user1);

        faucet.drip(address(usdc));

        // Try to drip again immediately
        vm.expectRevert();
        faucet.drip(address(usdc));

        vm.stopPrank();
    }

    function testDripAfterCooldownExpires() public {
        vm.startPrank(user1);

        // First drip
        faucet.drip(address(usdc));
        uint256 balanceAfterFirst = usdc.balanceOf(user1);

        // Fast forward 24 hours
        vm.warp(block.timestamp + 24 hours);

        // Second drip should succeed
        faucet.drip(address(usdc));
        uint256 balanceAfterSecond = usdc.balanceOf(user1);

        vm.stopPrank();

        assertEq(balanceAfterFirst, STABLECOIN_LIMIT);
        assertEq(balanceAfterSecond, STABLECOIN_LIMIT * 2);
    }

    function testDripUnsupportedToken() public {
        MockERC20 unsupportedToken = new MockERC20("Unsupported", "UNS", 10000 * 10**18);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(TokenFaucet.TokenNotSupported.selector, address(unsupportedToken)));
        faucet.drip(address(unsupportedToken));
    }

    function testDripInsufficientFaucetBalance() public {
        // Drain faucet
        faucet.withdrawTokens(address(usdc), usdc.balanceOf(address(faucet)), owner);

        vm.prank(user1);
        vm.expectRevert();
        faucet.drip(address(usdc));
    }

    function testDripUpdatesLastDripTime() public {
        uint256 timestampBefore = block.timestamp;

        vm.prank(user1);
        faucet.drip(address(usdc));

        assertEq(faucet.lastDripTime(user1, address(usdc)), timestampBefore);
    }

    /*//////////////////////////////////////////////////////////////
                        DRIP MULTIPLE TESTS
    //////////////////////////////////////////////////////////////*/

    function testDripMultipleFunction() public {
        address[] memory tokens = new address[](3);
        tokens[0] = address(usdc);
        tokens[1] = address(weth);
        tokens[2] = address(link);

        vm.prank(user1);
        faucet.dripMultiple(tokens);

        assertEq(usdc.balanceOf(user1), STABLECOIN_LIMIT);
        assertEq(weth.balanceOf(user1), WETH_LIMIT);
        assertEq(link.balanceOf(user1), LINK_LIMIT);
    }

    function testDripMultipleCooldownEnforced() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(usdc);
        tokens[1] = address(weth);

        vm.startPrank(user1);

        // First drip
        faucet.dripMultiple(tokens);

        // Try again immediately - should revert
        vm.expectRevert();
        faucet.dripMultiple(tokens);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetTimeUntilNextDripNeverDripped() public view {
        uint256 timeRemaining = faucet.getTimeUntilNextDrip(user1, address(usdc));
        assertEq(timeRemaining, 0);
    }

    function testGetTimeUntilNextDripAfterDrip() public {
        uint256 dripTime = block.timestamp;

        vm.prank(user1);
        faucet.drip(address(usdc));

        uint256 timeRemaining = faucet.getTimeUntilNextDrip(user1, address(usdc));
        // Time remaining should be close to 24 hours (might be slightly less due to block advancement)
        assertApproxEqAbs(timeRemaining, 24 hours, 1 hours);

        // Fast forward 12 hours from drip time
        vm.warp(dripTime + 12 hours);
        timeRemaining = faucet.getTimeUntilNextDrip(user1, address(usdc));
        assertApproxEqAbs(timeRemaining, 12 hours, 1 hours);

        // Fast forward to exactly 24 hours from drip time
        vm.warp(dripTime + 24 hours);
        timeRemaining = faucet.getTimeUntilNextDrip(user1, address(usdc));
        assertEq(timeRemaining, 0);
    }

    function testCanUserDripNeverDripped() public view {
        assertTrue(faucet.canUserDrip(user1, address(usdc)));
    }

    function testCanUserDripAfterDrip() public {
        vm.prank(user1);
        faucet.drip(address(usdc));

        assertFalse(faucet.canUserDrip(user1, address(usdc)));

        // Fast forward 24 hours
        vm.warp(block.timestamp + 24 hours);

        assertTrue(faucet.canUserDrip(user1, address(usdc)));
    }

    function testCanUserDripUnsupportedToken() public {
        MockERC20 unsupportedToken = new MockERC20("Unsupported", "UNS", 10000 * 10**18);
        assertFalse(faucet.canUserDrip(user1, address(unsupportedToken)));
    }

    function testGetSupportedTokens() public view {
        address[] memory tokens = faucet.getSupportedTokens();
        assertEq(tokens.length, 4);
        assertEq(tokens[0], address(usdc));
        assertEq(tokens[1], address(weth));
        assertEq(tokens[2], address(wbtc));
        assertEq(tokens[3], address(link));
    }

    function testGetFaucetBalance() public view {
        uint256 balance = faucet.getFaucetBalance(address(usdc));
        assertEq(balance, 100000 * 10**18);
    }

    function testGetUserDripInfoNeverDripped() public view {
        (uint256 lastDrip, bool canDrip, uint256 timeRemaining, uint256 dripAmount) =
            faucet.getUserDripInfo(user1, address(usdc));

        assertEq(lastDrip, 0);
        assertTrue(canDrip);
        assertEq(timeRemaining, 0);
        assertEq(dripAmount, STABLECOIN_LIMIT);
    }

    function testGetUserDripInfoAfterDrip() public {
        uint256 dripTimestamp = block.timestamp;

        vm.prank(user1);
        faucet.drip(address(usdc));

        (uint256 lastDrip, bool canDrip, uint256 timeRemaining, uint256 dripAmount) =
            faucet.getUserDripInfo(user1, address(usdc));

        assertEq(lastDrip, dripTimestamp);
        assertFalse(canDrip);
        assertEq(timeRemaining, 24 hours);
        assertEq(dripAmount, STABLECOIN_LIMIT);
    }

    /*//////////////////////////////////////////////////////////////
                        WITHDRAW TESTS
    //////////////////////////////////////////////////////////////*/

    function testWithdrawTokens() public {
        uint256 withdrawAmount = 1000 * 10**18;
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);

        vm.expectEmit(true, false, false, true);
        emit TokensWithdrawn(address(usdc), withdrawAmount, owner);

        faucet.withdrawTokens(address(usdc), withdrawAmount, owner);

        uint256 ownerBalanceAfter = usdc.balanceOf(owner);
        assertEq(ownerBalanceAfter - ownerBalanceBefore, withdrawAmount);
    }

    function testWithdrawTokensToZeroAddress() public {
        vm.expectRevert("Invalid recipient");
        faucet.withdrawTokens(address(usdc), 1000 * 10**18, address(0));
    }

    function testWithdrawTokensByNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        faucet.withdrawTokens(address(usdc), 1000 * 10**18, user1);
    }

    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testMultipleUsersDrip() public {
        // User1 drips
        vm.prank(user1);
        faucet.drip(address(usdc));

        // User2 drips (should succeed even though user1 is on cooldown)
        vm.prank(user2);
        faucet.drip(address(usdc));

        assertEq(usdc.balanceOf(user1), STABLECOIN_LIMIT);
        assertEq(usdc.balanceOf(user2), STABLECOIN_LIMIT);
    }

    function testFullWorkflow() public {
        // 1. User drips all tokens
        vm.startPrank(user1);
        address[] memory tokens = new address[](4);
        tokens[0] = address(usdc);
        tokens[1] = address(weth);
        tokens[2] = address(wbtc);
        tokens[3] = address(link);

        faucet.dripMultiple(tokens);
        vm.stopPrank();

        // 2. Verify balances
        assertEq(usdc.balanceOf(user1), STABLECOIN_LIMIT);
        assertEq(weth.balanceOf(user1), WETH_LIMIT);
        assertEq(wbtc.balanceOf(user1), WBTC_LIMIT);
        assertEq(link.balanceOf(user1), LINK_LIMIT);

        // 3. Cannot drip again immediately
        vm.prank(user1);
        vm.expectRevert();
        faucet.drip(address(usdc));

        // 4. Fast forward 24 hours
        vm.warp(block.timestamp + 24 hours);

        // 5. Can drip again
        vm.prank(user1);
        faucet.drip(address(usdc));

        assertEq(usdc.balanceOf(user1), STABLECOIN_LIMIT * 2);
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function testDripAtExactCooldownBoundary() public {
        vm.startPrank(user1);

        faucet.drip(address(usdc));

        // Fast forward to 1 second before cooldown expires
        vm.warp(block.timestamp + 24 hours - 1);
        vm.expectRevert();
        faucet.drip(address(usdc));

        // Fast forward 1 more second (exactly 24 hours)
        vm.warp(block.timestamp + 1);
        faucet.drip(address(usdc));

        vm.stopPrank();

        assertEq(usdc.balanceOf(user1), STABLECOIN_LIMIT * 2);
    }

    function testRemoveTokenWhileUserHasCooldown() public {
        vm.prank(user1);
        faucet.drip(address(usdc));

        // Remove token while user is on cooldown
        faucet.removeToken(address(usdc));

        // Fast forward 24 hours
        vm.warp(block.timestamp + 24 hours);

        // User should not be able to drip removed token
        vm.prank(user1);
        vm.expectRevert();
        faucet.drip(address(usdc));
    }
}
