import React, { useState, useEffect } from 'react';
import { OddsWebSocketClient } from './components/OddsWebSocketClient';
import { ArbitrageTable } from './components/ArbitrageTable';
import { MarketDataChart } from './components/MarketDataChart';
import { SharpDetectionPanel } from './components/SharpDetectionPanel';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import BunV13Demo from './components/BunV13Demo';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Odds Protocol Dashboard</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'arbitrage' ? 'active' : ''}
          onClick={() => setActiveTab('arbitrage')}
        >
          Arbitrage
        </button>
        <button
          className={activeTab === 'market-data' ? 'active' : ''}
          onClick={() => setActiveTab('market-data')}
        >
          Market Data
        </button>
        <button
          className={activeTab === 'sharp-detection' ? 'active' : ''}
          onClick={() => setActiveTab('sharp-detection')}
        >
          Sharp Detection
        </button>
        <button
          className={activeTab === 'performance' ? 'active' : ''}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          className={activeTab === 'bun-v13' ? 'active' : ''}
          onClick={() => setActiveTab('bun-v13')}
        >
          Bun v1.3 CSS
        </button>
      </nav>

      <main className="app-main">
        <OddsWebSocketClient onConnectionChange={setIsConnected} />

        {activeTab === 'overview' && (
          <div className="overview-panel">
            <h2>System Overview</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>WebSocket Status</h3>
                <p>{isConnected ? 'Connected' : 'Disconnected'}</p>
              </div>
              <div className="metric-card">
                <h3>Active Opportunities</h3>
                <p>0</p>
              </div>
              <div className="metric-card">
                <h3>Messages/sec</h3>
                <p>0</p>
              </div>
              <div className="metric-card">
                <h3>Latency</h3>
                <p>0ms</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'arbitrage' && <ArbitrageTable />}
        {activeTab === 'market-data' && <MarketDataChart />}
        {activeTab === 'sharp-detection' && <SharpDetectionPanel />}
        {activeTab === 'performance' && <PerformanceMetrics />}
        {activeTab === 'bun-v13' && <BunV13Demo />}
      </main>
    </div>
  );
}

export default App;
