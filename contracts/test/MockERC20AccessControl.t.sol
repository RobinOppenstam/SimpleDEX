// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";

/**
 * @title MockERC20AccessControlTest
 * @notice Tests for MockERC20 access control (especially minting)
 */
contract MockERC20AccessControlTest is Test {
    MockERC20 token;
    address owner;
    address alice;
    address bob;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Deploy token with initial supply
        token = new MockERC20("Test Token", "TEST", 1000000 * 10**18);
    }

    /*//////////////////////////////////////////////////////////////
                        OWNERSHIP TESTS
    //////////////////////////////////////////////////////////////*/

    function testOwnerIsSetCorrectly() public view {
        assertEq(token.owner(), owner);
    }

    function testInitialSupplyMintedToOwner() public view {
        assertEq(token.balanceOf(owner), 1000000 * 10**18);
    }

    /*//////////////////////////////////////////////////////////////
                        MINT ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function testOwnerCanMint() public {
        uint256 mintAmount = 1000 * 10**18;
        uint256 balanceBefore = token.balanceOf(alice);

        token.mint(alice, mintAmount);

        assertEq(token.balanceOf(alice), balanceBefore + mintAmount);
    }

    function testOwnerCanMintToMultipleAddresses() public {
        token.mint(alice, 100 * 10**18);
        token.mint(bob, 200 * 10**18);

        assertEq(token.balanceOf(alice), 100 * 10**18);
        assertEq(token.balanceOf(bob), 200 * 10**18);
    }

    function testOwnerCanMintMultipleTimes() public {
        token.mint(alice, 50 * 10**18);
        token.mint(alice, 75 * 10**18);

        assertEq(token.balanceOf(alice), 125 * 10**18);
    }

    function testNonOwnerCannotMint() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1000 * 10**18);
    }

    function testUnauthorizedAddressCannotMintToSelf() public {
        uint256 balanceBefore = token.balanceOf(bob);

        vm.prank(bob);
        vm.expectRevert();
        token.mint(bob, 1000000 * 10**18);

        // Balance should remain unchanged
        assertEq(token.balanceOf(bob), balanceBefore);
    }

    function testUnauthorizedAddressCannotMintToOthers() public {
        uint256 balanceBefore = token.balanceOf(alice);

        vm.prank(bob);
        vm.expectRevert();
        token.mint(alice, 1000000 * 10**18);

        // Balance should remain unchanged
        assertEq(token.balanceOf(alice), balanceBefore);
    }

    function testMaliciousActorCannotDrainSupply() public {
        address attacker = makeAddr("attacker");

        vm.startPrank(attacker);

        // Try to mint max tokens
        vm.expectRevert();
        token.mint(attacker, type(uint256).max);

        // Attacker should have 0 tokens
        assertEq(token.balanceOf(attacker), 0);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        OWNERSHIP TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function testOwnershipCanBeTransferred() public {
        // Transfer ownership to alice
        token.transferOwnership(alice);

        assertEq(token.owner(), alice);
    }

    function testNewOwnerCanMintAfterTransfer() public {
        // Transfer ownership to alice
        token.transferOwnership(alice);

        // Alice (new owner) can mint
        vm.prank(alice);
        token.mint(bob, 500 * 10**18);

        assertEq(token.balanceOf(bob), 500 * 10**18);
    }

    function testOldOwnerCannotMintAfterTransfer() public {
        // Transfer ownership to alice
        token.transferOwnership(alice);

        // Original owner can no longer mint
        vm.expectRevert();
        token.mint(bob, 500 * 10**18);
    }

    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testOwnerCanMintAndTransfer() public {
        // Owner mints to alice
        token.mint(alice, 1000 * 10**18);

        // Alice can transfer her tokens
        vm.prank(alice);
        token.transfer(bob, 300 * 10**18);

        assertEq(token.balanceOf(alice), 700 * 10**18);
        assertEq(token.balanceOf(bob), 300 * 10**18);
    }

    function testNonOwnerCanTransferButCannotMint() public {
        // Give alice some tokens
        token.transfer(alice, 1000 * 10**18);

        vm.startPrank(alice);

        // Alice can transfer
        token.transfer(bob, 500 * 10**18);
        assertEq(token.balanceOf(bob), 500 * 10**18);

        // But alice cannot mint
        vm.expectRevert();
        token.mint(alice, 1000 * 10**18);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_OnlyOwnerCanMint(address caller, address recipient, uint256 amount) public {
        // Bound amount to reasonable values
        amount = bound(amount, 1, type(uint128).max);

        // Assume caller is not the owner
        vm.assume(caller != owner);
        vm.assume(recipient != address(0));

        uint256 balanceBefore = token.balanceOf(recipient);

        vm.prank(caller);
        vm.expectRevert();
        token.mint(recipient, amount);

        // Balance should not change
        assertEq(token.balanceOf(recipient), balanceBefore);
    }

    function testFuzz_OwnerCanAlwaysMint(address recipient, uint256 amount) public {
        // Bound amount to prevent overflow
        amount = bound(amount, 1, type(uint128).max);
        vm.assume(recipient != address(0));

        uint256 balanceBefore = token.balanceOf(recipient);

        token.mint(recipient, amount);

        assertEq(token.balanceOf(recipient), balanceBefore + amount);
    }

    /*//////////////////////////////////////////////////////////////
                        SECURITY SCENARIO TESTS
    //////////////////////////////////////////////////////////////*/

    function testScenario_FaucetIntegration() public {
        // Simulate faucet contract
        address faucet = makeAddr("faucet");

        // Owner mints tokens to faucet
        token.mint(faucet, 100000 * 10**18);

        assertEq(token.balanceOf(faucet), 100000 * 10**18);

        // Faucet can distribute but not mint
        vm.startPrank(faucet);
        token.transfer(alice, 1000 * 10**18);

        vm.expectRevert();
        token.mint(faucet, 1000 * 10**18);
        vm.stopPrank();
    }

    function testScenario_MultipleScriptsRunByOwner() public {
        // Simulate DeployFaucet script
        address faucet = makeAddr("faucet");
        token.mint(faucet, 200000 * 10**18);

        // Simulate MintTokensToUser script
        address user = makeAddr("user");
        token.mint(user, 100000 * 10**18);

        // Simulate AddLiquidity script
        address pool = makeAddr("pool");
        token.mint(pool, 50000 * 10**18);

        assertEq(token.balanceOf(faucet), 200000 * 10**18);
        assertEq(token.balanceOf(user), 100000 * 10**18);
        assertEq(token.balanceOf(pool), 50000 * 10**18);
    }

    function testScenario_AttackerCannotBypassFaucet() public {
        address attacker = makeAddr("attacker");

        // Attacker tries to mint directly instead of using faucet
        vm.startPrank(attacker);

        vm.expectRevert();
        token.mint(attacker, 1000000 * 10**18);

        // Attacker still has 0 tokens
        assertEq(token.balanceOf(attacker), 0);

        vm.stopPrank();
    }
}
