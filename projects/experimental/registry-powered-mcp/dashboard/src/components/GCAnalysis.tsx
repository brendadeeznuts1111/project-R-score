
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Activity, Zap, Cpu, BarChart3, Database, Play, Pause, RefreshCw, AlertTriangle, Layers, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HeapDataPoint {
  time: number;
  heapUsed: number;
  heapTotal: number;
  latency: number;
}

export const GCAnalysis: React.FC = () => {
  const [data, setData] = useState<HeapDataPoint[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [gcMode, setGcMode] = useState<'none' | 'sync' | 'async'>('none');
  
  // Simulated heap stats (mimicking bun:jsc heapStats())
  const [heapStats, setHeapStats] = useState({
    heapSize: 45 * 1024 * 1024,
    heapCapacity: 64 * 1024 * 1024,
    extraMemorySize: 2 * 1024 * 1024,
    objectCount: 15420,
    protectedObjectCount: 230,
    globalObjectCount: 50,
    protectedGlobalObjectCount: 12,
  });

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const tickRef = useRef<number>(0);

  // Simulation Logic
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      tickRef.current += 1;

      setData(prev => {
        // Simulate Allocation
        const last = prev.length > 0 ? prev[prev.length - 1] : { heapUsed: 20, heapTotal: 64, latency: 0.1 };
        
        let allocationRate = Math.random() * 2.5; // MB per tick
        let latencySpike = 0.1 + Math.random() * 0.2; // Base latency

        // Apply GC Logic
        if (gcMode === 'sync') {
            // Sync GC: Instant drop, High Latency
            if (last.heapUsed > 15) {
                allocationRate = - (last.heapUsed * 0.8); // Drop 80% instant
                latencySpike = 45 + Math.random() * 10; // 45-55ms "Stop the world"
            }
            // Reset mode after one tick of "collection" (simulating a function call)
            // In a real app we'd toggle state back, here we keep it to show continuous manual triggers if held, 
            // but usually a button click sets it once. 
            // We'll handle the reset in the button handler logic usually, but here we just process the "frame".
        } else if (gcMode === 'async') {
            // Async GC: Gradual drop, Low Latency
            if (last.heapUsed > 15) {
                allocationRate = -2.5; // Consistent drain
                latencySpike = 1.2 + Math.random() * 0.5; // Slight overhead
            }
        }

        let newHeap = Math.max(10, last.heapUsed + allocationRate);
        
        // Cap heap
        if (newHeap > 120) newHeap = 120;

        // Update displayed stats
        setHeapStats(prevStats => ({
            ...prevStats,
            heapSize: Math.floor(newHeap * 1024 * 1024),
            objectCount: Math.floor(newHeap * 350) + 1200, // Rough correlation
        }));

        const newPoint = {
            time: elapsed,
            heapUsed: newHeap,
            heapTotal: 128, // Constant capacity for demo
            latency: latencySpike
        };

        const newData = [...prev, newPoint];
        if (newData.length > 60) newData.shift(); // Keep last 60 ticks
        return newData;
      });

      // Auto-reset sync mode to simulate "single call" effect if needed, 
      // but for visualization holding the state 'sync' creates a sawtooth if we don't reset.
      // Let's rely on the button onClick to trigger a single 'sync' event logic via state timeout or similar.
      // Actually, better to just let the button handler set a temporary state.
      
    }, 100);

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, gcMode]);

  // Handler to trigger a single Sync GC event
  const triggerSyncGC = () => {
      setGcMode('sync');
      setTimeout(() => setGcMode('none'), 150); // Duration of the "GC pause" in simulation
  };

  // Handler to toggle Async GC background pressure
  const toggleAsyncGC = () => {
      setGcMode(prev => prev === 'async' ? 'none' : 'async');
  };

  const formatBytes = (bytes: number) => {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-40 bg-rose-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Trash2 size={14} /> Memory Management
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Garbage Collection Analytics</h2>
                <p className="text-slate-500 text-sm max-w-xl">
                    Real-time visualization of <code>Bun.gc()</code> behavior. Compare <strong>synchronous</strong> (blocking) vs <strong>asynchronous</strong> (non-blocking) collection strategies on the JavaScriptCore heap.
                </p>
            </div>
            
            <div className="flex gap-4">
                <div className={`glass-panel p-4 rounded-xl border transition-all ${gcMode === 'sync' ? 'border-rose-500/50 bg-rose-500/10' : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'}`}>
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Heap Used</div>
                    <div className={`text-2xl font-black ${gcMode === 'sync' ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {formatBytes(heapStats.heapSize)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">Cap: {formatBytes(heapStats.heapCapacity)}</div>
                </div>
                <div className={`glass-panel p-4 rounded-xl border transition-all ${gcMode === 'async' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'}`}>
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Object Count</div>
                    <div className={`text-2xl font-black ${gcMode === 'async' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {heapStats.objectCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">Protected: {heapStats.protectedObjectCount}</div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={16} className="text-indigo-500"/> GC Controls
                    </h3>
                    <button 
                        onClick={() => setIsRunning(!isRunning)} 
                        className={`p-2 rounded-lg border ${isRunning ? 'border-amber-500/20 text-amber-500' : 'border-emerald-500/20 text-emerald-500'} hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
                    >
                        {isRunning ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={triggerSyncGC}
                        className="w-full group relative overflow-hidden p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 transition-all text-left"
                    >
                        <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/5 transition-colors"></div>
                        <div className="flex justify-between items-start mb-2">
                            <code className="text-xs font-bold text-rose-500">Bun.gc(true)</code>
                            <Zap size={14} className="text-rose-500 opacity-50 group-hover:opacity-100" />
                        </div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Synchronous</div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Forces immediate collection. Blocks the event loop until complete. Use for benchmarks or critical memory pressure.
                        </p>
                    </button>

                    <button 
                        onClick={toggleAsyncGC}
                        className={`w-full group relative overflow-hidden p-4 rounded-xl border transition-all text-left ${gcMode === 'async' ? 'bg-emerald-500/5 border-emerald-500/50' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'}`}
                    >
                        <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors"></div>
                        <div className="flex justify-between items-start mb-2">
                            <code className="text-xs font-bold text-emerald-500">Bun.gc(false)</code>
                            <RefreshCw size={14} className={`text-emerald-500 ${gcMode === 'async' ? 'animate-spin' : 'opacity-50 group-hover:opacity-100'}`} />
                        </div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Asynchronous</div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Schedules collection on a background thread. Non-blocking. Ideal for high-throughput server scenarios.
                        </p>
                    </button>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        <strong>Performance Note:</strong> Frequent synchronous GC calls will severely impact P99 latency. Use <code>heapStats()</code> to monitor pressure before triggering.
                    </p>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Layers size={14} className="text-sky-500"/> JSC Heap Stats
                </h3>
                <div className="space-y-2 font-mono text-[10px]">
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span className="text-slate-500">heapSize</span>
                        <span className="text-slate-700 dark:text-slate-300">{heapStats.heapSize}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span className="text-slate-500">heapCapacity</span>
                        <span className="text-slate-700 dark:text-slate-300">{heapStats.heapCapacity}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span className="text-slate-500">extraMemorySize</span>
                        <span className="text-slate-700 dark:text-slate-300">{heapStats.extraMemorySize}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span className="text-slate-500">objectCount</span>
                        <span className="text-slate-700 dark:text-slate-300">{heapStats.objectCount}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span className="text-slate-500">protectedObjectCount</span>
                        <span className="text-slate-700 dark:text-slate-300">{heapStats.protectedObjectCount}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                        <span className="text-slate-500">globalObjectCount</span>
                        <span className="text-slate-700 dark:text-slate-300">{heapStats.globalObjectCount}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
            {/* Heap Usage Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-[300px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} className="text-purple-500"/> Heap Allocation (MB)
                    </h3>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full"></div> Used</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300 dark:bg-slate-700 rounded-full"></div> Capacity</span>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorHeap" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.1} />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 140]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#a78bfa' }}
                                formatter={(val: number) => [val.toFixed(1) + ' MB', 'Heap Used']}
                                labelFormatter={() => ''}
                            />
                            <Area type="monotone" dataKey="heapUsed" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorHeap)" animationDuration={300} />
                            <ReferenceLine y={128} stroke="#475569" strokeDasharray="3 3" label={{ value: 'Capacity', fill: '#64748b', fontSize: 10, position: 'insideTopRight' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Latency Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-[300px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <Cpu size={14} className="text-rose-500"/> Event Loop Block Time (ms)
                    </h3>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> Latency</span>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.1} />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 60]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#fb7185' }}
                                formatter={(val: number) => [val.toFixed(2) + ' ms', 'Latency']}
                                labelFormatter={() => ''}
                            />
                            <Area type="step" dataKey="latency" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" animationDuration={300} />
                            <ReferenceLine y={16} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Frame Drop (16ms)', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
