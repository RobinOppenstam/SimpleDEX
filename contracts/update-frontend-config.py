#!/usr/bin/env python3

"""
Update frontend configuration files with contract addresses from .env
"""

import os
import re
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[0;32m'
    BLUE = '\033[0;34m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

def load_env():
    """Load environment variables from .env file"""
    env_file = Path(__file__).parent / ".env"

    if not env_file.exists():
        print(f"{Colors.RED}Error: .env file not found at {env_file}{Colors.NC}")
        print(f"{Colors.YELLOW}Run python3 extract-addresses.py first to generate .env{Colors.NC}")
        return None

    env_vars = {}
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

    return env_vars

def update_tokens_config(env_vars, frontend_dir):
    """Update src/app/config/tokens.ts"""
    tokens_file = frontend_dir / "src/app/config/tokens.ts"

    if not tokens_file.exists():
        print(f"{Colors.YELLOW}⚠ tokens.ts not found, skipping{Colors.NC}")
        return

    with open(tokens_file, 'r') as f:
        content = f.read()

    # Replace token addresses in the TOKENS object
    tokens_section = f"""// Main token registry - Updated with latest Anvil deployment
export const TOKENS: Record<string, Token> = {{
  mUSDC: {{
    address: '{env_vars.get('USDC_ADDRESS', '')}',
    symbol: 'mUSDC',
    name: 'Mock USD Coin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDC.png',
  }},
  mUSDT: {{
    address: '{env_vars.get('USDT_ADDRESS', '')}',
    symbol: 'mUSDT',
    name: 'Mock Tether USD',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDT.png',
  }},
  mDAI: {{
    address: '{env_vars.get('DAI_ADDRESS', '')}',
    symbol: 'mDAI',
    name: 'Mock Dai Stablecoin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/DAI.png',
  }},
  mWETH: {{
    address: '{env_vars.get('WETH_ADDRESS', '')}',
    symbol: 'mWETH',
    name: 'Mock Wrapped Ether',
    decimals: 18,
    logoURI: '/WETH.png',
  }},
  mWBTC: {{
    address: '{env_vars.get('WBTC_ADDRESS', '')}',
    symbol: 'mWBTC',
    name: 'Mock Wrapped Bitcoin',
    decimals: 18,
    logoURI: '/bitcoin.png',
  }},
  mLINK: {{
    address: '{env_vars.get('LINK_ADDRESS', '')}',
    symbol: 'mLINK',
    name: 'Mock Chainlink',
    decimals: 18,
    logoURI: '/LINK.png',
  }},
  mUNI: {{
    address: '{env_vars.get('UNI_ADDRESS', '')}',
    symbol: 'mUNI',
    name: 'Mock Uniswap',
    decimals: 18,
    logoURI: '/UNI.png',
  }},
}};"""

    # Replace the TOKENS section
    pattern = r'// Main token registry.*?\n};'
    content = re.sub(pattern, tokens_section, content, flags=re.DOTALL)

    with open(tokens_file, 'w') as f:
        f.write(content)

    print(f"{Colors.GREEN}✓ Updated tokens.ts{Colors.NC}")

def update_pricefeeds_config(env_vars, frontend_dir):
    """Update src/app/config/priceFeeds.ts"""
    pricefeeds_file = frontend_dir / "src/app/config/priceFeeds.ts"

    if not pricefeeds_file.exists():
        print(f"{Colors.YELLOW}⚠ priceFeeds.ts not found, skipping{Colors.NC}")
        return

    with open(pricefeeds_file, 'r') as f:
        content = f.read()

    # Replace configuration section - match from start to the ABI section
    config_section = f"""// Price Oracle Configuration

export const PRICE_ORACLE_ADDRESS = '{env_vars.get('PRICE_ORACLE_ADDRESS', '')}';

// Individual aggregator addresses (for direct queries if needed)
export const AGGREGATORS = {{
  mWETH: '{env_vars.get('ETH_USD_AGGREGATOR', '')}',
  mWBTC: '{env_vars.get('BTC_USD_AGGREGATOR', '')}',
  mLINK: '{env_vars.get('LINK_USD_AGGREGATOR', '')}',
  mUNI: '{env_vars.get('UNI_USD_AGGREGATOR', '')}',
  mUSDC: '{env_vars.get('USDC_USD_AGGREGATOR', '')}',
  mUSDT: '{env_vars.get('USDT_USD_AGGREGATOR', '')}',
  mDAI: '{env_vars.get('DAI_USD_AGGREGATOR', '')}',
}};

"""

    # Replace everything from start to the Price Oracle ABI comment
    pattern = r'^.*?(?=// Price Oracle ABI)'
    content = re.sub(pattern, config_section, content, flags=re.DOTALL)

    with open(pricefeeds_file, 'w') as f:
        f.write(content)

    print(f"{Colors.GREEN}✓ Updated priceFeeds.ts{Colors.NC}")

def update_page_config(env_vars, frontend_dir):
    """Update src/app/page.tsx"""
    page_file = frontend_dir / "src/app/page.tsx"

    if not page_file.exists():
        print(f"{Colors.YELLOW}⚠ page.tsx not found, skipping{Colors.NC}")
        return

    with open(page_file, 'r') as f:
        content = f.read()

    # Replace CONTRACTS object
    content = re.sub(
        r"ROUTER: '0x[a-fA-F0-9]{40}'",
        f"ROUTER: '{env_vars.get('ROUTER_ADDRESS', '')}'",
        content
    )
    content = re.sub(
        r"FACTORY: '0x[a-fA-F0-9]{40}'",
        f"FACTORY: '{env_vars.get('FACTORY_ADDRESS', '')}'",
        content
    )
    content = re.sub(
        r"TOKEN_A: '0x[a-fA-F0-9]{40}'",
        f"TOKEN_A: '{env_vars.get('TOKEN_A_ADDRESS', '')}'",
        content
    )
    content = re.sub(
        r"TOKEN_B: '0x[a-fA-F0-9]{40}'",
        f"TOKEN_B: '{env_vars.get('TOKEN_B_ADDRESS', '')}'",
        content
    )

    with open(page_file, 'w') as f:
        f.write(content)

    print(f"{Colors.GREEN}✓ Updated page.tsx{Colors.NC}")

def update_deprecated_config(env_vars, frontend_dir):
    """Update src/config/tokens.ts (deprecated)"""
    deprecated_file = frontend_dir / "src/config/tokens.ts"

    if not deprecated_file.exists():
        print(f"{Colors.YELLOW}⚠ config/tokens.ts not found, skipping{Colors.NC}")
        return

    with open(deprecated_file, 'r') as f:
        content = f.read()

    # Update addresses
    replacements = [
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'TKA'", f"address: '{env_vars.get('TOKEN_A_ADDRESS', '')}', symbol: 'TKA'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'TKB'", f"address: '{env_vars.get('TOKEN_B_ADDRESS', '')}', symbol: 'TKB'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'USDC'", f"address: '{env_vars.get('USDC_ADDRESS', '')}', symbol: 'USDC'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'USDT'", f"address: '{env_vars.get('USDT_ADDRESS', '')}', symbol: 'USDT'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'DAI'", f"address: '{env_vars.get('DAI_ADDRESS', '')}', symbol: 'DAI'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'WETH'", f"address: '{env_vars.get('WETH_ADDRESS', '')}', symbol: 'WETH'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'WBTC'", f"address: '{env_vars.get('WBTC_ADDRESS', '')}', symbol: 'WBTC'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'LINK'", f"address: '{env_vars.get('LINK_ADDRESS', '')}', symbol: 'LINK'"),
        (r"address: '0x[a-fA-F0-9]{40}',\s*symbol: 'UNI'", f"address: '{env_vars.get('UNI_ADDRESS', '')}', symbol: 'UNI'"),
    ]

    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)

    # Update CONTRACTS
    content = re.sub(
        r"ROUTER: '0x[a-fA-F0-9]{40}'",
        f"ROUTER: '{env_vars.get('ROUTER_ADDRESS', '')}'",
        content
    )
    content = re.sub(
        r"FACTORY: '0x[a-fA-F0-9]{40}'",
        f"FACTORY: '{env_vars.get('FACTORY_ADDRESS', '')}'",
        content
    )

    with open(deprecated_file, 'w') as f:
        f.write(content)

    print(f"{Colors.GREEN}✓ Updated deprecated config/tokens.ts{Colors.NC}")

