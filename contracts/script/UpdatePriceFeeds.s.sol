// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@chainlink/src/v0.8/tests/MockV3Aggregator.sol";

/**
 * @title UpdatePriceFeeds
 * @notice Script to manually update price feed values for testing
 * @dev Usage examples:
 *   - Update ETH to $3,500: forge script UpdatePriceFeeds --sig "updateETH(uint256)" 350000000000 --broadcast
 *   - Update all at once: forge script UpdatePriceFeeds --sig "updateAll()" --broadcast
 */
contract UpdatePriceFeeds is Script {
    // Aggregator addresses (update these after deployment)
    address public ethUsdAggregator = vm.envOr("ETH_USD_AGGREGATOR", address(0));
    address public btcUsdAggregator = vm.envOr("BTC_USD_AGGREGATOR", address(0));
    address public linkUsdAggregator = vm.envOr("LINK_USD_AGGREGATOR", address(0));
    address public uniUsdAggregator = vm.envOr("UNI_USD_AGGREGATOR", address(0));
    address public usdcUsdAggregator = vm.envOr("USDC_USD_AGGREGATOR", address(0));
    address public usdtUsdAggregator = vm.envOr("USDT_USD_AGGREGATOR", address(0));
    address public daiUsdAggregator = vm.envOr("DAI_USD_AGGREGATOR", address(0));

    /**
     * @notice Update ETH/USD price
     * @param newPrice New price with 8 decimals (e.g., 350000000000 for $3,500)
     */
    function updateETH(int256 newPrice) external {
        require(ethUsdAggregator != address(0), "ETH aggregator not set");
        vm.startBroadcast();
        MockV3Aggregator(ethUsdAggregator).updateAnswer(newPrice);
        console.log("Updated ETH/USD to:", uint256(newPrice));
        vm.stopBroadcast();
    }

    /**
     * @notice Update BTC/USD price
     * @param newPrice New price with 8 decimals
     */
    function updateBTC(int256 newPrice) external {
        require(btcUsdAggregator != address(0), "BTC aggregator not set");
        vm.startBroadcast();
        MockV3Aggregator(btcUsdAggregator).updateAnswer(newPrice);
        console.log("Updated BTC/USD to:", uint256(newPrice));
        vm.stopBroadcast();
    }

    /**
     * @notice Update LINK/USD price
     * @param newPrice New price with 8 decimals
     */
    function updateLINK(int256 newPrice) external {
        require(linkUsdAggregator != address(0), "LINK aggregator not set");
        vm.startBroadcast();
        MockV3Aggregator(linkUsdAggregator).updateAnswer(newPrice);
        console.log("Updated LINK/USD to:", uint256(newPrice));
        vm.stopBroadcast();
    }

    /**
     * @notice Update UNI/USD price
     * @param newPrice New price with 8 decimals
     */
    function updateUNI(int256 newPrice) external {
        require(uniUsdAggregator != address(0), "UNI aggregator not set");
        vm.startBroadcast();
        MockV3Aggregator(uniUsdAggregator).updateAnswer(newPrice);
        console.log("Updated UNI/USD to:", uint256(newPrice));
        vm.stopBroadcast();
    }

    /**
     * @notice Update all price feeds with realistic current market prices
     * @dev Call this periodically to keep prices somewhat current
     */
    function updateAll() external {
        vm.startBroadcast();

        console.log("Updating all price feeds...");

        // ETH: $3,400
        if (ethUsdAggregator != address(0)) {
            MockV3Aggregator(ethUsdAggregator).updateAnswer(340000000000);
            console.log("ETH/USD: $3,400.00");
        }

        // BTC: $95,000
        if (btcUsdAggregator != address(0)) {
            MockV3Aggregator(btcUsdAggregator).updateAnswer(9500000000000);
            console.log("BTC/USD: $95,000.00");
        }

        // LINK: $20
        if (linkUsdAggregator != address(0)) {
            MockV3Aggregator(linkUsdAggregator).updateAnswer(2000000000);
            console.log("LINK/USD: $20.00");
        }

        // UNI: $12
        if (uniUsdAggregator != address(0)) {
            MockV3Aggregator(uniUsdAggregator).updateAnswer(1200000000);
            console.log("UNI/USD: $12.00");
        }

        // Stablecoins: $1.00
        if (usdcUsdAggregator != address(0)) {
            MockV3Aggregator(usdcUsdAggregator).updateAnswer(100000000);
            console.log("USDC/USD: $1.00");
        }

        if (usdtUsdAggregator != address(0)) {
            MockV3Aggregator(usdtUsdAggregator).updateAnswer(100000000);
            console.log("USDT/USD: $1.00");
        }

        if (daiUsdAggregator != address(0)) {
            MockV3Aggregator(daiUsdAggregator).updateAnswer(100000000);
            console.log("DAI/USD: $1.00");
        }

        console.log("All prices updated!");

        vm.stopBroadcast();
    }

    /**
     * @notice Simulate a price crash scenario (for testing)
     */
    function simulateCrash() external {
        vm.startBroadcast();

        console.log("SIMULATING MARKET CRASH...");

        // ETH down 50% to $1,700
        if (ethUsdAggregator != address(0)) {
            MockV3Aggregator(ethUsdAggregator).updateAnswer(170000000000);
            console.log("ETH/USD: $1,700.00 (-50%)");
        }

        // BTC down 40% to $57,000
        if (btcUsdAggregator != address(0)) {
            MockV3Aggregator(btcUsdAggregator).updateAnswer(5700000000000);
            console.log("BTC/USD: $57,000.00 (-40%)");
        }

        // LINK down 60% to $8
        if (linkUsdAggregator != address(0)) {
            MockV3Aggregator(linkUsdAggregator).updateAnswer(800000000);
            console.log("LINK/USD: $8.00 (-60%)");
        }

        // UNI down 50% to $6
        if (uniUsdAggregator != address(0)) {
            MockV3Aggregator(uniUsdAggregator).updateAnswer(600000000);
            console.log("UNI/USD: $6.00 (-50%)");
        }

        console.log("Crash simulation complete!");

        vm.stopBroadcast();
    }

    /**
     * @notice Simulate a bull market scenario (for testing)
     */
    function simulatePump() external {
        vm.startBroadcast();

        console.log("SIMULATING BULL MARKET...");

        // ETH up 50% to $5,100
        if (ethUsdAggregator != address(0)) {
            MockV3Aggregator(ethUsdAggregator).updateAnswer(510000000000);
            console.log("ETH/USD: $5,100.00 (+50%)");
        }

        // BTC up 30% to $123,500
        if (btcUsdAggregator != address(0)) {
            MockV3Aggregator(btcUsdAggregator).updateAnswer(12350000000000);
            console.log("BTC/USD: $123,500.00 (+30%)");
        }

        // LINK up 100% to $40
        if (linkUsdAggregator != address(0)) {
            MockV3Aggregator(linkUsdAggregator).updateAnswer(4000000000);
            console.log("LINK/USD: $40.00 (+100%)");
        }

        // UNI up 75% to $21
        if (uniUsdAggregator != address(0)) {
            MockV3Aggregator(uniUsdAggregator).updateAnswer(2100000000);
            console.log("UNI/USD: $21.00 (+75%)");
        }

        console.log("Bull market simulation complete!");

        vm.stopBroadcast();
    }
}
