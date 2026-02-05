
import React, { useState } from 'react';
import { Terminal, Globe, FileCode, Layers, Search, Cpu, Box, Hash, Lock, FolderOpen, ArrowRight } from 'lucide-react';

export const GlobalContextViewer: React.FC = () => {
  const [envSearch, setEnvSearch] = useState('');

  const envVars = [
    { key: 'NODE_ENV', value: 'production', important: true },
    { key: 'BUN_ENV', value: 'production', important: true },
    { key: 'PORT', value: '3000' },
    { key: 'BUN_INSTALL', value: '/home/bun/.bun' },
    { key: 'PATH', value: '/home/bun/.bun/bin:/usr/local/bin:/usr/bin' },
    { key: 'API_KEY', value: 'sk_live_****************', secure: true },
    { key: 'DB_HOST', value: '10.0.0.5' },
    { key: 'TZ', value: 'UTC' },
  ];

  const filteredEnv = envVars.filter(e => e.key.toLowerCase().includes(envSearch.toLowerCase()));

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
          <Globe size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Global Context</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Bun.env • import.meta • Process</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environment Variables */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
             <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={14} /> Bun.env
             </span>
             <span className="text-[9px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500 font-mono">Fast Map</span>
          </div>
          
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                type="text" 
                placeholder="Filter ENV..." 
                value={envSearch}
                onChange={e => setEnvSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-y-auto max-h-[250px] custom-scrollbar">
             {filteredEnv.map((e) => (
                 <div key={e.key} className="flex flex-col p-2 hover:bg-white/5 rounded-lg group transition-colors">
                    <span className={`text-[10px] font-bold font-mono ${e.important ? 'text-purple-400' : 'text-slate-400'}`}>{e.key}</span>
                    <span className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1">
                        {e.secure ? <Lock size={8} className="text-emerald-500" /> : null}
                        {e.value}
                    </span>
                 </div>
             ))}
          </div>
        </div>

        {/* Import Meta & Process */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* import.meta */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 flex flex-col gap-3 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                    <FileCode size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">import.meta</span>
                </div>
                
                <div className="space-y-2">
                    <div className="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col">
                        <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">.path</span>
                        <code className="text-[10px] text-slate-700 dark:text-slate-300 font-mono break-all">/app/src/entry.ts</code>
                    </div>
                    <div className="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col">
                        <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">.dir</span>
                        <code className="text-[10px] text-slate-700 dark:text-slate-300 font-mono break-all">/app/src</code>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">.main</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase">TRUE</span>
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">.url</span>
                            <span className="text-[10px] font-mono text-slate-500">file://...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Process & Version */}
            <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 flex flex-col gap-2 group hover:border-sky-500/30 transition-all">
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
                        <Cpu size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">Process State</span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-mono font-bold">PID</span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono">38492</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-mono font-bold">CWD</span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono truncate max-w-[100px]">/app/backend</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-mono font-bold">Bun.main</span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono">/app/src/index.ts</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex flex-col justify-center items-center text-center">
                    <div className="p-2 bg-indigo-500 rounded-lg text-white mb-2 shadow-lg shadow-indigo-500/30">
                        <Layers size={18} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Bun Runtime</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">v1.3.2</span>
                    <span className="text-[9px] font-mono text-slate-500 mt-1">Revision: 5d2c1b...</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
