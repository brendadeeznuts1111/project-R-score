
import React, { useState, useEffect } from 'react';
import { TerminalWidget } from './TerminalWidget';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Layout, 
  Activity, 
  Code, 
  FileType, 
  AlertCircle,
  PlayCircle,
  Check,
  ChevronUp,
  BarChart3,
  RefreshCw,
  Info,
  // Added missing Terminal icon import from lucide-react
  Terminal
} from 'lucide-react';

type TaskStatus = 'completed' | 'active' | 'pending';
type TaskPriority = 'P1' | 'P2' | 'P3';

interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

interface DocFile {
  name: string;
  status: 'tagged' | 'untagged' | 'partial';
  blocks: number;
}

const DOC_FILES: DocFile[] = [
  { name: 'LSP_IMPLEMENTATION_STATUS.md', status: 'untagged', blocks: 4 },
  { name: 'LSP_OPencode_COMPARISON.md', status: 'partial', blocks: 3 },
  { name: 'ARCHITECTURE.md', status: 'tagged', blocks: 2 },
  { name: 'METRICS_STRATEGY.md', status: 'untagged', blocks: 5 },
  { name: 'ERROR_RECOVERY.md', status: 'untagged', blocks: 2 },
];

const INITIAL_TASKS: Task[] = [
  { id: 0, title: 'Bun v1.3.5 Runtime Upgrade', status: 'completed', priority: 'P1' },
  { id: 1, title: 'Fix Language Tags (Markdown)', status: 'active', priority: 'P1' },
  { id: 2, title: 'LSP Pre-warming Script', status: 'pending', priority: 'P2' },
  { id: 3, title: 'Metrics Dashboard', status: 'completed', priority: 'P3' },
  { id: 4, title: 'Error Recovery (Crash Handling)', status: 'pending', priority: 'P2' },
  { id: 5, title: 'Test Suite Integration', status: 'pending', priority: 'P2' },
];

