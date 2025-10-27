// app/components/TokenSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Token, getAllTokens, searchTokens } from '../config/tokens';
import { ethers } from 'ethers';
import { formatNumber } from '../utils/formatNumber';
import { useNetwork } from '@/hooks/useNetwork';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, X } from 'lucide-react';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  excludeToken?: Token | null;
  signer?: ethers.Signer | null;
}

export default function TokenSelector({ selectedToken, onSelect, excludeToken, signer }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const { chainId } = useNetwork();

  useEffect(() => {
    setMounted(true);
  }, []);

  const tokens = searchQuery
    ? searchTokens(searchQuery, chainId)
    : getAllTokens(chainId);

  const filteredTokens = tokens.filter(
    token => token.address !== excludeToken?.address
  );

  useEffect(() => {
    if (isOpen && signer) {
      loadBalances();
    }
  }, [isOpen, signer]);

  const loadBalances = async () => {
    if (!signer) return;

    try {
      const address = await signer.getAddress();
      const newBalances: Record<string, string> = {};

      for (const token of filteredTokens) {
        // Skip tokens with empty addresses
        if (!token.address) {
          console.log(`[TokenSelector] Skipping token ${token.symbol} - empty address`);
          newBalances[token.address] = '0';
          continue;
        }

        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
          const balance = await contract.balanceOf(address);
          newBalances[token.address] = ethers.formatUnits(balance, token.decimals);
        } catch (error) {
          console.error(`[TokenSelector] Error loading balance for ${token.symbol}:`, error);
          newBalances[token.address] = '0';
        }
      }

      setBalances(newBalances);
    } catch (error) {
      console.error('[TokenSelector] Error loading balances:', error);
    }
  };

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Selected Token Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl font-semibold hover:bg-accent hover:border-primary/50 transition-all border-border"
      >
        {selectedToken ? (
          <>
            {selectedToken.logoURI ? (
              <img src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 bg-gradient-silver rounded-full flex items-center justify-center text-white text-xs font-bold">
                {selectedToken.symbol[0]}
              </div>
            )}
            <span>{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Select token</span>
        )}
        <ChevronDown className="w-4 h-4" />
      </Button>

      {/* Modal */}
      {isOpen && mounted && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95"
          onMouseDown={(e) => {
            // Only close if clicking the backdrop (not the modal content)
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="relative glass gradient-border rounded-2xl shadow-glow-lg w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold bg-gradient-silver bg-clip-text text-transparent">Select a token</h3>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Search Input */}
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or paste address"
                className="w-full"
                autoFocus
              />
            </div>

            {/* Token List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTokens.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No tokens found</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => handleSelect(token)}
                      className="w-full px-4 py-3 hover:bg-accent/50 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {token.logoURI ? (
                          <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-silver rounded-full flex items-center justify-center text-white font-bold shadow-glow">
                            {token.symbol[0]}
                          </div>
                        )}
                        <div className="text-left">
                          <div className="font-semibold text-foreground">{token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                        </div>
                      </div>
                      {balances[token.address] && parseFloat(balances[token.address]) > 0 && (
                        <div className="text-right">
                          <div className="font-medium text-primary">
                            {formatNumber(balances[token.address])}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}