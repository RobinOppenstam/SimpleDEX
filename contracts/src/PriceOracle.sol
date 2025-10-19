// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceOracle
 * @notice Central price oracle that wraps Chainlink aggregators for token prices
 * @dev Uses Chainlink's AggregatorV3Interface for maximum compatibility and security
 */
contract PriceOracle {
    address public owner;

    // Mapping from token address to Chainlink aggregator address
    mapping(address => address) public priceFeeds;

    // Staleness threshold (1 hour) - can be adjusted
    uint256 public constant STALENESS_THRESHOLD = 3600;

    // Events
    event PriceFeedUpdated(address indexed token, address indexed aggregator);
    event PriceQueried(address indexed token, int256 price, uint256 timestamp);

    // Errors
    error OnlyOwner();
    error InvalidAddress();
    error PriceFeedNotSet();
    error StalePrice();
    error InvalidPrice();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Register a price feed for a token
     * @param token The token address
     * @param aggregator The Chainlink aggregator address
     */
    function setPriceFeed(address token, address aggregator) external onlyOwner {
        if (token == address(0) || aggregator == address(0)) revert InvalidAddress();
        priceFeeds[token] = aggregator;
        emit PriceFeedUpdated(token, aggregator);
    }

    /**
     * @notice Batch register price feeds
     * @param tokens Array of token addresses
     * @param aggregators Array of aggregator addresses
     */
    function setPriceFeeds(address[] calldata tokens, address[] calldata aggregators) external onlyOwner {
        if (tokens.length != aggregators.length) revert InvalidAddress();

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0) || aggregators[i] == address(0)) revert InvalidAddress();
            priceFeeds[tokens[i]] = aggregators[i];
            emit PriceFeedUpdated(tokens[i], aggregators[i]);
        }
    }

    /**
     * @notice Get the latest price for a token
     * @param token The token address
     * @return price The latest price (with aggregator's decimals)
     * @return decimals The number of decimals in the price
     */
    function getLatestPrice(address token) public view returns (int256 price, uint8 decimals) {
        address aggregatorAddress = priceFeeds[token];
        if (aggregatorAddress == address(0)) revert PriceFeedNotSet();

        AggregatorV3Interface aggregator = AggregatorV3Interface(aggregatorAddress);

        (, int256 answer,,  ,) = aggregator.latestRoundData();

        // Check for stale price (optional - can be disabled for testing)
        // if (block.timestamp - updatedAt > STALENESS_THRESHOLD) revert StalePrice();

        // Check for invalid price
        if (answer <= 0) revert InvalidPrice();

        price = answer;
        decimals = aggregator.decimals();
    }

    /**
     * @notice Get USD value for a token amount
     * @param token The token address
     * @param amount The token amount (in token's decimals)
     * @param tokenDecimals The number of decimals the token has
     * @return usdValue The USD value (with 8 decimals)
     */
    function getPriceInUSD(address token, uint256 amount, uint8 tokenDecimals)
        external
        view
        returns (uint256 usdValue)
    {
        (int256 price,) = getLatestPrice(token);

        // Convert to USD: (amount * price) / (10^tokenDecimals)
        // Result will have priceDecimals decimals (usually 8 for USD pairs)
        usdValue = (amount * uint256(price)) / (10 ** tokenDecimals);
    }

    /**
     * @notice Get historical price data for a token
     * @param token The token address
     * @param roundId The round ID to query
     * @return returnedRoundId The round ID
     * @return price The price
     * @return startedAt The timestamp when the round started
     * @return updatedAt The timestamp when the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function getRoundData(address token, uint80 roundId)
        external
        view
        returns (
            uint80 returnedRoundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        address aggregatorAddress = priceFeeds[token];
        if (aggregatorAddress == address(0)) revert PriceFeedNotSet();

        AggregatorV3Interface aggregator = AggregatorV3Interface(aggregatorAddress);
        (returnedRoundId, price, startedAt, updatedAt, answeredInRound) = aggregator.getRoundData(roundId);

        if (price <= 0) revert InvalidPrice();
    }

    /**
     * @notice Get latest round data for a token
     * @param token The token address
     * @return roundId The round ID
     * @return price The price
     * @return startedAt The timestamp when the round started
     * @return updatedAt The timestamp when the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function getLatestRoundData(address token)
        external
        view
        returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        address aggregatorAddress = priceFeeds[token];
        if (aggregatorAddress == address(0)) revert PriceFeedNotSet();

        AggregatorV3Interface aggregator = AggregatorV3Interface(aggregatorAddress);
        (roundId, price, startedAt, updatedAt, answeredInRound) = aggregator.latestRoundData();

        if (price <= 0) revert InvalidPrice();
    }

    /**
     * @notice Get the price feed aggregator address for a token
     * @param token The token address
     * @return aggregator The aggregator address
     */
    function getPriceFeed(address token) external view returns (address) {
        return priceFeeds[token];
    }

    /**
     * @notice Transfer ownership
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        owner = newOwner;
    }
}