export const LSPDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const togglePriority = (taskId: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const priorities: TaskPriority[] = ['P1', 'P2', 'P3'];
      const currentIndex = priorities.indexOf(t.priority);
      const nextIndex = (currentIndex + 1) % priorities.length;
      return { ...t, priority: priorities[nextIndex] };
    }));
  };

  const getPriorityStyles = (p: TaskPriority) => {
    switch (p) {
      case 'P1': return 'text-rose-500 border-rose-500/30 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/20';
      case 'P2': return 'text-amber-500 border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20';
      case 'P3': return 'text-sky-500 border-sky-500/30 bg-sky-500/5 ring-1 ring-sky-500/20';
    }
  };

  const p1Count = tasks.filter(t => t.priority === 'P1').length;

  // LSP Monitoring Data
  const lspMetrics = {
    serverStatus: 'running',
    activeConnections: 3,
    supportedLanguages: ['typescript', 'javascript', 'json', 'markdown', 'yaml'],
    diagnostics: { errors: 12, warnings: 28, info: 5 },
    codeActions: { available: 15, applied: 8 },
    performance: { avgResponseTime: 45, peakResponseTime: 120 },
    protocolVersion: '3.17'
  };

  // UUID v7 and Causal Ordering Data
  const [uuidStats, setUuidStats] = useState({
    version: 'UUIDv7',
    ordering: 'causal',
    protocol: 'v2.5',
    generated: 0,
    orderingViolations: 0,
    timestamp: new Date().toISOString()
  });

  const [ptyOrdering, setPtyOrdering] = useState({
    activeSessions: 3,
    sequencedEvents: 12,
    causalOrdering: 'active',
    protocolVersion: 'v2.5',
    timestamp: new Date().toISOString()
  });

  // Fetch UUID and PTY ordering stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [uuidResponse, ptyResponse] = await Promise.all([
          fetch('/api/uuid/stats'),
          fetch('/api/pty/ordering')
        ]);

        if (uuidResponse.ok) {
          const uuidData = await uuidResponse.json();
          setUuidStats(prev => ({ ...prev, ...uuidData }));
        }

        if (ptyResponse.ok) {
          const ptyData = await ptyResponse.json();
          setPtyOrdering(prev => ({ ...prev, ...ptyData }));
        }
      } catch (error) {
        // Keep default data on error
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex justify-between items-start">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Code size={14} /> Developer Experience
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase tracking-tighter">LSP Enhancement Hub</h2>
                <p className="text-slate-500 text-sm max-w-xl">
                    Tracking the optimization of the Language Server Protocol implementation using Bun v1.3.5+. Click priority badges below to cycle through levels.
                </p>
            </div>
            <div className="flex flex-col items-end gap-2">
                 <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 shadow-sm">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Project Active</span>
                 </div>
                 <div className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    TASKS_SYNCED: {tasks.length}
                 </div>
            </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 hover:border-sky-500/30 transition-colors cursor-help">
             <div className="flex justify-between items-start">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Activation</span>
                 <Zap size={16} className="text-emerald-500" />
             </div>
             <div>
                 <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                    85ms <span className="text-xs font-normal text-slate-400">/ 100ms</span>
                 </div>
                 <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                     <div className="h-full bg-emerald-500 w-[85%]"></div>
                 </div>
             </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 hover:border-rose-500/30 transition-colors cursor-help">
             <div className="flex justify-between items-start">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Priority P1 Load</span>
                 <BarChart3 size={16} className="text-rose-500" />
             </div>
             <div>
                 <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                    {p1Count} <span className="text-xs font-normal text-slate-400">Critical Tasks</span>
                 </div>
                 <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                     <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(p1Count / tasks.length) * 100}%` }}></div>
                 </div>
             </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 hover:border-amber-500/30 transition-colors cursor-help">
             <div className="flex justify-between items-start">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Test Coverage</span>
                 <Activity size={16} className="text-amber-500" />
             </div>
             <div>
                 <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                    0% <span className="text-xs font-normal text-slate-400">Pending</span>
                 </div>
                 <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                     <div className="h-full bg-amber-500 w-[5%]"></div>
                 </div>
             </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/50 transition-colors cursor-help">
             <div className="flex justify-between items-start">
                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Bun Runtime</span>
                 <PlayCircle size={16} className="text-indigo-500" />
             </div>
             <div>
                 <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                    v1.3.5+
                 </div>
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">Optimization Enabled</span>
             </div>
          </div>
       </div>

       {/* LSP Monitoring Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 hover:border-emerald-500/30 transition-colors cursor-help">
              <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LSP Server Status</span>
                  <div className={`w-3 h-3 rounded-full ${lspMetrics.serverStatus === 'running' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
              </div>
              <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                     {lspMetrics.serverStatus} <span className="text-xs font-normal text-slate-400 capitalize">{lspMetrics.serverStatus}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono text-[10px]">{lspMetrics.activeConnections} active connections</div>
              </div>
           </div>

           <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 hover:border-blue-500/30 transition-colors cursor-help">
              <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Language Support</span>
                  <Code size={16} className="text-blue-500" />
              </div>
              <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                     {lspMetrics.supportedLanguages.length} <span className="text-xs font-normal text-slate-400">Languages</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono text-[10px] truncate">{lspMetrics.supportedLanguages.slice(0, 3).join(', ')}{lspMetrics.supportedLanguages.length > 3 ? '...' : ''}</div>
              </div>
           </div>

           <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 hover:border-orange-500/30 transition-colors cursor-help">
              <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnostics</span>
                  <AlertCircle size={16} className="text-orange-500" />
              </div>
              <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                     {lspMetrics.diagnostics.errors + lspMetrics.diagnostics.warnings} <span className="text-xs font-normal text-slate-400">Issues</span>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-500 font-mono text-[10px]">
                     <span className="text-red-500">{lspMetrics.diagnostics.errors}E</span>
                     <span className="text-yellow-500">{lspMetrics.diagnostics.warnings}W</span>
                     <span className="text-blue-500">{lspMetrics.diagnostics.info}I</span>
                  </div>
              </div>
           </div>

           <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 hover:border-purple-500/30 transition-colors cursor-help">
              <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Response Time</span>
                  <Zap size={16} className="text-purple-500" />
              </div>
              <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                     {lspMetrics.performance.avgResponseTime}ms <span className="text-xs font-normal text-slate-400">avg</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono text-[10px]">Peak: {lspMetrics.performance.peakResponseTime}ms</div>
              </div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documentation Audit */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><AlertCircle size={20} /></div>
                <div>
                   <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Documentation Audit</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Missing Language Tags Detected</p>
                </div>
             </div>

             <div className="space-y-3">
                 {DOC_FILES.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 group hover:border-rose-500/20 transition-all">
                        <div className="flex items-center gap-3">
                            <FileType size={16} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-500">{file.blocks} blocks</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${
                                file.status === 'tagged' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                : file.status === 'partial' 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            }`}>
                                {file.status}
                            </span>
                        </div>
                    </div>
                 ))}
             </div>
          </div>

          {/* Implementation Tasks */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Layout size={20} /></div>
                <div>
                   <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Implementation Roadmap</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Phase 1: Core Optimization</p>
                </div>
             </div>

             <div className="space-y-3">
                 {tasks.map((task) => (
                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        task.status === 'active' 
                        ? 'bg-indigo-500/5 border-indigo-500/20 shadow-lg shadow-indigo-500/5' 
                        : task.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                            task.status === 'active' ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg' : 
                            task.status === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' :
                            'border-slate-300 dark:border-slate-600'
                        }`}>
                            {task.status === 'active' && <Clock size={12} className="animate-spin" />}
                            {task.status === 'completed' && <Check size={12} />}
                            {task.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                        </div>
                        
                        <div className="flex-1 flex flex-col min-w-0 pr-2">
                            <span className={`text-xs font-black truncate ${
                                task.status === 'active' ? 'text-indigo-600 dark:text-indigo-300 italic' : 
                                task.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-70' :
                                'text-slate-600 dark:text-slate-400'
                            }`}>
                                {task.title}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {/* Priority Selector Badge */}
                            <button 
                                onClick={() => togglePriority(task.id)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 group/badge ${getPriorityStyles(task.priority)}`}
                                title="Click to cycle task priority"
                            >
                                <RefreshCw size={10} className="group-hover/badge:rotate-180 transition-transform duration-500" />
                                {task.priority}
                            </button>

                            <span className={`hidden sm:inline-block text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border border-transparent ${
                                task.status === 'active' ? 'bg-indigo-500/10 text-indigo-500' :
                                task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                                {task.status === 'active' ? 'IN_PROG' : task.status}
                            </span>
                        </div>
                    </div>
                 ))}
             </div>
           </div>
       </div>

       {/* LSP Advanced Monitoring */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Code Actions & Protocol */}
           <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                   <Terminal size={20} />
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Code Actions</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Available Quick Fixes</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Available Actions</div>
                    <div className="text-lg font-black text-purple-600 dark:text-purple-400">{lspMetrics.codeActions.available}</div>
                 </div>

                 <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Applied Today</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{lspMetrics.codeActions.applied}</div>
                 </div>

                 <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Success Rate</div>
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                       {Math.round((lspMetrics.codeActions.applied / (lspMetrics.codeActions.applied + 2)) * 100)}%
                    </div>
                 </div>
              </div>
           </div>

           {/* LSP Protocol Status */}
           <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
                   <Activity size={20} />
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Protocol Status</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">LSP v{lspMetrics.protocolVersion}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Protocol Version</div>
                       <div className="text-xs font-mono bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2 py-1 rounded">v{lspMetrics.protocolVersion}</div>
                    </div>
                    <div className="text-xs text-slate-500">Language Server Protocol specification</div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Server Health</div>
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">HEALTHY</span>
                       </div>
                    </div>
                    <div className="text-xs text-slate-500">All LSP capabilities operational</div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Fragment Guard</div>
                       <div className="text-xs font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">ACTIVE</div>
                    </div>
                    <div className="text-xs text-slate-500">WebSocket message fragmentation protection</div>
                 </div>
              </div>
           </div>

           {/* LSP Performance Metrics */}
           <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                   <BarChart3 size={20} />
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Performance Metrics</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">LSP Response Times</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-1">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Hover Requests</div>
                       <div className="text-sm font-bold text-slate-900 dark:text-slate-100">23ms</div>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[77%]"></div>
                    </div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-1">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Completion</div>
                       <div className="text-sm font-bold text-slate-900 dark:text-slate-100">67ms</div>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-full bg-purple-500 w-[45%]"></div>
                    </div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-1">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Diagnostics</div>
                       <div className="text-sm font-bold text-slate-900 dark:text-slate-100">89ms</div>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-full bg-orange-500 w-[33%]"></div>
                    </div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="text-xs text-slate-500 text-center">
                       Performance targets: <span className="font-mono text-emerald-600 dark:text-emerald-400">&lt;100ms</span>
                    </div>
                 </div>
              </div>
           </div>
       </div>

       {/* UUID v7 & Causal Ordering */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                   <Clock size={20} />
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">UUID v7 Request IDs</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Agent-UUID-v7 sorting</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Protocol Version</div>
                       <div className="text-xs font-mono bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">{uuidStats.version}</div>
                    </div>
                    <div className="text-xs text-slate-500">RFC 9562 timestamp-based UUIDs</div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Causal Ordering</div>
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">{uuidStats.ordering}</span>
                       </div>
                    </div>
                    <div className="text-xs text-slate-500">Timestamp-based event sequencing</div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">Generated Request IDs</div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100">{uuidStats.generated.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Total UUID v7 requests processed</div>
                 </div>
              </div>
           </div>

           <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
                   <Terminal size={20} />
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">PTY Event Sequencing</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Causal ordering v2.5</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Active Sessions</div>
                       <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">{ptyOrdering.activeSessions}</div>
                    </div>
                    <div className="text-xs text-slate-500">Concurrent PTY connections</div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Sequenced Events</div>
                       <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{ptyOrdering.sequencedEvents}</div>
                    </div>
                    <div className="text-xs text-slate-500">Events processed in causal order</div>
                 </div>

                 <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Protocol Status</div>
                       <div className="text-xs font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">v{ptyOrdering.protocolVersion}</div>
                    </div>
                    <div className="text-xs text-slate-500">Edge lattice causal ordering active</div>
                 </div>
              </div>
           </div>
       </div>

       {/* LSP Terminal Monitor */}
       <div className="glass-panel p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
           <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <Terminal size={16} className="text-emerald-500" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live LSP Diagnostic Stream</span>
                 <div className="flex items-center gap-2 ml-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">LSP_BRIDGE_ACTIVE</span>
                 </div>
              </div>
              <div className="flex items-center gap-4 text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                 <span className="flex items-center gap-1.5"><Zap size={10} className="text-amber-500" /> {lspMetrics.performance.avgResponseTime}ms avg</span>
                 <span className="flex items-center gap-1.5"><Activity size={10} className="text-indigo-500" /> {lspMetrics.activeConnections} clients</span>
                 <span className="flex items-center gap-1.5"><Code size={10} className="text-cyan-500" /> v{lspMetrics.protocolVersion}</span>
              </div>
           </div>
           <div className="p-4">
              <TerminalWidget type="lsp" connectionUrl="/lsp/debug" />
           </div>
       </div>

       {/* LSP System Info */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-700">
             <Info size={20} className="text-indigo-500 shrink-0" />
             <p className="text-[11px] text-slate-500 leading-relaxed italic">
                <strong>LSP Protocol:</strong> Running Language Server Protocol v{lspMetrics.protocolVersion} with {lspMetrics.supportedLanguages.length} language servers active. Fragment Guard protects WebSocket streams.
             </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-700 delay-100">
             <Check size={20} className="text-emerald-500 shrink-0" />
             <p className="text-[11px] text-slate-500 leading-relaxed italic">
                <strong>Task Priorities:</strong> P1-P3 priority system allocates edge cycles. P1 tasks bypass 85ns dispatch queue during congestion. Currently {p1Count} critical tasks active.
             </p>
          </div>
       </div>
    </div>
  );
};
