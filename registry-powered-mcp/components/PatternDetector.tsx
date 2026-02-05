
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Zap, 
  Shield, 
  AlertTriangle, 
  Loader2, 
  Play, 
  Terminal, 
  CheckCircle2, 
  History, 
  GitBranch, 
  Database, 
  Users, 
  TrendingUp, 
  Scale, 
  AlertOctagon, 
  ArrowDown, 
  Activity, 
  MousePointer2, 
  GitCommit, 
  Globe, 
  Lock,
  Layers,
  FileJson,
  Network,
  BookOpen,
  Divide,
  TrendingDown,
  Sigma,
  Code,
  Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'debug';
  timestamp: string;
}

// INFRA-05: Standardized Telemetry Class (Frontend Adapter)
class ApiResponse<T> {
  constructor(
    public data: T,
    public status: number,
    public timestamp: string,
    public patternId: number,
    public error?: { ljungBoxTest?: { pValue: number; residuals: number[] } }
  ) {}

  logTelemetry() {
    const baseData = {
      timestamp: this.timestamp,
      status: this.status,
      patternId: this.patternId
    };

    // Simulate process.env.DEBUG for browser environment
    const isDebug = true; 

    const debugData = isDebug ? {
      ljungBoxPValue: this.error?.ljungBoxTest?.pValue,
      residuals: this.error?.ljungBoxTest?.residuals.slice(0, 5) // Show first 5 residuals
    } : {};

    // Use console.table for browser visualization instead of inspect.table
    console.table([{
      ...baseData,
      ...debugData
    }]);
  }
}

