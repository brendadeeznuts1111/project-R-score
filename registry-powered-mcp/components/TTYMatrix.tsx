
import React from 'react';
import { Terminal, Box, Globe, Cpu, CheckCircle2, Zap, Layers } from 'lucide-react';
import { TTY_ECOSYSTEM } from '../constants';

export const TTYMatrix: React.FC = () => {
  return (
    <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col shadow-2xl">
      <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Terminal size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">TTY Program Ecosystem</h3>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">v2.3.0 Native PTY Overlays</p>
          </div>
        </div>
        <div className="flex gap-2">
            <span className="text-[10px] bg-sky-500/10 text-sky-600 px-2 py-1 rounded border border-sky-500/20 font-bold">WEBSOCKET BRIDGE ACTIVE</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100/50 dark:bg-slate-900/30 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Program</th>
              <th className="px-6 py-4">Features</th>
              <th className="px-6 py-4">MCP Integration</th>
              <th className="px-6 py-4">Performance</th>
              <th className="px-6 py-4">Cloudflare Arch</th>
              <th className="px-6 py-4 text-center">Docker</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
            {TTY_ECOSYSTEM.map((item, idx) => (
              <tr key={idx} className="hover:bg-emerald-500/5 transition-colors group">
                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 font-mono flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  {item.program}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">{item.features}</td>
                <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/10">
                        {item.integration}
                    </span>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-emerald-600 dark:text-emerald-400 italic">
                    <div className="flex items-center gap-1">
                        <Zap size={10} /> {item.performance}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Layers size={12} className="text-sky-500" />
                        {item.cloudflare}
                    </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    {item.docker && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> VERIFIED
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-black/90 text-emerald-500 font-mono text-[10px] border-t border-slate-800">
        <span className="animate-pulse">></span> SYNC_COMPLETE: All TTY programs mapped to v2.3.0-DurableObjects bridge.
      </div>
    </div>
  );
};
