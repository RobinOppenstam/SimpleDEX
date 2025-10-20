#!/usr/bin/env python3
"""
Extract all pair addresses from the DEXFactory contract and update .env files
"""

import json
import os
import sys
from pathlib import Path
from web3 import Web3

def get_pair_addresses(factory_address, token_pairs, rpc_url):
    """Fetch pair addresses from factory contract"""
    w3 = Web3(Web3.HTTPProvider(rpc_url))

    # Factory ABI - just the getPair function
    factory_abi = [
        {
            "inputs": [
                {"internalType": "address", "name": "tokenA", "type": "address"},
                {"internalType": "address", "name": "tokenB", "type": "address"}
            ],
            "name": "getPair",
            "outputs": [{"internalType": "address", "name": "pair", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    factory = w3.eth.contract(address=factory_address, abi=factory_abi)

    pairs = {}
    for name, (token_a, token_b) in token_pairs.items():
        try:
            pair_address = factory.functions.getPair(token_a, token_b).call()
            if pair_address != '0x0000000000000000000000000000000000000000':
                pairs[name] = pair_address
                print(f"✓ {name}: {pair_address}")
            else:
                print(f"✗ {name}: No pair found")
        except Exception as e:
            print(f"✗ {name}: Error - {e}")

    return pairs

def update_contract_env(pairs, chain_id):
    """Update contracts/.env with pair addresses"""
    env_file = Path(__file__).parent / ".env"

    # Read existing .env
    env_lines = []
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_lines = f.readlines()

    # Remove old pair addresses section
    new_lines = []
    skip_section = False
    for line in env_lines:
        if line.strip().startswith('# Pair Addresses'):
            skip_section = True
        elif skip_section and line.strip() and not line.strip().startswith('PAIR_'):
            skip_section = False

        if not skip_section and not line.strip().startswith('PAIR_'):
            new_lines.append(line)

    # Add new pair addresses section
    network_name = "Sepolia" if chain_id == 11155111 else "Anvil"
    new_lines.append(f"\n# Pair Addresses ({network_name} - Chain ID {chain_id})\n")
    for name, address in pairs.items():
        env_var = f"PAIR_{name.replace('/', '_').replace('m', '').upper()}"
        new_lines.append(f"{env_var}={address}\n")

    # Write back
    with open(env_file, 'w') as f:
        f.writelines(new_lines)

    print(f"\n✓ Updated {env_file}")

def update_frontend_env(pairs, chain_id):
    """Update frontend/.env.local with pair addresses"""
    env_file = Path(__file__).parent.parent / "dex-frontend" / ".env.local"

    # Read existing .env.local
    env_lines = []
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_lines = f.readlines()

    # Remove old pair addresses for this network
    network_prefix = "SEPOLIA" if chain_id == 11155111 else "ANVIL"
    new_lines = []
    for line in env_lines:
        if not line.strip().startswith(f'NEXT_PUBLIC_{network_prefix}_PAIR_'):
            new_lines.append(line)

    # Add new pair addresses
    network_name = "Sepolia" if chain_id == 11155111 else "Anvil"
    new_lines.append(f"\n# {network_name} Pair Addresses\n")
    for name, address in pairs.items():
        env_var = f"NEXT_PUBLIC_{network_prefix}_PAIR_{name.replace('/', '_').replace('m', '').upper()}"
        new_lines.append(f"{env_var}={address}\n")

    # Write back
    with open(env_file, 'w') as f:
        f.writelines(new_lines)

    print(f"✓ Updated {env_file}")

def main():
    # Determine chain ID
    chain_id = 31337  # Default to Anvil
    if len(sys.argv) > 1:
        chain_id = int(sys.argv[1])

    network_name = "Sepolia" if chain_id == 11155111 else "Anvil"
    print(f"\n=== Extracting Pair Addresses for {network_name} (Chain ID: {chain_id}) ===\n")

    # Load .env to get contract addresses
    env_file = Path(__file__).parent / ".env"
    env_vars = {}
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()

    # Get contract addresses
    factory_address = env_vars.get('FACTORY_ADDRESS')
    if not factory_address:
        print("❌ FACTORY_ADDRESS not found in .env")
        sys.exit(1)

    # Get token addresses
    usdc = env_vars.get('USDC_ADDRESS')
    usdt = env_vars.get('USDT_ADDRESS')
    dai = env_vars.get('DAI_ADDRESS')
    weth = env_vars.get('WETH_ADDRESS')
    wbtc = env_vars.get('WBTC_ADDRESS')
    link = env_vars.get('LINK_ADDRESS')
    uni = env_vars.get('UNI_ADDRESS')

    # Define pairs (matching CreatePairs.s.sol)
    token_pairs = {
        'mUSDC/mUSDT': (usdc, usdt),
        'mUSDC/mDAI': (usdc, dai),
        'mWETH/mUSDC': (weth, usdc),
        'mWETH/mUSDT': (weth, usdt),
        'mWETH/mDAI': (weth, dai),
        'mWBTC/mUSDC': (wbtc, usdc),
        'mWBTC/mWETH': (wbtc, weth),
        'mLINK/mUSDC': (link, usdc),
        'mLINK/mWETH': (link, weth),
        'mUNI/mUSDC': (uni, usdc),
    }

    # Get RPC URL
    if chain_id == 11155111:
        rpc_url = env_vars.get('SEPOLIA_RPC_URL', 'https://sepolia.infura.io/v3/')
    else:
        rpc_url = env_vars.get('RPC_URL', 'http://localhost:8545')

    print(f"Factory: {factory_address}")
    print(f"RPC: {rpc_url}")
    print(f"\nFetching pair addresses...\n")

    # Fetch pair addresses
    pairs = get_pair_addresses(factory_address, token_pairs, rpc_url)

    if not pairs:
        print("\n❌ No pairs found. Make sure pairs have been created.")
        sys.exit(1)

    print(f"\n✓ Found {len(pairs)} pairs\n")

    # Update environment files
    update_contract_env(pairs, chain_id)
    update_frontend_env(pairs, chain_id)

    print("\n✅ Pair addresses extracted and updated successfully!")
    print("\nNext steps:")
    print("1. Restart frontend: cd dex-frontend && npm run dev")
    print("2. Hard refresh browser (Ctrl+Shift+R)")

if __name__ == '__main__':
    main()
