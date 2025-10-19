// app/components/Faucet.tsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { Token, getAllTokens } from '../config/tokens';
import NotificationModal, { NotificationStatus } from './NotificationModal';

const ERC20_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address owner) view returns (uint256)',
];

interface FaucetProps {
  signer: ethers.Signer;
}

export default function Faucet({ signer }: FaucetProps) {
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('1000');

  // Notification modal state
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('pending');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTxHash, setNotificationTxHash] = useState<string>();
  const [notificationTokenIcon, setNotificationTokenIcon] = useState<string>();
  const [notificationTokenSymbol, setNotificationTokenSymbol] = useState<string>();

  const showNotification = (
    status: NotificationStatus,
    title: string,
    message: string,
    txHash?: string,
    tokenIcon?: string,
    tokenSymbol?: string
  ) => {
    setNotificationStatus(status);
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationTxHash(txHash);
    setNotificationTokenIcon(tokenIcon);
    setNotificationTokenSymbol(tokenSymbol);
    setNotificationOpen(true);
  };

  const tokens = getAllTokens();

  const handleClaim = async (token: Token) => {
    if (!token || !amount) return;

    try {
      setLoading(true);
      setSelectedToken(token);

      showNotification(
        'pending',
        'Claiming Tokens',
        `Requesting ${amount} ${token.symbol} from faucet...`,
        undefined,
        token.logoURI,
        token.symbol
      );

      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
      const address = await signer.getAddress();
      const amountWei = ethers.parseUnits(amount, token.decimals);

      const tx = await tokenContract.mint(address, amountWei);
      await tx.wait();

      showNotification(
        'success',
        'Tokens Claimed!',
        `Successfully claimed ${amount} ${token.symbol}`,
        tx.hash,
        token.logoURI,
        token.symbol
      );

      setSelectedToken(null);
    } catch (error) {
      console.error('Error claiming tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification(
        'error',
        'Claim Failed',
        errorMessage,
        undefined,
        token.logoURI,
        token.symbol
      );
      setSelectedToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Token Faucet</h2>
        <p className="text-gray-600">Get free test tokens for trading on the DEX</p>
      </div>

      {/* Amount Input */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Amount to Claim
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg font-semibold"
        />
        <p className="text-xs text-gray-500 mt-2">
          Enter the amount of tokens you want to claim
        </p>
      </div>

      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tokens.map((token) => (
          <div
            key={token.address}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border-2 border-gray-100 hover:border-indigo-200"
          >
            {/* Token Header */}
            <div className="flex items-center gap-4 mb-4">
              {token.logoURI ? (
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {token.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-800">{token.symbol}</h3>
                <p className="text-sm text-gray-500">{token.name}</p>
              </div>
            </div>

            {/* Token Address */}
            <div className="mb-4 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Contract Address</p>
              <p className="text-xs font-mono text-gray-700 break-all">
                {token.address}
              </p>
            </div>

            {/* Claim Button */}
            <button
              onClick={() => handleClaim(token)}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                loading && selectedToken?.address === token.address
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && selectedToken?.address === token.address ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Claiming...
                </span>
              ) : (
                `Claim ${amount} ${token.symbol}`
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">About the Faucet</h4>
            <p className="text-sm text-blue-800">
              This faucet provides free test tokens for use on the DEX. These tokens have no real value and are only for testing purposes on the testnet.
            </p>
            <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
              <li>Tokens are minted directly to your wallet</li>
              <li>You can claim as many times as you need</li>
              <li>Use these tokens to test swaps and provide liquidity</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationOpen}
        status={notificationStatus}
        title={notificationTitle}
        message={notificationMessage}
        txHash={notificationTxHash}
        tokenIcon={notificationTokenIcon}
        tokenSymbol={notificationTokenSymbol}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
}
