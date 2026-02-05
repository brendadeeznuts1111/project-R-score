
import React, { useState, useEffect, useRef } from 'react';
import { MonitorPlay, Zap, Play, Terminal, Cpu, Database, Layers, CheckCircle2, AlertTriangle, RefreshCw, X, Maximize2, Shield, Activity, Power, Code } from 'lucide-react';

interface ProcessRecord {
  id: string;
  command: string[];
  status: 'running' | 'exited' | 'pending';
  exitCode?: number;
  startTime: number;
}

export const ReusableTerminalLab: React.FC = () => {
  const [isTerminalActive, setIsTerminalActive] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['> STANDBY: Reusable PTY Hub Ready']);
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [isExecutingSequence, setIsExecutingSequence] = useState(false);
  const [terminalStats, setTerminalStats] = useState({ cols: 80, rows: 24, mode: 'raw' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const addOutput = (text: string) => {
    setTerminalOutput(prev => [...prev, text]);
  };

  const spawnTerminal = () => {
    setIsTerminalActive(true);
    addOutput(`> await using terminal = new Bun.Terminal({ cols: 80, rows: 24 })`);
    addOutput(`> [SYS] Terminal Instance Allocated (POSIX Shared Memory)`);
  };

  const killTerminal = () => {
    setIsTerminalActive(false);
    setProcesses([]);
    setTerminalOutput(['> Terminal Instance Closed. Resource TAX reclaimed.']);
  };

  const runProcess = async (cmd: string[], duration: number) => {
    const id = `proc_${Math.random().toString(36).substr(2, 4)}`;
    const newProc: ProcessRecord = { id, command: cmd, status: 'running', startTime: Date.now() };
    
    setProcesses(prev => [newProc, ...prev]);
    addOutput(`> [SPAWN] ${cmd.join(' ')} (terminal: terminal_instance)`);
    
    // Simulate process execution
    await new Promise(resolve => setTimeout(resolve, duration));
    
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'exited', exitCode: 0 } : p));
    addOutput(`> [EXIT] Process ${id} finished with code 0.`);
  };

  const executeSequence = async () => {
    if (!isTerminalActive || isExecutingSequence) return;
    setIsExecutingSequence(true);
    
    addOutput(`> [SEQUENCE] Starting build-and-deploy chain...`);
    
    await runProcess(['bun', 'install'], 2000);
    await runProcess(['bun', 'test', '--coverage'], 1500);
    await runProcess(['bun', 'build', './index.ts'], 1200);
    await runProcess(['bun', 'deploy', '--pop=ORD-1'], 2500);
    
    addOutput(`> [SEQUENCE] Chain Complete. Terminal remains ACTIVE.`);
    setIsExecutingSequence(false);
  };

  const handleResize = () => {
    const newCols = Math.floor(Math.random() * 40) + 80;
    setTerminalStats(prev => ({ ...prev, cols: newCols }));
    addOutput(`> terminal.resize({ cols: ${newCols}, rows: 24 })`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header HUD */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sky-500 font-black text-[10px] uppercase tracking-[0.3em]">
                    <MonitorPlay size={14} /> POSIX Terminal Infrastructure
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Universal Reusable Terminals</h2>
                <p className="text-slate-500 text-sm max-w-xl">
                    Create standalone PTY instances that survive subprocess lifecycle. Execute build chains without the initialization tax of spawning new PTYs.
                </p>
            </div>
            
            <div className="flex gap-4">
                {!isTerminalActive ? (
                    <button 
                        onClick={spawnTerminal}
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-3"
                    >
                        <Power size={16} /> Spawn Hub Terminal
                    </button>
                ) : (
                    <button 
                        onClick={killTerminal}
                        className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 transition-all flex items-center gap-3"
                    >
                        <X size={16} /> Close Terminal
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* The Lab Visualizer */}
        <div className="lg:col-span-8 space-y-6">
            <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-black overflow-hidden flex flex-col h-[500px] shadow-2xl relative">
                {/* Scanline overlay for aesthetic */}
                <div className="absolute inset-0 scanlines opacity-10 pointer-events-none z-20"></div>
                
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <Terminal size={16} className={isTerminalActive ? "text-emerald-500" : "text-slate-500"} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Universal_Terminal_Instance_01
                        </span>
                        {isTerminalActive && (
                            <div className="flex items-center gap-2 ml-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[8px] font-black text-emerald-500 uppercase">AWAITING_SPAWN</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                         <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500 mr-4">
                            <span>COLS: {terminalStats.cols}</span>
                            <span>ROWS: {terminalStats.rows}</span>
                            <span className="text-indigo-400">MODE: {terminalStats.mode.toUpperCase()}</span>
                         </div>
                    </div>
                </div>

                <div 
                    ref={scrollRef}
                    className="flex-1 p-6 font-mono text-[12px] overflow-y-auto selection:bg-indigo-500/30 custom-scrollbar z-10"
                >
                    {terminalOutput.map((line, i) => (
                        <div key={i} className={`mb-1 ${line.startsWith('>') ? 'text-emerald-500/90' : 'text-slate-300'}`}>
                            <span className="text-slate-700 mr-2 select-none">[{i}]</span>
                            {line}
                        </div>
                    ))}
                    {isTerminalActive && (
                        <div className="inline-block w-2 h-4 bg-emerald-500 animate-pulse align-middle ml-1"></div>
                    )}
                </div>

                {isTerminalActive && (
                    <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-center gap-6 shrink-0 z-30">
                        <button 
                            onClick={executeSequence}
                            disabled={isExecutingSequence}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
                        >
                            {isExecutingSequence ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                            Execute Script Chain
                        </button>
                        <button 
                            onClick={handleResize}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all"
                        >
                            <Maximize2 size={12} />
                            Resize PTY
                        </button>
                    </div>
                )}
            </div>

            {/* Architecture Insight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-44 bg-emerald-500/5 border-emerald-500/10">
                    <div className="flex items-center gap-2 text-emerald-500 mb-3">
                        <Shield size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ownership & Scoping</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        The `await using` syntax ensures the terminal instance is gracefully closed when the current scope exits, cleaning up POSIX descriptors automatically.
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-emerald-600 text-[10px] font-black">
                        <CheckCircle2 size={12} /> MEMORY_SAFE: LEAK_REDUCED
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-44 bg-indigo-500/5 border-indigo-500/10">
                    <div className="flex items-center gap-2 text-indigo-500 mb-3">
                        <Database size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Shared IO Buffer</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        All subprocesses spawned within the `terminal` object pipe their output directly to the shared `data(term, data)` callback.
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-indigo-600 text-[10px] font-black">
                        <Zap size={12} /> ZERO_COPY_IO: ACTIVE
                    </div>
                </div>
            </div>
        </div>

        {/* Process History Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col flex-1 shadow-xl min-h-[400px]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                        <Layers size={18} />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic tracking-tight">Active Terminal Stack</h3>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                    {processes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
                            <Activity size={32} className="text-slate-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">No Active Subprocesses</span>
                        </div>
                    ) : (
                        processes.map((proc) => (
                            <div key={proc.id} className={`p-4 rounded-xl border transition-all ${proc.status === 'running' ? 'bg-indigo-500/5 border-indigo-500/30 shadow-lg shadow-indigo-500/10' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${proc.status === 'running' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                        <span className="text-[11px] font-black font-mono text-slate-700 dark:text-slate-200">{proc.id}</span>
                                    </div>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${proc.status === 'running' ? 'text-indigo-500 border-indigo-500/20' : 'text-slate-400 border-slate-300 dark:border-slate-700'}`}>
                                        {proc.status.toUpperCase()}
                                    </span>
                                </div>
                                <code className="text-[10px] text-indigo-400 block mb-2">{proc.command.join(' ')}</code>
                                {proc.status === 'exited' && (
                                    <div className="flex items-center gap-2 text-[8px] font-black text-emerald-500">
                                        <CheckCircle2 size={10} /> EXIT_CODE: {proc.exitCode}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                         <div className="flex items-center gap-2 text-amber-500 mb-2">
                            <Code size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">API Signature</span>
                         </div>
                         <code className="text-[9px] font-mono text-slate-500 leading-tight">
                            Bun.spawn([args], &#123; terminal: terminal_obj &#125;)
                         </code>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-3xl border border-sky-500/20 bg-sky-500/5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-500 font-bold text-xs uppercase">
                    <Cpu size={16} /> POSIX Compliance
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    Universal Terminals provide low-level controls for raw mode, unref/ref behavior, and atomic closing. Limited to POSIX-compliant kernels (Linux/macOS).
                </p>
                <div className="mt-2">
                    <span className="px-2 py-1 rounded bg-sky-500/10 text-[8px] font-black text-sky-600 uppercase tracking-widest">Kernel Tier: A-Grade</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
