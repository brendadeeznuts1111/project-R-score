import React, { useState, useEffect, useRef } from 'react';

/**
 * 📟 Real-Time Terminal View Component
 * Simulates a live log stream from the system
 */
export const TerminalView: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:4000';
    const socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
      console.log('[WS] Connected to system terminal');
      socket.send(JSON.stringify({ 
        type: 'spawn', 
        command: 'bun', 
        args: ['run', 'scripts/enterprise-scaling.ts'] 
      }));
      setLogs(prev => [...prev, '[SYSTEM] WebSocket connection established. Spawning PTY session...']);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'data') {
          setLogs(prev => [...prev.slice(-99), payload.data.trim()]);
        } else if (payload.type === 'exit') {
          setLogs(prev => [...prev, `[SYSTEM] Process exited with code ${payload.code}`]);
        }
      } catch (e) {
        setLogs(prev => [...prev.slice(-99), event.data]);
      }
    };

    socket.onclose = () => {
      setLogs(prev => [...prev, '[SYSTEM] WebSocket connection closed.']);
    };

    wsRef.current = socket;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Basic key forwarding
        let key = e.key;
        if (key === 'Enter') key = '\n';
        if (key.length === 1 || key === '\n') {
          wsRef.current.send(JSON.stringify({ type: 'input', data: key }));
        }
      }
    };

    const handleResize = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN && terminalRef.current) {
        // Approximate grid size based on div dimensions
        const cols = Math.floor(terminalRef.current.clientWidth / 8);
        const rows = Math.floor(terminalRef.current.clientHeight / 16);
        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      socket.close();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="mt-6" tabIndex={0}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <div className="w-3 h-3 bg-green-500 rounded-full" />
        </div>
        <span className="text-gray-400 text-xs font-mono">dev-hq-system-logs</span>
      </div>
      <div 
        ref={terminalRef}
        className="p-4 bg-black text-green-500 font-mono text-xs h-64 overflow-y-auto rounded-b-lg scrollbar-thin scrollbar-thumb-gray-700"
      >
        {logs.map((log, i) => (
          <div key={i} className="mb-1 leading-relaxed">
            <span className="text-gray-500 mr-2">$</span>
            {log}
          </div>
        ))}
        <div className="animate-pulse">_</div>
      </div>
    </div>
  );
};
