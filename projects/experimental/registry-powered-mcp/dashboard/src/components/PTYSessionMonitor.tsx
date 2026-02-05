
import React, { useState, useEffect } from 'react';
import { Terminal, Globe, Zap, ExternalLink, ShieldCheck, Activity, Lock, Cpu } from 'lucide-react';

interface PTYSession {
  id: string;
  user: string;
  program: string;
  pop: string;
  uptime: string;
  latency: string;
  status: 'active' | 'idle' | 'syncing';
  protocol: string;
}

const INITIAL_SESSIONS: PTYSession[] = [
  { id: 'pts/0', user: 'admin', program: 'bash', pop: 'ORD-1', uptime: '42m 12s', latency: '8ms', status: 'active', protocol: 'ANSI/VT100' },
  { id: 'pts/1', user: 'root', program: 'vim', pop: 'SFO-1', uptime: '1h 04m', latency: '4ms', status: 'active', protocol: 'xterm-256color' },
  { id: 'pts/4', user: 'deploy', program: 'htop', pop: 'LHR-1', uptime: '12m 05s', latency: '12ms', status: 'syncing', protocol: 'ANSI' },
  { id: 'pts/9', user: 'dev_bot', program: 'bun-lsp', pop: 'HND-1', uptime: '02m 45s', latency: '6ms', status: 'active', protocol: 'MCP-v2' },
];

export const PTYSessionMonitor: React.FC = () => {
  const [sessions, setSessions] = useState<PTYSession[]>(INITIAL_SESSIONS);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      setSessions(prev => prev.map(s => {
        if (Math.random() > 0.8) {
          const baseLat = parseInt(s.latency);
          const jitter = Math.random() > 0.5 ? 1 : -1;
          return {
            ...s,
            latency: Math.max(2, baseLat + jitter) + 'ms',
          };
        }
        return s;
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full shadow-xl relative group">
      {/* Handshake Scanner Overlay Effect */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/20 animate-[scan_4s_linear_infinite] pointer-events-none z-0"></div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 ring-1 ring-indigo-500/20 shadow-inner">
            <Terminal size={18} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">PTY Bridge Control</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
              Durable Object Sync Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-indigo-400 font-black bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">v2.5_PROT</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar z-10">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white dark:bg-slate-950 z-20 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-900">
            <tr>
              <th className="px-4 py-3">TTY / Identity</th>
              <th className="px-2 py-3">Module</th>
              <th className="px-2 py-3">PoP</th>
              <th className="px-2 py-3">Latency</th>
              <th className="px-4 py-3 text-right">Handshake</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-900/30">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-indigo-500/[0.03] transition-colors group/row">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 font-mono tracking-tighter">
                            {session.id}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 opacity-50">{session.protocol}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 italic flex items-center gap-1">
                        <Lock size={8} className="text-slate-400" /> {session.user}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shadow-sm ${
                    session.program === 'vim' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                    session.program === 'bash' ? 'text-sky-500 border-sky-500/20 bg-sky-500/5' :
                    session.program === 'htop' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
                    'text-indigo-500 border-indigo-500/20 bg-indigo-500/5'
                  }`}>
                    {session.program}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1.5">
                    <Globe size={10} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 tracking-tighter">{session.pop}</span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1.5">
                     <span className={`w-1 h-1 rounded-full ${parseInt(session.latency) < 10 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                     <span className="text-[10px] font-mono text-indigo-400 font-black tracking-tighter">{session.latency}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="opacity-0 group-hover/row:opacity-100 transition-opacity">
                         <button className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-indigo-500 transition-all">
                            <ExternalLink size={10} />
                         </button>
                    </div>
                    <div className={`w-2 h-2 rounded-full shadow-lg ${session.status === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-emerald-500/20'}`}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Integrity: Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-indigo-500" />
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">85ns DISPATCH</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${Math.sin(pulse/10)*50 + 50}%` }}></div>
           </div>
           <Activity size={10} className="text-indigo-400 animate-pulse" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0; opacity: 0.1; }
          50% { opacity: 0.4; }
          100% { top: 100%; opacity: 0.1; }
        }
      `}} />
    </div>
  );
};
