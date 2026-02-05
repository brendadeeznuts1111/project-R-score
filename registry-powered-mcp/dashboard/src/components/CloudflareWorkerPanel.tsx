
import React from 'react';
import { Cloud, Zap, ArrowRight, Shield, Globe, Cpu, RefreshCw, Layers, Database, HardDrive, Lock, Filter } from 'lucide-react';

const ROUTES = [
  { path: '/api/mcp/*', target: 'mcp-core-router', status: 'verified', hits: '12.4M' },
  { path: '/pty/session/:id', target: 'pty-bridge-do', status: 'verified', hits: '2.1M' },
  { path: '/registry/sync', target: 'registry-hub-do', status: 'active', hits: '450k' },
  { path: '/webhooks/telegram', target: 'telegram-bot-handler', status: 'verified', hits: '89k' },
];

const BINDINGS = [
  { type: 'Durable Object', name: 'SESSION_SYNC', class: 'PtyBridgeDO', status: 'connected' },
  { type: 'R2 Bucket', name: 'REGISTRY_ARTIFACTS', class: 'registry-storage', status: 'active' },
  { type: 'KV Namespace', name: 'CONFIG_CACHE', class: 'edge-config', status: 'active' },
  { type: 'AI', name: 'AI', class: '@cf/meta/llama-3.1-8b', status: 'active' },
];

export const CloudflareWorkerPanel: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-500 font-black text-[10px] uppercase tracking-[0.3em]">
              <Cloud size={14} /> Edge Script Logic
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">CF_WORKER: HUB_EDGE_v2.5</h2>
            <p className="text-slate-500 text-sm max-w-xl">
              Standardized V8 Isolate executing the global lattice. Native URLPattern routing for sub-millisecond dispatch.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center min-w-[140px]">
              <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Status</div>
              <div className="text-xl font-black text-slate-800 dark:text-white uppercase italic">DEPLOYED</div>
              <div className="text-[10px] font-mono text-emerald-500 mt-1">NODE_ORD_01</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-center min-w-[140px]">
              <div className="text-[10px] font-black text-sky-600 uppercase mb-1">Runtime</div>
              <div className="text-xl font-black text-slate-800 dark:text-white uppercase italic">V8_ISOLATE</div>
              <div className="text-[10px] font-mono text-sky-500 mt-1">v2025.1.0</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="text-sky-500" /> Dynamic Edge Routing Table
              </h3>
              <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">PATTERN_MATCH: ACTIVE</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/30 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100 dark:border-slate-900">
                    <th className="px-6 py-4">Inbound Pattern</th>
                    <th className="px-4 py-4">Target Integration</th>
                    <th className="px-4 py-4">Traffic</th>
                    <th className="px-6 py-4 text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/30 font-mono text-[11px]">
                  {ROUTES.map((route, i) => (
                    <tr key={i} className="hover:bg-sky-500/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-bold text-sky-600 dark:text-sky-400">{route.path}</td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{route.target}</td>
                      <td className="px-4 py-4 text-slate-500">{route.hits} reqs</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-emerald-500">
                          <Shield size={12} />
                          <span className="font-black uppercase text-[9px]">Verified</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Lock size={18} /></div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Environment Bindings (Wrangler)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BINDINGS.map((bind, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between group hover:border-sky-500/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 group-hover:text-sky-500 transition-colors">
                      {bind.type === 'Durable Object' ? <Database size={16} /> : bind.type === 'R2 Bucket' ? <HardDrive size={16} /> : <Zap size={16} />}
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">{bind.type}</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{bind.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">{bind.class}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Zap size={20} /></div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Request Interceptor</h4>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                <div className="text-sky-500 mb-1">// router.ts</div>
                <div>export default &#123;</div>
                <div className="pl-4">async fetch(req, env) &#123;</div>
                <div className="pl-8 text-emerald-500">const url = new URL(req.url);</div>
                <div className="pl-8 text-emerald-500">if (url.pathname.startsWith("/pty")) ...</div>
                <div className="pl-4">&#125;</div>
                <div>&#125;;</div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                Optimized with 0ms cold-start latency. WAF layer executes 12-checks before script entry.
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><Filter size={18} /></div>
              <h4 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest italic">WAF Integrity</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 uppercase">Threat Scrubbing</span>
                <span className="text-rose-500">ACTIVE (Level 4)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 w-[94%]"></div>
              </div>
              <p className="text-[9px] text-slate-500 leading-tight italic">
                Scrubbing malformed WebSocket frames and PTY control sequence injections at the edge.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 flex items-center gap-4">
            <div className="p-3 bg-sky-600 rounded-xl text-white shadow-xl shadow-sky-600/20">
              <Globe size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Global Sync</div>
              <div className="text-sm font-black text-slate-800 dark:text-slate-100">DEPLOYED TO 300 POPS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