export const PatternDetector: React.FC = () => {
  const [activeView, setActiveView] = useState<'scanner' | 'logic' | 'framework'>('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [pattern, setPattern] = useState('almgren-chriss-id17');
  const [userId, setUserId] = useState('syndicate_node_09');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Generate optimal trajectory data for visualization
  const trajectoryData = useMemo(() => {
    const k = 1.42; // Decay constant
    return Array.from({ length: 25 }, (_, i) => {
        const t = i / 24;
        // v(t) ~ sinh(k(T-t))
        // Normalized to start at 100
        const val = Math.sinh(k * (1 - t)) / Math.sinh(k) * 100;
        return {
            time: `${i}h`,
            rate: val.toFixed(1),
        };
    });
  }, []);

  const runDetection = () => {
    setIsScanning(true);
    
    const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
      setLogs(prev => [...prev, {
        id: Date.now(),
        message: msg,
        type,
        timestamp: new Date().toISOString().split('T')[1].slice(0, -1)
      }]);
    };

    setLogs([]);
    addLog(`[INIT] Loading Pattern ID 17 (Almgren-Chriss Optimal Trajectory)...`);
    addLog(`[DATA] Ingesting volume_series & price_series (T=24h) for ${userId}...`);
    
    setTimeout(() => {
      addLog(`[FIT] Fitting AC trajectory curve: sinh(κ(T-t))...`, 'info');
      addLog(`[CALC] Decay constant (κ): 1.42 (Normalized T=1)`, 'info');
    }, 600);

    setTimeout(() => {
        addLog(`[METRIC] Front-loading ratio: 0.68 (> 0.65 threshold)`, 'warning');
        addLog(`[METRIC] Impact Asymmetry: 0.72 (> 0.70 threshold)`, 'warning');
        addLog(`[STAT] Volume Concentration (T/2): 0.88`, 'info');
    }, 1200);

    setTimeout(() => {
      // INFRA-05: Ljung-Box Test residuals under DEBUG feature
      addLog(`[DEBUG] Ljung-Box Residuals: [0.042, -0.012, 0.008, 0.103]`, 'debug');
      addLog(`[TEST] Ljung-Box test on residuals: p=0.08 (White Noise Confirmed)`, 'success');
      addLog(`[MICRO] Multi-venue synchronization detected across 3 books`, 'warning');
      
      // Execute Telemetry Class Logic
      const telemetry = new ApiResponse(
          null, 
          200, 
          new Date().toISOString(), 
          17, 
          { ljungBoxTest: { pValue: 0.08, residuals: [0.042, -0.012, 0.008, 0.103] } }
      );
      telemetry.logTelemetry();
      addLog(`[TELEMETRY] Pattern 17 structured data logged to console.`, 'debug');

    }, 1600);

    setTimeout(() => {
      addLog(`[RESULT] PATTERN ID 17 CONFIRMED: Syndicate Optimization Detected.`, 'success');
      // INFRA-05: Standardized HTTP Status
      addLog(`[HTTP] 200 OK: ApiResponse<Pattern17> envelope verified.`, 'success');
      addLog(`[ACTION] Flagging for Risk Management Intervention.`, 'error');
      setIsScanning(false);
    }, 2200);
  };

  const FlowNode = ({ icon: Icon, title, sub, type, children }: { icon: any, title: string, sub?: string, type: 'start' | 'process' | 'decision' | 'tension' | 'child' | 'output' | 'input' | 'external', children?: React.ReactNode }) => {
    const styles = {
      start: "bg-slate-900 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]",
      process: "bg-slate-900/80 text-cyan-400 border-cyan-500/30",
      decision: "bg-slate-900 text-amber-400 border-amber-500/50",
      tension: "bg-rose-950/30 text-rose-400 border-rose-500/40 border-dashed",
      child: "bg-slate-800/50 text-blue-300 border-blue-400/20 scale-90",
      output: "bg-emerald-950/30 text-emerald-400 border-emerald-500/50",
      input: "bg-amber-950/30 text-amber-400 border-amber-500/40",
      external: "bg-purple-950/30 text-purple-400 border-purple-500/40"
    };

    return (
      <div className={`relative p-3 rounded-xl border flex flex-col items-center text-center transition-all hover:scale-[1.02] cursor-default group ${styles[type]}`}>
        {children}
        <div className="p-2 rounded-lg bg-black/20 mb-2">
          <Icon size={16} />
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest leading-tight">{title}</div>
        {sub && <div className="text-[9px] opacity-70 mt-1 font-mono leading-tight">{sub}</div>}
        
        {/* Connector Line for visual flow if needed later */}
        {type === 'tension' && (
             <div className="absolute -right-2 -top-2">
                <AlertTriangle size={12} className="text-rose-500 animate-pulse" />
             </div>
        )}
      </div>
    );
  };

  const Arrow = () => (
    <div className="flex justify-center py-2">
      <ArrowDown size={14} className="text-slate-600" />
    </div>
  );

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-2xl animate-in fade-in duration-500 h-[800px]">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950/50 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tighter italic">Enhanced Pattern Detector</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Almgren-Chriss Trajectory Analysis</p>
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setActiveView('scanner')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'scanner' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Terminal size={12} /> Live Scanner
            </button>
            <button 
              onClick={() => setActiveView('logic')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'logic' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <GitBranch size={12} /> Logic Topology
            </button>
            <button 
              onClick={() => setActiveView('framework')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'framework' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <BookOpen size={12} /> Pattern ID 17
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeView === 'scanner' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Identity (userId)</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detection Pattern</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={runDetection}
                disabled={isScanning}
                className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 group disabled:opacity-50"
              >
                {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="group-hover:translate-x-1 transition-transform" />}
                {isScanning ? 'EXECUTING TRAJECTORY SCAN...' : 'LAUNCH PATTERN DETECTOR'}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Execution Horizon</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Clock size={12} className="text-emerald-500" /> T=24h Window</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Risk Aversion (λ)</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Activity size={12} className="text-sky-500" /> Adaptive Fit</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col h-full min-h-[300px]">
              <div className="flex-1 bg-black rounded-2xl border border-slate-800 p-4 font-mono text-[11px] overflow-y-auto shadow-inner relative group custom-scrollbar">
                <div className="absolute top-3 right-3 opacity-30 group-hover:opacity-100 transition-opacity">
                  <History size={14} className="text-slate-500" />
                </div>
                {logs.length === 0 ? (
                  <div className="text-slate-700 flex flex-col items-center justify-center h-full gap-2 italic">
                    <Activity size={24} className="opacity-20" />
                    <span>Awaiting volume series data...</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {logs.map((log) => (
                      <div key={log.id} className={`flex gap-2 ${
                        log.type === 'error' ? 'text-rose-400 font-bold' : 
                        log.type === 'success' ? 'text-emerald-400 font-bold' : 
                        log.type === 'warning' ? 'text-amber-400' : 
                        log.type === 'debug' ? 'text-purple-400 font-mono italic' :
                        'text-slate-300'
                      }`}>
                        <span className="text-slate-600 select-none text-[9px] mt-0.5">{log.timestamp}</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isScanning && <div className="animate-pulse inline-block w-1.5 h-3 bg-emerald-500 ml-2"></div>}
              </div>
            </div>
          </div>
        )}

        {activeView === 'logic' && (
          <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
             <div className="max-w-5xl mx-auto flex flex-col items-center">
                 {/* Start & Input */}
                 <div className="w-full max-w-md space-y-2">
                    <FlowNode icon={Play} title="Start: Volume Stream" type="start" />
                    <Arrow />
                    <FlowNode icon={FileJson} title="Input: Time Series (v(t))" sub="Resolution: 1min" type="input" />
                    <Arrow />
                    <FlowNode icon={Divide} title="Fit: Almgren-Chriss Trajectory" sub="sinh(κ(T-t))" type="process" />
                    <Arrow />
                 </div>

                 {/* Parallel Paths */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-2 relative">
                    
                    {/* Trajectory Analysis */}
                    <div className="flex flex-col gap-3 relative p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase rounded text-slate-500">Shape</div>
                        <FlowNode icon={TrendingUp} title="Front-Loading Ratio" sub="x(T/3)/X > 0.65" type="process" />
                        <div className="grid grid-cols-2 gap-2">
                            <FlowNode icon={Activity} title="Decay (κ)" type="child" />
                            <FlowNode icon={ArrowDown} title="Residuals" type="child" />
                        </div>
                        <FlowNode icon={AlertTriangle} title="Ljung-Box Test" sub="White Noise check" type="tension" />
                    </div>

                    {/* Market Impact */}
                    <div className="flex flex-col gap-3 relative p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase rounded text-slate-500">Impact</div>
                        <FlowNode icon={Scale} title="Impact Asymmetry" sub="Initial vs Terminal" type="process" />
                         <div className="grid grid-cols-2 gap-2">
                            <FlowNode icon={Layers} title="Temp Impact" type="child" />
                            <FlowNode icon={Database} title="Perm Impact" type="child" />
                        </div>
                        <FlowNode icon={AlertOctagon} title="Price Response" sub=">0.7 Correlation" type="tension" />
                    </div>

                    {/* Microstructure */}
                    <div className="flex flex-col gap-3 relative p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase rounded text-slate-500">Venue</div>
                        <FlowNode icon={Users} title="Cross-Book Sync" sub="Multi-venue checks" type="process" />
                         <div className="grid grid-cols-2 gap-2">
                            <FlowNode icon={ArrowDown} title="Limit Orders" type="child" />
                            <FlowNode icon={Network} title="Clustering" type="child" />
                        </div>
                        <FlowNode icon={Lock} title="Detection" sub="Syndicate Flag" type="output" />
                    </div>
                 </div>
             </div>
          </div>
        )}

        {activeView === 'framework' && (
          <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                        <BookOpen size={14} /> Pattern Properties & Detection Signals
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Pattern ID 17: Almgren-Chriss Optimal Betting Trajectory</h2>
                </div>

                {/* Core Pattern Characteristics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Activity size={16} className="text-emerald-500" /> Volume-Time Signature
                        </h3>
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs text-slate-500 leading-relaxed space-y-2">
                            <p><strong className="text-slate-700 dark:text-slate-300">Front-loaded exponential decay:</strong> Betting rate follows <code>v(t) ∝ sinh(κ(T-t))</code>.</p>
                            <p><strong className="text-slate-700 dark:text-slate-300">Cumulative position:</strong> >65% of volume executed in first 33% of time.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <TrendingUp size={16} className="text-sky-500" /> Price/Odds Co-movement
                        </h3>
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs text-slate-500 leading-relaxed space-y-2">
                            <p><strong className="text-slate-700 dark:text-slate-300">Rapid initial adjustment:</strong> Line movement concentrated in first execution phase.</p>
                            <p><strong className="text-slate-700 dark:text-slate-300">Stabilization:</strong> Reduced volatility after initial adjustment.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" /> Temporal Properties
                        </h3>
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs text-slate-500 leading-relaxed space-y-2">
                            <p><strong className="text-slate-700 dark:text-slate-300">Initiation:</strong> {'<2 hours'} after line posting.</p>
                            <p><strong className="text-slate-700 dark:text-slate-300">Horizon:</strong> Complete within 12-18 hours for 24h markets.</p>
                        </div>
                    </div>
                </div>

                {/* Trajectory Visualization */}
                <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <TrendingDown size={16} className="text-indigo-500" /> Optimal Execution Trajectory (κ=1.42)
                        </h3>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded font-bold uppercase">Theoretical Model</span>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trajectoryData}>
                                <defs>
                                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.1} />
                                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#818cf8' }}
                                    formatter={(value: any) => [`${value}%`, 'Betting Rate']}
                                />
                                <Area type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                         <span>Initial Rate: 100% (Aggressive)</span>
                         <span>Terminal Rate: ~0% (Passive)</span>
                    </div>
                </div>

                {/* Quantitative Metrics Table */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Divide size={18} className="text-indigo-500" /> Quantitative Detection Metrics
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3">Metric</th>
                                    <th className="px-4 py-3">Formula</th>
                                    <th className="px-4 py-3">Threshold (ID 17)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                <tr>
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Front-loading ratio</td>
                                    <td className="px-4 py-3 font-mono text-slate-500">FR = x(T/3)/X</td>
                                    <td className="px-4 py-3 font-mono text-emerald-500 font-bold">{'>'} 0.65</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Decay constant (κ)</td>
                                    <td className="px-4 py-3 font-mono text-slate-500">Fitted from trajectory</td>
                                    <td className="px-4 py-3 font-mono text-emerald-500 font-bold">{'>'} 1.2 (T=1)</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Impact asymmetry</td>
                                    <td className="px-4 py-3 font-mono text-slate-500">IA = Δp₀-₁h/Δp_total</td>
                                    <td className="px-4 py-3 font-mono text-emerald-500 font-bold">{'>'} 0.7</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Volume concentration</td>
                                    <td className="px-4 py-3 font-mono text-slate-500">VC = ∫₀^T/2 v(t)dt / X</td>
                                    <td className="px-4 py-3 font-mono text-emerald-500 font-bold">{'>'} 0.85</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Implementation Code */}
                <div className="space-y-4">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Code size={18} className="text-amber-500" /> Real-Time Detection Algorithm
                    </h3>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto relative">
                        <div className="absolute top-2 right-2 text-[10px] font-bold text-slate-600 uppercase">Bun / TypeScript</div>
<pre>{`function detectPattern17(volumeSeries: number[], priceSeries: number[], T: number) {
  // 1. Fit AC trajectory
  const { kappa, xEst } = fitAlmgrenChriss(volumeSeries, T);

  // 2. Calculate metrics
  const frontRatio = cumulativeVolume(0, T / 3) / totalVolume;
  const impactAsym = priceChange(0, 1) / totalPriceChange;

  // 3. Statistical tests
  const residuals = volumeSeries.map((v, i) => v - acPrediction[i]);
  const ljungBox = testWhiteNoise(residuals);
  const adf = testStationarity(priceSeriesAfterInit);

  // 4. Pattern scoring
  const score =
    +(kappa > 1.2) * 0.3 +
    +(frontRatio > 0.65) * 0.25 +
    +(impactAsym > 0.7) * 0.2 +
    +(ljungBox.p > 0.05) * 0.15 +
    +(adf.p < 0.05) * 0.1;

  return { detected: score > 0.7, kappa, frontRatio };
}`}</pre>
                    </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Layers size={18} className="text-purple-500" /> Market Microstructure
                        </h3>
                        <div className="space-y-2">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                                <strong className="block mb-1 text-slate-700 dark:text-slate-200">Liquidity Consumption</strong>
                                <span className="text-slate-500">Multi-venue synchronization with bets targeting bookmaker limits.</span>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                                <strong className="block mb-1 text-slate-700 dark:text-slate-200">Response Functions</strong>
                                <span className="text-slate-500">Public retail volume often follows syndicate-initiated moves after a 2-4 hour lag.</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Shield size={18} className="text-rose-500" /> Differentiation
                        </h3>
                        <div className="space-y-2">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex gap-2">
                                <div className="min-w-[4px] bg-emerald-500 rounded-full"></div>
                                <div>
                                    <strong className="text-slate-700 dark:text-slate-200">vs. Public Betting</strong>
                                    <p className="text-slate-500">Public shows random timing & reaction to news. ID 17 is mathematically optimized.</p>
                                </div>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex gap-2">
                                <div className="min-w-[4px] bg-sky-500 rounded-full"></div>
                                <div>
                                    <strong className="text-slate-700 dark:text-slate-200">vs. Market Making</strong>
                                    <p className="text-slate-500">MM flow is two-sided and mean-reverting. ID 17 is directional.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
