
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Cpu, Zap, Play, CheckCircle2, Gauge, Search, Server, FileDigit, BarChart3, AlertCircle, RefreshCw, Layers, Sliders, FileCode, Copy, Check, ArrowRight, Download, Laptop2, ShieldCheck, Key, Lock, Globe, AlertOctagon, Info, MousePointer2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface LogEntry {
  id: number;
  text: string;
  type: 'cmd' | 'output' | 'success' | 'error' | 'patch' | 'debug';
}

const PARAMETERS = {
  kqueue: [
    { key: '--evfilt-read-timeout', value: '1ms', desc: 'Minimizes read latency for immediate packet processing.' },
    { key: '--evfilt-read-batch', value: '64', desc: 'Batches 64 events per syscall to reduce kernel overhead.' },
    { key: '--kqueue-max-events', value: '1024', desc: 'Expands event ring buffer for high-concurrency bursts.' },
    { key: '--kqueue-wakeup-threshold', value: '256', desc: 'Triggers event loop wakeup at 25% capacity.' },
    { key: '--kqueue-poll-interval', value: '0.5ms', desc: 'Sub-millisecond polling for real-time responsiveness.' },
    { key: '--kqueue-edge-triggered', value: 'true', desc: 'Edge-triggered mode for efficient state tracking.' },
  ]
};

