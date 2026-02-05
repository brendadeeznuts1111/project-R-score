
import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, Zap, Activity, Clock, Server, Lock, Cpu, RefreshCw, AlertTriangle, List, Search } from 'lucide-react';

const MOCK_STORAGE_KEYS = [
  { key: 'session:pts_0', value: '{"user":"admin","pop":"ORD-1"}', ttl: '42m' },
  { key: 'session:pts_1', value: '{"user":"root","pop":"SFO-1"}', ttl: '1h 04m' },
  { key: 'registry:sync_lock', value: 'true', ttl: '12s' },
  { key: 'telemetry:buffer_ptr', value: '0x8FA2', ttl: 'inf' },
  { key: 'mcp:version_pin', value: '"1.3.6_STABLE"', ttl: 'inf' },
];

export const DurableObjectVisualizer: React.FC = () => {
  const [pulse, setPulse] = useState(0);
  const [storageUsed, setStorageUsed] = useState(4.2651);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      setStorageUsed(prev => prev + (Math.random() * 0.0001 - 0.00004));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/50 pointer-events-none opacity-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
              <Database size={14} /> Persistent State Logic
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">DURABLE_OBJ: SESSION_SYNC</h2>
            <p className="text-slate-500 text-sm max-w-xl">
              Transactional state consistency for PTY sessions and Registry metadata. Guaranteed single-instance global execution.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center">
              <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Storage Util</div>
              <div className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{storageUsed.toFixed(4)} MB</div>
              <div className="text-[9px] font-mono text-emerald-500 mt-1 uppercase italic">Transactional_KV: OK</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl flex-1 flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <List size={14} className="text-indigo-500" /> Live State Inspector (this.storage)
                    </h3>
                    <div className="relative w-48">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Filter keys..." className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 pl-7 pr-3 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-3">Storage Key</th>
                                <th className="px-4 py-3">Value Fragment</th>
                                <th className="px-6 py-3 text-right">TTL/Expires</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-900/30 font-mono text-[11px]">
                            {MOCK_STORAGE_KEYS.map((item, i) => (
                                <tr key={i} className="hover:bg-indigo-500/[0.02] transition-colors group">
                                    <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{item.key}</td>
                                    <td className="px-4 py-4 text-slate-500 max-w-[200px] truncate">{item.value}</td>
                                    <td className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase italic">{item.ttl}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[9px] font-black text-slate-600 uppercase">Strong Consistency Lock: Enabled</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-700">PTR_COUNT: {MOCK_STORAGE_KEYS.length}</span>
                </div>
            </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6 shadow-xl relative group">
                <div className="absolute -top-px left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 italic">
                        <Activity size={16} className="text-indigo-500" /> Instance Lifecycle
                    </h3>
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 uppercase tracking-widest">Single_Global</span>
                </div>

                <div className="space-y-4">
                    {[
                        { label: 'Consistency Level', value: 'Strong/Sequential', icon: Lock },
                        { label: 'Creation Policy', value: 'On-Demand (lazy)', icon: Zap },
                        { label: 'Hibernate State', value: 'Active_DO', icon: RefreshCw },
                        { label: 'Broadcast Radius', value: '300 PoPs Lattice', icon: Server },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 group-hover:border-indigo-500/30 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                            <item.icon size={14} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 italic">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/20">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Clock size={18} /></div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Alarm Scheduler</h4>
            </div>
            <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-800 bg-black/40 font-mono text-[10px] text-slate-400 relative">
                    <div className="absolute top-2 right-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[8px] text-emerald-500 font-black">NEXT: 12m 04s</span>
                    </div>
                    <div className="text-amber-500 mb-2">// session_cleanup.ts</div>
                    <div>async alarm() &#123;</div>
                    <div className="pl-4">const keys = await this.storage.list();</div>
                    <div className="pl-4">await this.storage.deleteAll();</div>
                    <div className="pl-4">console.log("Cleanup complete");</div>
                    <div>&#125;</div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                Alarms are guaranteed to execute even if the Worker script is updated. Essential for resource garbage collection.
                </p>
            </div>
            </div>

            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><ShieldCheck size={18} /></div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic tracking-tight">Integrity Verified</h4>
                </div>
                <div className="mt-4 flex items-center justify-between text-[9px] font-mono font-bold text-slate-500">
                    <span>DO_VERSION: 1.3.6_STABLE</span>
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        SYNC_LOCKED
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
