/**
 * FinancialTerminal.tsx - PTY-Enabled Financial Terminal Component
 * Renders interactive terminal for financial data visualization
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { TerminalDimensions } from './PTYManager';

export interface FinancialTerminalProps {
  websocketUrl?: string;
  theme?: 'quantum' | 'matrix' | 'classic';
  initialDimensions?: TerminalDimensions;
  symbols?: string[];
  onData?: (data: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  accent: string;
}

const THEMES: Record<string, TerminalTheme> = {
  quantum: {
    background: '#000010',
    foreground: '#00f0ff',
    cursor: '#9d00ff',
    selection: 'rgba(0, 240, 255, 0.3)',
    accent: '#00ff41'
  },
  matrix: {
    background: '#000000',
    foreground: '#00ff00',
    cursor: '#00ff00',
    selection: 'rgba(0, 255, 0, 0.2)',
    accent: '#00ff00'
  },
  classic: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    selection: 'rgba(255, 255, 255, 0.2)',
    accent: '#569cd6'
  }
};

export const FinancialTerminal: React.FC<FinancialTerminalProps> = ({
  websocketUrl = 'ws://localhost:3001/terminal',
  theme = 'quantum',
  initialDimensions = { cols: 80, rows: 24 },
  symbols = ['AAPL', 'GOOGL', 'TSLA', 'MSFT'],
  onData,
  onConnect,
  onDisconnect,
  className = ''
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const fitAddon = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [dimensions, setDimensions] = useState<TerminalDimensions>(initialDimensions);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const currentTheme = THEMES[theme] || THEMES.quantum;

  // Initialize xterm.js terminal
  const initializeTerminal = useCallback(async () => {
    if (!terminalRef.current || terminalInstance.current) return;

    // Dynamic import for xterm.js
    const { Terminal } = await import('@xterm/xterm');
    const { FitAddon } = await import('@xterm/addon-fit');
    const { WebLinksAddon } = await import('@xterm/addon-web-links');

    terminalInstance.current = new Terminal({
      theme: {
        background: currentTheme.background,
        foreground: currentTheme.foreground,
        cursor: currentTheme.cursor,
        selectionBackground: currentTheme.selection
      },
      fontSize: 14,
      fontFamily: 'Monaco, "Cascadia Code", "Fira Code", Consolas, monospace',
      cursorBlink: true,
      allowTransparency: true,
      cols: dimensions.cols,
      rows: dimensions.rows,
      scrollback: 10000
    });

    fitAddon.current = new FitAddon();
    terminalInstance.current.loadAddon(fitAddon.current);
    terminalInstance.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Write welcome message
    writeWelcomeMessage();
  }, [currentTheme, dimensions]);

  // Write welcome message
  const writeWelcomeMessage = () => {
    const term = terminalInstance.current;
    if (!term) return;

    term.writeln('\x1b[36m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[36m║\x1b[0m     \x1b[1;35mQuantum Financial Terminal\x1b[0m                              \x1b[36m║\x1b[0m');
    term.writeln('\x1b[36m║\x1b[0m     \x1b[32mPTY-Enabled Real-Time Market Dashboard\x1b[0m                  \x1b[36m║\x1b[0m');
    term.writeln('\x1b[36m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln(`\x1b[33mTracking symbols:\x1b[0m ${symbols.join(', ')}`);
    term.writeln('\x1b[90mConnecting to server...\x1b[0m');
    term.writeln('');
  };

  // Connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(websocketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      terminalInstance.current?.writeln('\x1b[32m✓ Connected to Quantum Terminal Server\x1b[0m');
      terminalInstance.current?.writeln('\x1b[90mType "help" for available commands\x1b[0m\n');
      onConnect?.();

      // Send initial configuration
      ws.send(JSON.stringify({
        type: 'config',
        symbols,
        dimensions,
        timestamp: Date.now()
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch {
        // Raw terminal data
        terminalInstance.current?.write(event.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      terminalInstance.current?.writeln('\n\x1b[31m✗ Disconnected from server\x1b[0m');
      onDisconnect?.();

      // Auto-reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      terminalInstance.current?.writeln('\x1b[31mConnection error occurred\x1b[0m');
    };
  }, [websocketUrl, symbols, dimensions, onConnect, onDisconnect]);

  // Handle messages from server
  const handleServerMessage = (data: any) => {
    const term = terminalInstance.current;
    if (!term) return;

    switch (data.type) {
      case 'terminal_data':
        term.write(data.data);
        setLastUpdate(new Date());
        onData?.(data.data);
        break;

      case 'market_update':
        renderMarketUpdate(data);
        break;

      case 'alert':
        term.writeln(`\n\x1b[1;33m⚠ ALERT:\x1b[0m ${data.message}`);
        break;

      case 'error':
        term.writeln(`\n\x1b[1;31m✗ ERROR:\x1b[0m ${data.message}`);
        break;
    }
  };

  // Render market update in terminal
  const renderMarketUpdate = (data: any) => {
    const term = terminalInstance.current;
    if (!term) return;

    const { symbol, price, change, percent, volume } = data;
    const color = change >= 0 ? '\x1b[32m' : '\x1b[31m';
    const arrow = change >= 0 ? '▲' : '▼';

    term.writeln(
      `\x1b[36m${symbol.padEnd(6)}\x1b[0m ` +
      `$${price.toFixed(2).padStart(10)} ` +
      `${color}${arrow} ${Math.abs(change).toFixed(2).padStart(7)} (${percent.toFixed(2)}%)\x1b[0m ` +
      `\x1b[90mVol: ${volume.toLocaleString()}\x1b[0m`
    );
  };

  // Handle terminal input
  useEffect(() => {
    if (!terminalInstance.current) return;

    const disposable = terminalInstance.current.onData((data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'terminal_input',
          data,
          timestamp: Date.now()
        }));
      }
    });

    return () => disposable.dispose();
  }, []);

  // Handle resize
  useEffect(() => {
    if (!terminalRef.current || !fitAddon.current) return;

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.current?.fit();
      const term = terminalInstance.current;
      if (term) {
        const newDimensions = { cols: term.cols, rows: term.rows };
        setDimensions(newDimensions);

        // Notify server of resize
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'terminal_resize',
            ...newDimensions,
            timestamp: Date.now()
          }));
        }
      }
    });

    resizeObserver.observe(terminalRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeTerminal().then(connectWebSocket);

    return () => {
      wsRef.current?.close();
      terminalInstance.current?.dispose();
    };
  }, [initializeTerminal, connectWebSocket]);

  // Send command helper
  const sendCommand = (command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'terminal_command',
        command,
        timestamp: Date.now()
      }));
    }
  };

  return (
    <div
      className={`financial-terminal ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: currentTheme.background,
        border: `1px solid ${currentTheme.foreground}33`,
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: `${currentTheme.foreground}11`,
          borderBottom: `1px solid ${currentTheme.foreground}33`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: connected ? currentTheme.accent : '#ff0033',
              boxShadow: connected ? `0 0 8px ${currentTheme.accent}` : 'none'
            }}
          />
          <span style={{ color: currentTheme.foreground, fontWeight: 'bold' }}>
            Quantum Financial Terminal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {lastUpdate && (
            <span style={{ color: `${currentTheme.foreground}88`, fontSize: '12px' }}>
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span style={{ color: `${currentTheme.foreground}88`, fontSize: '12px' }}>
            {dimensions.cols}x{dimensions.rows}
          </span>
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          padding: '8px'
        }}
      />

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '6px 12px',
          backgroundColor: `${currentTheme.foreground}11`,
          borderTop: `1px solid ${currentTheme.foreground}33`,
          fontSize: '11px',
          color: `${currentTheme.foreground}88`
        }}
      >
        <div>
          <kbd style={{ padding: '2px 6px', backgroundColor: `${currentTheme.foreground}22`, borderRadius: '3px' }}>Ctrl+C</kbd>
          {' interrupt | '}
          <kbd style={{ padding: '2px 6px', backgroundColor: `${currentTheme.foreground}22`, borderRadius: '3px' }}>Ctrl+D</kbd>
          {' exit | '}
          <kbd style={{ padding: '2px 6px', backgroundColor: `${currentTheme.foreground}22`, borderRadius: '3px' }}>F11</kbd>
          {' fullscreen'}
        </div>
        <div>
          {symbols.map((sym, i) => (
            <span
              key={sym}
              style={{
                padding: '2px 6px',
                marginLeft: i > 0 ? '4px' : 0,
                backgroundColor: `${currentTheme.accent}33`,
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              onClick={() => sendCommand(`quote ${sym}`)}
            >
              {sym}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialTerminal;