export const KQueueTuning: React.FC = () => {
  const [isBuggy, setIsBuggy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 0, text: '# KQueue Optimization Script for MCP Registry Hub', type: 'output' },
    { id: 1, text: '# Target: Eliminate Event Loop Spinning on macOS', type: 'output' }
  ]);
  const [metrics, setMetrics] = useState({ p99: 10.8, cpu: 2.1 });
  const [chartData, setChartData] = useState(Array.from({ length: 30 }, (_, i) => ({
    time: i,
    p99: 10.8 + (Math.random() * 0.5),
    cpu: 2.1 + (Math.random() * 1)
  })));
  
  const [eventRing, setEventRing] = useState(Array.from({ length: 8 }, (_, i) => ({ id: i, active: false })));
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setMetrics(prev => ({
        p99: isBuggy ? 45.2 + Math.random() * 20 : 10.8 + Math.random() * 0.5,
        cpu: isBuggy ? 99.8 + Math.random() * 0.2 : 2.1 + Math.random() * 0.8
      }));

      setChartData(prev => {
        const next = [...prev.slice(1), {
          time: prev[prev.length - 1].time + 1,
          p99: isBuggy ? 45.2 + Math.random() * 20 : 10.8 + Math.random() * 0.5,
          cpu: isBuggy ? 99.8 + Math.random() * 0.2 : 2.1 + Math.random() * 0.8
        }];
        return next;
      });

      setEventRing(prev => prev.map(e => ({ ...e, active: isBuggy || Math.random() > 0.8 })));
    }, 200);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isBuggy]);

  const toggleFix = () => {
    const nextState = !isBuggy;
    setIsBuggy(nextState);
    if (nextState) {
        addLog('SYSCALL: kqueue_inject_buggy_check()', 'cmd');
        addLog('⚠️ KQUEUE SPIN ALERT: Bitwise comparison (filter & EVFILT_WRITE) causing infinite loop on writable sockets.', 'error');
        addLog('🔥 CPU LOAD: 100% Core saturation.', 'error');
    } else {
        addLog('🩹 APPLYING PATCH: (filter & EVFILT_WRITE) -> (filter == EVFILT_WRITE)', 'patch');
        addLog('🩹 ADDING FLAG: EV_ONESHOT applied to writable events.', 'patch');
        addLog('✅ CPU Usage Normalized. Event loop yielding correctly.', 'success');
    }
  };

  const addLog = (text: string, type: LogEntry['type']) => {
    setLogs(prev => [{ id: Date.now(), text, type }, ...prev].slice(0, 40));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Dynamic Header */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isBuggy ? 'opacity-10' : 'opacity-0'} pointer-events-none`}>
            <div className="absolute inset-0 bg-rose-500 animate-pulse"></div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Zap size={14} /> Kernel Diagnostic Lab
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">macOS KQueue Spin Guard</h2>
                <p className="text-slate-500 text-sm max-w-xl">
                    Demonstrating the critical fix for 100% CPU usage caused by bitwise filter comparison regression in kernel event handling.
                </p>
            </div>
            
            <div className="flex gap-4">
                <div className={`glass-panel p-5 rounded-2xl border transition-all duration-500 ${isBuggy ? 'border-rose-500 bg-rose-500/10' : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'}`}>
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">CPU Stress</div>
                    <div className={`text-3xl font-black tabular-nums ${isBuggy ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {metrics.cpu.toFixed(1)}%
                    </div>
                </div>
                <button 
                    onClick={toggleFix}
                    className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group ${isBuggy ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-rose-600 border-rose-500 text-white shadow-xl shadow-rose-500/20'}`}
                >
                    {isBuggy ? <ShieldCheck size={24} /> : <AlertOctagon size={24} className="animate-pulse" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{isBuggy ? 'Apply Patch' : 'Simulate Bug'}</span>
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Lab */}
        <div className="lg:col-span-8 space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 flex flex-col gap-8 shadow-2xl relative overflow-hidden h-[400px]">
                <div className="absolute top-4 left-6 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kernel Event Flow Visualizer</span>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-64 h-64">
                        {/* Ring Buffer Animation */}
                        <div className={`absolute inset-0 rounded-full border-4 border-dashed transition-colors duration-1000 ${isBuggy ? 'border-rose-500/50 animate-[spin_1s_linear_infinite]' : 'border-indigo-500/20 animate-[spin_10s_linear_infinite]'}`}></div>
                        
                        {/* Event Nodes */}
                        {eventRing.map((node, i) => {
                            const angle = (i / 8) * Math.PI * 2;
                            const x = Math.cos(angle) * 110 + 128;
                            const y = Math.sin(angle) * 110 + 128;
                            return (
                                <div 
                                    key={node.id}
                                    style={{ left: x - 12, top: y - 12 }}
                                    className={`absolute w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${node.active ? 'bg-rose-500 border-white scale-110 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'bg-slate-800 border-slate-700 opacity-20'}`}
                                >
                                    <FileDigit size={10} className="text-white" />
                                </div>
                            );
                        })}

                        {/* Central Hub */}
                        <div className="absolute inset-16 bg-slate-900 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center shadow-inner group">
                            <Cpu size={32} className={`transition-all duration-1000 ${isBuggy ? 'text-rose-500 scale-125 animate-pulse' : 'text-indigo-500'}`} />
                            <div className="mt-2 text-[10px] font-black text-slate-500">KEVENT()</div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 inset-x-6 flex justify-between items-end">
                    <div className="space-y-1">
                        <div className="text-[9px] font-black text-slate-500 uppercase">Comparison Logic</div>
                        <div className={`p-2 rounded-lg font-mono text-[11px] border transition-all ${isBuggy ? 'bg-rose-950/40 border-rose-500 text-rose-400' : 'bg-emerald-950/40 border-emerald-500 text-emerald-400'}`}>
                            {isBuggy ? 'if (filter & EVFILT_WRITE)' : 'if (filter == EVFILT_WRITE)'}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                             <div className="text-[9px] font-black text-slate-500 uppercase">Kernel Latency</div>
                             <div className={`text-xl font-black ${isBuggy ? 'text-rose-500' : 'text-sky-400'}`}>{isBuggy ? '452.1ms' : '0.12ms'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Correlation */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={16} className="text-emerald-500"/> Real-time Impact Metrics
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span className="text-[8px] font-bold text-slate-500 uppercase">CPU</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500"></span><span className="text-[8px] font-bold text-slate-500 uppercase">Latency</span></div>
                    </div>
                </div>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCPU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorLAT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.05} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="cpu" stroke="#f43f5e" fillOpacity={1} fill="url(#colorCPU)" animationDuration={300} name="CPU %" />
                            <Area type="step" dataKey="p99" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorLAT)" animationDuration={300} name="P99 (ms)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Right Console */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-black overflow-hidden flex flex-col flex-1 shadow-xl min-h-[500px]">
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Diagnostic Stream</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isBuggy ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'} text-white`}>
                        {isBuggy ? 'Degraded' : 'Operational'}
                    </div>
                </div>
                <div className="p-6 font-mono text-[11px] overflow-y-auto flex-1 custom-scrollbar">
                    {logs.map((log) => (
                        <div key={log.id} className="mb-2 animate-in fade-in slide-in-from-left-1">
                            {log.type === 'cmd' && <div className="text-sky-400 flex gap-2"><span className="text-slate-600">$</span>{log.text}</div>}
                            {log.type === 'output' && <div className="text-slate-500 ml-4">{log.text}</div>}
                            {log.type === 'success' && <div className="text-emerald-400 ml-4 font-bold">✅ {log.text}</div>}
                            {log.type === 'error' && <div className="text-rose-400 ml-4 font-bold">❌ {log.text}</div>}
                            {log.type === 'patch' && <div className="text-indigo-400 ml-4 font-bold italic">🩹 {log.text}</div>}
                        </div>
                    ))}
                    <div className="flex gap-2 text-emerald-500 mt-2">
                        <span className="animate-pulse bg-emerald-500/50 w-2 h-4 block"></span>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold text-xs uppercase">
                    <Info size={16} /> Hardening Specification
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    The bug was caused by a filter comparison in the kqueue event handling that used bitwise AND (&) instead of equality (==). Combined with missing EV_ONESHOT flags on writable events, this caused the event loop to spin continuously even when no I/O was pending.
                </p>
                <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-[8px] font-black text-slate-500">v1.3.2+ Hardened</span>
                    <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-[8px] font-black text-slate-500">X-Spin-Guard: Active</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
