// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TokenFaucet.sol";
import "../src/MockERC20.sol";

/**
 * @title DeployFaucet
 * @notice Deploy and configure the token faucet with rate limits
 * @dev Limits: 2000 USD stablecoins, 0.5 WETH, 0.1 WBTC, 200 LINK, 500 UNI
 */
contract DeployFaucet is Script {
    struct Addresses {
        address mUSDC;
        address mUSDT;
        address mDAI;
        address mWETH;
        address mWBTC;
        address mLINK;
        address mUNI;
    }

    function getAddresses() internal view returns (Addresses memory) {
        return Addresses({
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
        Addresses memory addrs = getAddresses();

        vm.startBroadcast();

        console.log("\n=== Deploying Token Faucet ===\n");

        // Deploy faucet
        TokenFaucet faucet = new TokenFaucet();
        console.log("TokenFaucet deployed at:", address(faucet));

        console.log("\n=== Configuring Token Limits ===\n");

        // Token limits as per requirements
        // Stablecoins: 2000 USD each (18 decimals for our mocks)
        uint256 stablecoinLimit = 2000 * 10**18;

        // WETH: 0.5 tokens (18 decimals)
        uint256 wethLimit = 0.5 * 10**18;

        // WBTC: 0.1 tokens (18 decimals for our mock, normally 8)
        uint256 wbtcLimit = 0.1 * 10**18;

        // LINK: 200 tokens (18 decimals)
        uint256 linkLimit = 200 * 10**18;

        // UNI: 500 tokens (18 decimals)
        uint256 uniLimit = 500 * 10**18;

        // Add tokens with limits
        if (addrs.mUSDC != address(0)) {
            faucet.addToken(addrs.mUSDC, stablecoinLimit);
            console.log("Added mUSDC with limit: 2000 tokens");
        }

        if (addrs.mUSDT != address(0)) {
            faucet.addToken(addrs.mUSDT, stablecoinLimit);
            console.log("Added mUSDT with limit: 2000 tokens");
        }

        if (addrs.mDAI != address(0)) {
            faucet.addToken(addrs.mDAI, stablecoinLimit);
            console.log("Added mDAI with limit: 2000 tokens");
        }

        if (addrs.mWETH != address(0)) {
            faucet.addToken(addrs.mWETH, wethLimit);
            console.log("Added mWETH with limit: 0.5 tokens");
        }

        if (addrs.mWBTC != address(0)) {
            faucet.addToken(addrs.mWBTC, wbtcLimit);
            console.log("Added mWBTC with limit: 0.1 tokens");
        }

        if (addrs.mLINK != address(0)) {
            faucet.addToken(addrs.mLINK, linkLimit);
            console.log("Added mLINK with limit: 200 tokens");
        }

        if (addrs.mUNI != address(0)) {
            faucet.addToken(addrs.mUNI, uniLimit);
            console.log("Added mUNI with limit: 500 tokens");
        }

        console.log("\n=== Funding Faucet ===\n");

        // Fund faucet with tokens (100x the drip amount for longevity)
        if (addrs.mUSDC != address(0)) {
            MockERC20(addrs.mUSDC).mint(address(faucet), stablecoinLimit * 100);
            console.log("Funded mUSDC: 200,000 tokens");
        }

        if (addrs.mUSDT != address(0)) {
            MockERC20(addrs.mUSDT).mint(address(faucet), stablecoinLimit * 100);
            console.log("Funded mUSDT: 200,000 tokens");
        }

        if (addrs.mDAI != address(0)) {
            MockERC20(addrs.mDAI).mint(address(faucet), stablecoinLimit * 100);
            console.log("Funded mDAI: 200,000 tokens");
        }

        if (addrs.mWETH != address(0)) {
            MockERC20(addrs.mWETH).mint(address(faucet), wethLimit * 100);
            console.log("Funded mWETH: 50 tokens");
        }

        if (addrs.mWBTC != address(0)) {
            MockERC20(addrs.mWBTC).mint(address(faucet), wbtcLimit * 100);
            console.log("Funded mWBTC: 10 tokens");
        }

        if (addrs.mLINK != address(0)) {
            MockERC20(addrs.mLINK).mint(address(faucet), linkLimit * 100);
            console.log("Funded mLINK: 20,000 tokens");
        }

        if (addrs.mUNI != address(0)) {
            MockERC20(addrs.mUNI).mint(address(faucet), uniLimit * 100);
            console.log("Funded mUNI: 50,000 tokens");
        }

        vm.stopBroadcast();

        console.log("\n=== Faucet Configuration Summary ===\n");
        console.log("Faucet Address:", address(faucet));
        console.log("Cooldown Period: 24 hours");
        console.log("\nToken Limits:");
        console.log("  Stablecoins (mUSDC/mUSDT/mDAI): 2,000 per drip");
        console.log("  mWETH: 0.5 per drip");
        console.log("  mWBTC: 0.1 per drip");
        console.log("  mLINK: 200 per drip");
        console.log("  mUNI: 500 per drip");
        console.log("\n=== Faucet Ready! ===\n");

        // Output for .env file
        console.log("=== Export to .env ===");
        console.log("FAUCET_ADDRESS=", vm.toLowercase(vm.toString(address(faucet))));
    }
}
