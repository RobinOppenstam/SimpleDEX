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

def update_env_local(env_vars, frontend_dir):
    """Create or update .env.local with contract addresses"""
    env_local_file = frontend_dir / ".env.local"

    env_content = f"""# Auto-generated by update-frontend-config.py
# DO NOT EDIT MANUALLY - This file is regenerated on each deployment

# Contract Addresses
NEXT_PUBLIC_FACTORY_ADDRESS={env_vars.get('FACTORY_ADDRESS', '')}
NEXT_PUBLIC_ROUTER_ADDRESS={env_vars.get('ROUTER_ADDRESS', '')}
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS={env_vars.get('PRICE_ORACLE_ADDRESS', '')}
NEXT_PUBLIC_FAUCET_ADDRESS={env_vars.get('FAUCET_ADDRESS', '')}

# Token Addresses
NEXT_PUBLIC_USDC_ADDRESS={env_vars.get('USDC_ADDRESS', '')}
NEXT_PUBLIC_USDT_ADDRESS={env_vars.get('USDT_ADDRESS', '')}
NEXT_PUBLIC_DAI_ADDRESS={env_vars.get('DAI_ADDRESS', '')}
NEXT_PUBLIC_WETH_ADDRESS={env_vars.get('WETH_ADDRESS', '')}
NEXT_PUBLIC_WBTC_ADDRESS={env_vars.get('WBTC_ADDRESS', '')}
NEXT_PUBLIC_LINK_ADDRESS={env_vars.get('LINK_ADDRESS', '')}
NEXT_PUBLIC_UNI_ADDRESS={env_vars.get('UNI_ADDRESS', '')}

# Price Feed Aggregators
NEXT_PUBLIC_ETH_USD_AGGREGATOR={env_vars.get('ETH_USD_AGGREGATOR', '')}
NEXT_PUBLIC_BTC_USD_AGGREGATOR={env_vars.get('BTC_USD_AGGREGATOR', '')}
NEXT_PUBLIC_LINK_USD_AGGREGATOR={env_vars.get('LINK_USD_AGGREGATOR', '')}
NEXT_PUBLIC_UNI_USD_AGGREGATOR={env_vars.get('UNI_USD_AGGREGATOR', '')}
NEXT_PUBLIC_USDC_USD_AGGREGATOR={env_vars.get('USDC_USD_AGGREGATOR', '')}
NEXT_PUBLIC_USDT_USD_AGGREGATOR={env_vars.get('USDT_USD_AGGREGATOR', '')}
NEXT_PUBLIC_DAI_USD_AGGREGATOR={env_vars.get('DAI_USD_AGGREGATOR', '')}

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
"""

    with open(env_local_file, 'w') as f:
        f.write(env_content)

    print(f"{Colors.GREEN}✓ Updated .env.local{Colors.NC}")

def main():
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print(f"{Colors.BLUE}  Updating Frontend Configuration{Colors.NC}")
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

    # Update each config file
    print(f"{Colors.BLUE}[1/5] Updating .env.local{Colors.NC}")
    update_env_local(env_vars, frontend_dir)

    print(f"{Colors.BLUE}[2/5] Updating tokens.ts{Colors.NC}")
    update_tokens_config(env_vars, frontend_dir)

    print(f"{Colors.BLUE}[3/5] Updating priceFeeds.ts{Colors.NC}")
    update_pricefeeds_config(env_vars, frontend_dir)

    print(f"{Colors.BLUE}[4/5] Updating page.tsx{Colors.NC}")
    update_page_config(env_vars, frontend_dir)

    print(f"{Colors.BLUE}[5/5] Updating deprecated config/tokens.ts{Colors.NC}")
    update_deprecated_config(env_vars, frontend_dir)

    print()
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print(f"{Colors.GREEN}✓ Frontend configuration updated!{Colors.NC}")
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print()
    print(f"{Colors.YELLOW}Contract Addresses:{Colors.NC}")
    print(f"  Factory:     {Colors.GREEN}{env_vars.get('FACTORY_ADDRESS')}{Colors.NC}")
    print(f"  Router:      {Colors.GREEN}{env_vars.get('ROUTER_ADDRESS')}{Colors.NC}")
    print(f"  PriceOracle: {Colors.GREEN}{env_vars.get('PRICE_ORACLE_ADDRESS')}{Colors.NC}")
    print(f"  Faucet:      {Colors.GREEN}{env_vars.get('FAUCET_ADDRESS')}{Colors.NC}")
    print()
    print(f"{Colors.YELLOW}Next steps:{Colors.NC}")
    print("  1. Restart the Next.js dev server to pick up new .env.local")
    print("  2. Hard refresh your browser (Ctrl+Shift+R)")
    print("  3. The frontend will automatically use the new addresses")
    print()

if __name__ == '__main__':
    exit(main() or 0)
