// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/DEXFactory.sol";
import "../src/DEXRouter.sol";

/**
 * @title TestConnection
 * @notice Script to verify contract deployment and balances
 */
contract TestConnection is Script {
    // Contract addresses
    address constant FACTORY = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address constant ROUTER = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;

    // Token addresses
    address constant USDC = 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9;
    address constant USDT = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707;
    address constant DAI = 0x0165878A594ca255338adfa4d48449f69242Eb8F;
    address constant WETH = 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853;

    // Test user address (Anvil account #1)
    address constant TEST_USER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    function run() external view {
        console.log("=== Testing Contract Connections ===\n");

        // Test Factory
        console.log("1. Factory Contract:");
        console.log("   Address:", FACTORY);
        try DEXFactory(FACTORY).allPairsLength() returns (uint256 pairCount) {
            console.log("   Status: CONNECTED");
            console.log("   Pair Count:", pairCount);
        } catch {
            console.log("   Status: FAILED - Cannot connect");
        }
        console.log("");

        // Test Router
        console.log("2. Router Contract:");
        console.log("   Address:", ROUTER);
        try DEXRouter(ROUTER).factory() returns (address factoryAddr) {
            console.log("   Status: CONNECTED");
            console.log("   Factory:", factoryAddr);
        } catch {
            console.log("   Status: FAILED - Cannot connect");
        }
        console.log("");

        // Test Tokens
        console.log("3. Token Contracts:");
        console.log("");

        testToken("USDC", USDC);
        testToken("USDT", USDT);
        testToken("DAI", DAI);
        testToken("WETH", WETH);

        console.log("4. Test User Balances:");
        console.log("   User Address:", TEST_USER);
        console.log("");

        testUserBalance("USDC", USDC, TEST_USER);
        testUserBalance("USDT", USDT, TEST_USER);
        testUserBalance("DAI", DAI, TEST_USER);
        testUserBalance("WETH", WETH, TEST_USER);

        // Test a pair
        console.log("5. Sample Pair (WETH/USDC):");
        try DEXFactory(FACTORY).getPair(WETH, USDC) returns (address pairAddr) {
            console.log("   Pair Address:", pairAddr);
            if (pairAddr != address(0)) {
                console.log("   Status: EXISTS");
            } else {
                console.log("   Status: NOT CREATED");
            }
        } catch {
            console.log("   Status: FAILED");
        }
        console.log("");

        console.log("=== Test Complete ===");
    }

    function testToken(string memory symbol, address tokenAddr) internal view {
        console.log("   ", symbol);
        console.log("      Address:", tokenAddr);

        try MockERC20(tokenAddr).name() returns (string memory name) {
            console.log("      Status: CONNECTED");
            console.log("      Name:", name);

            try MockERC20(tokenAddr).totalSupply() returns (uint256 supply) {
                console.log("      Total Supply:", supply / 10**18);
            } catch {}
        } catch {
            console.log("      Status: FAILED - Cannot connect");
        }
        console.log("");
    }

    function testUserBalance(string memory symbol, address tokenAddr, address user) internal view {
        try MockERC20(tokenAddr).balanceOf(user) returns (uint256 balance) {
            console.log("   ", symbol, ":", balance / 10**18);
        } catch {
            console.log("   ", symbol, ": FAILED");
        }
    }
}
