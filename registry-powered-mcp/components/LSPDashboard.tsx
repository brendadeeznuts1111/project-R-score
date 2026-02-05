
import React, { useState } from 'react';
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
  Check
} from 'lucide-react';

interface DocFile {
  name: string;
  status: 'tagged' | 'untagged' | 'partial';
  blocks: number;
}

interface Task {
  id: number;
  title: string;
  status: 'active' | 'completed' | 'pending';
  priority: 'P1' | 'P2' | 'P3';
}

const DOC_FILES: DocFile[] = [
  { name: 'LSP_IMPLEMENTATION_STATUS.md', status: 'untagged', blocks: 4 },
  { name: 'LSP_OPencode_COMPARISON.md', status: 'partial', blocks: 3 },
  { name: 'ARCHITECTURE.md', status: 'tagged', blocks: 2 },
  { name: 'METRICS_STRATEGY.md', status: 'untagged', blocks: 5 },
  { name: 'ERROR_RECOVERY.md', status: 'untagged', blocks: 2 },
];

const TASKS: Task[] = [
  { id: 0, title: 'Bun v1.3.5 Runtime Upgrade', status: 'completed', priority: 'P1' },
  { id: 1, title: 'Fix Language Tags (Markdown)', status: 'active', priority: 'P1' },
  { id: 2, title: 'LSP Pre-warming Script', status: 'pending', priority: 'P2' },
  { id: 3, title: 'Metrics Dashboard', status: 'completed', priority: 'P2' },
  { id: 4, title: 'Error Recovery (Crash Handling)', status: 'pending', priority: 'P1' },
  { id: 5, title: 'Test Suite Integration', status: 'pending', priority: 'P3' },
];

export const LSPDashboard: React.FC = () => {
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
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">LSP Enhancement Hub</h2>
                <p className="text-slate-500 text-sm max-w-xl">
                    Tracking the optimization of the Language Server Protocol implementation using Bun v1.3.5+.
                </p>
            </div>
            <div className="flex gap-2">
                 <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                     <span className="text-[10px] font-black text-emerald-600 uppercase">Project Active</span>
                 </div>
            </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32">
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
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32">
             <div className="flex justify-between items-start">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Doc Coverage</span>
                 <FileText size={16} className="text-rose-500" />
             </div>
             <div>
                 <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                    20% <span className="text-xs font-normal text-slate-400">Tagged</span>
                 </div>
                 <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                     <div className="h-full bg-rose-500 w-[20%]"></div>
                 </div>
             </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32">
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
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 bg-indigo-500/5 border-indigo-500/20">
             <div className="flex justify-between items-start">
                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Bun Runtime</span>
                 <PlayCircle size={16} className="text-indigo-500" />
             </div>
             <div>
                 <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                    v1.3.5+
                 </div>
                 <span className="text-[10px] text-slate-500 font-bold uppercase">Optimization Enabled</span>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documentation Audit */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><AlertCircle size={20} /></div>
                <div>
                   <h3 className="font-bold text-slate-800 dark:text-slate-100">Documentation Audit</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Missing Language Tags Detected</p>
                </div>
             </div>

             <div className="space-y-3">
                 {DOC_FILES.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <FileType size={16} className="text-slate-400" />
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
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Layout size={20} /></div>
                <div>
                   <h3 className="font-bold text-slate-800 dark:text-slate-100">Implementation Roadmap</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Phase 1: Core Optimization</p>
                </div>
             </div>

             <div className="space-y-3">
                  {TASKS.map((task, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        task.status === 'active'
                        ? 'bg-indigo-500/5 border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                        : task.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            task.status === 'active' ? 'border-indigo-500 bg-indigo-500 text-white' :
                            task.status === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' :
                            'border-slate-300 dark:border-slate-600'
                        }`}>
                            {task.status === 'active' && <Clock size={10} className="animate-spin" />}
                            {task.status === 'completed' && <Check size={10} />}
                            {task.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                        </div>
                        <span className={`text-xs font-bold ${
                            task.status === 'active' ? 'text-indigo-600 dark:text-indigo-400' :
                            task.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-70' :
                            'text-slate-600 dark:text-slate-400'
                        }`}>
                            {task.title}
                        </span>

                        <div className="flex items-center gap-2 ml-auto">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                task.priority === 'P1' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                task.priority === 'P2' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                            }`}>
                                {task.priority}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                task.status === 'active' ? 'bg-indigo-500/10 text-indigo-500' :
                                task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                                {task.status === 'active' ? 'In Progress' : task.status}
                            </span>
                        </div>
                    </div>
                  ))}
             </div>
          </div>
      </div>

      {/* Terminal Simulation */}
      <div className="glass-panel p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
             <div className="flex items-center gap-3">
                 <TerminalWidget type="lsp" connectionUrl="/lsp/debug" />
             </div>
          </div>
      </div>
    </div>
  );
};
