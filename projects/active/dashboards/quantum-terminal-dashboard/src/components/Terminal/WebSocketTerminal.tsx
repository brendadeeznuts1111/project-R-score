/**
 * WebSocketTerminal.tsx - Generic WebSocket Terminal Component
 * Provides a reusable terminal interface with WebSocket connectivity
 */

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface WebSocketTerminalProps {
  url: string;
  autoConnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  cols?: number;
  rows?: number;
  fontSize?: number;
  fontFamily?: string;
  theme?: {
    background?: string;
    foreground?: string;
    cursor?: string;
    selection?: string;
  };
  onConnect?: () => void;
  onDisconnect?: () => void;
  onData?: (data: string) => void;
  onError?: (error: Event) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface WebSocketTerminalHandle {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
  send: (data: any) => void;
  connect: () => void;
  disconnect: () => void;
  resize: (cols: number, rows: number) => void;
  isConnected: () => boolean;
}

export const WebSocketTerminal = forwardRef<WebSocketTerminalHandle, WebSocketTerminalProps>(({
  url,
  autoConnect = true,
  reconnectDelay = 3000,
  maxReconnectAttempts = 5,
  cols = 80,
  rows = 24,
  fontSize = 14,
  fontFamily = 'Monaco, "Cascadia Code", Consolas, monospace',
  theme = {},
  onConnect,
  onDisconnect,
  onData,
  onError,
  className = '',
  style = {}
}, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const fitAddon = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const [connected, setConnected] = useState(false);
  const [dimensions, setDimensions] = useState({ cols, rows });

  const defaultTheme = {
    background: '#000010',
    foreground: '#00f0ff',
    cursor: '#9d00ff',
    selection: 'rgba(0, 240, 255, 0.3)',
    ...theme
  };

  // Initialize terminal
  const initTerminal = useCallback(async () => {
    if (!terminalRef.current || terminalInstance.current) return;

    const { Terminal } = await import('@xterm/xterm');
    const { FitAddon } = await import('@xterm/addon-fit');
    const { WebLinksAddon } = await import('@xterm/addon-web-links');

    terminalInstance.current = new Terminal({
      theme: defaultTheme,
      fontSize,
      fontFamily,
      cursorBlink: true,
      allowTransparency: true,
      cols: dimensions.cols,
      rows: dimensions.rows,
      scrollback: 5000,
      convertEol: true
    });

    fitAddon.current = new FitAddon();
    terminalInstance.current.loadAddon(fitAddon.current);
    terminalInstance.current.loadAddon(new WebLinksAddon());

    terminalInstance.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Handle input
    terminalInstance.current.onData((data: string) => {
      sendToServer({ type: 'terminal_input', data });
    });

    return terminalInstance.current;
  }, [defaultTheme, fontSize, fontFamily, dimensions]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      terminalInstance.current?.writeln('\x1b[32m[Connected]\x1b[0m');
      onConnect?.();

      // Send initial resize
      sendToServer({
        type: 'terminal_resize',
        cols: dimensions.cols,
        rows: dimensions.rows
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'terminal_data') {
          terminalInstance.current?.write(data.data);
          onData?.(data.data);
        }
      } catch {
        terminalInstance.current?.write(event.data);
        onData?.(event.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      terminalInstance.current?.writeln('\n\x1b[31m[Disconnected]\x1b[0m');
      onDisconnect?.();

      // Auto-reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        terminalInstance.current?.writeln(
          `\x1b[33mReconnecting (${reconnectAttempts.current}/${maxReconnectAttempts})...\x1b[0m`
        );
        reconnectTimeout.current = setTimeout(connect, reconnectDelay);
      }
    };

    ws.onerror = (error) => {
      onError?.(error);
    };
  }, [url, dimensions, reconnectDelay, maxReconnectAttempts, onConnect, onDisconnect, onData, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
    wsRef.current?.close();
  }, [maxReconnectAttempts]);

  // Send to server
  const sendToServer = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    write: (data: string) => terminalInstance.current?.write(data),
    writeln: (data: string) => terminalInstance.current?.writeln(data),
    clear: () => terminalInstance.current?.clear(),
    focus: () => terminalInstance.current?.focus(),
    send: sendToServer,
    connect,
    disconnect,
    resize: (cols: number, rows: number) => {
      terminalInstance.current?.resize(cols, rows);
      setDimensions({ cols, rows });
      sendToServer({ type: 'terminal_resize', cols, rows });
    },
    isConnected: () => connected
  }), [sendToServer, connect, disconnect, connected]);

  // Handle window resize
  useEffect(() => {
    if (!terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        const term = terminalInstance.current;
        if (term) {
          setDimensions({ cols: term.cols, rows: term.rows });
          sendToServer({ type: 'terminal_resize', cols: term.cols, rows: term.rows });
        }
      }
    });

    resizeObserver.observe(terminalRef.current);
    return () => resizeObserver.disconnect();
  }, [sendToServer]);

  // Initialize and optionally connect
  useEffect(() => {
    initTerminal().then(() => {
      if (autoConnect) {
        connect();
      }
    });

    return () => {
      disconnect();
      terminalInstance.current?.dispose();
    };
  }, [initTerminal, autoConnect, connect, disconnect]);

  return (
    <div
      className={`websocket-terminal ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: defaultTheme.background,
        ...style
      }}
    >
      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          fontSize: '11px',
          color: defaultTheme.foreground
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#00ff41' : '#ff0033'
            }}
          />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <span style={{ opacity: 0.6 }}>{dimensions.cols}x{dimensions.rows}</span>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          padding: '4px'
        }}
      />
    </div>
  );
});

WebSocketTerminal.displayName = 'WebSocketTerminal';

export default WebSocketTerminal;
