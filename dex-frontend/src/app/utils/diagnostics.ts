// Diagnostic utility to debug contract connections
import { ethers } from 'ethers';

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

export async function runDiagnostics(provider: ethers.Provider, factoryAddress: string) {
  console.log('=== DEX Frontend Diagnostics ===\n');

  try {
    // 1. Check network
    const network = await provider.getNetwork();
    console.log('✓ Network Info:');
    console.log(`  Chain ID: ${network.chainId}`);
    console.log(`  Name: ${network.name}`);

    // 2. Check block number
    const blockNumber = await provider.getBlockNumber();
    console.log(`\n✓ Current Block: ${blockNumber}`);

    // 3. Check factory contract
    console.log('\n✓ Factory Contract:');
    console.log(`  Address: ${factoryAddress}`);

    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const pairCount = await factory.allPairsLength();
    console.log(`  Pair Count: ${pairCount.toString()}`);

    // 4. Test a known pair
    const WETH = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';
    const USDC = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

    console.log('\n✓ Testing WETH/USDC Pair:');
    const pairAddress = await factory.getPair(WETH, USDC);
    console.log(`  Pair Address: ${pairAddress}`);

    if (pairAddress !== ethers.ZeroAddress) {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const [reserve0, reserve1] = await pair.getReserves();
      console.log(`  Reserve0: ${ethers.formatEther(reserve0)}`);
      console.log(`  Reserve1: ${ethers.formatEther(reserve1)}`);
    } else {
      console.log('  ❌ Pair does not exist!');
    }

    console.log('\n=== Diagnostics Complete ===');
    return true;
  } catch (error) {
    console.error('\n❌ Diagnostic Error:', error);
    return false;
  }
}
