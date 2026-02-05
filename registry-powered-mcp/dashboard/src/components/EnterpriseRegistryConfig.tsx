
import React, { useState } from 'react';
import { 
  Settings, 
  Lock, 
  Shield, 
  FileText, 
  Globe, 
  Info, 
  Copy, 
  Server, 
  Zap, 
  Activity, 
  AlertCircle, 
  Layers, 
  Fingerprint, 
  ShieldCheck, 
  Database, 
  Key, 
  CheckCircle2,
  Terminal,
  Cpu,
  Search,
  MousePointer2,
  Code,
  // Fix: Added missing Plus icon import
  Plus
} from 'lucide-react';
import { ENTERPRISE_SCOPES_DATA } from '../constants';

const HARDENING_SCOPES = [
  { scope: "@myorg1", type: "Hyper-Bun", encryption: true, audit: true, rbac: true, status: 'STABLE' },
  { scope: "@myorg2", type: "Hyper-Bun", encryption: true, audit: true, rbac: true, status: 'STABLE' },
  { scope: "@bun-mcp", type: "Hyper-Bun", encryption: true, audit: true, rbac: true, status: 'STABLE' },
  { scope: "@internal-tools", type: "Hyper-Bun", encryption: true, audit: true, rbac: true, status: 'STABLE' },
  { scope: "@cdn-fast", type: "Hyper-Bun", encryption: true, audit: true, rbac: true, status: 'STABLE' },
  { scope: "@mcp-enterprise", type: "Hyper-Bun", encryption: true, audit: true, rbac: true, status: 'STABLE' },
];

