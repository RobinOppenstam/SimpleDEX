// app/components/TokenSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Token, getAllTokens, searchTokens, COMMON_BASES } from '../config/tokens';
import { ethers } from 'ethers';
import { formatNumber } from '../utils/formatNumber';

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

  const tokens = searchQuery
    ? searchTokens(searchQuery)
    : getAllTokens();

  const filteredTokens = tokens.filter(
    token => token.address !== excludeToken?.address
  );

  const commonBaseTokens = filteredTokens.filter(token =>
    COMMON_BASES.includes(token.symbol)
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
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
          const balance = await contract.balanceOf(address);
          newBalances[token.address] = ethers.formatUnits(balance, token.decimals);
        } catch (error) {
          newBalances[token.address] = '0';
        }
      }

      setBalances(newBalances);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      {/* Selected Token Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 transition border border-gray-200"
      >
        {selectedToken ? (
          <>
            {selectedToken.logoURI ? (
              <img src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {selectedToken.symbol[0]}
              </div>
            )}
            <span>{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-gray-400">Select token</span>
        )}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Token List Modal */}
          <div className="absolute top-full mt-2 bg-white rounded-2xl shadow-2xl z-50 w-96 max-h-[500px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">Select a token</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Search Input */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or paste address"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            {/* Common Bases */}
            {!searchQuery && (
              <div className="p-4 border-b">
                <p className="text-xs text-gray-500 mb-2">Common bases</p>
                <div className="flex gap-2 flex-wrap">
                  {commonBaseTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => handleSelect(token)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      {token.logoURI ? (
                        <img src={token.logoURI} alt={token.symbol} className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {token.symbol[0]}
                        </div>
                      )}
                      <span className="font-medium text-sm">{token.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Token List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTokens.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No tokens found</p>
                </div>
              ) : (
                filteredTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token)}
                    className="w-full px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {token.logoURI ? (
                        <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {token.symbol[0]}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="font-semibold">{token.symbol}</div>
                        <div className="text-xs text-gray-500">{token.name}</div>
                      </div>
                    </div>
                    {balances[token.address] && parseFloat(balances[token.address]) > 0 && (
                      <div className="text-right">
                        <div className="font-medium">
                          {formatNumber(balances[token.address])}
                        </div>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50 rounded-b-2xl">
              <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Manage token lists
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}