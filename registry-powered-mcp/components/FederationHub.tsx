
import React, { useState } from 'react';
import { 
  Network, 
  Shield, 
  Zap, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  Box, 
  Server, 
  Lock, 
  Cpu, 
  Database,
  Fingerprint,
  Link,
  Terminal,
  Activity,
  FileJson,
  Microscope,
  PlayCircle,
  FolderOpen,
  FileCode,
  Download,
  Terminal as TerminalIcon
} from 'lucide-react';

interface SyncState {
  aws: 'idle' | 'syncing' | 'synced';
  gcp: 'idle' | 'syncing' | 'synced';
  policies: 'idle' | 'syncing' | 'synced';
}

interface ProfileRecord {
  id: string;
  name: string;
  timestamp: string;
  size: string;
}

export const FederationHub: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    aws: 'idle',
    gcp: 'idle',
    policies: 'idle'
  });

  const [configVersion, setConfigVersion] = useState<0 | 1>(1);
  const [cpuProfiling, setCpuProfiling] = useState(false);
  const [profName, setProfName] = useState('hub-sync.cpuprofile');
  const [profDir, setProfDir] = useState('./profiles');
  const [profiles, setProfiles] = useState<ProfileRecord[]>([
    { id: '1', name: 'startup-audit.cpuprofile', timestamp: '2025-12-19 04:20', size: '1.2MB' }
  ]);
  
  const [logs, setLogs] = useState<string[]>(['> Federation Hub v3.8.2 Initialized.', '> Lockfile Protocol: configVersion 1 (Isolated Linker Default).']);

  const runSync = (target: keyof SyncState) => {
    setSyncState(prev => ({ ...prev, [target]: 'syncing' }));
    const logPrefix = target === 'policies' ? '[POLICY]' : '[CONTAINER]';
    const targetName = target === 'aws' ? 'AWS ECR' : target === 'gcp' ? 'GCP AR' : 'Global Hub';

    setLogs(prev => [`${logPrefix} Initiating handshake with ${targetName}...`, ...prev]);
    
    if (target === 'policies') {
        setLogs(prev => [`${logPrefix} Validating bun.lock: configVersion=${configVersion}...`, ...prev]);
    }

    setTimeout(() => {
      setLogs(prev => [`${logPrefix} Hashing binary payload (SHA-256: 0x8FA2...)...`, ...prev]);
      if (cpuProfiling) {
         setLogs(prev => [`${logPrefix} [PROFILER] Executing: bun --cpu-prof --cpu-prof-name ${profName} --cpu-prof-dir ${profDir} sync-task.ts`, ...prev]);
      }
    }, 800);

    setTimeout(() => {
      setLogs(prev => [`${logPrefix} Propagating immutable configs (v${configVersion}) to edge nodes...`, ...prev]);
      setSyncState(prev => ({ ...prev, [target]: 'synced' }));
      setLogs(prev => [`${logPrefix} SUCCESS: Parity confirmed with ${targetName}.`, ...prev]);
      
      if (cpuProfiling) {
        const newProfile: ProfileRecord = {
            id: Date.now().toString(),
            name: profName,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            size: '0.8MB'
        };
        setProfiles(prev => [newProfile, ...prev]);
      }
    }, 2500);
  };

  const toggleProfiler = () => {
    const newState = !cpuProfiling;
    setCpuProfiling(newState);
    setLogs(prev => [
        newState ? `> CPU Profiling ENABLED: --cpu-prof-name ${profName}` : '> CPU Profiling DISABLED.',
        ...prev
    ]);
  };

  const cliCommand = `bun --cpu-prof ${cpuProfiling ? `--cpu-prof-name "${profName}" --cpu-prof-dir "${profDir}"` : ''} sync.ts`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orchestrator Visualizer */}
        <div className="lg:col-span-8 glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[550px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent)] pointer-events-none"></div>
          <div className="absolute top-4 left-4 flex gap-2">
             <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                Bun v1.3.2 Standard
             </div>
             <div className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                Immutable Layers
             </div>
          </div>
          
          <div className="relative z-10 w-full flex flex-col items-center">
             <div className="text-center mb-10">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Federation Hub Controller</h3>
                <div className="flex items-center justify-center gap-4 mt-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Binary Parity Orchestration</p>
                    <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest italic">Hub Status: Operational</p>
                </div>
             </div>

             <div className="flex items-center justify-center w-full gap-8 md:gap-16">
                {/* Source: Hyper-Bun */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className={`w-28 h-28 rounded-[2.5rem] bg-indigo-600 shadow-2xl shadow-indigo-600/40 flex items-center justify-center border-2 transition-all duration-500 ${syncState.policies === 'syncing' ? 'border-emerald-400 animate-pulse scale-105' : 'border-white/20'}`}>
                    <Network size={48} className="text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Hyper-Bun Hub</span>
                    <div className="flex flex-col items-center mt-1">
                        <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter">configVersion: {configVersion}</span>
                        {cpuProfiling && <span className="text-[8px] text-emerald-500 font-mono animate-pulse">PROFILER ATTACHED</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                   <div className="flex items-center relative">
                      <div className="w-16 h-[2px] bg-gradient-to-r from-indigo-500 via-emerald-500 to-sky-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                      <div className={`absolute left-1/2 -translate-x-1/2 p-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-10 ${syncState.aws === 'syncing' || syncState.gcp === 'syncing' ? 'animate-spin' : ''}`}>
                        <ArrowRightLeft size={16} className="text-emerald-500" />
                      </div>
                   </div>
                   <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">TLS 1.3 Handshake</span>
                </div>

                {/* Cloud Targets */}
                <div className="flex flex-col gap-4">
                  <div className={`p-4 rounded-2xl border transition-all duration-500 group cursor-default ${syncState.aws === 'synced' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${syncState.aws === 'synced' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                        <Cloud size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 block uppercase tracking-tight">AWS ECR</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-slate-500">Immutable</span>
                            {syncState.aws === 'synced' && <CheckCircle2 size={10} className="text-emerald-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border transition-all duration-500 group cursor-default ${syncState.gcp === 'synced' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${syncState.gcp === 'synced' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                        <Server size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 block uppercase tracking-tight">GCP AR</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-slate-500">Isolated</span>
                            {syncState.gcp === 'synced' && <CheckCircle2 size={10} className="text-emerald-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          <div className="mt-12 w-full glass-panel bg-black/40 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-inner">
             <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-2">
                <TerminalIcon size={14} className="text-indigo-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CLI Execution Preview</span>
             </div>
             <code className="text-xs font-mono text-emerald-400 break-all selection:bg-emerald-500/30">
                {cliCommand}
             </code>
          </div>

          <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Lockfile</span>
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">v{configVersion} Standard</div>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint size={14} className="text-sky-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Integrity</span>
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">SHA-256</div>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Microscope size={14} className="text-amber-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Profiling</span>
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{cpuProfiling ? '.cpu-prof Active' : 'Idle'}</div>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-indigo-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Security</span>
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">IAM Federated</div>
             </div>
          </div>
        </div>

        {/* Control & Logs Panel */}
        <div className="lg:col-span-4 space-y-4 flex flex-col h-full">
           <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 shadow-xl">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Control Plane</h4>
              
              <div className="space-y-3">
                  <button 
                    onClick={() => runSync('policies')}
                    disabled={syncState.policies === 'syncing'}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {syncState.policies === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> : <Link size={16} />}
                    Sync UI Policies
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => runSync('aws')}
                      disabled={syncState.aws === 'syncing'}
                      className="py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <RefreshCw size={12} className={syncState.aws === 'syncing' ? 'animate-spin' : ''} />
                      AWS ECR
                    </button>
                    <button 
                      onClick={() => runSync('gcp')}
                      disabled={syncState.gcp === 'syncing'}
                      className="py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <RefreshCw size={12} className={syncState.gcp === 'syncing' ? 'animate-spin' : ''} />
                      GCP AR
                    </button>
                  </div>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1"></div>

              {/* Advanced Profiler Config */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">CPU Wall-time Profiler</span>
                        <span className="text-[9px] text-slate-500 font-bold">--cpu-prof v1.3.2</span>
                    </div>
                    <button 
                        onClick={toggleProfiler}
                        className={`p-1.5 rounded-xl border transition-all ${cpuProfiling ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                    >
                        {cpuProfiling ? <Activity size={20} className="animate-pulse" /> : <PlayCircle size={20} />}
                    </button>
                </div>

                {cpuProfiling && (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <FileCode size={10} /> Output Filename
                            </label>
                            <input 
                                type="text"
                                value={profName}
                                onChange={(e) => setProfName(e.target.value)}
                                placeholder="filename.cpuprofile"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <FolderOpen size={10} /> Output Directory
                            </label>
                            <input 
                                type="text"
                                value={profDir}
                                onChange={(e) => setProfDir(e.target.value)}
                                placeholder="./profiles"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Lockfile configVersion</span>
                        <span className="text-[9px] text-slate-500 font-bold">v0=Hoisted | v1=Isolated</span>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => setConfigVersion(0)}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${configVersion === 0 ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                        >
                            v0
                        </button>
                        <button 
                            onClick={() => setConfigVersion(1)}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${configVersion === 1 ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                        >
                            v1
                        </button>
                    </div>
                </div>
           </div>

           {/* Profile Gallery */}
           <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-xl">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                 <Microscope size={14} className="text-amber-500" /> Generated Profiles
              </h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar pr-1">
                 {profiles.map(p => (
                    <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                       <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-500">
                             <FileCode size={14} />
                          </div>
                          <div>
                             <div className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{p.name}</div>
                             <div className="text-[8px] text-slate-500 font-mono">{p.timestamp} • {p.size}</div>
                          </div>
                       </div>
                       <button className="p-1.5 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-emerald-500">
                          <Download size={12} />
                       </button>
                    </div>
                 ))}
                 {profiles.length === 0 && (
                    <div className="text-center py-4 text-[10px] text-slate-500 italic">No profiles generated yet.</div>
                 )}
              </div>
           </div>

           <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col flex-1 shadow-2xl min-h-[180px]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <TerminalIcon size={14} className="text-indigo-500" /> Orchestration Log
                 </span>
                 <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Activity size={12} className="text-emerald-500" />
                 </div>
              </div>
              <div className="flex-1 bg-black p-5 font-mono text-[10px] text-indigo-400/90 overflow-y-auto selection:bg-indigo-500/20 scrollbar-thin">
                 {logs.map((log, i) => (
                    <div key={i} className={`mb-1.5 leading-tight flex gap-3 ${log.includes('SUCCESS') ? 'text-emerald-400 font-black' : log.includes('[PROFILER]') ? 'text-amber-400' : ''}`}>
                      <span className="text-slate-700 select-none w-4 text-right italic opacity-50">{logs.length - i}</span>
                      <span className="flex-1">{log}</span>
                    </div>
                 ))}
                 <div className="animate-pulse inline-block w-2 h-3 bg-indigo-500/50"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
