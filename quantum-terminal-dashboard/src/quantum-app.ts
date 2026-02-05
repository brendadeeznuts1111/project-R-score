/**
 * quantum-app.ts - Main Entry Point with Feature Flags
 * Quantum Terminal Dashboard Application
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QuantumDashboard } from './components/Dashboard';

// Type declaration for bun:bundle feature flags
declare function feature(name: string): boolean;

// Feature flag checking with fallback
const hasFeature = (name: string): boolean => {
  try {
    return typeof feature === 'function' ? feature(name) : true;
  } catch {
    return true; // Default to enabled if not in bundled context
  }
};

// Application configuration
const CONFIG = {
  // Feature flags
  TERMINAL_ENABLED: hasFeature('TERMINAL'),
  WEBGL_ENABLED: hasFeature('WEBGL'),
  PREMIUM_ENABLED: hasFeature('PREMIUM'),
  PTY_SUPPORT: hasFeature('PTY_SUPPORT'),

  // Server configuration
  HTTP_PORT: parseInt(process.env.HTTP_PORT || '4444'),
  WS_PORT: parseInt(process.env.WS_PORT || '3001'),
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'wss://api.example.com/terminal',

  // Dashboard configuration
  DEFAULT_SYMBOLS: ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN', 'NVDA'],
  DEFAULT_THEME: 'quantum' as const,

  // Build info
  VERSION: '1.4.0-pty.alpha.1',
  BUILD_TIMESTAMP: process.env.BUILD_TIMESTAMP || Date.now().toString()
};

/**
 * Initialize the application
 */
async function initializeApp() {
  console.log('Quantum Terminal Dashboard');
  console.log('='.repeat(40));
  console.log(`Version: ${CONFIG.VERSION}`);
  console.log(`Features enabled:`);
  console.log(`  - Terminal: ${CONFIG.TERMINAL_ENABLED ? 'Yes' : 'No'}`);
  console.log(`  - WebGL: ${CONFIG.WEBGL_ENABLED ? 'Yes' : 'No'}`);
  console.log(`  - Premium: ${CONFIG.PREMIUM_ENABLED ? 'Yes' : 'No'}`);
  console.log(`  - PTY Support: ${CONFIG.PTY_SUPPORT ? 'Yes' : 'No'}`);
  console.log('='.repeat(40));

  // Check if we're in browser or server context
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (isBrowser) {
    await initializeBrowserApp();
  } else {
    await initializeServerApp();
  }
}

/**
 * Initialize browser application (React dashboard)
 */
async function initializeBrowserApp() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('Root element not found');
    return;
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(QuantumDashboard, {
        symbols: CONFIG.DEFAULT_SYMBOLS,
        websocketUrl: CONFIG.WEBSOCKET_URL,
        theme: CONFIG.DEFAULT_THEME
      })
    )
  );

  console.log('Browser application initialized');
}

/**
 * Initialize server application (Bun servers)
 */
async function initializeServerApp() {
  const { startServers } = await import('./servers/http-server.js');

  await startServers(CONFIG.HTTP_PORT, CONFIG.WS_PORT);

  console.log('\nQuantum Terminal Dashboard is running!');
  console.log(`Open https://app.example.com in your browser`);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(CONFIG.VERSION);
    return;
  }

  if (args.includes('--ticker')) {
    const { start } = await import('./scripts/financial-ticker.js');
    start();
    return;
  }

  if (args.includes('--monitor')) {
    const { start } = await import('./scripts/market-monitor.js');
    start();
    return;
  }

  if (args.includes('--build')) {
    const { buildAll } = await import('../scripts/build-terminal.js');
    await buildAll();
    return;
  }

  // Default: start servers
  await initializeApp();
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Quantum Terminal Dashboard v${CONFIG.VERSION}
PTY-Enabled Financial Dashboard with Feature Flags

Usage:
  bun run src/quantum-app.ts [options]

Options:
  --help, -h       Show this help message
  --version, -v    Show version number
  --ticker         Run financial ticker in terminal
  --monitor        Run market monitor (htop-style)
  --build          Build all profiles

Environment Variables:
  HTTP_PORT        HTTP server port (default: 4444)
  WS_PORT          WebSocket server port (default: 3001)
  WEBSOCKET_URL    WebSocket URL for client (default: wss://api.example.com/terminal)

Feature Flags (compile-time):
  TERMINAL         Enable PTY terminal support
  WEBGL            Enable WebGL visualizations
  PREMIUM          Enable premium features
  PTY_SUPPORT      Enable full PTY support

Examples:
  # Start dashboard servers
  bun run src/quantum-app.ts

  # Run ticker visualization
  bun run src/quantum-app.ts --ticker

  # Run market monitor
  bun run src/quantum-app.ts --monitor

  # Build with specific features
  bun build src/quantum-app.ts --feature=TERMINAL --feature=WEBGL
`);
}

// Export configuration
export { CONFIG, initializeApp };

// Run main if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
