// utils/etherscan.ts
import { ethers } from 'ethers';

// Etherscan API endpoints
const ETHERSCAN_API_URLS: Record<number, string> = {
  11155111: 'https://api-sepolia.etherscan.io/api', // Sepolia
  1: 'https://api.etherscan.io/api', // Mainnet
};

interface EtherscanLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  gasPrice: string;
  gasUsed: string;
  logIndex: string;
  transactionHash: string;
  transactionIndex: string;
}

interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanLog[] | string;
}

/**
 * Fetch event logs from Etherscan API
 * Much more efficient than querying via eth_getLogs for historical data
 */
export async function fetchLogsFromEtherscan(
  chainId: number,
  contractAddress: string,
  topics: string[],
  fromBlock: number = 0,
  toBlock: number | 'latest' = 'latest',
  apiKey?: string
): Promise<ethers.Log[]> {
  const baseUrl = ETHERSCAN_API_URLS[chainId];

  if (!baseUrl) {
    throw new Error(`Etherscan API not available for chain ID ${chainId}`);
  }

  // Build query parameters
  const params = new URLSearchParams({
    module: 'logs',
    action: 'getLogs',
    address: contractAddress,
    fromBlock: fromBlock.toString(),
    toBlock: toBlock === 'latest' ? 'latest' : toBlock.toString(),
    page: '1',
    offset: '1000', // Max 1000 per request
  });

  // Add topics (event signature and indexed parameters)
  topics.forEach((topic, index) => {
    if (topic) {
      params.append(`topic${index}`, topic);
      if (index < topics.length - 1) {
        params.append(`topic${index}_${index + 1}_opr`, 'and');
      }
    }
  });

  // Add API key if provided
  if (apiKey) {
    params.append('apikey', apiKey);
  }

  const url = `${baseUrl}?${params.toString()}`;

  console.log(`[Etherscan] Fetching logs from ${contractAddress.slice(0, 10)}...`);
  console.log(`[Etherscan] URL: ${url}`);

  try {
    const response = await fetch(url);
    const data: EtherscanResponse = await response.json();

    console.log(`[Etherscan] Response:`, data);

    if (data.status !== '1') {
      // Status "0" with "No records found" is not an error, just empty results
      if (data.message === 'No records found') {
        console.log(`[Etherscan] No logs found for ${contractAddress.slice(0, 10)}`);
        return [];
      }
      throw new Error(`Etherscan API error: ${data.message}`);
    }

    // Convert Etherscan logs to ethers.js Log format
    const logs = (data.result as EtherscanLog[]).map((log) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: parseInt(log.blockNumber, 16),
      transactionHash: log.transactionHash,
      transactionIndex: parseInt(log.transactionIndex, 16),
      logIndex: parseInt(log.logIndex, 16),
      removed: false,
      blockHash: '', // Not provided by Etherscan
      index: parseInt(log.logIndex, 16),
    })) as ethers.Log[];

    console.log(`[Etherscan] Fetched ${logs.length} logs from ${contractAddress.slice(0, 10)}`);
    return logs;
  } catch (error) {
    console.error('[Etherscan] Error fetching logs:', error);
    throw error;
  }
}

/**
 * Fetch logs with pagination support
 * Automatically handles multiple requests if there are more than 1000 logs
 */
export async function fetchAllLogsFromEtherscan(
  chainId: number,
  contractAddress: string,
  topics: string[],
  fromBlock: number = 0,
  toBlock: number | 'latest' = 'latest',
  apiKey?: string
): Promise<ethers.Log[]> {
  const allLogs: ethers.Log[] = [];
  let page = 1;
  const maxPerPage = 1000;

  while (true) {
    const baseUrl = ETHERSCAN_API_URLS[chainId];

    if (!baseUrl) {
      throw new Error(`Etherscan API not available for chain ID ${chainId}`);
    }

    const params = new URLSearchParams({
      module: 'logs',
      action: 'getLogs',
      address: contractAddress,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock === 'latest' ? 'latest' : toBlock.toString(),
      page: page.toString(),
      offset: maxPerPage.toString(),
    });

    topics.forEach((topic, index) => {
      if (topic) {
        params.append(`topic${index}`, topic);
        if (index < topics.length - 1) {
          params.append(`topic${index}_${index + 1}_opr`, 'and');
        }
      }
    });

    if (apiKey) {
      params.append('apikey', apiKey);
    }

    const url = `${baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data: EtherscanResponse = await response.json();

      console.log(`[Etherscan] Response for page ${page}:`, data);

      if (data.status !== '1') {
        if (data.message === 'No records found') {
          break;
        }
        console.error(`[Etherscan] Full error response:`, JSON.stringify(data));
        throw new Error(`Etherscan API error: ${data.message}${data.result ? ' - ' + data.result : ''}`);
      }

      const logs = (data.result as EtherscanLog[]).map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: parseInt(log.blockNumber, 16),
        transactionHash: log.transactionHash,
        transactionIndex: parseInt(log.transactionIndex, 16),
        logIndex: parseInt(log.logIndex, 16),
        removed: false,
        blockHash: '',
        index: parseInt(log.logIndex, 16),
      })) as ethers.Log[];

      allLogs.push(...logs);

      // If we got less than maxPerPage, we've reached the end
      if (logs.length < maxPerPage) {
        break;
      }

      page++;

      // Add a small delay to respect rate limits (5 calls/second)
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`[Etherscan] Error fetching page ${page}:`, error);
      throw error;
    }
  }

  console.log(`[Etherscan] Total logs fetched: ${allLogs.length}`);
  return allLogs;
}
