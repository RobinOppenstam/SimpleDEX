// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";

/**
 * @title MintTokensToUser
 * @notice Script to mint tokens to a specific user address for testing
 *
 * ⚠️  SECURITY WARNING:
 * - This script requires OWNER privileges (only token owner can mint)
 * - Only use for testing/development purposes
 * - For testnet: Update hardcoded addresses below
 *
 * @dev Usage:
 *   forge script script/MintTokensToUser.s.sol:MintTokensToUser \
 *     --rpc-url <RPC_URL> \
 *     --private-key <OWNER_PRIVATE_KEY> \
 *     --broadcast
 */
contract MintTokensToUser is Script {
    // ⚠️ HARDCODED ADDRESSES - These are for LOCAL Anvil only!
    // TODO: For testnet, either update these or use vm.envOr() to read from .env
    address constant USDC = 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9;
    address constant USDT = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707;
    address constant DAI = 0x0165878A594ca255338adfa4d48449f69242Eb8F;
    address constant WETH = 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853;
    address constant WBTC = 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6;
    address constant LINK = 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318;
    address constant UNI = 0x610178dA211FEF7D417bC0e6FeD39F05609AD788;

    function run() external {
        // Get user address from environment or use a default test address
        address user = vm.envOr("USER_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)); // Anvil account #1

        vm.startBroadcast();

        console.log("=== Minting tokens to:", user);
        console.log("");

        // Mint generous amounts for testing
        MockERC20(USDC).mint(user, 100000 * 10**18);
        console.log("USDC: Minted 100,000 tokens");

        MockERC20(USDT).mint(user, 100000 * 10**18);
        console.log("USDT: Minted 100,000 tokens");

        MockERC20(DAI).mint(user, 100000 * 10**18);
        console.log("DAI: Minted 100,000 tokens");

        MockERC20(WETH).mint(user, 1000 * 10**18);
        console.log("WETH: Minted 1,000 tokens");

        MockERC20(WBTC).mint(user, 50 * 10**18);
        console.log("WBTC: Minted 50 tokens");

        MockERC20(LINK).mint(user, 10000 * 10**18);
        console.log("LINK: Minted 10,000 tokens");

        MockERC20(UNI).mint(user, 10000 * 10**18);
        console.log("UNI: Minted 10,000 tokens");

        console.log("");
        console.log("=== Tokens minted successfully! ===");
        console.log("User can now trade on the DEX");

        vm.stopBroadcast();
    }
}
