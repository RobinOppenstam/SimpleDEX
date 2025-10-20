// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PriceOracle.sol";
import "@chainlink/src/v0.8/tests/MockV3Aggregator.sol";
import "../src/MockERC20.sol";

contract PriceOracleTest is Test {
    PriceOracle public oracle;
    MockV3Aggregator public ethAggregator;
    MockV3Aggregator public btcAggregator;
    MockV3Aggregator public usdcAggregator;
    MockV3Aggregator public linkAggregator;

    MockERC20 public weth;
    MockERC20 public wbtc;
    MockERC20 public usdc;
    MockERC20 public link;

    address public owner;
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    // Chainlink standard decimals
    uint8 constant PRICE_DECIMALS = 8;

    // Initial prices (with 8 decimals)
    int256 constant ETH_PRICE = 340000000000; // $3,400.00
    int256 constant BTC_PRICE = 9500000000000; // $95,000.00
    int256 constant USDC_PRICE = 100000000; // $1.00
    int256 constant LINK_PRICE = 2000000000; // $20.00

    // Events to test
    event PriceFeedUpdated(address indexed token, address indexed aggregator);
    event PriceQueried(address indexed token, int256 price, uint256 timestamp);

    function setUp() public {
        owner = address(this);

        // Deploy PriceOracle
        oracle = new PriceOracle();

        // Deploy mock aggregators with initial prices
        ethAggregator = new MockV3Aggregator(PRICE_DECIMALS, ETH_PRICE);
        btcAggregator = new MockV3Aggregator(PRICE_DECIMALS, BTC_PRICE);
        usdcAggregator = new MockV3Aggregator(PRICE_DECIMALS, USDC_PRICE);
        linkAggregator = new MockV3Aggregator(PRICE_DECIMALS, LINK_PRICE);

        // Deploy mock tokens
        weth = new MockERC20("Wrapped Ether", "WETH", 1000 ether);
        wbtc = new MockERC20("Wrapped Bitcoin", "WBTC", 100 * 10**8); // 8 decimals
        usdc = new MockERC20("USD Coin", "USDC", 1000000 * 10**6); // 6 decimals
        link = new MockERC20("Chainlink", "LINK", 100000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR & OWNERSHIP TESTS
    //////////////////////////////////////////////////////////////*/

    function testConstructorSetsOwner() public view {
        assertEq(oracle.owner(), owner);
    }

    function testTransferOwnership() public {
        address newOwner = address(0x123);
        oracle.transferOwnership(newOwner);
        assertEq(oracle.owner(), newOwner);
    }

    function testTransferOwnershipToZeroAddress() public {
        vm.expectRevert(PriceOracle.InvalidAddress.selector);
        oracle.transferOwnership(address(0));
    }

    function testTransferOwnershipByNonOwner() public {
        vm.prank(user1);
        vm.expectRevert(PriceOracle.OnlyOwner.selector);
        oracle.transferOwnership(user1);
    }

    /*//////////////////////////////////////////////////////////////
                        SET PRICE FEED TESTS (SINGLE)
    //////////////////////////////////////////////////////////////*/

    function testSetPriceFeed() public {
        vm.expectEmit(true, true, false, true);
        emit PriceFeedUpdated(address(weth), address(ethAggregator));

        oracle.setPriceFeed(address(weth), address(ethAggregator));

        assertEq(oracle.getPriceFeed(address(weth)), address(ethAggregator));
    }

    function testSetPriceFeedWithZeroTokenAddress() public {
        vm.expectRevert(PriceOracle.InvalidAddress.selector);
        oracle.setPriceFeed(address(0), address(ethAggregator));
    }

    function testSetPriceFeedWithZeroAggregatorAddress() public {
        vm.expectRevert(PriceOracle.InvalidAddress.selector);
        oracle.setPriceFeed(address(weth), address(0));
    }

    function testSetPriceFeedByNonOwner() public {
        vm.prank(user1);
        vm.expectRevert(PriceOracle.OnlyOwner.selector);
        oracle.setPriceFeed(address(weth), address(ethAggregator));
    }

    function testUpdateExistingPriceFeed() public {
        // Set initial feed
        oracle.setPriceFeed(address(weth), address(ethAggregator));
        assertEq(oracle.getPriceFeed(address(weth)), address(ethAggregator));

        // Update to new aggregator
        MockV3Aggregator newAggregator = new MockV3Aggregator(PRICE_DECIMALS, ETH_PRICE * 2);
        oracle.setPriceFeed(address(weth), address(newAggregator));
        assertEq(oracle.getPriceFeed(address(weth)), address(newAggregator));
    }

    /*//////////////////////////////////////////////////////////////
                        SET PRICE FEEDS TESTS (BATCH)
    //////////////////////////////////////////////////////////////*/

    function testSetPriceFeedsBatch() public {
        address[] memory tokens = new address[](4);
        address[] memory aggregators = new address[](4);

        tokens[0] = address(weth);
        tokens[1] = address(wbtc);
        tokens[2] = address(usdc);
        tokens[3] = address(link);

        aggregators[0] = address(ethAggregator);
        aggregators[1] = address(btcAggregator);
        aggregators[2] = address(usdcAggregator);
        aggregators[3] = address(linkAggregator);

        // Expect events for each token
        vm.expectEmit(true, true, false, true);
        emit PriceFeedUpdated(address(weth), address(ethAggregator));
        vm.expectEmit(true, true, false, true);
        emit PriceFeedUpdated(address(wbtc), address(btcAggregator));
        vm.expectEmit(true, true, false, true);
        emit PriceFeedUpdated(address(usdc), address(usdcAggregator));
        vm.expectEmit(true, true, false, true);
        emit PriceFeedUpdated(address(link), address(linkAggregator));

        oracle.setPriceFeeds(tokens, aggregators);

        // Verify all feeds are set
        assertEq(oracle.getPriceFeed(address(weth)), address(ethAggregator));
        assertEq(oracle.getPriceFeed(address(wbtc)), address(btcAggregator));
        assertEq(oracle.getPriceFeed(address(usdc)), address(usdcAggregator));
        assertEq(oracle.getPriceFeed(address(link)), address(linkAggregator));
    }

    function testSetPriceFeedsBatchMismatchedArrays() public {
        address[] memory tokens = new address[](2);
        address[] memory aggregators = new address[](3);

        tokens[0] = address(weth);
        tokens[1] = address(wbtc);

        aggregators[0] = address(ethAggregator);
        aggregators[1] = address(btcAggregator);
        aggregators[2] = address(usdcAggregator);

        vm.expectRevert(PriceOracle.InvalidAddress.selector);
        oracle.setPriceFeeds(tokens, aggregators);
    }

    function testSetPriceFeedsBatchWithZeroTokenAddress() public {
        address[] memory tokens = new address[](2);
        address[] memory aggregators = new address[](2);

        tokens[0] = address(weth);
        tokens[1] = address(0); // Zero address

        aggregators[0] = address(ethAggregator);
        aggregators[1] = address(btcAggregator);

        vm.expectRevert(PriceOracle.InvalidAddress.selector);
        oracle.setPriceFeeds(tokens, aggregators);
    }

    function testSetPriceFeedsBatchWithZeroAggregatorAddress() public {
        address[] memory tokens = new address[](2);
        address[] memory aggregators = new address[](2);

        tokens[0] = address(weth);
        tokens[1] = address(wbtc);

        aggregators[0] = address(ethAggregator);
        aggregators[1] = address(0); // Zero address

        vm.expectRevert(PriceOracle.InvalidAddress.selector);
        oracle.setPriceFeeds(tokens, aggregators);
    }

    function testSetPriceFeedsBatchByNonOwner() public {
        address[] memory tokens = new address[](1);
        address[] memory aggregators = new address[](1);

        tokens[0] = address(weth);
        aggregators[0] = address(ethAggregator);

        vm.prank(user1);
        vm.expectRevert(PriceOracle.OnlyOwner.selector);
        oracle.setPriceFeeds(tokens, aggregators);
    }

    /*//////////////////////////////////////////////////////////////
                        GET LATEST PRICE TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetLatestPrice() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        (int256 price, uint8 decimals) = oracle.getLatestPrice(address(weth));

        assertEq(price, ETH_PRICE);
        assertEq(decimals, PRICE_DECIMALS);
    }

    function testGetLatestPriceForUnsetFeed() public {
        vm.expectRevert(PriceOracle.PriceFeedNotSet.selector);
        oracle.getLatestPrice(address(weth));
    }

    function testGetLatestPriceWithNegativePrice() public {
        // Create aggregator with negative price
        MockV3Aggregator badAggregator = new MockV3Aggregator(PRICE_DECIMALS, -100);
        oracle.setPriceFeed(address(weth), address(badAggregator));

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getLatestPrice(address(weth));
    }

    function testGetLatestPriceWithZeroPrice() public {
        // Create aggregator with zero price
        MockV3Aggregator badAggregator = new MockV3Aggregator(PRICE_DECIMALS, 0);
        oracle.setPriceFeed(address(weth), address(badAggregator));

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getLatestPrice(address(weth));
    }

    function testGetLatestPriceWithDifferentDecimals() public {
        // Create aggregator with different decimals
        MockV3Aggregator customAggregator = new MockV3Aggregator(18, 1 ether);
        oracle.setPriceFeed(address(weth), address(customAggregator));

        (int256 price, uint8 decimals) = oracle.getLatestPrice(address(weth));

        assertEq(price, 1 ether);
        assertEq(decimals, 18);
    }

    function testGetLatestPriceMultipleTokens() public {
        // Set up multiple feeds
        oracle.setPriceFeed(address(weth), address(ethAggregator));
        oracle.setPriceFeed(address(wbtc), address(btcAggregator));
        oracle.setPriceFeed(address(usdc), address(usdcAggregator));

        // Query each one
        (int256 ethPrice,) = oracle.getLatestPrice(address(weth));
        (int256 btcPrice,) = oracle.getLatestPrice(address(wbtc));
        (int256 usdcPrice,) = oracle.getLatestPrice(address(usdc));

        assertEq(ethPrice, ETH_PRICE);
        assertEq(btcPrice, BTC_PRICE);
        assertEq(usdcPrice, USDC_PRICE);
    }

    /*//////////////////////////////////////////////////////////////
                        GET PRICE IN USD TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetPriceInUSDWith18Decimals() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        uint256 amount = 10 ether; // 10 WETH
        uint256 usdValue = oracle.getPriceInUSD(address(weth), amount, 18);

        // Expected: (10 * 10^18 * 340000000000) / 10^18 = 3400000000000 (with 8 decimals)
        // This is $34,000.00 (10 ETH * $3,400 per ETH)
        assertEq(usdValue, 3400000000000);
    }

    function testGetPriceInUSDWith6Decimals() public {
        oracle.setPriceFeed(address(usdc), address(usdcAggregator));

        uint256 amount = 1000 * 10**6; // 1000 USDC (6 decimals)
        uint256 usdValue = oracle.getPriceInUSD(address(usdc), amount, 6);

        // Expected: (1000 * 10^6 * 100000000) / 10^6 = 1000 * 10^8
        assertEq(usdValue, 1000 * 10**8);
    }

    function testGetPriceInUSDWith8Decimals() public {
        oracle.setPriceFeed(address(wbtc), address(btcAggregator));

        uint256 amount = 1 * 10**8; // 1 WBTC (8 decimals)
        uint256 usdValue = oracle.getPriceInUSD(address(wbtc), amount, 8);

        // Expected: (1 * 10^8 * 9500000000000) / 10^8 = 9500000000000
        assertEq(usdValue, 9500000000000);
    }

    function testGetPriceInUSDWithZeroAmount() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        uint256 usdValue = oracle.getPriceInUSD(address(weth), 0, 18);

        assertEq(usdValue, 0);
    }

    function testGetPriceInUSDWithLargeAmount() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        uint256 amount = 1000000 ether; // 1 million WETH
        uint256 usdValue = oracle.getPriceInUSD(address(weth), amount, 18);

        // Expected: (1000000 * 10^18 * 340000000000) / 10^18 = 340000000000 * 1000000
        assertEq(usdValue, 340000000000 * 1000000);
    }

    function testGetPriceInUSDForUnsetFeed() public {
        vm.expectRevert(PriceOracle.PriceFeedNotSet.selector);
        oracle.getPriceInUSD(address(weth), 1 ether, 18);
    }

    /*//////////////////////////////////////////////////////////////
                        GET ROUND DATA TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetRoundData() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        // Get the current round ID from the aggregator
        (uint80 latestRoundId,,,,) = ethAggregator.latestRoundData();

        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = oracle.getRoundData(address(weth), latestRoundId);

        assertEq(roundId, latestRoundId);
        assertEq(price, ETH_PRICE);
        assertGt(updatedAt, 0);
        assertGt(startedAt, 0);
        assertEq(answeredInRound, latestRoundId);
    }

    function testGetRoundDataForUnsetFeed() public {
        vm.expectRevert(PriceOracle.PriceFeedNotSet.selector);
        oracle.getRoundData(address(weth), 1);
    }

    function testGetRoundDataWithInvalidPrice() public {
        MockV3Aggregator badAggregator = new MockV3Aggregator(PRICE_DECIMALS, -100);
        oracle.setPriceFeed(address(weth), address(badAggregator));

        (uint80 roundId,,,,) = badAggregator.latestRoundData();

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getRoundData(address(weth), roundId);
    }

    /*//////////////////////////////////////////////////////////////
                    GET LATEST ROUND DATA TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetLatestRoundData() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = oracle.getLatestRoundData(address(weth));

        assertGt(roundId, 0);
        assertEq(price, ETH_PRICE);
        assertGt(updatedAt, 0);
        assertGt(startedAt, 0);
        assertEq(answeredInRound, roundId);
    }

    function testGetLatestRoundDataForUnsetFeed() public {
        vm.expectRevert(PriceOracle.PriceFeedNotSet.selector);
        oracle.getLatestRoundData(address(weth));
    }

    function testGetLatestRoundDataWithInvalidPrice() public {
        MockV3Aggregator badAggregator = new MockV3Aggregator(PRICE_DECIMALS, 0);
        oracle.setPriceFeed(address(weth), address(badAggregator));

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getLatestRoundData(address(weth));
    }

    /*//////////////////////////////////////////////////////////////
                        GET PRICE FEED TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetPriceFeed() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        address feed = oracle.getPriceFeed(address(weth));

        assertEq(feed, address(ethAggregator));
    }

    function testGetPriceFeedForUnsetToken() public view {
        address feed = oracle.getPriceFeed(address(weth));

        assertEq(feed, address(0));
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES & INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testFullWorkflowSingleToken() public {
        // 1. Deploy and set feed
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        // 2. Query latest price
        (int256 price, uint8 decimals) = oracle.getLatestPrice(address(weth));
        assertEq(price, ETH_PRICE);
        assertEq(decimals, PRICE_DECIMALS);

        // 3. Get USD value
        uint256 usdValue = oracle.getPriceInUSD(address(weth), 1 ether, 18);
        assertEq(usdValue, 340000000000);

        // 4. Get round data
        (uint80 roundId,,,uint256 updatedAt,) = oracle.getLatestRoundData(address(weth));
        assertGt(roundId, 0);
        assertGt(updatedAt, 0);
    }

    function testFullWorkflowMultipleTokens() public {
        // Set up all feeds
        address[] memory tokens = new address[](4);
        address[] memory aggregators = new address[](4);

        tokens[0] = address(weth);
        tokens[1] = address(wbtc);
        tokens[2] = address(usdc);
        tokens[3] = address(link);

        aggregators[0] = address(ethAggregator);
        aggregators[1] = address(btcAggregator);
        aggregators[2] = address(usdcAggregator);
        aggregators[3] = address(linkAggregator);

        oracle.setPriceFeeds(tokens, aggregators);

        // Query all prices
        (int256 ethPrice,) = oracle.getLatestPrice(address(weth));
        (int256 btcPrice,) = oracle.getLatestPrice(address(wbtc));
        (int256 usdcPrice,) = oracle.getLatestPrice(address(usdc));
        (int256 linkPrice,) = oracle.getLatestPrice(address(link));

        assertEq(ethPrice, ETH_PRICE);
        assertEq(btcPrice, BTC_PRICE);
        assertEq(usdcPrice, USDC_PRICE);
        assertEq(linkPrice, LINK_PRICE);
    }

    function testPriceUpdates() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        // Initial price
        (int256 price1,) = oracle.getLatestPrice(address(weth));
        assertEq(price1, ETH_PRICE);

        // Update aggregator price
        int256 newPrice = 400000000000; // $4,000
        ethAggregator.updateAnswer(newPrice);

        // Query updated price
        (int256 price2,) = oracle.getLatestPrice(address(weth));
        assertEq(price2, newPrice);
    }

    function testMultiplePriceUpdates() public {
        oracle.setPriceFeed(address(weth), address(ethAggregator));

        int256[] memory prices = new int256[](5);
        prices[0] = 300000000000;
        prices[1] = 350000000000;
        prices[2] = 340000000000;
        prices[3] = 360000000000;
        prices[4] = 380000000000;

        for (uint256 i = 0; i < prices.length; i++) {
            ethAggregator.updateAnswer(prices[i]);
            (int256 price,) = oracle.getLatestPrice(address(weth));
            assertEq(price, prices[i]);
        }
    }

    function testGasOptimizationBatchVsSingle() public {
        address[] memory tokens = new address[](4);
        address[] memory aggregators = new address[](4);

        tokens[0] = address(weth);
        tokens[1] = address(wbtc);
        tokens[2] = address(usdc);
        tokens[3] = address(link);

        aggregators[0] = address(ethAggregator);
        aggregators[1] = address(btcAggregator);
        aggregators[2] = address(usdcAggregator);
        aggregators[3] = address(linkAggregator);

        // Measure batch gas
        uint256 gasBefore = gasleft();
        oracle.setPriceFeeds(tokens, aggregators);
        uint256 batchGas = gasBefore - gasleft();

        // Reset oracle
        oracle = new PriceOracle();

        // Measure single call gas
        gasBefore = gasleft();
        for (uint256 i = 0; i < tokens.length; i++) {
            oracle.setPriceFeed(tokens[i], aggregators[i]);
        }
        uint256 singleGas = gasBefore - gasleft();

        // Log gas usage for comparison (informational only)
        console.log("Batch gas:", batchGas);
        console.log("Single gas:", singleGas);

        // Batch might be slightly more expensive due to array handling overhead
        // but should be within a reasonable range (1.5x is acceptable)
        assertTrue(batchGas < singleGas * 15 / 10, "Batch gas usage is too high");
    }

    function testStalenessThresholdConstant() public view {
        uint256 threshold = oracle.STALENESS_THRESHOLD();
        assertEq(threshold, 3600); // 1 hour in seconds
    }

    /*//////////////////////////////////////////////////////////////
                        FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzzGetPriceInUSD(uint256 amount, uint8 tokenDecimals) public {
        // Bound inputs to reasonable ranges to avoid overflow
        // Max amount: type(uint128).max to ensure no overflow in multiplication
        // Token decimals: 0-18 (standard range for ERC20)
        amount = bound(amount, 1, type(uint128).max);
        tokenDecimals = uint8(bound(tokenDecimals, 0, 18));

        oracle.setPriceFeed(address(weth), address(ethAggregator));

        // Should not revert with valid inputs
        uint256 usdValue = oracle.getPriceInUSD(address(weth), amount, tokenDecimals);

        // USD value should be greater than zero for non-zero amounts
        // when token decimals are <= 18
        // For very small amounts with high decimals, result might be 0 due to integer division
        if (amount >= 10 ** tokenDecimals) {
            assertGt(usdValue, 0, "USD value should be greater than 0 for significant amounts");
        }
    }

    function testFuzzSetPriceFeed(address token, address aggregator) public {
        // Only test with non-zero addresses
        vm.assume(token != address(0) && aggregator != address(0));

        oracle.setPriceFeed(token, aggregator);
        assertEq(oracle.getPriceFeed(token), aggregator);
    }
}
