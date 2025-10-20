// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenFaucet
 * @notice Rate-limited token faucet for testnet distributions
 * @dev Implements 24-hour cooldown per address with configurable token limits
 */
contract TokenFaucet is Ownable, ReentrancyGuard {
    // Cooldown period (24 hours)
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    // Token limits (in token's native decimals)
    mapping(address => uint256) public tokenLimits;

    // Last drip timestamp per user per token
    mapping(address => mapping(address => uint256)) public lastDripTime;

    // Supported tokens
    address[] public supportedTokens;
    mapping(address => bool) public isTokenSupported;

    // Events
    event TokenDripped(address indexed user, address indexed token, uint256 amount);
    event TokenLimitUpdated(address indexed token, uint256 newLimit);
    event TokenAdded(address indexed token, uint256 limit);
    event TokenRemoved(address indexed token);
    event TokensWithdrawn(address indexed token, uint256 amount, address indexed to);

    // Errors
    error CooldownNotExpired(uint256 timeRemaining);
    error TokenNotSupported(address token);
    error InsufficientFaucetBalance(address token, uint256 requested, uint256 available);
    error InvalidTokenAddress();
    error InvalidLimit();
    error TokenAlreadySupported();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Request tokens from the faucet
     * @param token The token address to drip
     * @dev Enforces 24-hour cooldown and token limits
     */
    function drip(address token) external nonReentrant {
        if (!isTokenSupported[token]) revert TokenNotSupported(token);

        uint256 lastDrip = lastDripTime[msg.sender][token];
        uint256 timeSinceLastDrip = block.timestamp - lastDrip;

        if (timeSinceLastDrip < COOLDOWN_PERIOD) {
            revert CooldownNotExpired(COOLDOWN_PERIOD - timeSinceLastDrip);
        }

        uint256 amount = tokenLimits[token];
        uint256 balance = IERC20(token).balanceOf(address(this));

        if (balance < amount) {
            revert InsufficientFaucetBalance(token, amount, balance);
        }

        // Update last drip time
        lastDripTime[msg.sender][token] = block.timestamp;

        // Transfer tokens
        IERC20(token).transfer(msg.sender, amount);

        emit TokenDripped(msg.sender, token, amount);
    }

    /**
     * @notice Request multiple tokens at once
     * @param tokens Array of token addresses to drip
     * @dev More gas efficient than multiple single drips
     */
    function dripMultiple(address[] calldata tokens) external nonReentrant {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];

            if (!isTokenSupported[token]) revert TokenNotSupported(token);

            uint256 lastDrip = lastDripTime[msg.sender][token];
            uint256 timeSinceLastDrip = block.timestamp - lastDrip;

            if (timeSinceLastDrip < COOLDOWN_PERIOD) {
                revert CooldownNotExpired(COOLDOWN_PERIOD - timeSinceLastDrip);
            }

            uint256 amount = tokenLimits[token];
            uint256 balance = IERC20(token).balanceOf(address(this));

            if (balance < amount) {
                revert InsufficientFaucetBalance(token, amount, balance);
            }

            // Update last drip time
            lastDripTime[msg.sender][token] = block.timestamp;

            // Transfer tokens
            IERC20(token).transfer(msg.sender, amount);

            emit TokenDripped(msg.sender, token, amount);
        }
    }

    /**
     * @notice Add a new token to the faucet
     * @param token Token address
     * @param limit Amount to drip per request
     */
    function addToken(address token, uint256 limit) external onlyOwner {
        if (token == address(0)) revert InvalidTokenAddress();
        if (limit == 0) revert InvalidLimit();
        if (isTokenSupported[token]) revert TokenAlreadySupported();

        supportedTokens.push(token);
        isTokenSupported[token] = true;
        tokenLimits[token] = limit;

        emit TokenAdded(token, limit);
    }

    /**
     * @notice Remove a token from the faucet
     * @param token Token address
     */
    function removeToken(address token) external onlyOwner {
        if (!isTokenSupported[token]) revert TokenNotSupported(token);

        isTokenSupported[token] = false;
        tokenLimits[token] = 0;

        // Remove from array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }

        emit TokenRemoved(token);
    }

    /**
     * @notice Update the limit for a token
     * @param token Token address
     * @param newLimit New drip amount
     */
    function updateTokenLimit(address token, uint256 newLimit) external onlyOwner {
        if (!isTokenSupported[token]) revert TokenNotSupported(token);
        if (newLimit == 0) revert InvalidLimit();

        tokenLimits[token] = newLimit;
        emit TokenLimitUpdated(token, newLimit);
    }

    /**
     * @notice Batch update token limits
     * @param tokens Array of token addresses
     * @param limits Array of new limits
     */
    function updateTokenLimits(
        address[] calldata tokens,
        uint256[] calldata limits
    ) external onlyOwner {
        require(tokens.length == limits.length, "Array length mismatch");

        for (uint256 i = 0; i < tokens.length; i++) {
            if (!isTokenSupported[tokens[i]]) revert TokenNotSupported(tokens[i]);
            if (limits[i] == 0) revert InvalidLimit();

            tokenLimits[tokens[i]] = limits[i];
            emit TokenLimitUpdated(tokens[i], limits[i]);
        }
    }

    /**
     * @notice Withdraw tokens from faucet (emergency/rebalance)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function withdrawTokens(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).transfer(to, amount);
        emit TokensWithdrawn(token, amount, to);
    }

    /**
     * @notice Get time remaining until user can drip again
     * @param user User address
     * @param token Token address
     * @return timeRemaining Seconds until cooldown expires (0 if can drip now)
     */
    function getTimeUntilNextDrip(
        address user,
        address token
    ) external view returns (uint256 timeRemaining) {
        uint256 lastDrip = lastDripTime[user][token];
        if (lastDrip == 0) return 0; // Never dripped

        uint256 timeSinceLastDrip = block.timestamp - lastDrip;
        if (timeSinceLastDrip >= COOLDOWN_PERIOD) {
            return 0;
        }

        return COOLDOWN_PERIOD - timeSinceLastDrip;
    }

    /**
     * @notice Check if user can drip a token
     * @param user User address
     * @param token Token address
     * @return canDrip True if user can drip now
     */
    function canUserDrip(address user, address token) external view returns (bool canDrip) {
        if (!isTokenSupported[token]) return false;

        uint256 lastDrip = lastDripTime[user][token];
        if (lastDrip == 0) return true; // Never dripped

        uint256 timeSinceLastDrip = block.timestamp - lastDrip;
        return timeSinceLastDrip >= COOLDOWN_PERIOD;
    }

    /**
     * @notice Get all supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    /**
     * @notice Get faucet balance for a token
     * @param token Token address
     * @return balance Faucet's balance of the token
     */
    function getFaucetBalance(address token) external view returns (uint256 balance) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get user's drip info for a token
     * @param user User address
     * @param token Token address
     * @return lastDrip Timestamp of last drip
     * @return canDrip Whether user can drip now
     * @return timeRemaining Seconds until can drip (0 if can drip now)
     * @return dripAmount Amount they will receive
     */
    function getUserDripInfo(
        address user,
        address token
    )
        external
        view
        returns (
            uint256 lastDrip,
            bool canDrip,
            uint256 timeRemaining,
            uint256 dripAmount
        )
    {
        lastDrip = lastDripTime[user][token];

        if (!isTokenSupported[token]) {
            return (lastDrip, false, 0, 0);
        }

        dripAmount = tokenLimits[token];

        if (lastDrip == 0) {
            return (lastDrip, true, 0, dripAmount);
        }

        uint256 timeSinceLastDrip = block.timestamp - lastDrip;
        if (timeSinceLastDrip >= COOLDOWN_PERIOD) {
            return (lastDrip, true, 0, dripAmount);
        }

        timeRemaining = COOLDOWN_PERIOD - timeSinceLastDrip;
        return (lastDrip, false, timeRemaining, dripAmount);
    }
}