def update_env_local(env_vars, frontend_dir, network='anvil'):
    """Create or update .env.local with contract addresses"""
    env_local_file = frontend_dir / ".env.local"

    # Check if .env.local already exists to preserve other network's addresses
    existing_env = {}
    if env_local_file.exists():
        with open(env_local_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    existing_env[key.strip()] = value.strip()

    # Determine which network we're updating
    if network == 'sepolia':
        # Update Sepolia addresses
        existing_env['NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS'] = env_vars.get('FACTORY_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS'] = env_vars.get('ROUTER_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS'] = env_vars.get('PRICE_ORACLE_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS'] = env_vars.get('FAUCET_ADDRESS', '')

        # Update Sepolia token addresses
        existing_env['NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS'] = env_vars.get('USDC_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_USDT_ADDRESS'] = env_vars.get('USDT_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_DAI_ADDRESS'] = env_vars.get('DAI_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS'] = env_vars.get('WETH_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_WBTC_ADDRESS'] = env_vars.get('WBTC_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_LINK_ADDRESS'] = env_vars.get('LINK_ADDRESS', '')
        existing_env['NEXT_PUBLIC_SEPOLIA_UNI_ADDRESS'] = env_vars.get('UNI_ADDRESS', '')

        # Get Sepolia RPC URL from .env if available
        if 'SEPOLIA_RPC_URL' in env_vars:
            existing_env['NEXT_PUBLIC_SEPOLIA_RPC_URL'] = env_vars['SEPOLIA_RPC_URL']

        print(f"{Colors.GREEN}✓ Updated Sepolia addresses in .env.local{Colors.NC}")
    else:
        # Update Anvil addresses
        existing_env['NEXT_PUBLIC_FACTORY_ADDRESS'] = env_vars.get('FACTORY_ADDRESS', '')
        existing_env['NEXT_PUBLIC_ROUTER_ADDRESS'] = env_vars.get('ROUTER_ADDRESS', '')
        existing_env['NEXT_PUBLIC_PRICE_ORACLE_ADDRESS'] = env_vars.get('PRICE_ORACLE_ADDRESS', '')
        existing_env['NEXT_PUBLIC_FAUCET_ADDRESS'] = env_vars.get('FAUCET_ADDRESS', '')
        existing_env['NEXT_PUBLIC_ANVIL_RPC_URL'] = 'http://127.0.0.1:8545'

        # Update Anvil token addresses
        existing_env['NEXT_PUBLIC_USDC_ADDRESS'] = env_vars.get('USDC_ADDRESS', '')
        existing_env['NEXT_PUBLIC_USDT_ADDRESS'] = env_vars.get('USDT_ADDRESS', '')
        existing_env['NEXT_PUBLIC_DAI_ADDRESS'] = env_vars.get('DAI_ADDRESS', '')
        existing_env['NEXT_PUBLIC_WETH_ADDRESS'] = env_vars.get('WETH_ADDRESS', '')
        existing_env['NEXT_PUBLIC_WBTC_ADDRESS'] = env_vars.get('WBTC_ADDRESS', '')
        existing_env['NEXT_PUBLIC_LINK_ADDRESS'] = env_vars.get('LINK_ADDRESS', '')
        existing_env['NEXT_PUBLIC_UNI_ADDRESS'] = env_vars.get('UNI_ADDRESS', '')

        print(f"{Colors.GREEN}✓ Updated Anvil addresses in .env.local{Colors.NC}")

    # Set default chain ID if not already set
    if 'NEXT_PUBLIC_DEFAULT_CHAIN_ID' not in existing_env:
        existing_env['NEXT_PUBLIC_DEFAULT_CHAIN_ID'] = '31337'

    # Write updated .env.local
    env_content = f"""# SimpleDex Frontend Environment Configuration
# Auto-updated by update-frontend-config.py
# You can manually edit this file - only deployed addresses will be auto-updated

# ===================================
# Network Selection
# ===================================
NEXT_PUBLIC_DEFAULT_CHAIN_ID={existing_env.get('NEXT_PUBLIC_DEFAULT_CHAIN_ID', '31337')}

# ===================================
# Anvil (Local Development) - Chain ID 31337
# ===================================
NEXT_PUBLIC_ANVIL_RPC_URL={existing_env.get('NEXT_PUBLIC_ANVIL_RPC_URL', 'http://127.0.0.1:8545')}

# Anvil contract addresses (auto-populated by startup.sh)
NEXT_PUBLIC_FACTORY_ADDRESS={existing_env.get('NEXT_PUBLIC_FACTORY_ADDRESS', '')}
NEXT_PUBLIC_ROUTER_ADDRESS={existing_env.get('NEXT_PUBLIC_ROUTER_ADDRESS', '')}
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS={existing_env.get('NEXT_PUBLIC_PRICE_ORACLE_ADDRESS', '')}
NEXT_PUBLIC_FAUCET_ADDRESS={existing_env.get('NEXT_PUBLIC_FAUCET_ADDRESS', '')}

# Anvil token addresses
NEXT_PUBLIC_USDC_ADDRESS={existing_env.get('NEXT_PUBLIC_USDC_ADDRESS', '')}
NEXT_PUBLIC_USDT_ADDRESS={existing_env.get('NEXT_PUBLIC_USDT_ADDRESS', '')}
NEXT_PUBLIC_DAI_ADDRESS={existing_env.get('NEXT_PUBLIC_DAI_ADDRESS', '')}
NEXT_PUBLIC_WETH_ADDRESS={existing_env.get('NEXT_PUBLIC_WETH_ADDRESS', '')}
NEXT_PUBLIC_WBTC_ADDRESS={existing_env.get('NEXT_PUBLIC_WBTC_ADDRESS', '')}
NEXT_PUBLIC_LINK_ADDRESS={existing_env.get('NEXT_PUBLIC_LINK_ADDRESS', '')}
NEXT_PUBLIC_UNI_ADDRESS={existing_env.get('NEXT_PUBLIC_UNI_ADDRESS', '')}

# ===================================
# Sepolia Testnet - Chain ID 11155111
# ===================================
NEXT_PUBLIC_SEPOLIA_RPC_URL={existing_env.get('NEXT_PUBLIC_SEPOLIA_RPC_URL', '')}

# Sepolia contract addresses (auto-populated by startup-sepolia.sh)
NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS', '')}

# Sepolia token addresses
NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_USDT_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_USDT_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_DAI_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_DAI_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_WBTC_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_WBTC_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_LINK_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_LINK_ADDRESS', '')}
NEXT_PUBLIC_SEPOLIA_UNI_ADDRESS={existing_env.get('NEXT_PUBLIC_SEPOLIA_UNI_ADDRESS', '')}
"""

    with open(env_local_file, 'w') as f:
        f.write(env_content)

    print(f"{Colors.GREEN}✓ Updated .env.local{Colors.NC}")

def main():
    import sys

    # Determine network from command line argument or environment
    network = 'anvil'
    if len(sys.argv) > 1:
        network = sys.argv[1].lower()
    elif os.getenv('RPC_URL', '').startswith('https://'):
        network = 'sepolia'

    network_name = 'Sepolia' if network == 'sepolia' else 'Anvil'

    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print(f"{Colors.BLUE}  Updating Frontend Configuration{Colors.NC}")
    print(f"{Colors.BLUE}  Network: {network_name}{Colors.NC}")
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print()

    # Load environment variables
    env_vars = load_env()
    if not env_vars:
        return 1

    # Check required variables
    if not env_vars.get('FACTORY_ADDRESS') or not env_vars.get('ROUTER_ADDRESS'):
        print(f"{Colors.RED}Error: Required addresses not found in .env{Colors.NC}")
        print(f"{Colors.YELLOW}Make sure FACTORY_ADDRESS and ROUTER_ADDRESS are set{Colors.NC}")
        return 1

    print(f"{Colors.YELLOW}Loaded addresses from .env{Colors.NC}")
    print()

    # Locate frontend directory
    frontend_dir = Path(__file__).parent.parent / "dex-frontend"

    if not frontend_dir.exists():
        print(f"{Colors.RED}Error: Frontend directory not found at {frontend_dir}{Colors.NC}")
        return 1

    # Update .env.local with network-specific addresses
    print(f"{Colors.BLUE}[1/5] Updating .env.local ({network_name} addresses){Colors.NC}")
    update_env_local(env_vars, frontend_dir, network)

    # Only update TypeScript files for Anvil (these use hardcoded addresses, deprecated)
    if network == 'anvil':
        print(f"{Colors.BLUE}[2/5] Updating tokens.ts{Colors.NC}")
        update_tokens_config(env_vars, frontend_dir)

        print(f"{Colors.BLUE}[3/5] Updating priceFeeds.ts{Colors.NC}")
        update_pricefeeds_config(env_vars, frontend_dir)

        print(f"{Colors.BLUE}[4/5] Updating page.tsx{Colors.NC}")
        update_page_config(env_vars, frontend_dir)

        print(f"{Colors.BLUE}[5/5] Updating deprecated config/tokens.ts{Colors.NC}")
        update_deprecated_config(env_vars, frontend_dir)
    else:
        print(f"{Colors.YELLOW}ℹ Skipping TypeScript file updates (not needed for Sepolia){Colors.NC}")

    print()
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print(f"{Colors.GREEN}✓ Frontend configuration updated!{Colors.NC}")
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print()
    print(f"{Colors.YELLOW}Contract Addresses ({network_name}):{Colors.NC}")
    print(f"  Factory:     {Colors.GREEN}{env_vars.get('FACTORY_ADDRESS')}{Colors.NC}")
    print(f"  Router:      {Colors.GREEN}{env_vars.get('ROUTER_ADDRESS')}{Colors.NC}")
    print(f"  PriceOracle: {Colors.GREEN}{env_vars.get('PRICE_ORACLE_ADDRESS')}{Colors.NC}")
    print(f"  Faucet:      {Colors.GREEN}{env_vars.get('FAUCET_ADDRESS')}{Colors.NC}")
    print()
    print(f"{Colors.YELLOW}Next steps:{Colors.NC}")
    if network == 'sepolia':
        print(f"  1. Verify addresses were added to .env.local under SEPOLIA section")
        print(f"  2. Connect MetaMask to Sepolia testnet")
    else:
        print(f"  1. Verify addresses were added to .env.local under ANVIL section")
        print(f"  2. Connect MetaMask to Localhost 8545")
    print("  3. Restart the Next.js dev server to pick up new .env.local")
    print("  4. Hard refresh your browser (Ctrl+Shift+R)")
    print("  5. The frontend will automatically detect and use the correct network")
    print()

if __name__ == '__main__':
    exit(main() or 0)
