'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchHistoricalPrices, TOKEN_TO_COINGECKO_ID, HistoricalTimeframe } from '@/app/utils/coingecko';

interface PriceChartProps {
  tokenSymbol: string;
  tokenLogoURI?: string;
  currentPrice: number;
  priceChange24h?: number;
}

type Timeframe = HistoricalTimeframe;

export default function PriceChart({ tokenSymbol, tokenLogoURI, currentPrice, priceChange24h = 0 }: PriceChartProps) {
  // Get token color based on symbol (for fallback)
  const getTokenColor = (symbol: string) => {
    const colors: Record<string, string> = {
      mWETH: '#627eea',
      mWBTC: '#f7931a',
      mUSDC: '#2775ca',
      mUSDT: '#26a17b',
      mDAI: '#f5ac37',
      mLINK: '#375bd2',
    };
    return colors[symbol] || '#00ff41';
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('1D');
  const [priceData, setPriceData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef<{ symbol: string; timeframe: Timeframe } | null>(null);

  // Generate fallback mock data when API fails or token not supported
  const generateMockData = useCallback(() => {
    const points = activeTimeframe === '1H' ? 12 : activeTimeframe === '1D' ? 96 : activeTimeframe === '1W' ? 168 : 720;
    const volatility = activeTimeframe === '1H' ? 0.002 : activeTimeframe === '1D' ? 0.01 : activeTimeframe === '1W' ? 0.03 : 0.08;

    const data: number[] = [];
    let price = currentPrice * (1 - (priceChange24h / 100));

    for (let i = 0; i < points; i++) {
      const change = (Math.random() - 0.48) * volatility * price;
      price = Math.max(price + change, price * 0.5);
      data.push(price);
    }

    data[data.length - 1] = currentPrice;
    return data;
  }, [activeTimeframe, currentPrice, priceChange24h]);

  // Fetch real historical price data from CoinGecko
  useEffect(() => {
    const coinId = TOKEN_TO_COINGECKO_ID[tokenSymbol];

    // Skip if we already fetched for this symbol/timeframe combination
    if (fetchedRef.current?.symbol === tokenSymbol && fetchedRef.current?.timeframe === activeTimeframe) {
      return;
    }

    // If no CoinGecko ID mapping, use mock data
    if (!coinId) {
      console.log(`[PriceChart] No CoinGecko ID for ${tokenSymbol}, using mock data`);
      setPriceData(generateMockData());
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const historicalPrices = await fetchHistoricalPrices(coinId, activeTimeframe);

        if (historicalPrices.length > 0) {
          // Update the last price point to current price for accuracy
          const prices = [...historicalPrices];
          prices[prices.length - 1] = currentPrice;
          setPriceData(prices);
          fetchedRef.current = { symbol: tokenSymbol, timeframe: activeTimeframe };
          console.log(`[PriceChart] Loaded ${prices.length} real price points for ${tokenSymbol}`);
        } else {
          // Fallback to mock data if API returns empty
          console.log(`[PriceChart] No historical data for ${tokenSymbol}, using mock data`);
          setPriceData(generateMockData());
        }
      } catch (error) {
        console.error(`[PriceChart] Error fetching historical prices:`, error);
        setPriceData(generateMockData());
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tokenSymbol, activeTimeframe, currentPrice, generateMockData]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || priceData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 10, bottom: 20, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate min/max for scaling
    const minPrice = Math.min(...priceData) * 0.995;
    const maxPrice = Math.max(...priceData) * 1.005;
    const priceRange = maxPrice - minPrice;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Create gradient for line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    const isPositive = priceChange24h >= 0;
    if (isPositive) {
      gradient.addColorStop(0, '#00ff41');
      gradient.addColorStop(1, '#008f11');
    } else {
      gradient.addColorStop(0, '#ff5f56');
      gradient.addColorStop(1, '#8f1111');
    }

    // Draw the line
    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    priceData.forEach((price, index) => {
      const x = padding.left + (index / (priceData.length - 1)) * chartWidth;
      const y = padding.top + ((maxPrice - price) / priceRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw area fill
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    if (isPositive) {
      areaGradient.addColorStop(0, 'rgba(0, 255, 65, 0.15)');
      areaGradient.addColorStop(1, 'rgba(0, 255, 65, 0)');
    } else {
      areaGradient.addColorStop(0, 'rgba(255, 95, 86, 0.15)');
      areaGradient.addColorStop(1, 'rgba(255, 95, 86, 0)');
    }

    ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Draw current price dot
    const lastX = padding.left + chartWidth;
    const lastY = padding.top + ((maxPrice - priceData[priceData.length - 1]) / priceRange) * chartHeight;

    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isPositive ? '#00ff41' : '#ff5f56';
    ctx.fill();

    // Glow effect on dot
    ctx.beginPath();
    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
    ctx.fillStyle = isPositive ? 'rgba(0, 255, 65, 0.3)' : 'rgba(255, 95, 86, 0.3)';
    ctx.fill();

  }, [priceData, priceChange24h]);

  const timeframes: Timeframe[] = ['1H', '1D', '1W', '1M'];
  const isPositive = priceChange24h >= 0;

  return (
    <div className="glass-panel p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.4rem',
              color: 'var(--color-text-main)',
              fontWeight: 700,
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {tokenLogoURI ? (
              <img
                src={tokenLogoURI}
                alt={tokenSymbol}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  boxShadow: `0 0 12px ${getTokenColor(tokenSymbol)}60`,
                  border: '2px solid rgba(255,255,255,0.1)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: getTokenColor(tokenSymbol),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#fff',
                  fontSize: '0.7rem',
                  boxShadow: `0 0 12px ${getTokenColor(tokenSymbol)}60`,
                }}
              >
                {tokenSymbol[1] || tokenSymbol[0]}
              </div>
            )}
            {tokenSymbol} / USD
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--color-neon-primary)',
              letterSpacing: '-1px',
            }}
          >
            ${currentPrice.toFixed(4)}
          </div>
          <div
            style={{
              fontSize: '0.9rem',
              color: isPositive ? 'var(--color-neon-primary)' : 'var(--color-error)',
              fontFamily: 'var(--font-mono)',
              marginTop: '4px',
            }}
          >
            {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}% (24H)
          </div>
        </div>

        {/* Timeframe Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px',
            borderRadius: '6px',
          }}
        >
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              style={{
                background: activeTimeframe === tf ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                color: activeTimeframe === tf ? '#fff' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: '100%',
          position: 'relative',
          minHeight: '200px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '6px',
          border: '1px solid var(--color-panel-border)',
          overflow: 'hidden',
        }}
      >
        {/* Loading Indicator */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'var(--color-neon-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              zIndex: 10,
            }}
          >
            LOADING...
          </div>
        )}

        {/* Grid Lines (decorative) */}
        <div style={{ position: 'absolute', top: '25%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', top: '50%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', top: '75%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.03)' }} />

        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            opacity: isLoading ? 0.3 : 1,
            transition: 'opacity 0.2s',
          }}
        />
      </div>
    </div>
  );
}
