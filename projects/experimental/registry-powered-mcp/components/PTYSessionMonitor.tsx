
import React, { useState, useEffect } from 'react';
import { Terminal, Wifi, Globe, Clock, Zap, ExternalLink, ShieldCheck } from 'lucide-react';

interface PTYSession {
  id: string;
  user: string;
  program: string;
  pop: string;
  uptime: string;
  latency: string;
  status: 'active' | 'idle' | 'terminating';
}

const INITIAL_SESSIONS: PTYSession[] = [
  { id: 'pts/0', user: 'root', program: 'bash', pop: 'ORD-1', uptime: '42m 12s', latency: '8ms', status: 'active' },
  { id: 'pts/1', user: 'admin', program: 'vim', pop: 'SFO-1', uptime: '1h 04m', latency: '4ms', status: 'active' },
  { id: 'pts/4', user: 'deploy', program: 'htop', pop: 'LHR-1', uptime: '12m 05s', latency: '12ms', status: 'idle' },
];

export const PTYSessionMonitor: React.FC = () => {
  const [sessions, setSessions] = useState<PTYSession[]>(INITIAL_SESSIONS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev => prev.map(s => {
        if (Math.random() > 0.9) {
          return {
            ...s,
            latency: (parseInt(s.latency) + (Math.random() > 0.5 ? 1 : -1)) + 'ms',
          };
        }
        return s;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full shadow-xl">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
            <Terminal size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">PTY Bridge Monitor</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Active Durable Sessions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-emerald-500 animate-pulse font-bold">● LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-900">
            <tr>
              <th className="px-4 py-3">TTY</th>
              <th className="px-2 py-3">Prog</th>
              <th className="px-2 py-3">PoP</th>
              <th className="px-2 py-3">Ping</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-indigo-500/5 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 font-mono">{session.id}</span>
                    <span className="text-[9px] text-slate-500 italic">{session.user}</span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                    session.program === 'vim' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                    session.program === 'bash' ? 'text-sky-500 border-sky-500/20 bg-sky-500/5' :
                    'text-amber-500 border-amber-500/20 bg-amber-500/5'
                  }`}>
                    {session.program}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1.5">
                    <Globe size={10} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500">{session.pop}</span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">{session.latency}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100">
                    <ExternalLink size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Handshake Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={10} className="text-amber-500" />
          <span className="text-[9px] font-mono text-slate-600">85ns DISPATCH</span>
        </div>
      </div>
    </div>
  );
};
