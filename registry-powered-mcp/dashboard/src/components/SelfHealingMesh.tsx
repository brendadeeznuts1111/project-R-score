import React, { useState } from 'react';
import { RefreshCw, ShieldCheck, Zap, Activity, AlertTriangle, Terminal, Network, Lock } from 'lucide-react';

interface NodeHealth {
  id: string;
  status: 'online' | 'recovering' | 'outage';
  consensus: number;
  lastRepair: string;
}

const INITIAL_NODES: NodeHealth[] = [
  { id: 'ORD-01', status: 'online', consensus: 100, lastRepair: 'N/A' },
  { id: 'SFO-01', status: 'online', consensus: 100, lastRepair: 'N/A' },
  { id: 'LHR-01', status: 'online', consensus: 100, lastRepair: 'N/A' },
  { id: 'FRA-01', status: 'online', consensus: 100, lastRepair: 'N/A' },
  { id: 'HND-01', status: 'online', consensus: 100, lastRepair: 'N/A' },
  { id: 'SIN-01', status: 'online', consensus: 100, lastRepair: 'N/A' },
];

export const SelfHealingMesh: React.FC = () => {
    const [nodes, setNodes] = useState<NodeHealth[]>(INITIAL_NODES);
    const [logs, setLogs] = useState<string[]>(['> Self-Healing Fabric initialized.', '> Policy ENFORCED: 0-Downtime Migration.']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [repairProgress, setRepairProgress] = useState(0);

    const addLog = (msg: string) => setLogs(prev => [`> ${new Date().toLocaleTimeString()} :: ${msg}`, ...prev].slice(0, 15));

    const triggerChaos = () => {
        setIsSimulating(true);
        setRepairProgress(0);

        // Randomly fail 2 nodes
        const failIndices = [0, 2];
        setNodes(prev => prev.map((n, i) => failIndices.includes(i) ? { ...n, status: 'outage', consensus: 0 } : n));

        addLog("CRITICAL: Outage detected on ORD-01 and LHR-01.");
        addLog("PROTOCOL_INVOKED: Self-Healing Mesh v2.8.0");

        // Step 1: Detect
        setTimeout(() => {
            addLog("ISOLATING faulted nodes. Durable Object sync locked.");
            setRepairProgress(25);
        }, 1200);

        // Step 2: Recover
        setTimeout(() => {
            setNodes(prev => prev.map(n => n.status === 'outage' ? { ...n, status: 'recovering', consensus: 45 } : n));
            addLog("RECOVERING nodes from warm snapshot. Synchronizing SHA-256 lattice...");
            setRepairProgress(60);
        }, 3000);

        // Step 3: Verify
        setTimeout(() => {
            setNodes(prev => prev.map(n => ({ ...n, status: 'online', consensus: 100, lastRepair: new Date().toLocaleTimeString() })));
            addLog("CONSENSUS RE-ESTABLISHED.ORD-01 and LHR-01 are stable.");
            setRepairProgress(100);
            setIsSimulating(false);
        }, 5500);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Header HUD */}
            <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full -z-10"></div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                            <RefreshCw size={14} className={isSimulating ? 'animate-spin' : ''} /> Fabric Auto-Remediation
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Self-Healing Mesh</h2>
                        <p className="text-slate-500 text-sm max-w-xl">
                            Continuous integrity monitoring across 300 PoPs. Faults are automatically isolated and recovered via warm snapshots in under 6 seconds.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={triggerChaos}
                            disabled={isSimulating}
                            className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-600/20 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            <AlertTriangle size={18} /> Simulate Outage
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Visual Mesh Map */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 flex flex-col gap-6 shadow-xl relative overflow-hidden min-h-[450px]">
                        <div className="absolute inset-0 cyber-grid opacity-10"></div>
                        <header className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                                    <Network size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Regional Consensus Fabric</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Repair Status: {repairProgress}%</span>
                            </div>
                        </header>

                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10 pt-4">
                            {nodes.map((node) => (
                                <div key={node.id} className={`p-5 rounded-2xl border transition-all duration-500 flex flex-col justify-between group ${
                                    node.status === 'outage' ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]' :
                                    node.status === 'recovering' ? 'bg-amber-500/10 border-amber-500/50' :
                                    'bg-slate-900 border-slate-800 hover:border-indigo-500/50'
                                }`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-500 uppercase mb-1">{node.id}</span>
                                            <span className="text-sm font-black text-white italic tracking-tight">Consensus: {node.consensus}%</span>
                                        </div>
                                        <div className={`p-2 rounded-xl ${
                                            node.status === 'outage' ? 'bg-rose-500 text-white animate-pulse' :
                                            node.status === 'recovering' ? 'bg-amber-500 text-white' :
                                            'bg-slate-800 text-emerald-500'
                                        }`}>
                                            {node.status === 'outage' ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-2">
                                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${node.status === 'outage' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${node.consensus}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase tracking-tighter">
                                            <span>Repaired: {node.lastRepair}</span>
                                            <span className={node.status === 'outage' ? 'text-rose-500 font-bold' : ''}>{node.status.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isSimulating && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-4">
                                 <div className="relative">
                                    <div className="w-16 h-16 rounded-2xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                                    <Zap size={24} className="absolute inset-0 m-auto text-indigo-500 animate-pulse" />
                                </div>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Healing Phase {repairProgress < 50 ? 'I (Isolation)' : 'II (Lattice Sync)'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Diagnostic Stream */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-black overflow-hidden flex flex-col h-[450px] shadow-xl">
                        <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Fabric Remediation Stream</span>
                            </div>
                            {isSimulating && <Activity size={12} className="text-indigo-500 animate-pulse" />}
                        </div>
                        <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto custom-scrollbar leading-relaxed">
                             {logs.map((log, i) => (
                                 <div key={i} className={`mb-1.5 flex gap-3 ${log.includes('CONSENSUS') ? 'text-emerald-400 font-bold' : log.includes('CRITICAL') ? 'text-rose-400' : 'text-slate-400'}`}>
                                     <span>{log}</span>
                                 </div>
                             ))}
                             {isSimulating && (
                                 <div className="flex gap-2 text-indigo-500 mt-2">
                                     <span className="animate-pulse bg-indigo-500/50 w-2 h-4 block"></span>
                                 </div>
                             )}
                        </div>
                        <div className="p-4 bg-slate-900 border-t border-slate-800">
                             <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stability Index</span>
                                <span className="text-emerald-500 font-black text-[10px] tracking-widest">99.99%</span>
                             </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                            <Lock size={16} /> Convergence Rule
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                            v2.8.0 introduces **Quorum Locking**. The mesh will never yield an inconsistent state even during multi-node partition events.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};