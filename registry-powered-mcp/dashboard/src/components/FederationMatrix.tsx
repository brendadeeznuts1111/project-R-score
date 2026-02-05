
import React, { useState } from 'react';
import { Network, Shield, Zap, DollarSign, Activity, CheckCircle2, AlertTriangle, XCircle, Search, Info, Layers, Filter, Globe, Cpu, Clock, MousePointer2, Box } from 'lucide-react';
import { FederationHub } from './FederationHub';
import { FederationSecurityStatus } from './FederationSecurityStatus';

const CAPABILITIES = [
  { system: 'npm', type: 'Package', auth: 'Token/Basic', read: 'y', write: 'y', search: 'y', list: 'n', sync: 'w', cost: 'Free', latency: '<100ms', security: 'Public/Private' },
  { system: 'GitHub Packages', type: 'Package/Container', auth: 'PAT/OAuth', read: 'y', write: 'y', search: 'y', list: 'y', sync: 'y', cost: 'Included', latency: '<200ms', security: 'Private by default' },
  { system: 'Docker Hub', type: 'Container', auth: 'Basic/OAuth', read: 'y', write: 'w', search: 'y', list: 'y', sync: 'n', cost: 'Free/Paid', latency: '<150ms', security: 'Public/Private' },
  { system: 'AWS ECR', type: 'Container', auth: 'SigV4', read: 'y', write: 'y', search: 'n', list: 'y', sync: 'y', cost: '$0.10/GB', latency: '<50ms', security: 'Private' },
  { system: 'AWS SSM', type: 'Config', auth: 'SigV4', read: 'y', write: 'y', search: 'n', list: 'y', sync: 'y', cost: '$0.05/10k', latency: '<10ms', security: 'Encrypted' },
  { system: 'GCP Artifact', type: 'Package/Container', auth: 'OAuth2', read: 'y', write: 'y', search: 'y', list: 'y', sync: 'y', cost: '$0.10/GB', latency: '<100ms', security: 'IAM' },
  { system: 'Azure ACR', type: 'Container', auth: 'Token/MSI', read: 'y', write: 'y', search: 'n', list: 'y', sync: 'y', cost: '$0.10/GB', latency: '<120ms', security: 'Private' },
  { system: 'JFrog', type: 'Universal', auth: 'Token/Basic', read: 'y', write: 'y', search: 'y', list: 'y', sync: 'y', cost: '$$$', latency: '<50ms', security: 'RBAC' },
  { system: 'Sonatype Nexus', type: 'Universal', auth: 'Token/Basic', read: 'y', write: 'y', search: 'y', list: 'y', sync: 'y', cost: '$$$', latency: '<50ms', security: 'RBAC' },
  { system: 'Hyper-Bun', type: 'Package/Policy', auth: 'JWT', read: 'y', write: 'y', search: 'y', list: 'y', sync: 'y', cost: 'Free', latency: '<20ms', security: 'Full RBAC' },
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'y') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'w') return <AlertTriangle size={14} className="text-amber-500" />;
  if (status === 'n') return <XCircle size={14} className="text-rose-500" />;
  return <span className="text-[10px] opacity-40">—</span>;
};

