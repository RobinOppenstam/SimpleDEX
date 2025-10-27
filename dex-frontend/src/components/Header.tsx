'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

type TabType = 'swap' | 'liquidity' | 'positions' | 'history' | 'faucet' | 'analytics' | 'market';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const tabs = [
    { id: 'swap' as TabType, label: 'Swap' },
    { id: 'liquidity' as TabType, label: 'Liquidity' },
    { id: 'positions' as TabType, label: 'LP Positions' },
    { id: 'history' as TabType, label: 'History' },
    { id: 'market' as TabType, label: 'Market' },
    { id: 'faucet' as TabType, label: 'Faucet' },
  ];

  return (
    <header className="bg-card/80 backdrop-blur-md shadow-glow border-b border-border">
      <div className="container mx-auto px-4">
        {/* Single row: Logo, Tabs, and Connect Button */}
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Logo/Title - Left */}
          <div className="flex items-center flex-shrink-0">
            <h1 className="text-2xl font-bold bg-gradient-silver bg-clip-text text-transparent">
              Simple DEX
            </h1>
          </div>

          {/* Navigation Tabs - Center */}
          <nav className="flex gap-1 overflow-x-auto flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-all rounded-md ${
                  activeTab === tab.id
                    ? 'text-primary-foreground bg-primary shadow-glow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:shadow-sm'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right side - Connect Button */}
          <div className="flex items-center flex-shrink-0">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
