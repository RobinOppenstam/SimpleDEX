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

    struct Aggregators {
        MockV3Aggregator ethUsd;
        MockV3Aggregator btcUsd;
        MockV3Aggregator linkUsd;
        MockV3Aggregator uniUsd;
        MockV3Aggregator usdcUsd;
        MockV3Aggregator usdtUsd;
        MockV3Aggregator daiUsd;
    }

    struct TokenAddresses {
        address mUSDC;
        address mUSDT;
        address mDAI;
        address mWETH;
        address mWBTC;
        address mLINK;
        address mUNI;
    }

    function getTokenAddresses() internal view returns (TokenAddresses memory) {
        return TokenAddresses({
            mUSDC: vm.envOr("USDC_ADDRESS", address(0x86A2EE8FAf9A840F7a2c64CA3d51209F9A02081D)),
            mUSDT: vm.envOr("USDT_ADDRESS", address(0xA4899D35897033b927acFCf422bc745916139776)),
            mDAI: vm.envOr("DAI_ADDRESS", address(0xf953b3A269d80e3eB0F2947630Da976B896A8C5b)),
            mWETH: vm.envOr("WETH_ADDRESS", address(0xAA292E8611aDF267e563f334Ee42320aC96D0463)),
            mWBTC: vm.envOr("WBTC_ADDRESS", address(0x5c74c94173F05dA1720953407cbb920F3DF9f887)),
            mLINK: vm.envOr("LINK_ADDRESS", address(0x720472c8ce72c2A2D711333e064ABD3E6BbEAdd3)),
            mUNI: vm.envOr("UNI_ADDRESS", address(0xe8D2A1E88c91DCd5433208d4152Cc4F399a7e91d))
        });
    }

    function deployAggregators() internal returns (Aggregators memory) {
        console.log("Deploying Mock Aggregators...");

        Aggregators memory aggs;

        aggs.ethUsd = new MockV3Aggregator(DECIMALS, ETH_USD_PRICE);
        console.log("ETH/USD Aggregator:", address(aggs.ethUsd), "- Price: $3,400.00");

        aggs.btcUsd = new MockV3Aggregator(DECIMALS, BTC_USD_PRICE);
        console.log("BTC/USD Aggregator:", address(aggs.btcUsd), "- Price: $95,000.00");

        aggs.linkUsd = new MockV3Aggregator(DECIMALS, LINK_USD_PRICE);
        console.log("LINK/USD Aggregator:", address(aggs.linkUsd), "- Price: $20.00");

        aggs.uniUsd = new MockV3Aggregator(DECIMALS, UNI_USD_PRICE);
        console.log("UNI/USD Aggregator:", address(aggs.uniUsd), "- Price: $12.00");

        aggs.usdcUsd = new MockV3Aggregator(DECIMALS, USDC_USD_PRICE);
        console.log("USDC/USD Aggregator:", address(aggs.usdcUsd), "- Price: $1.00");

        aggs.usdtUsd = new MockV3Aggregator(DECIMALS, USDT_USD_PRICE);
        console.log("USDT/USD Aggregator:", address(aggs.usdtUsd), "- Price: $1.00");

        aggs.daiUsd = new MockV3Aggregator(DECIMALS, DAI_USD_PRICE);
        console.log("DAI/USD Aggregator:", address(aggs.daiUsd), "- Price: $1.00");

        return aggs;
    }

    function registerPriceFeeds(
        PriceOracle oracle,
        TokenAddresses memory tokens,
        Aggregators memory aggs
    ) internal {
        console.log("\nRegistering Price Feeds...");

        address[] memory tokenArray = new address[](7);
        address[] memory aggregatorArray = new address[](7);

        tokenArray[0] = tokens.mWETH;
        aggregatorArray[0] = address(aggs.ethUsd);

        tokenArray[1] = tokens.mWBTC;
        aggregatorArray[1] = address(aggs.btcUsd);

        tokenArray[2] = tokens.mLINK;
        aggregatorArray[2] = address(aggs.linkUsd);

        tokenArray[3] = tokens.mUNI;
        aggregatorArray[3] = address(aggs.uniUsd);

        tokenArray[4] = tokens.mUSDC;
        aggregatorArray[4] = address(aggs.usdcUsd);

        tokenArray[5] = tokens.mUSDT;
        aggregatorArray[5] = address(aggs.usdtUsd);

        tokenArray[6] = tokens.mDAI;
        aggregatorArray[6] = address(aggs.daiUsd);

        oracle.setPriceFeeds(tokenArray, aggregatorArray);
        console.log("All price feeds registered!");
    }

    function verifyPrices(PriceOracle oracle, TokenAddresses memory tokens) internal view {
        console.log("\nVerifying Prices...");
        (int256 ethPrice, uint8 ethDecimals) = oracle.getLatestPrice(tokens.mWETH);
        console.log("mWETH Price:", uint256(ethPrice), "Decimals:", ethDecimals);

        (int256 btcPrice, uint8 btcDecimals) = oracle.getLatestPrice(tokens.mWBTC);
        console.log("mWBTC Price:", uint256(btcPrice), "Decimals:", btcDecimals);

        (int256 usdcPrice, uint8 usdcDecimals) = oracle.getLatestPrice(tokens.mUSDC);
        console.log("mUSDC Price:", uint256(usdcPrice), "Decimals:", usdcDecimals);
    }

    function logAddresses(PriceOracle oracle, Aggregators memory aggs) internal view {
        console.log("\n=== Price Feed Addresses for Frontend ===\n");
        console.log("PRICE_ORACLE:", address(oracle));
        console.log("\nAGGREGATORS:");
        console.log("  mWETH:", address(aggs.ethUsd));
        console.log("  mWBTC:", address(aggs.btcUsd));
        console.log("  mLINK:", address(aggs.linkUsd));
        console.log("  mUNI:", address(aggs.uniUsd));
        console.log("  mUSDC:", address(aggs.usdcUsd));
        console.log("  mUSDT:", address(aggs.usdtUsd));
        console.log("  mDAI:", address(aggs.daiUsd));
        console.log("");
    }

    function run() external {
        TokenAddresses memory tokens = getTokenAddresses();

        vm.startBroadcast();

        console.log("\n=== Deploying Price Feeds ===\n");

        Aggregators memory aggs = deployAggregators();

        console.log("\nDeploying PriceOracle...");
        PriceOracle oracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(oracle));

        registerPriceFeeds(oracle, tokens, aggs);
        verifyPrices(oracle, tokens);

        vm.stopBroadcast();

        logAddresses(oracle, aggs);
    }
}
