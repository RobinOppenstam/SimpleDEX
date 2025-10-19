// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";
import "@chainlink/src/v0.8/tests/MockV3Aggregator.sol";

contract DeployPriceFeeds is Script {
    // Price feed decimals (Chainlink standard for USD pairs)
    uint8 constant DECIMALS = 8;

    // Initial prices (with 8 decimals)
    // ETH/USD: $3,400.00 = 340000000000
    int256 constant ETH_USD_PRICE = 340000000000;
    // BTC/USD: $95,000.00 = 9500000000000
    int256 constant BTC_USD_PRICE = 9500000000000;
    // LINK/USD: $20.00 = 2000000000
    int256 constant LINK_USD_PRICE = 2000000000;
    // UNI/USD: $12.00 = 1200000000
    int256 constant UNI_USD_PRICE = 1200000000;
    // USDC/USD: $1.00 = 100000000
    int256 constant USDC_USD_PRICE = 100000000;
    // USDT/USD: $1.00 = 100000000
    int256 constant USDT_USD_PRICE = 100000000;
    // DAI/USD: $1.00 = 100000000
    int256 constant DAI_USD_PRICE = 100000000;

    function run() external {
        // Get token addresses from environment or use defaults (Updated Anvil addresses)
        address mUSDC = vm.envOr("USDC_ADDRESS", address(0x86A2EE8FAf9A840F7a2c64CA3d51209F9A02081D));
        address mUSDT = vm.envOr("USDT_ADDRESS", address(0xA4899D35897033b927acFCf422bc745916139776));
        address mDAI = vm.envOr("DAI_ADDRESS", address(0xf953b3A269d80e3eB0F2947630Da976B896A8C5b));
        address mWETH = vm.envOr("WETH_ADDRESS", address(0xAA292E8611aDF267e563f334Ee42320aC96D0463));
        address mWBTC = vm.envOr("WBTC_ADDRESS", address(0x5c74c94173F05dA1720953407cbb920F3DF9f887));
        address mLINK = vm.envOr("LINK_ADDRESS", address(0x720472c8ce72c2A2D711333e064ABD3E6BbEAdd3));
        address mUNI = vm.envOr("UNI_ADDRESS", address(0xe8D2A1E88c91DCd5433208d4152Cc4F399a7e91d));

        vm.startBroadcast();

        console.log("\n=== Deploying Price Feeds ===\n");

        // Deploy MockV3Aggregators
        console.log("Deploying Mock Aggregators...");

        MockV3Aggregator ethUsdAggregator = new MockV3Aggregator(DECIMALS, ETH_USD_PRICE);
        console.log("ETH/USD Aggregator:", address(ethUsdAggregator), "- Price: $3,400.00");

        MockV3Aggregator btcUsdAggregator = new MockV3Aggregator(DECIMALS, BTC_USD_PRICE);
        console.log("BTC/USD Aggregator:", address(btcUsdAggregator), "- Price: $95,000.00");

        MockV3Aggregator linkUsdAggregator = new MockV3Aggregator(DECIMALS, LINK_USD_PRICE);
        console.log("LINK/USD Aggregator:", address(linkUsdAggregator), "- Price: $20.00");

        MockV3Aggregator uniUsdAggregator = new MockV3Aggregator(DECIMALS, UNI_USD_PRICE);
        console.log("UNI/USD Aggregator:", address(uniUsdAggregator), "- Price: $12.00");

        MockV3Aggregator usdcUsdAggregator = new MockV3Aggregator(DECIMALS, USDC_USD_PRICE);
        console.log("USDC/USD Aggregator:", address(usdcUsdAggregator), "- Price: $1.00");

        MockV3Aggregator usdtUsdAggregator = new MockV3Aggregator(DECIMALS, USDT_USD_PRICE);
        console.log("USDT/USD Aggregator:", address(usdtUsdAggregator), "- Price: $1.00");

        MockV3Aggregator daiUsdAggregator = new MockV3Aggregator(DECIMALS, DAI_USD_PRICE);
        console.log("DAI/USD Aggregator:", address(daiUsdAggregator), "- Price: $1.00");

        // Deploy PriceOracle
        console.log("\nDeploying PriceOracle...");
        PriceOracle oracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(oracle));

        // Register all price feeds
        console.log("\nRegistering Price Feeds...");

        address[] memory tokens = new address[](7);
        address[] memory aggregators = new address[](7);

        tokens[0] = mWETH;
        aggregators[0] = address(ethUsdAggregator);

        tokens[1] = mWBTC;
        aggregators[1] = address(btcUsdAggregator);

        tokens[2] = mLINK;
        aggregators[2] = address(linkUsdAggregator);

        tokens[3] = mUNI;
        aggregators[3] = address(uniUsdAggregator);

        tokens[4] = mUSDC;
        aggregators[4] = address(usdcUsdAggregator);

        tokens[5] = mUSDT;
        aggregators[5] = address(usdtUsdAggregator);

        tokens[6] = mDAI;
        aggregators[6] = address(daiUsdAggregator);

        oracle.setPriceFeeds(tokens, aggregators);
        console.log("All price feeds registered!");

        // Verify prices
        console.log("\nVerifying Prices...");
        (int256 ethPrice, uint8 ethDecimals) = oracle.getLatestPrice(mWETH);
        console.log("mWETH Price:", uint256(ethPrice), "Decimals:", ethDecimals);

        (int256 btcPrice, uint8 btcDecimals) = oracle.getLatestPrice(mWBTC);
        console.log("mWBTC Price:", uint256(btcPrice), "Decimals:", btcDecimals);

        (int256 usdcPrice, uint8 usdcDecimals) = oracle.getLatestPrice(mUSDC);
        console.log("mUSDC Price:", uint256(usdcPrice), "Decimals:", usdcDecimals);

        vm.stopBroadcast();

        // Output addresses for frontend integration
        console.log("\n=== Price Feed Addresses for Frontend ===\n");
        console.log("PRICE_ORACLE:", address(oracle));
        console.log("\nAGGREGATORS:");
        console.log("  mWETH:", address(ethUsdAggregator));
        console.log("  mWBTC:", address(btcUsdAggregator));
        console.log("  mLINK:", address(linkUsdAggregator));
        console.log("  mUNI:", address(uniUsdAggregator));
        console.log("  mUSDC:", address(usdcUsdAggregator));
        console.log("  mUSDT:", address(usdtUsdAggregator));
        console.log("  mDAI:", address(daiUsdAggregator));
        console.log("");
    }
}
