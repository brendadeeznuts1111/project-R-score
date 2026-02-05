import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Trash2, Copy } from 'lucide-react';
import { api } from '../lib/api';

interface TerminalLine {
  id: number;
  type: 'stdout' | 'stderr' | 'info' | 'success' | 'error';
  content: string;
  timestamp: number;
}

export const TerminalView: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [configName, setConfigName] = useState('production-standard');
  const [selectedFlags, setSelectedFlags] = useState<string[]>(['ENV_PRODUCTION', 'FEAT_ENCRYPTION']);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = (type: TerminalLine['type'], content: string) => {
    const line: TerminalLine = {
      id: lineIdRef.current++,
      type,
      content,
      timestamp: Date.now()
    };
    setLines(prev => [...prev, line]);
  };

  const triggerBuild = async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    addLine('info', `▶️  Starting build: ${configName}`);
    addLine('info', `📋 Flags: ${selectedFlags.join(', ')}`);

    try {
      const result = await api.triggerBuild(configName, selectedFlags);

      if (result.stdout) {
        result.stdout.split('\n').forEach(line => {
          if (line.trim()) addLine('stdout', line);
        });
      }

      if (result.stderr) {
        result.stderr.split('\n').forEach(line => {
          if (line.trim()) addLine('stderr', line);
        });
      }

      if (result.exitCode === 0) {
        addLine('success', `✅ Build completed successfully in ${result.config}`);
      } else {
        addLine('error', `❌ Build failed with exit code ${result.exitCode}`);
      }
    } catch (error) {
      addLine('error', `❌ Build error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const clearTerminal = () => {
    setLines([]);
    lineIdRef.current = 0;
  };

  const copyOutput = () => {
    const text = lines.map(l => l.content).join('\n');
    navigator.clipboard.writeText(text);
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'stdout': return 'text-slate-300';
      case 'stderr': return 'text-red-400';
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-500 font-bold';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Build Terminal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyOutput}
            disabled={lines.length === 0}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
            title="Copy output"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            onClick={clearTerminal}
            disabled={lines.length === 0}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Build Controls */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex gap-3">
          <select
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            className="flex-1 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="development">Development</option>
            <option value="production">Production</option>
            <option value="production-standard">Production Standard</option>
            <option value="production-premium">Production Premium</option>
          </select>

          <button
            onClick={triggerBuild}
            disabled={isExecuting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
          >
            {isExecuting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Building...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Build
              </>
            )}
          </button>
        </div>

        {/* Flags Display */}
        <div className="flex flex-wrap gap-2">
          {selectedFlags.map(flag => (
            <span
              key={flag}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-indigo-400"
            >
              {flag}
            </span>
          ))}
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="h-64 overflow-y-auto p-4 bg-black/60 font-mono text-xs space-y-1"
      >
        {lines.length === 0 ? (
          <div className="text-slate-600 text-center py-8">
            No output yet. Start a build to see the output here.
          </div>
        ) : (
          lines.map(line => (
            <div
              key={line.id}
              className={`${getLineColor(line.type)} hover:bg-slate-900/30 px-1 rounded transition-colors`}
            >
              <span className="opacity-50 select-none mr-2">
                [{new Date(line.timestamp).toLocaleTimeString()}]
              </span>
              {line.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
