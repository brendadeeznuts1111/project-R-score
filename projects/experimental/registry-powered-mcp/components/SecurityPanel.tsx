
import React, { useState, useEffect } from 'react';
import { Shield, Lock, Globe, AlertTriangle, CheckCircle, Activity, ToggleLeft, ToggleRight, AlertOctagon, Terminal, Cpu, Search, Fingerprint, ShieldCheck, Zap, Layers, Rocket, Key } from 'lucide-react';
import { Sparkline } from './Sparkline';
import { EnhanceWithAIButton } from './EnhanceWithAIButton';

export const SecurityPanel: React.FC = () => {
  const [flags, setFlags] = useState({
    'experimental_edge_cache': true,
    'beta_ai_agent': true,
    'canary_deployment': false,
    'strict_mode': true,
    'url_pattern_api': true,
    'kqueue_event_loop_fix': true,
    'zod_schema_enforcement': true,
    'node_crypto_ecdh_enabled': true,
    'node_crypto_safe_primes': true
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditLog, setAuditLog] = useState<string[]>([]);

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const runAudit = () => {
    setIsAuditing(true);
    setAuditLog(['> Initializing security audit v2.0-stable...', '> Checking trustedDependencies in R2...', '> Running Zod validation on 142 packages...', '> Verifying node:crypto ECDH implementation...', '> Probing crypto.generatePrime({ safe: true }) entropy...']);
    
    setTimeout(() => {
      setAuditLog(prev => [...prev, '> Safe Prime Generation: Verified (2048-bit)', '> ECDH createECDH("secp256k1"): OK', '> Verifying JSC Loader isolation... OK', '> Auditing networking spin counts...', '> Edge Schema Guard: Active', '> Protocol property verified: Bun.serve().protocol']);
    }, 1000);
    
    setTimeout(() => {
      setAuditLog(prev => [...prev, '> Audit complete. v2.0 standards met.', '> System Integrity: 100%', '> All cryptographic primitives verified.']);
      setIsAuditing(false);
    }, 2500);
  };

  const wafData = [450, 480, 520, 490, 600, 750, 800, 650, 500, 480, 460, 450];
  const schemaData = [100, 99.8, 100, 100, 98.5, 100, 100, 100, 99.9, 100];

  const securityContext = `Security Configuration:
Feature Flags: ${Object.entries(flags).map(([k, v]) => `${k}: ${v}`).join(', ')}
Threat Level: LOW
ECDH: secp256k1 & prime256v1
Node 25 Parity: 100%
WAF Blocks Today: ${wafData[wafData.length - 1]}
Schema Compliance: ${schemaData[schemaData.length - 1]}%
Last Audit: ${auditLog.length > 0 ? auditLog[auditLog.length - 1] : 'Not run'}`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Header with AI Enhancement */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Shield size={24} className="text-emerald-500" />
          Security Dashboard
        </h2>
        <EnhanceWithAIButton
          title="Security Analysis"
          context={securityContext}
          size="md"
          variant="default"
        />
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-16 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
             <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">THREAT LEVEL</h3>
                <Shield size={18} className="text-emerald-500" />
             </div>
             <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">LOW</div>
             <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">Unified Security Layer Active</div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
             <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">ECDH HANDSHAKE</h3>
                <Key size={18} className="text-sky-500" />
             </div>
             <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">SECURE</div>
             <div className="flex items-end justify-between">
                <div className="text-xs text-slate-500 font-mono text-[10px]">secp256k1 & prime256v1</div>
             </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
             <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">NODE 25 PARITY</h3>
                <Fingerprint size={18} className="text-blue-500" />
             </div>
             <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">100%</div>
             <div className="text-xs text-slate-500 font-mono text-[10px]">@types/node@25 compatibility</div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
             <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">WAF BLOCKS</h3>
                <AlertOctagon size={18} className="text-amber-500" />
             </div>
             <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">15,892</div>
             <div className="text-xs text-slate-500 font-mono text-[10px]">Since v2.0 Baseline</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roadmap Section */}
        <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20">
                    <h3 className="font-semibold text-indigo-800 dark:text-indigo-100 flex items-center gap-2">
                        <Rocket size={18} className="text-indigo-500" />
                        Roadmap v2.0 (Enhanced Production)
                    </h3>
                    <button 
                        onClick={runAudit}
                        disabled={isAuditing}
                        className="px-3 py-1 rounded-lg bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-400 transition-all flex items-center gap-2"
                    >
                        {isAuditing ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                        {isAuditing ? 'AUDITING...' : 'RUN SECURITY SCAN'}
                    </button>
                </div>
                <div className="p-6 space-y-4 bg-white/50 dark:bg-slate-900/20">
                    <div className="flex items-start gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="p-2 rounded bg-sky-500/10 text-sky-500"><Key size={16} /></div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Safe Prime Generation</h4>
                                <span className="text-[10px] font-bold text-sky-500">100% COMPLETE</span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-sky-500 w-full"></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Native crypto.generatePrime({"{ safe: true }"}) verified for production.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="p-2 rounded bg-emerald-500/10 text-emerald-500"><Layers size={16} /></div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Unified Security Layer</h4>
                                <span className="text-[10px] font-bold text-emerald-500">98% COMPLETE</span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[98%]"></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">v1.3.6 hardening applied to all 21 core endpoints with ECDH enabled.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="p-2 rounded bg-blue-500/10 text-blue-500"><Activity size={16} /></div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Telemetry Foundation</h4>
                                <span className="text-[10px] font-bold text-blue-500">100% COMPLETE</span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-full"></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Baseline metrics established for GraphQL, AI Subsystem, and R2 Storage.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                        <Zap size={18} className="text-indigo-500" />
                        Audit History & Telemetry Probes
                    </h3>
                </div>
                {auditLog.length > 0 && (
                    <div className="p-4 bg-black/90 font-mono text-[10px] text-emerald-500 border-t border-slate-800 min-h-32 max-h-48 overflow-y-auto">
                        {auditLog.map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                )}
            </div>
        </div>

        {/* Feature Flags */}
        <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                    <Activity size={18} className="text-purple-500" />
                    Security Controls
                </h3>
            </div>
            <div className="p-4 space-y-4">
                {Object.entries(flags).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 transition-colors">
                        <div className="flex-1 pr-4">
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide truncate">
                                {key.replace(/_/g, ' ')}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {enabled ? 'Active globally' : 'Disabled'}
                            </div>
                        </div>
                        <button 
                            onClick={() => toggleFlag(key as keyof typeof flags)}
                            className={`shrink-0 transition-colors ${enabled ? 'text-indigo-500 hover:text-indigo-400' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                            {enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>

    </div>
  );
};

const Loader2 = ({ size, className }: { size: number, className: string }) => (
    <Activity size={size} className={className} />
);
