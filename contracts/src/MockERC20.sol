// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing with access-controlled minting
 * @dev Only the contract owner can mint new tokens
 */
contract MockERC20 is ERC20, Ownable {
    /**
     * @notice Deploy a new mock ERC20 token
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply minted to deployer
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @notice Mint new tokens (owner only)
     * @param to Address to receive tokens
     * @param amount Amount to mint
     * @dev Only callable by contract owner to prevent unauthorized minting
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}