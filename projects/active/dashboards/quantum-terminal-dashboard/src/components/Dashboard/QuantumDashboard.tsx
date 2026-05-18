/**
 * QuantumDashboard.tsx - Main Dashboard Component
 * Integrates terminal, visualizations, and market data
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FinancialTerminal } from '../Terminal/FinancialTerminal';
import { MarketOverview } from './MarketOverview';
import { FeatureStatus } from './FeatureStatus';

// Check for feature flags at compile time
declare function feature(name: string): boolean;

export interface QuantumDashboardProps {
  symbols?: string[];
  websocketUrl?: string;
  theme?: 'quantum' | 'matrix' | 'classic';
}

export const QuantumDashboard: React.FC<QuantumDashboardProps> = ({
  symbols = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN', 'NVDA'],
  websocketUrl = 'ws://localhost:3001/terminal',
  theme = 'quantum'
}) => {
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [activePanel, setActivePanel] = useState<'terminal' | 'chart' | 'monitor'>('terminal');
  const [marketData, setMarketData] = useState<Map<string, any>>(new Map());

  // Check feature flags
  const hasTerminal = typeof feature === 'function' ? feature('TERMINAL') : true;
  const hasWebGL = typeof feature === 'function' ? feature('WEBGL') : true;
  const hasPremium = typeof feature === 'function' ? feature('PREMIUM') : false;

  const handleTerminalData = useCallback((data: string) => {
    // Parse market updates from terminal output
    const priceMatch = data.match(/(\w+)\s+\$?([\d.]+)\s+([+-]?[\d.]+)/);
    if (priceMatch) {
      const [, symbol, price, change] = priceMatch;
      setMarketData(prev => new Map(prev).set(symbol, {
        price: parseFloat(price),
        change: parseFloat(change),
        timestamp: Date.now()
      }));
    }
  }, []);

  return (
    <div
      className="quantum-dashboard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#000010',
        color: '#00f0ff',
        fontFamily: 'Monaco, "Cascadia Code", Consolas, monospace'
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #00f0ff33',
          background: 'linear-gradient(90deg, #000020, #000010)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>Q</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Quantum Financial Dashboard
            </h1>
            <span style={{ fontSize: '11px', color: '#00f0ff88' }}>
              PTY Terminal Integration v1.4.0
            </span>
          </div>
        </div>

        <FeatureStatus
          hasTerminal={hasTerminal}
          hasWebGL={hasWebGL}
          hasPremium={hasPremium}
          terminalConnected={terminalConnected}
        />
      </header>

      {/* Navigation */}
      <nav
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 20px',
          borderBottom: '1px solid #00f0ff22',
          backgroundColor: '#00001a'
        }}
      >
        {[
          { id: 'terminal', label: 'Terminal', icon: '>' },
          { id: 'chart', label: 'Charts', icon: 'M' },
          { id: 'monitor', label: 'Monitor', icon: '#' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: activePanel === tab.id ? '#00f0ff22' : 'transparent',
              color: activePanel === tab.id ? '#00f0ff' : '#00f0ff88',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontFamily: 'monospace' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Terminal or Active Panel */}
        <div
          style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #00f0ff22',
            overflow: 'hidden'
          }}
        >
          {hasTerminal ? (
            <FinancialTerminal
              websocketUrl={websocketUrl}
              theme={theme}
              symbols={symbols}
              onData={handleTerminalData}
              onConnect={() => setTerminalConnected(true)}
              onDisconnect={() => setTerminalConnected(false)}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '12px',
                color: '#00f0ff88'
              }}
            >
              <span style={{ fontSize: '48px' }}>X</span>
              <p>Terminal features disabled in this build</p>
              <code style={{ fontSize: '11px' }}>
                Recompile with --feature=TERMINAL
              </code>
            </div>
          )}
        </div>

        {/* Right Panel - Market Overview */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: '300px'
          }}
        >
          <MarketOverview
            symbols={symbols}
            marketData={marketData}
            websocketUrl={websocketUrl}
          />
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '8px 20px',
          borderTop: '1px solid #00f0ff22',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#00f0ff66'
        }}
      >
        <span>Quantum Terminal Dashboard v1.4.0-pty.alpha.1</span>
        <span>
          Build: {hasTerminal ? 'terminal' : 'no-terminal'} |
          Features: {[hasTerminal && 'PTY', hasWebGL && 'WebGL', hasPremium && 'Premium'].filter(Boolean).join(', ') || 'None'}
        </span>
      </footer>
    </div>
  );
};

export default QuantumDashboard;