export const EnterpriseRegistryConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'toml' | 'hardening'>('toml');
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const tomlSnippet = `# .npmrc - ENHANCED Enterprise Scoped Registries v2.0
[install.scopes]

# 🏢 Sonatype Nexus Setup (with :email support)
"@nexus-org" = {
  url = "https://registry.example.com/",
  username = "myuser",
  password = "\${NPM_PASS}",
  email = "user@example.com"
}

# 🔒 HARDENED ENV VARS (Optional ? modifier in quotes)
"@myorg-failover" = {
  token = "\${NPM_TOKEN?}", 
  auth = "Bearer \${AUTH_TOKEN?}",
  url = "https://registry-us.myorg.com/",
  failover = [
    "https://registry-eu.myorg.com/",
    "https://registry-ap.myorg.com/"
  ]
}

# 🔑 TOKEN AUTH (Quoted Expansion demonstration)
"@bun-mcp" = { 
  token = "\${MCP_GITHUB_TOKEN}",
  url = "https://npm.pkg.github.com/myorg/bun-mcp/",
  metrics = true
}

# 🛡️ INTERNAL + AIRGAPPED (Zero-trust + Audit)
"@internal-tools" = {
  token = "\${INTERNAL_TOKEN?}",
  url = "https://artifactory.internal.corp:8081/npm/",
  audit = true,
  offline = true
}

# 🏗️ PUBLIC HOISTING PATTERNS (New in v1.2+)
public-hoist-pattern[]=@typescript/*
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=@types/*`;

  return (
    <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      {/* Dynamic Header */}
      <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-md opacity-20 animate-pulse"></div>
            <div className="relative p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Server size={22} className="text-emerald-500" />
            </div>
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg italic">Enterprise Scopes</h3>
            <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Hardening v1.3.6 Active</span>
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">JSCSandbox: Isolated</span>
            </div>
          </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('toml')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'toml' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Code size={14} /> .npmrc Hub
            </button>
            <button 
              onClick={() => setActiveTab('hardening')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'hardening' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Shield size={14} /> Security Map
            </button>
        </div>
      </div>
      
      <div className="p-6">
        {activeTab === 'toml' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-500">
            <div className="lg:col-span-2 space-y-4">
               <div className="glass-panel p-4 bg-black/95 rounded-xl border border-slate-800 relative group overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-500 to-indigo-500"></div>
                  <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2 px-1">
                      <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                          <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                      </div>
                      <button 
                        onClick={() => {
                            navigator.clipboard.writeText(tomlSnippet);
                            alert("TOML Scopes Copied");
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 opacity-0 group-hover:opacity-100 transition-all border border-white/10 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                      >
                        <Copy size={12} /> Copy Config
                      </button>
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed text-slate-300 overflow-x-auto scrollbar-thin py-2 px-2 selection:bg-indigo-500/30">
                    {tomlSnippet.split('\n').map((line, i) => (
                      <div key={i} className="flex gap-6 hover:bg-white/5 px-2 -mx-2 transition-colors">
                        <span className="w-4 text-slate-600 select-none text-right font-mono italic opacity-50">{i + 1}</span>
                        <span className={`
                            ${line.startsWith('#') ? 'text-slate-500 italic' : ''}
                            ${line.includes('=') ? 'text-emerald-400' : ''}
                            ${line.includes('{') || line.includes('}') ? 'text-indigo-400 font-bold' : ''}
                            ${line.includes('@') ? 'text-sky-400 font-bold' : ''}
                            ${line.includes('?') ? 'text-amber-500 font-black italic underline decoration-amber-500/30 underline-offset-4' : ''}
                            ${line.includes('public-hoist-pattern') ? 'text-sky-400' : ''}
                        `}>
                            {line}
                        </span>
                      </div>
                    ))}
                  </pre>
               </div>
               
               <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl shadow-sm">
                    <Info size={20} className="text-indigo-500 shrink-0" />
                    <div>
                        <p className="text-[10px] text-slate-800 dark:text-slate-100 font-black uppercase tracking-widest">
                          Environment Expansion Logic
                        </p>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                          Bun v1.3.6 supports <span className="text-indigo-500 font-bold">Quoted Expansion</span> for tokens and the <span className="text-amber-500 font-bold">? suffix</span> to prevent fatal startup errors on missing keys.
                        </p>
                    </div>
               </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registry Telemetry</h4>
                    <span className="text-[10px] font-mono text-emerald-500 animate-pulse">LIVE</span>
                </div>
                <div className="space-y-3 max-h-[440px] overflow-y-auto no-scrollbar pr-1 pb-4">
                    {ENTERPRISE_SCOPES_DATA.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:border-emerald-500/50 transition-all group cursor-default"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono tracking-tighter">{item.scope}</span>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{item.tag}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 mb-4 line-clamp-2">{item.desc}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {item.features.map((f, i) => (
                                    <span key={i} className="text-[8px] font-black text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded bg-slate-100/50 dark:bg-slate-950/50 flex items-center gap-1 group-hover:text-indigo-500 transition-colors uppercase tracking-widest">
                                        <Zap size={8} /> {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-60">
                        <Plus size={20} className="text-slate-400 mb-2" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Add Scope Mapping</span>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="p-6 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border border-indigo-500/20 rounded-3xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[100px] -z-10"></div>
                <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-2xl shadow-indigo-600/30">
                    <Fingerprint size={32} />
                </div>
                <div className="space-y-1 text-center md:text-left">
                   <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">JSCSandbox Enforcement initialization</h4>
                   <p className="text-xs text-indigo-500 font-black uppercase tracking-[0.2em]">Security Protocol v1.3.6 Active • All JS-Initialized scopes isolated</p>
                </div>
                <div className="md:ml-auto flex flex-col items-end">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sandbox Integrity</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-white">100% Verified</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {HARDENING_SCOPES.map((h, i) => (
                   <div 
                    key={i} 
                    onMouseEnter={() => setIsHovered(h.scope)}
                    onMouseLeave={() => setIsHovered(null)}
                    className={`glass-panel p-5 rounded-2xl border transition-all duration-300 relative group ${isHovered === h.scope ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 translate-y-[-4px]' : 'border-slate-200 dark:border-slate-800'}`}
                   >
                      <div className="flex items-center justify-between mb-5">
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono tracking-tighter italic">{h.scope}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${h.status === 'STABLE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Isolated via {h.type}</span>
                            </div>
                         </div>
                         <div className={`p-2 rounded-xl transition-colors ${isHovered === h.scope ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                            <Shield size={16} />
                         </div>
                      </div>

                      <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Encryption (AES-256)</span>
                            <span className="text-emerald-500"><ShieldCheck size={14} /></span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Audit Stream Pin</span>
                            <span className="text-emerald-500"><CheckCircle2 size={14} /></span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">RBAC Hardening</span>
                            <span className="text-emerald-500"><Lock size={14} /></span>
                         </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 opacity-60">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter">PTR Segment</span>
                            <span className="text-[8px] font-mono text-indigo-500 font-bold">0x8FA2{i}B2...</span>
                         </div>
                         <span className="text-[8px] font-mono text-slate-500">INIT: SUCCESS</span>
                      </div>
                   </div>
                ))}
             </div>

             <div className="glass-panel p-5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner flex flex-col md:flex-row items-center justify-between px-8 gap-4">
                <div className="flex flex-wrap items-center gap-8">
                    <div className="flex items-center gap-3">
                        <Key size={18} className="text-sky-500" />
                        <div>
                            <div className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Neural Handshake</div>
                            <div className="text-[9px] text-slate-600 uppercase font-bold">Verified on Edge Cluster</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Activity size={18} className="text-emerald-500" />
                        <div>
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Initialization</div>
                            <div className="text-[9px] text-slate-600 uppercase font-bold">Scope-to-Map binding stable</div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <Cpu size={14} className="text-indigo-500" />
                    <code className="text-[10px] font-mono text-slate-400 italic">JSCSandbox.execute(registryInitialization)</code>
                </div>
             </div>
          </div>
        )}
      </div>
      
      {/* Dynamic Status Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center px-8 gap-2">
         <div className="flex items-center gap-4">
             <span className="text-[10px] font-black text-emerald-500/80 flex items-center gap-2 uppercase tracking-widest">
                 <Activity size={12} className="animate-pulse" /> TELEMETRY_PROBE: HOIST_OPTIMIZED
             </span>
             <div className="h-4 w-px bg-slate-800"></div>
             <span className="text-[10px] font-black text-indigo-500/80 uppercase tracking-[0.2em] italic">JSCSandbox: Isolation Active</span>
         </div>
         <span className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.2em]">Compliance Baseline: v1.3.6 Enterprise Hardened</span>
      </div>
    </div>
  );
};
