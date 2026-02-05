
import React from 'react';
import { Globe, Server, Share2, Shield, Zap, Database, ArrowRight, ArrowLeftRight, FileCode } from 'lucide-react';
import { EdgeHeaders } from './EdgeHeaders';
import { EnhancementMatrix } from './EnhancementMatrix';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Global Edge Info */}
        <div className="glass-panel p-6 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all"></div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-sky-500/10 rounded-lg">
                <Globe size={20} className="text-sky-500" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Global Edge Topology</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Distributed across <span className="text-sky-500 font-bold">300 PoPs</span> globally. Each edge node handles request routing, Zstd compression, and WebSocket bridging natively via Bun.serve().
            </p>
          </div>
          <div className="space-y-3">
             <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 uppercase tracking-widest">Active PoPs</span>
                <span className="text-sky-500 font-bold">300 / 300</span>
             </div>
             <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 w-full animate-pulse"></div>
             </div>
          </div>
        </div>

        {/* Center: Durable Objects Sync Hub */}
        <div className="glass-panel p-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/50 pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Database size={20} className="text-indigo-500" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Durable Objects Hub</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Durable Objects maintain state consistency for <span className="text-indigo-500 font-bold">PTY Sessions</span> and <span className="text-indigo-500 font-bold">Enterprise Scopes</span>. Failover occurs within 200ms of node degradation.
            </p>
          </div>
          <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-lg border border-indigo-500/10 flex items-center gap-3">
            <Zap size={14} className="text-indigo-500" />
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Latency: 2ms DO Internal</span>
          </div>
        </div>

        {/* Right: Type-Safe Core */}
        <div className="glass-panel p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <FileCode size={20} className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Type-Safe Core</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Leveraging <span className="text-emerald-500 font-bold">bun-types</span> for full Node.js 25 parity. All internal primitives are validated against the official Bun package definitions.
            </p>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
             <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Typing Verified</span>
          </div>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-sky-500/5 to-indigo-500/5 blur-3xl -z-10"></div>
        
        <h3 className="text-center font-bold text-slate-400 uppercase tracking-[0.3em] mb-12 text-xs">v2.0 Hyper-Scale Flow</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
           <div className="flex flex-col items-center gap-4 group">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-sky-500/50 transition-all duration-300">
                <Globe size={32} className="text-sky-500" />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Edge Node</span>
           </div>

           <div className="hidden md:block">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-px bg-slate-300 dark:bg-slate-700"></div>
                 <ArrowLeftRight size={16} className="text-slate-400 animate-pulse" />
                 <div className="w-8 h-px bg-slate-300 dark:bg-slate-700"></div>
              </div>
              <div className="text-[8px] text-center text-slate-500 font-mono mt-2">HTTP Upgrade</div>
           </div>

           <div className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-all duration-300 relative">
                <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-spin-slow"></div>
                <Database size={40} className="text-white" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Durable Sync Hub</span>
           </div>

           <div className="hidden md:block">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-px bg-slate-300 dark:bg-slate-700"></div>
                 <ArrowLeftRight size={16} className="text-slate-400 animate-pulse" />
                 <div className="w-8 h-px bg-slate-300 dark:bg-slate-700"></div>
              </div>
              <div className="text-[8px] text-center text-slate-500 font-mono mt-2">PTY Sequence</div>
           </div>

           <div className="flex flex-col items-center gap-4 group">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-emerald-500/50 transition-all duration-300">
                <Share2 size={32} className="text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">WS Bridge Layer</span>
           </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
           <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                 <Shield size={14} className="text-emerald-500" />
                 Security Isolation
              </h4>
              <p className="text-slate-500 leading-relaxed font-mono text-[10px]">
                 Registry tokens and scope creds never leave the encrypted DO context. WS Bridge strictly validates protocol frames to prevent injection.
              </p>
           </div>
           <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                 <Zap size={14} className="text-amber-500" />
                 Performance Metrics
              </h4>
              <p className="text-slate-500 leading-relaxed font-mono text-[10px]">
                 Edge matching (85ns) + DO Sync (2ms) = Sub-10ms total overhead for high-availability registry resolution.
              </p>
           </div>
        </div>
      </div>

      <EnhancementMatrix />

      {/* Edge Headers Strategy */}
      <EdgeHeaders />
    </div>
  );
};
