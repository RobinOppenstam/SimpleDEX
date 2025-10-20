// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";
import {MockV3Aggregator} from "chainlink-brownie-contracts/contracts/src/v0.8/tests/MockV3Aggregator.sol";

/**
 * @title DeployRealPriceFeeds
 * @notice Deploy PriceOracle with REAL Chainlink price feeds on testnet
 * @dev Uses actual Chainlink aggregators that update automatically
 *
 * Supported Testnets:
 * - Ethereum Sepolia
 * - Arbitrum Sepolia
 * - Base Sepolia
 *
 * ⚠️  NOTE: Real price feeds update automatically!
 * ⚠️  Prices will reflect actual market data
 * ⚠️  Use this for realistic testnet deployment
 */
contract DeployRealPriceFeeds is Script {
    // Chainlink Price Feed Addresses on Sepolia
    // Source: https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet

    struct ChainlinkFeeds {
        address ethUsd;
        address btcUsd;
        address linkUsd;
        address usdcUsd;
        address usdtUsd;
        address daiUsd;
    }

    function getSepoliaFeeds() internal pure returns (ChainlinkFeeds memory) {
        return ChainlinkFeeds({
            ethUsd: 0x694AA1769357215DE4FAC081bf1f309aDC325306,  // ETH/USD
            btcUsd: 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43,  // BTC/USD
            linkUsd: 0xc59E3633BAAC79493d908e63626716e204A45EdF, // LINK/USD
            usdcUsd: 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E, // USDC/USD
            usdtUsd: 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E, // Using USDC (USDT not available)
            daiUsd: 0x14866185B1962B63C3Ea9E03Bc1da838bab34C19   // DAI/USD
        });
    }

    function getArbitrumSepoliaFeeds() internal pure returns (ChainlinkFeeds memory) {
        // Arbitrum Sepolia feeds
        // Source: https://docs.chain.link/data-feeds/price-feeds/addresses?network=arbitrum&page=1#arbitrum-sepolia
        return ChainlinkFeeds({
            ethUsd: 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165,  // ETH/USD
            btcUsd: 0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69,  // BTC/USD
            linkUsd: 0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298, // LINK/USD
            usdcUsd: address(0), // Not available on Arbitrum Sepolia
            usdtUsd: address(0), // Not available
            daiUsd: address(0)   // Not available
        });
    }

    function getBaseSepoliaFeeds() internal pure returns (ChainlinkFeeds memory) {
        // Base Sepolia feeds
        // Source: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1#base-sepolia
        return ChainlinkFeeds({
            ethUsd: 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1,  // ETH/USD
            btcUsd: address(0), // Not available on Base Sepolia
            linkUsd: address(0), // Not available
            usdcUsd: address(0), // Not available
            usdtUsd: address(0), // Not available
            daiUsd: address(0)   // Not available
        });
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
            mUSDC: vm.envOr("USDC_ADDRESS", address(0)),
            mUSDT: vm.envOr("USDT_ADDRESS", address(0)),
            mDAI: vm.envOr("DAI_ADDRESS", address(0)),
            mWETH: vm.envOr("WETH_ADDRESS", address(0)),
            mWBTC: vm.envOr("WBTC_ADDRESS", address(0)),
            mLINK: vm.envOr("LINK_ADDRESS", address(0)),
            mUNI: vm.envOr("UNI_ADDRESS", address(0))
        });
    }

    function run() external {
        // Detect network
        uint256 chainId = block.chainid;
        string memory network;
        ChainlinkFeeds memory feeds;

        if (chainId == 11155111) {
            network = "Sepolia";
            feeds = getSepoliaFeeds();
        } else if (chainId == 421614) {
            network = "Arbitrum Sepolia";
            feeds = getArbitrumSepoliaFeeds();
        } else if (chainId == 84532) {
            network = "Base Sepolia";
            feeds = getBaseSepoliaFeeds();
        } else {
            revert("Unsupported network. Use Sepolia, Arbitrum Sepolia, or Base Sepolia");
        }

        console.log("\n=== Deploying Real Price Feeds on", network, "===\n");
        console.log("Chain ID:", chainId);

        TokenAddresses memory tokens = getTokenAddresses();

        vm.startBroadcast();

        // Deploy PriceOracle
        PriceOracle oracle = new PriceOracle();
        console.log("\nPriceOracle deployed at:", address(oracle));

        console.log("\n=== Registering REAL Chainlink Price Feeds ===");
        console.log("These feeds UPDATE AUTOMATICALLY with real market data!\n");

        // Register available feeds
        if (feeds.ethUsd != address(0) && tokens.mWETH != address(0)) {
            oracle.setPriceFeed(tokens.mWETH, feeds.ethUsd);
            console.log("mWETH -> ETH/USD Feed:", feeds.ethUsd);
        }

        if (feeds.btcUsd != address(0) && tokens.mWBTC != address(0)) {
            oracle.setPriceFeed(tokens.mWBTC, feeds.btcUsd);
            console.log("mWBTC -> BTC/USD Feed:", feeds.btcUsd);
        }

        if (feeds.linkUsd != address(0) && tokens.mLINK != address(0)) {
            oracle.setPriceFeed(tokens.mLINK, feeds.linkUsd);
            console.log("mLINK -> LINK/USD Feed:", feeds.linkUsd);
        }

        if (feeds.usdcUsd != address(0) && tokens.mUSDC != address(0)) {
            oracle.setPriceFeed(tokens.mUSDC, feeds.usdcUsd);
            console.log("mUSDC -> USDC/USD Feed:", feeds.usdcUsd);
        }

        if (feeds.usdtUsd != address(0) && tokens.mUSDT != address(0)) {
            oracle.setPriceFeed(tokens.mUSDT, feeds.usdtUsd);
            console.log("mUSDT -> USDT/USD Feed:", feeds.usdtUsd);
        }

        if (feeds.daiUsd != address(0) && tokens.mDAI != address(0)) {
            oracle.setPriceFeed(tokens.mDAI, feeds.daiUsd);
            console.log("mDAI -> DAI/USD Feed:", feeds.daiUsd);
        }

        // For UNI, deploy a MockV3Aggregator with a fixed price since Chainlink doesn't have UNI/USD
        if (tokens.mUNI != address(0)) {
            console.log("\nDeploying Mock Price Feed for UNI (not available on Chainlink):");
            MockV3Aggregator uniMockFeed = new MockV3Aggregator(
                8,           // decimals
                12_00000000  // $12.00 in 8 decimals
            );
            oracle.setPriceFeed(tokens.mUNI, address(uniMockFeed));
            console.log("mUNI -> Mock Feed (fixed $12.00):", address(uniMockFeed));
            console.log("    NOTE: This is a fixed price. Update manually if needed.");
        }

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("\nBenefits of Real Price Feeds:");
        console.log("   - Prices update automatically every ~1 hour");
        console.log("   - Reflects actual market conditions");
        console.log("   - No manual updates needed");
        console.log("   - More realistic user experience");

        console.log("\n=== Export to .env ===");
        console.log("PRICE_ORACLE_ADDRESS=", vm.toLowercase(vm.toString(address(oracle))));
    }
}
