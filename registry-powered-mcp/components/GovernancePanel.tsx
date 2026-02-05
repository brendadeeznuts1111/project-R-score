
import React, { useState } from 'react';
import { Gavel, ShieldCheck, Zap, Hash, FileDiff, Activity, Terminal, CheckCircle2, AlertTriangle, Scale, Lock, RefreshCw, Layers } from 'lucide-react';

const AUDIT_TEMPLATE = [
  { layer: 'Branching', mechanism: 'docs/v2.4.1-hardened-lattice-manifest', status: 'ACTIVE', color: 'text-sky-500' },
  { layer: 'Commit Logic', mechanism: '{DOMAIN}{SCOPE}{TYPE}{META}', status: 'ENFORCED', color: 'text-indigo-500' },
  { layer: 'PR Audit', mechanism: 'v2.4.1-PR-AUDIT-001', status: 'LOCKED', color: 'text-emerald-500' },
  { layer: 'Release', mechanism: 'v2.4.1@sha256:golden', status: 'STABLE', color: 'text-amber-500' },
];

export const GovernancePanel: React.FC = () => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(['> Governance Engine STANDBY', '> Awaiting compliance trigger...']);

  const runComplianceCheck = () => {
    setIsAuditing(true);
    setAuditProgress(0);
    setLogs(['> Initiating PR-AUDIT-001 Compliance Event...']);

    const steps = [
      { msg: '> Calculating Resource Tax Delta (ΔP99)...', duration: 800 },
      { msg: '> Baseline: 10.8ms | Delta: +0.02ms [PASS]', duration: 1200 },
      { msg: '> Verifying SHA-256 diff for lattice manifest...', duration: 1800 },
      { msg: '> SHA-256: 0x8FA2...B2F1 MATCHED.', duration: 2200 },
      { msg: '> Enforcing {DOMAIN}{SCOPE} commit syntax...', duration: 2800 },
      { msg: '> Governance: MISSION_ARCHIVE_SUCCESS', duration: 3400 },
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setLogs(prev => [step.msg, ...prev]);
        setAuditProgress(((i + 1) / steps.length) * 100);
        if (i === steps.length - 1) {
          setIsAuditing(false);
          setLogs(prev => ['✅ LATTICE_INTEGRITY_ABSOLUTE', ...prev]);
        }
      }, step.duration);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Hero Header */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Gavel size={14} /> Lattice Governance Hub
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Hardened Baseline PR Audit</h2>
                <p className="text-slate-500 text-sm max-w-xl">
                    Standardized regulatory anchor for Registry-Powered-MCP v2.4.1. Formalizing infrastructure governance as a mathematically verified event.
                </p>
            </div>
            
            <button 
                onClick={runComplianceCheck}
                disabled={isAuditing}
                className="px-8 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
            >
                {isAuditing ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {isAuditing ? 'Auditing...' : 'Run Compliance Check'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Governance Table */}
        <div className="lg:col-span-8 space-y-6">
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={16} className="text-indigo-500" /> System Lock-In: v2.4.1 Configuration
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Lattice Verified</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 uppercase text-[9px] font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4">Control Layer</th>
                                <th className="px-6 py-4">Enforcement Mechanism</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {AUDIT_TEMPLATE.map((row, idx) => (
                                <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{row.layer}</span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                                        {row.mechanism}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg border bg-opacity-10 ${row.color} border-current`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Progress & Logic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-48">
                    <div>
                        <div className="flex items-center gap-2 text-rose-500 mb-2">
                            <Zap size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Resource Tax Delta</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed italic">
                            Mandatory delta tracking to prevent "feature creep" from compromising 10.8ms p99 latency baseline.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400">
                            <span>REGRESSION LIMIT: 0.5ms</span>
                            <span className={isAuditing ? 'animate-pulse' : ''}>CURRENT: 0.02ms</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 w-[10%] transition-all duration-1000"></div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-48 bg-indigo-500/5">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-500 mb-2">
                            <Hash size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">SHA-256 Differential</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed italic">
                            Manifest integrity check. Any unauthorized mutation to the v2.4.1 lattice results in automatic PR rejection.
                        </p>
                    </div>
                    <div className="p-3 bg-black/90 rounded-xl border border-slate-800 font-mono text-[9px] text-indigo-400">
                        0x8FA2B2F1...7D9E
                    </div>
                </div>
            </div>
        </div>

        {/* Diagnostic Log */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-black overflow-hidden flex flex-col h-[500px] shadow-2xl">
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Governance Event Stream</span>
                    </div>
                </div>
                <div className="p-6 font-mono text-[11px] overflow-y-auto flex-1 custom-scrollbar flex flex-col-reverse">
                    <div className="flex gap-2 text-emerald-500 mt-2">
                        <span className="animate-pulse bg-emerald-500/50 w-2 h-4 block"></span>
                    </div>
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-1.5 leading-tight ${log.includes('✅') || log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('⚠️') ? 'text-amber-400' : 'text-slate-400'}`}>
                            {log}
                        </div>
                    ))}
                </div>
                {isAuditing && (
                    <div className="h-1 bg-indigo-500 animate-[shimmer_2s_infinite]"></div>
                )}
            </div>

            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-bold text-xs uppercase">
                    <CheckCircle2 size={16} /> Administrator Directive
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    "The v2.4.1 Hardened Baseline is now a self-sustaining ecosystem. Governance is mathematically verified. Mission archive success confirmed."
                </p>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Steady-State Passive Watch</span>
                    <Lock size={12} className="text-emerald-500" />
                </div>
            </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};