export const FederationMatrix: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'capabilities' | 'sync' | 'security' | 'cost' | 'orchestrator'>('orchestrator');
  const [search, setSearch] = useState('');

  const filtered = CAPABILITIES.filter(item => 
    item.system.toLowerCase().includes(search.toLowerCase()) || 
    item.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Top Hero Section */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="space-y-3">
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                  <Network size={14} /> Federation Protocol v3.8.2.0
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">System Federation Matrix</h2>
              <p className="text-slate-500 text-sm max-w-xl">
                 Unified benchmarking across 10 major package, container, and configuration systems. Standardized for Hyper-Bun v2.4+ integration.
              </p>
           </div>
           
           <div className="flex gap-4">
              <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center min-w-[120px]">
                 <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Top Perf Hub</div>
                 <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Hyper-Bun</div>
                 <div className="text-[10px] font-mono text-emerald-500 mt-1">{"< 20ms Edge"}</div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center min-w-[120px]">
                 <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">Highest SLA</div>
                 <div className="text-xl font-black text-slate-900 dark:text-white">AWS/GCP Sync</div>
                 <div className="text-[10px] font-mono text-indigo-500 mt-1">Immutable</div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Matrix Control */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                {[
                    { id: 'orchestrator', label: 'Orchestrator', icon: Zap },
                    { id: 'capabilities', label: 'Capabilities', icon: Layers },
                    { id: 'sync', label: 'Sync & Auth', icon: Activity },
                    { id: 'security', label: 'Security & Compliance', icon: Shield },
                    { id: 'cost', label: 'Cost Analysis', icon: DollarSign },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            activeSubTab === tab.id 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        <tab.icon size={12} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Filter systems..."
                    value={search}
                    // Fix: Changed setSearchTerm to setSearch to match the state setter name.
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
                />
            </div>
        </div>

        {activeSubTab === 'orchestrator' ? (
          <div className="p-6">
             <FederationHub />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-black tracking-[0.2em] border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">System Identity</th>
                  <th className="px-4 py-4">Type</th>
                  {activeSubTab === 'capabilities' && (
                      <>
                          <th className="px-4 py-4 text-center">R</th>
                          <th className="px-4 py-4 text-center">W</th>
                          <th className="px-4 py-4 text-center">SRC</th>
                          <th className="px-4 py-4 text-center">LST</th>
                          <th className="px-4 py-4 text-center">SYN</th>
                          <th className="px-4 py-4">Latency</th>
                          <th className="px-4 py-4 text-right">Cost Tier</th>
                      </>
                  )}
                  {activeSubTab === 'sync' && (
                      <>
                          <th className="px-4 py-4">Auth Model</th>
                          <th className="px-4 py-4">Sync Strategy</th>
                          <th className="px-4 py-4 text-center">Uni</th>
                          <th className="px-4 py-4 text-center">Bi</th>
                          <th className="px-6 py-4 text-right">DevEx Rating</th>
                      </>
                  )}
                  {activeSubTab === 'security' && (
                      <th className="px-6 py-4 text-left">LSP Security Status</th>
                  )}
                   {activeSubTab === 'cost' && (
                      <>
                          <th className="px-4 py-4">Storage Cost</th>
                          <th className="px-4 py-4">Bandwidth</th>
                          <th className="px-4 py-4 text-right">Enterprise Tier</th>
                      </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((item, idx) => (
                  <tr key={idx} className={`hover:bg-indigo-500/5 transition-colors group ${item.system === 'Hyper-Bun' ? 'bg-emerald-500/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-6 rounded-full group-hover:scale-y-125 transition-transform ${item.system === 'Hyper-Bun' ? 'bg-emerald-500' : 'bg-indigo-500/30'}`}></div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{item.system}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase">{item.type}</td>
                    
                    {activeSubTab === 'capabilities' && (
                      <>
                          <td className="px-4 py-4 text-center"><StatusIcon status={item.read} /></td>
                          <td className="px-4 py-4 text-center"><StatusIcon status={item.write} /></td>
                          <td className="px-4 py-4 text-center"><StatusIcon status={item.search} /></td>
                          <td className="px-4 py-4 text-center"><StatusIcon status={item.list} /></td>
                          <td className="px-4 py-4 text-center"><StatusIcon status={item.sync} /></td>
                          <td className="px-4 py-4 text-[10px] font-mono font-bold text-sky-500">{item.latency}</td>
                          <td className="px-4 py-4 text-right text-[10px] font-black text-slate-700 dark:text-slate-300">{item.cost}</td>
                      </>
                    )}

                    {activeSubTab === 'sync' && (
                      <>
                          <td className="px-4 py-4 text-[10px] font-mono text-slate-500">{item.auth}</td>
                          <td className="px-4 py-4 text-[10px] font-bold text-indigo-500 uppercase">{item.sync === 'y' ? 'Automated' : item.sync === 'w' ? 'Manual' : 'None'}</td>
                          <td className="px-4 py-4 text-center"><StatusIcon status="y" /></td>
                          <td className="px-4 py-4 text-center"><StatusIcon status={item.sync} /></td>
                          <td className="px-6 py-4 text-right flex justify-end">
                              <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                      <div key={i} className={`w-1 h-3 rounded-full ${i < (item.system === 'npm' || item.system === 'Hyper-Bun' ? 5 : 3) ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                  ))}
                              </div>
                          </td>
                      </>
                    )}

                    {activeSubTab === 'security' && (
                      <td className="px-4 py-4">
                        <FederationSecurityStatus systemName={item.system} />
                      </td>
                    )}

                    {activeSubTab === 'cost' && (
                      <>
                          <td className="px-4 py-4 text-[10px] font-mono text-slate-500">{item.cost === 'Free' ? '$0' : item.cost}</td>
                          <td className="px-4 py-4 text-[10px] font-bold text-slate-500">{item.system.includes('AWS') ? '$0.09/GB' : 'Included'}</td>
                          <td className="px-4 py-4 text-right">
                              <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
                                  {item.system === 'Hyper-Bun' ? 'COMMUNITY FREE' : item.cost === '$$$' ? 'CONTRACT' : 'PAY-GO'}
                              </span>
                          </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 px-8">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Globe size={12} className="text-sky-500" /> Edge Latency Baseline: 10-200ms
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Cpu size={12} className="text-emerald-500" /> KQueue Engine: Active
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase italic">
                    <CheckCircle2 size={12} /> Compliance: SOC2/GDPR Pinned
                </div>
            </div>
        </div>
      </div>

      {/* Decision Tree Sub-Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><AlertTriangle size={20} /></div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Risk Assessment Matrix</h3>
             </div>
             <div className="space-y-4">
                 {[
                     { risk: 'Vendor Lock-in', cloud: 'High', hyper: 'Low', trend: 'down' },
                     { risk: 'Data Integrity', cloud: 'Very Low', hyper: 'Very Low', trend: 'neutral' },
                     { risk: 'Compliance Drift', cloud: 'Low', hyper: 'Low', trend: 'down' },
                     { risk: 'Cost Overrun', cloud: 'Medium', hyper: 'Low', trend: 'down' },
                 ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{r.risk}</span>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-rose-500">Cloud: {r.cloud}</span>
                            <span className="text-[10px] font-mono text-emerald-500 font-black italic">Hyper: {r.hyper}</span>
                        </div>
                    </div>
                 ))}
             </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><MousePointer2 size={20} /></div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic tracking-tight">Federation Strategy</h3>
             </div>
             <div className="p-4 rounded-xl bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 mb-4 shadow-inner">
                <div className="text-[10px] font-black text-indigo-500 uppercase mb-2">Primary Recommendation</div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold italic">
                   "Leverage Hyper-Bun as the Federation Hub for UI Policies & Configs, sync with AWS ECR/GCP AR for immutable binary containers."
                </p>
             </div>
             <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Latency Target</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 italic">{"< 25ms Global"}</span>
                 </div>
                 <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Storage Plan</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 italic">Multi-Cloud R2</span>
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};
