
import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Server, Terminal, MessageSquare, Zap, Database, Globe, Clock, Box, Cpu, ShieldCheck, Download, Copy, RefreshCw, Moon, Sun, Shield, Code2, Layers, BarChart3, Settings, Share2, Search, FileCode, Sliders, Table, Scale, Network, Library, AlertCircle, Package, Plug, Rss, Gauge, Trash2, AlertOctagon, ArrowRight, Gavel, BookText, Map as MapIcon, ChevronRight, FileJson, Check, Cloud, Send, MonitorPlay, SearchCode } from 'lucide-react';
import { MOCK_DATA, REGISTRY_MATRIX } from './constants';
import { View } from './types';
import { MetricsCard } from './components/MetricsCard';
import { PerformanceCharts } from './components/PerformanceCharts';
import { EndpointList } from './components/EndpointList';
import { TerminalWidget } from './components/TerminalWidget';
import { AIAssistant } from './components/AIAssistant';
import { FeatureMatrix } from './components/FeatureMatrix';
import { SecurityPanel } from './components/SecurityPanel';
import { EnhancementMatrix } from './components/EnhancementMatrix';
import { RegistryExplorer } from './components/RegistryExplorer';
import { GraphQLSchemaViewer } from './components/GraphQLSchemaViewer';
import { BenchmarkingView } from './components/BenchmarkingView';
import { TTYMatrix } from './components/TTYMatrix';
import { ArchitectureView } from './components/ArchitectureView';
import { BunfigBuilder } from './components/BunfigBuilder';
import { CodeSearch } from './components/CodeSearch';
import { ConsoleInspector } from './components/ConsoleInspector';
import { PatternDetector } from './components/PatternDetector';
import { PerformanceMatrix } from './components/PerformanceMatrix';
import { SelectionCriteria } from './components/SelectionCriteria';
import { FederationMatrix } from './components/FederationMatrix';
import { BunAPIBrowser } from './components/BunAPIBrowser';
import { LSPDashboard } from './components/LSPDashboard';
import { PackageManagerCLI } from './components/PackageManagerCLI';
import { GlobalContextViewer } from './components/GlobalContextViewer';
import { TranspilationViewer } from './components/TranspilationViewer';
import { PluginArchitectureView } from './components/PluginArchitectureView';
import { KQueueTuning } from './components/KQueueTuning';
import { GCAnalysis } from './components/GCAnalysis';
import { GovernancePanel } from './components/GovernancePanel';
import { BlogInfraMatrix } from './components/BlogInfraMatrix';
import { LatticeMap } from './components/LatticeMap';
import { RequestStream } from './components/RequestStream';
import { SystemStatusHeader } from './components/SystemStatusHeader';
import { PTYSessionMonitor } from './components/PTYSessionMonitor';
import { TelemetryDebugger } from './components/TelemetryDebugger';
import { CloudflareWorkerPanel } from './components/CloudflareWorkerPanel';
import { SelfHealingMesh } from './components/SelfHealingMesh';
import { DurableObjectVisualizer } from './components/DurableObjectVisualizer';
import { TelegramIntegration } from './components/TelegramIntegration';
import { ReusableTerminalLab } from './components/ReusableTerminalLab';
import { QuantitativeTelemetryPanel } from './components/QuantitativeTelemetryPanel';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [uptime, setUptime] = useState(MOCK_DATA.metrics.uptime_seconds);
  const [ptyCount, setPtyCount] = useState(3);
  const [copiedJSON, setCopiedJSON] = useState(false);
  
  const [sparkData, setSparkData] = useState({
    latency: Array.from({ length: 30 }, () => 7 + Math.random() * 3),
    requests: Array.from({ length: 30 }, () => 300 + Math.random() * 10),
    heap: Array.from({ length: 30 }, () => 40 + Math.random() * 5),
    pty: Array.from({ length: 30 }, () => 3 + Math.floor(Math.random() * 2))
  });
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') { root.classList.add('dark'); } 
    else { root.classList.remove('dark'); }
  }, [theme]);

  // Fetch live telemetry data from API
  useEffect(() => {
    const fetchTelemetryData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();

          // Update uptime from telemetry
          if (data.telemetry && data.telemetry.uptime_seconds) {
            setUptime(data.telemetry.uptime_seconds);
          }

          // Update sparkData with real telemetry buffers
          if (data.telemetry && data.telemetry.telemetry_buffers) {
            const buffers = data.telemetry.telemetry_buffers;
            setSparkData({
              latency: buffers.latency || Array.from({ length: 30 }, () => 7 + Math.random() * 3),
              requests: buffers.requests || Array.from({ length: 30 }, () => 300 + Math.random() * 50),
              heap: buffers.heap || Array.from({ length: 30 }, () => 40 + Math.random() * 5),
              pty: buffers.pty || Array.from({ length: 30 }, () => 3 + Math.floor(Math.random() * 5))
            });

            // Update PTY count from telemetry
            if (data.telemetry.active_pty_sessions) {
              setPtyCount(data.telemetry.active_pty_sessions);
            }
          }
        }
      } catch (error) {
        // Keep using existing data if API fails
        console.warn('Failed to fetch telemetry data:', error);
      }
    };

    // Fetch immediately
    fetchTelemetryData();

    // Then fetch every 5 seconds to match server update rate
    const timer = setInterval(fetchTelemetryData, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentDebugData = useMemo(() => ({
    timestamp: new Date().toISOString(),
    service: MOCK_DATA.service,
    version: MOCK_DATA.version,
    uptime_seconds: uptime,
    active_pty_sessions: ptyCount,
    telemetry_buffers: sparkData,
    registry_status: MOCK_DATA.status,
    topology_verified: true,
    region: "NODE_ORD_01"
  }), [uptime, ptyCount, sparkData]);

  const handleCopyTelemetryJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(currentDebugData, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const NavItem = ({ id, icon: Icon, label, color = "emerald" }: { id: View, icon: any, label: string, color?: string }) => (
    <button 
        onClick={() => setActiveView(id)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 group ${
            activeView === id 
            ? 'bg-slate-900 text-white shadow-[0_0_20px_rgba(0,0,0,0.4)] border border-slate-700' 
            : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
        }`}
    >
        <div className="flex items-center gap-3">
            <Icon size={18} className={activeView === id ? `text-${color}-500` : 'group-hover:scale-110 transition-transform'} />
            <span className="hidden lg:block font-black text-[11px] uppercase tracking-wider italic">{label}</span>
        </div>
        {activeView === id && <ChevronRight size={14} className="hidden lg:block text-slate-500" />}
    </button>
  );

  return (
    <div className="h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300 cyber-grid overflow-hidden flex flex-col">
        
        <SystemStatusHeader />

        <div className="flex flex-1 overflow-hidden">
            <aside className="w-20 lg:w-64 bg-slate-950 border-r border-slate-900 flex flex-col z-20 shrink-0">
                <div className="p-6 flex items-center gap-3 border-b border-slate-900 sticky top-0 bg-slate-950/80 backdrop-blur-xl z-10">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 rounded-lg animate-pulse"></div>
                        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-xl border border-white/20 shadow-2xl">B</div>
                    </div>
                    <div className="hidden lg:block">
                        <span className="font-black text-white text-sm tracking-tighter italic uppercase">Hub Control</span>
                        <div className="text-[9px] text-slate-500 font-black tracking-widest uppercase">v2.5 Hardened</div>
                    </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-8">
                     <div className="space-y-1">
                         <div className="hidden lg:block text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-4">Infrastructure</div>
                         <NavItem id={View.DASHBOARD} icon={Activity} label="System Pulse" color="emerald" />
                         <NavItem id={View.TOPOLOGY} icon={MapIcon} label="Lattice Map" color="sky" />
                         <NavItem id={View.ARCHITECTURE} icon={Layers} label="Mesh Arch" color="indigo" />
                         <NavItem id={View.PLUGIN_ARCHITECTURE} icon={Plug} label="Plugin Engine" color="purple" />
                         <NavItem id={View.REGISTRY} icon={Database} label="Registry Hub" color="amber" />
                     </div>

                    <div className="space-y-1">
                        <div className="hidden lg:block text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-4">Cloud Ecosystem</div>
                        <NavItem id={View.WORKERS} icon={Cloud} label="Workers Edge" color="sky" />
                        <NavItem id={View.DURABLE_OBJECTS} icon={Database} label="Durable States" color="indigo" />
                        <NavItem id={View.TELEGRAM} icon={Send} label="Comms Bot" color="sky" />
                    </div>

                      <div className="space-y-1">
                          <div className="hidden lg:block text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-4">Operations</div>
                          <NavItem id={View.SECURITY} icon={Shield} label="Security Core" color="rose" />
                          <NavItem id={View.GOVERNANCE} icon={Gavel} label="PR Audit" color="slate" />
                          <NavItem id={View.QUANTITATIVE_TELEMETRY} icon={BarChart3} label="Quantitative" color="amber" />
                          <NavItem id={View.FEDERATION_MATRIX} icon={Network} label="Federation Hub" color="indigo" />
                          <NavItem id={View.SELF_HEALING_MESH} icon={Network} label="Self-Healing" color="emerald" />
                          <NavItem id={View.LSP_MONITOR} icon={SearchCode} label="LSP Monitor" color="indigo" />
                          <NavItem id={View.AI_ASSISTANT} icon={MessageSquare} label="Inference" color="indigo" />
                      </div>

                    <div className="space-y-1">
                        <div className="hidden lg:block text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-4">Kernel Lab</div>
                        <NavItem id={View.KQUEUE_TUNING} icon={Gauge} label="KQueue Lab" color="amber" />
                        <NavItem id={View.GC_ANALYSIS} icon={Trash2} label="JSC Memory" color="rose" />
                        <NavItem id={View.REUSABLE_TERMINAL} icon={MonitorPlay} label="Uni Terminal" color="sky" />
                        <NavItem id={View.TERMINAL} icon={Terminal} label="PTY Remote" color="sky" />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-900 bg-slate-950/50">
                    <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center group cursor-help transition-all hover:border-emerald-500/50">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase italic">
                                Hub Ready
                            </span>
                        </div>
                        <div className="text-[8px] text-slate-600 font-mono mt-1 opacity-70 group-hover:text-slate-400 transition-colors">
                            BUN_{REGISTRY_MATRIX.RUNTIME.VERSION}
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent_40%)]">
                <div className="p-4 lg:p-10 max-w-[1600px] mx-auto space-y-10 min-h-full flex flex-col">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-500 mb-3">
                                <Activity size={16} className="animate-pulse" />
                                <span className="text-[10px] font-black tracking-[0.4em] uppercase">Edge Performance Observer</span>
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase flex items-center gap-4">
                                {activeView.replace('_', ' ')}
                                <span className="text-xs font-mono font-bold text-slate-600 tracking-normal normal-case not-italic px-3 py-1 rounded-full border border-slate-800">
                                    NODE_ORD_01
                                </span>
                            </h1>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <button 
                                onClick={handleCopyTelemetryJSON} 
                                className={`px-5 py-3 rounded-2xl border transition-all duration-300 flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl
                                    ${copiedJSON ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-900 border-slate-800 text-indigo-400 hover:text-white hover:border-indigo-500/50'}`}
                            >
                                {copiedJSON ? <Check size={16} /> : <FileJson size={16} />}
                                {copiedJSON ? 'JSON Copied' : 'JSON Telemetry'}
                            </button>
                            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-xl">
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <button className="px-8 py-3 rounded-2xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-3">
                                <Download size={16} /> Export Logs
                            </button>
                        </div>
                    </header>

                    <div className="flex-1">
                      {activeView === View.DASHBOARD && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                  <MetricsCard 
                                      title="Edge Latency" 
                                      value={`${sparkData.latency[sparkData.latency.length-1].toFixed(1)}ms`} 
                                      subValue="P99: 10.8ms" 
                                      icon={<Zap size={22}/>} 
                                      trend={sparkData.latency[sparkData.latency.length-1] > sparkData.latency[sparkData.latency.length-2] ? 'up' : 'down'}
                                      color="emerald"
                                      variant="jitter"
                                      sparklineData={sparkData.latency}
                                      rawValue={sparkData.latency[sparkData.latency.length-1]}
                                      footerTags={['300 POPS', 'SYSCALL_O1']}
                                  />
                                   <MetricsCard
                                       title="Active PTYs"
                                       value={ptyCount}
                                       secondaryValue="Durable Bridge"
                                       icon={<Terminal size={22}/>}
                                       color="sky"
                                       variant="mesh"
                                       sparklineData={sparkData.pty}
                                       rawValue={ptyCount}
                                       footerTags={['DO_CONSENSUS', '85ns_DISPATCH']}
                                   />
                                  <MetricsCard 
                                      title="Heap Allocation" 
                                      value={`${sparkData.heap[sparkData.heap.length-1].toFixed(1)}MB`} 
                                      secondaryValue="JSC GC Active" 
                                      icon={<Database size={22}/>} 
                                      color="purple"
                                      variant="parser"
                                      sparklineData={sparkData.heap}
                                      rawValue={sparkData.heap[sparkData.heap.length-1]}
                                      footerTags={['CAP: 128MB', 'RSS_MONITOR']}
                                  />
                                   <MetricsCard
                                       title="Throughput"
                                       value="42.8k"
                                       secondaryValue="Requests / sec"
                                       icon={<Activity size={22}/>}
                                       color="emerald"
                                       variant="mesh"
                                       footerTags={['SLA: 99.9%', 'EDGE_ROUTED']}
                                   />
                                   <MetricsCard
                                       title="UI P99 Latency"
                                       value="0.10ms"
                                       secondaryValue="Interface Response"
                                       icon={<Zap size={22}/>}
                                       color="sky"
                                       variant="kernel"
                                       footerTags={['TARGET: <1ms', 'REALTIME']}
                                   />
                                  <MetricsCard 
                                      title="System Uptime" 
                                      value={formatUptime(uptime)} 
                                      icon={<ShieldCheck size={22}/>} 
                                      color="rose" 
                                      variant="kernel"
                                      rawValue={uptime}
                                      footerTags={[`BUN_v${REGISTRY_MATRIX.RUNTIME.BUN_CORE}`, 'MACH-O_SAFE']}
                                  />
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                                  <div className="lg:col-span-8 space-y-8">
                                      <div className="h-[350px]"><PerformanceCharts /></div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                          <div className="h-[400px]">
                                            <PTYSessionMonitor />
                                          </div>
                                          <div className="h-[400px]">
                                            <RequestStream />
                                          </div>
                                      </div>

                                      <div className="h-[400px]">
                                          <TelemetryDebugger data={currentDebugData} />
                                      </div>

                                      <div className="h-[500px]"><LatticeMap /></div>
                                  </div>

                                  <div className="lg:col-span-4 space-y-8 flex flex-col">
                                      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/40 space-y-6 flex-1">
                                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Protocol Hardening</h4>
                                          <FeatureMatrix features={MOCK_DATA.features} />
                                          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-center gap-4">
                                              <div className="p-2 bg-indigo-500 rounded-lg text-white shadow-lg"><Zap size={14} /></div>
                                              <div>
                                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Pre-Connect Trigger</span>
                                                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">TLS Warm-up active globally</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeView === View.WORKERS && <CloudflareWorkerPanel />}
                      {activeView === View.DURABLE_OBJECTS && <DurableObjectVisualizer />}
                      {activeView === View.TELEGRAM && <TelegramIntegration />}
                      {activeView === View.REUSABLE_TERMINAL && <ReusableTerminalLab />}
                       {activeView === View.LSP_MONITOR && <LSPDashboard />}
                       {activeView === View.QUANTITATIVE_TELEMETRY && <QuantitativeTelemetryPanel />}
                       {activeView === View.SELF_HEALING_MESH && <SelfHealingMesh />}

                       {activeView === View.TOPOLOGY && <div className="h-[800px]"><LatticeMap /></div>}
                       {activeView === View.REGISTRY && <RegistryExplorer packages={MOCK_DATA.packages || []} />}
                       {activeView === View.ARCHITECTURE && <ArchitectureView />}
                       {activeView === View.PLUGIN_ARCHITECTURE && <PluginArchitectureView />}
                      {activeView === View.SECURITY && <SecurityPanel />}
                      {activeView === View.AI_ASSISTANT && <AIAssistant data={MOCK_DATA} />}
                      {activeView === View.KQUEUE_TUNING && <KQueueTuning />}
                      {activeView === View.GC_ANALYSIS && <GCAnalysis />}
                      {activeView === View.TERMINAL && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <TerminalWidget type="vim" connectionUrl={MOCK_DATA.endpoints["pty/vim"]} />
                              <TerminalWidget type="htop" connectionUrl={MOCK_DATA.endpoints["pty/htop"]} />
                              <TerminalWidget type="bash" connectionUrl={MOCK_DATA.endpoints["pty/bash"]} />
                              <TTYMatrix />
                          </div>
                      )}
                      {activeView === View.GOVERNANCE && <GovernancePanel />}
                      {activeView === View.FEDERATION_MATRIX && <FederationMatrix />}
                      {activeView === View.RUNTIME && (
                          <div className="space-y-10">
                              <GlobalContextViewer />
                              <TranspilationViewer />
                              <PatternDetector />
                              <ConsoleInspector />
                          </div>
                      )}
                    </div>

                    <footer className="border-t border-slate-900 bg-slate-950 p-8 mt-20 shrink-0">
                        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black gap-6">
                            <div className="flex items-center gap-6">
                              <span className="text-emerald-500 flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                 Network Integrity: Verified
                              </span>
                              <span className="flex items-center gap-2 opacity-50"><Layers size={14}/> Stack v2.5.1 Hardened</span>
                            </div>
                            <div className="flex gap-8 items-center">
                              <span className="flex items-center gap-2 text-indigo-500">
                                 <Rss size={14} className="animate-pulse" /> Live Telemetry
                              </span>
                              <span className="opacity-50">ENV: {MOCK_DATA.deployment}</span>
                              <span className="text-slate-400 font-mono text-[9px] bg-slate-900 px-3 py-1 rounded-full border border-slate-800">{MOCK_DATA.timestamp}</span>
                            </div>
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    </div>
  );
};

export default App;
