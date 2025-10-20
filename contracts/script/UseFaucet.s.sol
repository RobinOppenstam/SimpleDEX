// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TokenFaucet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title UseFaucet
 * @notice Script to interact with the token faucet
 * @dev Usage: forge script script/UseFaucet.s.sol:UseFaucet --rpc-url http://localhost:8545 --private-key <YOUR_KEY> --broadcast
 */
contract UseFaucet is Script {
    function run() external {
        address faucetAddress = vm.envOr("FAUCET_ADDRESS", address(0));
        require(faucetAddress != address(0), "FAUCET_ADDRESS not set in .env");

        TokenFaucet faucet = TokenFaucet(faucetAddress);

        vm.startBroadcast();

        address user = msg.sender;

        console.log("\n=== Token Faucet ===\n");
        console.log("Faucet Address:", faucetAddress);
        console.log("Your Address:", user);
        console.log("\n=== Available Tokens ===\n");

        // Get all supported tokens
        address[] memory tokens = faucet.getSupportedTokens();

        // Check which tokens user can claim
        uint256 claimableCount = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            bool canDrip = faucet.canUserDrip(user, token);
            uint256 timeRemaining = faucet.getTimeUntilNextDrip(user, token);
            uint256 dripAmount = faucet.tokenLimits(token);

            // Get token symbol (try to read it)
            string memory symbol = getTokenSymbol(token);

            console.log("Token:", symbol, "at", token);
            console.log("  Drip Amount:", dripAmount / 10**18);

            if (canDrip) {
                console.log("  Status: Available to claim!");
                claimableCount++;
            } else {
                console.log("  Status: On cooldown");
                console.log("  Time remaining:", timeRemaining / 3600, "hours");
            }
            console.log("");
        }

        if (claimableCount == 0) {
            console.log("=== No tokens available to claim ===");
            console.log("All tokens are on cooldown. Please wait 24 hours from your last claim.");
            vm.stopBroadcast();
            return;
        }

        // Claim all available tokens
        console.log("=== Claiming Available Tokens ===\n");

        address[] memory claimableTokens = new address[](claimableCount);
        uint256 index = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            if (faucet.canUserDrip(user, tokens[i])) {
                claimableTokens[index] = tokens[i];
                index++;
            }
        }

        // Use dripMultiple for gas efficiency
        faucet.dripMultiple(claimableTokens);

        console.log("=== Tokens Claimed Successfully! ===\n");

        // Show new balances
        console.log("=== Your New Balances ===\n");
        for (uint256 i = 0; i < claimableTokens.length; i++) {
            address token = claimableTokens[i];
            uint256 balance = IERC20(token).balanceOf(user);
            string memory symbol = getTokenSymbol(token);

            console.log(symbol, ":", balance / 10**18);
        }

        console.log("\n=== Next Claim Available In 24 Hours ===\n");

        vm.stopBroadcast();
    }

    function getTokenSymbol(address token) internal view returns (string memory) {
        // Try to call symbol() function
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("symbol()"));

        if (success && data.length > 0) {
            return abi.decode(data, (string));
        }

        // Fallback to address if symbol() doesn't exist
        return vm.toString(token);
    }
}
