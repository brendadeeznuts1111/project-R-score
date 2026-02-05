import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
  Zap, Shield, Package, Cpu, CheckCircle2, AlertTriangle, Code2, BarChart3, Terminal, RefreshCw,
  Info, ChevronRight, Copy, Layers, Smartphone, Globe, FlaskConical, Activity, Box, Binary,
  Settings, Flame, Search, BookOpen, Wand2, Heart, Bell, Layout, Gauge, Ruler, Lock, ZapOff,
  Hash, BoxSelect, Target, Timer, Briefcase, Filter, ChevronDown, ChevronUp, AlertOctagon, MapPin, Network,
  TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  FeatureFlag, OptimizationReport, BundleStat, MatrixItem, ConstantCategory,
  HealthScoreItem, AlertItem, UnicodeWidthItem, IntegrationItem, BuildConfig
} from './types';
import {
  FLAG_CATEGORIES, SNIPPETS, IMPLEMENTATION_MATRIX, RUNTIME_CONSTANTS,
  HEALTH_SCORE_MATRIX, ALERT_MATRIX, UNICODE_WIDTH_MATRIX, INTEGRATION_STATUS_MATRIX,
  BUILD_CONFIGURATIONS
} from './constants';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { AlertsPanel } from './components/AlertsPanel';
import { GeolocationPanel } from './components/GeolocationPanel';
import { AuthenticationPanel } from './components/AuthenticationPanel';
import { SocketInspectionPanel } from './components/SocketInspectionPanel';
import { TelemetryPanel } from './components/TelemetryPanel';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ConstantValueBadge: React.FC<{ value: string }> = ({ value }) => {
  const v = value.toLowerCase();
  let style = 'bg-slate-800/80 text-slate-200 border-slate-700/50';
  let Icon = Box;

  if (v.includes('number') || v.includes('uint64') || v.includes('gb') || v.includes('nanoseconds')) {
    style = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    Icon = Gauge;
  } else if (v.includes('esm') || v.includes('native') || v.includes('standard') || v.includes('enabled') || v.includes('full')) {
    style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    Icon = CheckCircle2;
  } else if (v.includes('epoch') || v.includes('profile') || v.includes('tsx') || v.includes('jsx')) {
    style = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    Icon = Activity;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${style}`}>
      <Icon className="w-3 h-3" />
      <span className="text-[10px] font-black uppercase tracking-tight">{value}</span>
    </div>
  );
};

const App: React.FC = () => {
  const [activeFlags, setActiveFlags] = useState<Set<FeatureFlag>>(new Set(["ENV_PRODUCTION", "FEAT_FREE", "FEAT_ENCRYPTION"]));
  const [activeTab, setActiveTab] = useState<'matrix' | 'code' | 'health' | 'bundle' | 'audit' | 'constants' | 'alerts' | 'geo' | 'auth' | 'sockets' | 'telemetry'>('matrix');
  const [activeConstantCategory, setActiveConstantCategory] = useState<string>(RUNTIME_CONSTANTS[0].id);
  const [constantSearch, setConstantSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setExpandedRows(new Set());
  }, [activeConstantCategory, constantSearch]);

  const toggleFlag = (flag: FeatureFlag) => {
    setActiveFlags(prev => {
      const next = new Set(prev);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  };

  const applyConfig = (config: BuildConfig) => {
    setActiveFlags(new Set(config.features));
  };

  const toggleDescription = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const buildCommand = useMemo(() => {
    const flags = Array.from(activeFlags).join(',');
    return `bun build --features=${flags} --minify ./src/index.ts --outdir ./dist`;
  }, [activeFlags]);

  const currentBundleStat = useMemo(() => {
    let size = 100; // Base
    if (activeFlags.has("FEAT_PREMIUM")) size += 45;
    if (activeFlags.has("FEAT_ENTERPRISE")) size += 80;
    if (activeFlags.has("FEAT_ENCRYPTION")) size += 12;
    if (activeFlags.has("ENV_DEVELOPMENT")) size += 50;
    if (activeFlags.has("INTEGRATION_GEELARK_API")) size += 60;
    
    const max = 800;
    return { name: 'Active Build', size, max, dce: `${Math.round((1 - size/max)*100)}%` };
  }, [activeFlags]);

  const allConfigStats = useMemo(() => {
    return BUILD_CONFIGURATIONS.map(config => {
      const sizeVal = parseInt(config.sizeEstimate);
      return {
        name: config.name,
        size: sizeVal,
        max: 800,
        dce: config.deadCodeElimination
      };
    });
  }, []);

  const healthScore = useMemo(() => {
    const criticalFlags = FLAG_CATEGORIES.flatMap(c => c.flags).filter(f => f.critical);
    const enabledCritical = criticalFlags.filter(f => activeFlags.has(f.id)).length;
    const score = (enabledCritical / criticalFlags.length) * 100;
    return HEALTH_SCORE_MATRIX.find(h => {
      const val = parseInt(h.range.replace('%', ''));
      return score >= (isNaN(val) ? 0 : val);
    }) || HEALTH_SCORE_MATRIX[HEALTH_SCORE_MATRIX.length - 1];
  }, [activeFlags]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyze this Bun build for Dev HQ: Flags: ${Array.from(activeFlags).join(',')}. Logic: check for production security (FEAT_ENCRYPTION, FEAT_VALIDATION_STRICT) vs ENV_PRODUCTION. Integration: GEELARK_API requires PREMIUM. Also evaluate if flags like --smol or --expose-gc should be suggested based on these choices for optimal process control. Return JSON: {analysis:string, estimatedGains:string, criticalWarnings:string[]}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text || '{}');
      setReport(data);
      setActiveTab('audit');
    } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const simulateDCE = (code: string) => {
    let result = code;
    result = result.replace(/feature\("([^"]+)"\)/g, (_, flag) => activeFlags.has(flag) ? 'true' : 'false');
    result = result.replace(/if \(false\) \{[\s\S]*?\}/g, '/* [DCE: ELIMINATED] */');
    result = result.replace(/if \(true\) \{([\s\S]*?)\}/g, '$1');
    result = result.replace(/true \? ([^:]+) : ([^;]+)/g, '$1');
    result = result.replace(/false \? ([^:]+) : ([^;]+)/g, '$2');
    return result.trim();
  };

  const currentConstants = useMemo(() => {
    return RUNTIME_CONSTANTS.find(c => c.id === activeConstantCategory);
  }, [activeConstantCategory]);

  const filteredConstants = useMemo(() => {
    if (!currentConstants) return [];
    if (!constantSearch) return currentConstants.items;
    const search = constantSearch.toLowerCase();
    return currentConstants.items.filter(item => 
      item.source.toLowerCase().includes(search) || 
      item.description.toLowerCase().includes(search) ||
      item.value.toLowerCase().includes(search)
    );
  }, [currentConstants, constantSearch]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      {/* Sidebar: Feature Flags */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Dev HQ Architect</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Bun Compiler v1.3.6</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {FLAG_CATEGORIES.map(category => (
            <div key={category.id} className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1">{category.label}</h3>
              <div className="space-y-1">
                {category.flags.map(flag => (
                  <button
                    key={flag.id}
                    onClick={() => toggleFlag(flag.id)}
                    className={`group/flag w-full text-left px-3 py-2 rounded-xl transition-all duration-200 flex items-start gap-3 border ${
                      activeFlags.has(flag.id) 
                        ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' 
                        : 'hover:bg-slate-800/50 text-slate-500 border-transparent'
                    }`}
                  >
                    <div className={`mt-1 h-3.5 w-3.5 rounded border-2 transition-all flex items-center justify-center ${
                      activeFlags.has(flag.id) ? 'bg-indigo-500 border-indigo-400' : 'border-slate-700'
                    }`}>
                      {activeFlags.has(flag.id) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <div className="text-[11px] font-bold truncate tracking-tight">{flag.id}</div>
                         {flag.critical && <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" />}
                      </div>
                      {flag.impact && activeFlags.has(flag.id) && (
                        <div className="text-[8px] font-black text-indigo-400/60 uppercase mt-0.5"> Impact: {flag.impact.bundleSize} size </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Integrity</span>
            <span className="text-xs font-bold" style={{ color: healthScore.color }}>{healthScore.badge}</span>
          </div>
          <button 
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-950/40"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {isAnalyzing ? "Auditing..." : "Compiler Audit"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        <header className="h-16 border-b border-slate-800 flex items-center px-8 justify-between bg-slate-950/80 backdrop-blur-xl z-10">
          <nav className="flex gap-2 h-full items-center">
            {[
              { id: 'matrix', label: 'Implementation', icon: Layout },
              { id: 'code', label: 'DCE Logic', icon: Code2 },
              { id: 'health', label: 'Health Matrix', icon: Heart },
              { id: 'constants', label: 'Constants', icon: Hash },
              { id: 'bundle', label: 'Impact Analysis', icon: BarChart3 },
              { id: 'audit', label: 'Security Log', icon: Shield },
              { id: 'alerts', label: 'Alerts', icon: AlertOctagon },
              { id: 'geo', label: 'Geolocation', icon: MapPin },
              { id: 'auth', label: 'Auth', icon: Lock },
              { id: 'sockets', label: 'Sockets', icon: Network },
              { id: 'telemetry', label: 'Telemetry', icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 h-9 rounded-full flex items-center gap-2 text-[11px] font-black transition-all border ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-lg'
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-4">
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BUN_MODULE_RESOLUTION: BUNDLER</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {/* Build Profiles Quick Select */}
          {activeTab !== 'constants' && (
            <div className="max-w-6xl mx-auto mb-10 animate-in fade-in duration-300">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Build Profiles (from meta.json)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {BUILD_CONFIGURATIONS.map(config => (
                  <button
                    key={config.name}
                    onClick={() => applyConfig(config)}
                    className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl hover:border-indigo-500/50 transition-all text-left group"
                  >
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1 group-hover:text-indigo-300 transition-colors">{config.name}</div>
                    <div className="text-[9px] text-slate-500 line-clamp-2 leading-tight">{config.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Implementation Matrix
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/50 text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Component</th>
                        <th className="px-6 py-4">Implementation</th>
                        <th className="px-6 py-4">Type Safety</th>
                        <th className="px-6 py-4">DCE</th>
                        <th className="px-6 py-4">Bundle Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {IMPLEMENTATION_MATRIX.map((item, idx) => (
                        <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                          <td className="px-6 py-5 font-bold text-slate-200">{item.component}</td>
                          <td className="px-6 py-5 font-mono text-indigo-400/80">{item.implementation}</td>
                          <td className="px-6 py-5">
                            <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase">
                              {item.typeSafety}
                            </span>
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-400 uppercase tracking-tighter">{item.dce}</td>
                          <td className="px-6 py-5 text-slate-400 italic">{item.impact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-500" />
                    Target Output Command
                  </h3>
                  <div className="bg-black/60 rounded-xl p-4 border border-slate-800 font-mono text-xs text-indigo-200/90 flex justify-between items-center">
                    <code className="truncate mr-4">{buildCommand}</code>
                    <button onClick={() => { navigator.clipboard.writeText(buildCommand); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="shrink-0 p-2 hover:bg-slate-800 rounded transition-colors">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center justify-around">
                   <StatCard icon={Shield} label="Security Pass" value={activeFlags.has("FEAT_ENCRYPTION") ? "ENCRYPTED" : "PLAINTEXT"} color={activeFlags.has("FEAT_ENCRYPTION") ? "text-green-400" : "text-red-400"} />
                   <StatCard icon={Zap} label="Concurrency" value={activeFlags.has("FEAT_BATCH_PROCESSING") ? "BATCH_MODE" : "SEQUENTIAL"} color="text-indigo-400" />
                   <StatCard icon={Activity} label="Auto-Heal" value={activeFlags.has("FEAT_AUTO_HEAL") ? "ACTIVE" : "DISABLED"} color={activeFlags.has("FEAT_AUTO_HEAL") ? "text-blue-400" : "text-slate-500"} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bundle' && (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-10 relative overflow-hidden">
                <div className="flex items-center justify-between mb-12">
                   <div>
                      <h2 className="text-2xl font-black tracking-tighter uppercase italic">Bundle Comparison</h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Profiles size & dead code efficiency</p>
                   </div>
                   <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-center">
                      <div className="text-3xl font-black text-indigo-500 tracking-tighter leading-none">{currentBundleStat.size}KB</div>
                      <div className="text-[10px] font-black text-slate-500 uppercase mt-1">Current Active</div>
                   </div>
                </div>
                <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={allConfigStats} layout="vertical" margin={{ left: 40 }}>
                         <XAxis type="number" hide domain={[0, 800]} />
                         <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} width={120} tick={{ fontWeight: 800 }} />
                         <RechartsTooltip cursor={{fill: 'rgba(99, 102, 241, 0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }} />
                         <Bar dataKey="size" radius={[0, 10, 10, 0]} barSize={30}>
                            {allConfigStats.map((e, i) => <Cell key={i} fill={activeFlags.has(BUILD_CONFIGURATIONS[i].features[0]) ? '#6366f1' : '#1e293b'} />)}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'constants' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-10">
                {/* Sidebar Navigation for Constants */}
                <div className="w-full md:w-72 shrink-0 space-y-4">
                  <div className="px-2">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Runtime Domains</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-6 italic">Select a domain to inspect native Bun runtime evaluations and hardware-proxied constants.</p>
                  </div>
                  
                  <nav className="space-y-2">
                    {RUNTIME_CONSTANTS.map(category => (
                      <button
                        key={category.id}
                        onClick={() => { setActiveConstantCategory(category.id); setConstantSearch(''); }}
                        className={`group w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all border ${
                          activeConstantCategory === category.id
                            ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300 shadow-xl shadow-indigo-950/20'
                            : 'bg-transparent border-slate-800/50 text-slate-500 hover:bg-slate-800/50 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-lg transition-colors ${
                          activeConstantCategory === category.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600 group-hover:text-slate-400'
                        }`}>
                          {category.id === 'perf' ? <Timer className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <span className="text-[11px] font-black uppercase tracking-wider block leading-none">{category.label}</span>
                          <span className="text-[9px] opacity-60 mt-1 block">Inspect {category.items.length} values</span>
                        </div>
                        {activeConstantCategory === category.id && <ChevronRight className="w-3 h-3 text-indigo-500" />}
                      </button>
                    ))}
                  </nav>

                  {/* Architecture Note */}
                  <div className="mt-10 p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Binary className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[9px] font-black text-indigo-400 uppercase">JIT Context</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Constants are evaluated during the <span className="text-slate-300">transpilation phase</span> to ensure O(1) access. Use <span className="text-indigo-400 font-bold">Bun.inspect.table</span> for runtime debugging.
                    </p>
                  </div>
                </div>

                {/* Constants Content Area */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">
                  {/* Local Search for Constants */}
                  <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm flex items-center gap-4">
                    <Search className="w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder={`Search ${currentConstants?.label.toLowerCase()}...`}
                      className="bg-transparent border-none outline-none flex-1 text-sm font-medium text-slate-200 placeholder:text-slate-600"
                      value={constantSearch}
                      onChange={(e) => setConstantSearch(e.target.value)}
                    />
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase">
                      <Filter className="w-3 h-3" />
                      Filter
                    </div>
                  </div>

                  {currentConstants && (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xs font-black text-slate-200 uppercase tracking-[0.1em]">{currentConstants.label} Registry</h2>
                          <div className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-black text-slate-500 uppercase">{filteredConstants.length} Matching</div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                            <tr>
                              <th className="px-8 py-5">Source Namespace / Property</th>
                              <th className="px-8 py-5">Value Signature</th>
                              <th className="px-8 py-5">Contextual Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {filteredConstants.length > 0 ? filteredConstants.map((item, idx) => {
                              const isExpanded = expandedRows.has(idx);
                              return (
                                <tr 
                                  key={idx} 
                                  className="hover:bg-indigo-500/5 transition-colors group cursor-pointer"
                                  onClick={() => toggleDescription(idx)}
                                >
                                  <td className="px-8 py-6 align-top">
                                    <div className="flex items-center gap-2">
                                      <code className="text-[11px] font-mono text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10 group-hover:border-indigo-500/30 transition-colors whitespace-nowrap">
                                        {item.source}
                                      </code>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6 align-top">
                                    <ConstantValueBadge value={item.value} />
                                  </td>
                                  <td className="px-8 py-6 max-w-md group/desc">
                                    <div className="relative flex items-start gap-3">
                                      <p className={`text-[11px] text-slate-400 font-medium leading-relaxed italic transition-all duration-300 ${
                                        isExpanded ? 'line-clamp-none' : 'line-clamp-2 group-hover/desc:line-clamp-none'
                                      }`}>
                                        {item.description}
                                      </p>
                                      <div className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                        <ChevronDown className="w-3 h-3 text-slate-600 group-hover/desc:text-indigo-500" />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr>
                                <td colSpan={3} className="px-8 py-20 text-center">
                                   <Search className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                   <div className="text-sm font-black text-slate-600 uppercase">No constants match "{constantSearch}"</div>
                                   <button onClick={() => setConstantSearch('')} className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-400 underline transition-colors">Clear Search Filters</button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] text-slate-600 font-black uppercase">Verified against Bun Runtime v1.3.6</span>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              <span className="text-[9px] text-slate-500 font-black uppercase">O(1) Access</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              <span className="text-[9px] text-slate-500 font-black uppercase">Inlined</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center gap-3">
                       <Heart className="w-4 h-4 text-red-500" />
                       <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest">Health Matrix</h2>
                    </div>
                    <table className="w-full text-left text-[10px]">
                       <tbody className="divide-y divide-slate-800/50">
                          {HEALTH_SCORE_MATRIX.map((h, idx) => (
                             <tr key={idx} className={h.badge === healthScore.badge ? 'bg-indigo-500/10' : ''}>
                                <td className="px-4 py-3 font-bold" style={{ color: h.color }}>{h.range}</td>
                                <td className="px-4 py-3 font-black">{h.badge}</td>
                                <td className="px-4 py-3 text-slate-400">{h.status}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center gap-3">
                       <Globe className="w-4 h-4 text-blue-500" />
                       <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest">Active Integrations</h2>
                    </div>
                    <table className="w-full text-left text-[10px]">
                       <tbody className="divide-y divide-slate-800/50">
                          {INTEGRATION_STATUS_MATRIX.map((i, idx) => (
                             <tr key={idx} className={activeFlags.has(i.flag) ? 'opacity-100' : 'opacity-30 grayscale'}>
                                <td className="px-4 py-3 flex items-center gap-2">
                                   <span className="text-lg">{i.icon}</span>
                                   <span className="font-bold">{i.name}</span>
                                </td>
                                <td className="px-4 py-3">
                                   <span className={`px-2 py-0.5 rounded-full font-black ${activeFlags.has(i.flag) ? 'text-green-400 bg-green-400/10' : 'text-slate-500 bg-slate-500/10'}`}>
                                      {activeFlags.has(i.flag) ? 'ONLINE' : 'OFFLINE'}
                                   </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{i.fallback}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {Object.entries(SNIPPETS).map(([key, snippet]) => (
                <div key={key} className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <pre className="p-5 text-[10px] font-mono text-slate-400 overflow-x-auto bg-slate-950"><code>{snippet.trim()}</code></pre>
                    <div className="bg-indigo-950/30 px-4 py-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest border-y border-indigo-500/10">Eliminated Build</div>
                    <pre className="p-5 text-[10px] font-mono text-indigo-200/90 overflow-x-auto bg-black/40"><code>{simulateDCE(snippet)}</code></pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-top-4 duration-500">
               {report ? (
                 <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 relative overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-6 mb-12">
                       <Shield className="w-10 h-10 text-indigo-500" />
                       <h2 className="text-3xl font-black tracking-tighter uppercase italic">Security Audit</h2>
                    </div>
                    <div className="space-y-8">
                       <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Build Analysis</h4>
                          <p className="text-base leading-relaxed text-slate-200">{report.analysis}</p>
                       </div>
                       <div className={`p-6 rounded-2xl border ${report.criticalWarnings.length > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${report.criticalWarnings.length > 0 ? 'text-red-500' : 'text-green-500'}`}>Critical Alerts</h4>
                          <ul className="space-y-2">
                             {report.criticalWarnings.length > 0 ? report.criticalWarnings.map((w, i) => (
                                <li key={i} className="text-xs text-red-300/80 flex gap-2"><div className="h-1 w-1 bg-red-500 rounded-full mt-1.5 shrink-0" />{w}</li>
                             )) : <li className="text-xs text-green-400 font-bold">Safe for deployment.</li>}
                          </ul>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="text-center py-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl">
                    <button onClick={runAnalysis} className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black px-10 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20">Run AI Analysis</button>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="animate-in fade-in duration-500">
              <AlertsPanel />
            </div>
          )}

          {activeTab === 'geo' && (
            <div className="animate-in fade-in duration-500">
              <GeolocationPanel />
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="animate-in fade-in duration-500">
              <AuthenticationPanel />
            </div>
          )}

          {activeTab === 'sockets' && (
            <div className="animate-in fade-in duration-500">
              <SocketInspectionPanel />
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="animate-in fade-in duration-500">
              <TelemetryPanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ icon: any; label: string; value: string; color?: string }> = ({ icon: Icon, label, value, color = "text-slate-200" }) => (
  <div className="text-center">
    <Icon className={`w-5 h-5 mx-auto mb-2 opacity-50 ${color}`} />
    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
    <div className={`text-xs font-black ${color}`}>{value}</div>
  </div>
);

export default App;
