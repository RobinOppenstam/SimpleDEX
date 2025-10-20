// Quick debug script to check if environment variables are loaded
console.log('=== Environment Variables Check ===\n');

console.log('Sepolia addresses:');
console.log('FACTORY:', process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS);
console.log('ROUTER:', process.env.NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS);
console.log('PRICE_ORACLE:', process.env.NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS);
console.log('FAUCET:', process.env.NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS);

console.log('\nSepolia tokens:');
console.log('USDC:', process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS);
console.log('WETH:', process.env.NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS);

console.log('\nAnvil addresses:');
console.log('FACTORY:', process.env.NEXT_PUBLIC_FACTORY_ADDRESS);
console.log('ROUTER:', process.env.NEXT_PUBLIC_ROUTER_ADDRESS);
