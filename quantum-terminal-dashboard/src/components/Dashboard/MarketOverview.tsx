/**
 * MarketOverview.tsx - Real-time Market Data Panel
 * Displays stock prices, changes, and trends
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface MarketData {
  price: number;
  change: number;
  percent: number;
  volume: number;
  high: number;
  low: number;
  timestamp: number;
}

export interface MarketOverviewProps {
  symbols: string[];
  marketData: Map<string, Partial<MarketData>>;
  websocketUrl?: string;
  refreshInterval?: number;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  symbols,
  marketData,
  websocketUrl,
  refreshInterval = 1000
}) => {
  const [simulatedData, setSimulatedData] = useState<Map<string, MarketData>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulate market data updates
  useEffect(() => {
    const generatePrice = (symbol: string) => {
      const basePrice = {
        AAPL: 178.50,
        GOOGL: 141.25,
        TSLA: 248.75,
        MSFT: 378.90,
        AMZN: 178.35,
        NVDA: 875.40
      }[symbol] || 100;

      const variance = basePrice * 0.02;
      return basePrice + (Math.random() * variance * 2 - variance);
    };

    const updateData = () => {
      setSimulatedData(prev => {
        const next = new Map(prev);
        symbols.forEach(symbol => {
          const existing = prev.get(symbol);
          const newPrice = generatePrice(symbol);
          const oldPrice = existing?.price || newPrice;
          const change = newPrice - oldPrice;

          next.set(symbol, {
            price: newPrice,
            change,
            percent: (change / oldPrice) * 100,
            volume: Math.floor(Math.random() * 10000000) + 1000000,
            high: Math.max(existing?.high || 0, newPrice),
            low: Math.min(existing?.low || Infinity, newPrice),
            timestamp: Date.now()
          });
        });
        return next;
      });
      setLastUpdate(new Date());
    };

    updateData();
    const interval = setInterval(updateData, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols, refreshInterval]);

  // Merge simulated and real data
  const getMergedData = (symbol: string): MarketData | undefined => {
    const real = marketData.get(symbol);
    const simulated = simulatedData.get(symbol);
    if (!simulated) return undefined;
    return { ...simulated, ...real } as MarketData;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#00001a'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #00f0ff22',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#00f0ff' }}>Market Overview</span>
        <span style={{ fontSize: '11px', color: '#00f0ff66' }}>
          {lastUpdate.toLocaleTimeString()}
        </span>
      </div>

      {/* Symbol List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {symbols.map(symbol => {
          const data = getMergedData(symbol);
          if (!data) return null;

          const isPositive = data.change >= 0;
          const changeColor = isPositive ? '#00ff41' : '#ff3366';
          const arrow = isPositive ? '\u25B2' : '\u25BC';

          return (
            <div
              key={symbol}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: '#000025',
                borderRadius: '6px',
                border: '1px solid #00f0ff22',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00f0ff44';
                e.currentTarget.style.backgroundColor = '#000030';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#00f0ff22';
                e.currentTarget.style.backgroundColor = '#000025';
              }}
            >
              {/* Symbol Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '8px'
                }}
              >
                <span style={{ fontWeight: 'bold', color: '#00f0ff' }}>{symbol}</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  ${data.price.toFixed(2)}
                </span>
              </div>

              {/* Change Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px'
                }}
              >
                <span style={{ color: changeColor }}>
                  {arrow} {isPositive ? '+' : ''}{data.change.toFixed(2)} ({isPositive ? '+' : ''}{data.percent.toFixed(2)}%)
                </span>
                <span style={{ color: '#00f0ff66' }}>
                  Vol: {(data.volume / 1000000).toFixed(1)}M
                </span>
              </div>

              {/* Range Bar */}
              <div
                style={{
                  marginTop: '8px',
                  height: '4px',
                  backgroundColor: '#00f0ff22',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${((data.price - data.low) / (data.high - data.low)) * 100}%`,
                    backgroundColor: changeColor,
                    borderRadius: '2px'
                  }}
                />
              </div>

              {/* High/Low Labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                  fontSize: '10px',
                  color: '#00f0ff44'
                }}
              >
                <span>L: ${data.low.toFixed(2)}</span>
                <span>H: ${data.high.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #00f0ff22',
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: '11px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#00ff41', fontWeight: 'bold' }}>
            {symbols.filter(s => (getMergedData(s)?.change ?? 0) >= 0).length}
          </div>
          <div style={{ color: '#00f0ff66' }}>Gainers</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ff3366', fontWeight: 'bold' }}>
            {symbols.filter(s => (getMergedData(s)?.change ?? 0) < 0).length}
          </div>
          <div style={{ color: '#00f0ff66' }}>Losers</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#00f0ff', fontWeight: 'bold' }}>
            {symbols.length}
          </div>
          <div style={{ color: '#00f0ff66' }}>Total</div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
