
import React from 'react';
import { BookText, Zap, Cpu, Activity, Database, ShieldCheck, Layers, Hash, Code2, Globe, Server, Info, ArrowUpRight } from 'lucide-react';

const INFRA_MAPPING = [
  { id: 19, name: 'Blog-Config-Manager', file: 'blog/config.ts', primary: 'Bun.file() + Bun.watch()', secondary: 'Bun.parse()', pattern: 'Hot-reload config with integrity verification', tax: 'Heap: <1MB' },
  { id: 20, name: 'Static-Generator-Engine', file: 'blog/generator.ts', primary: 'Bun.build()', secondary: 'Bun.write(), Bun.spawn()', pattern: 'Parallel build pipeline with asset hashing', tax: 'CPU: 12%' },
  { id: 21, name: 'Markdown-Parser-Stream', file: 'blog/post-parser.ts', primary: 'Bun.file().stream()', secondary: 'Bun.parseSync()', pattern: 'Streaming frontmatter + content parsing', tax: 'CPU: 3%' },
  { id: 22, name: 'RSS-Feed-Compiler', file: 'blog/rss-generator.ts', primary: 'Bun.write()', secondary: 'Bun.Redis', pattern: 'Cache-stamped XML generation with atomic writes', tax: 'Heap: <500KB' },
  { id: 23, name: 'Asset-Pipeline-Processor', file: 'blog/asset-processor.ts', primary: 'Bun.file()', secondary: 'Bun.CryptoHasher', pattern: 'On-demand optimization with integrity verification', tax: 'I/O: Lazy' },
  { id: 24, name: 'Redis-Cache-Layer', file: 'blog/cache-manager.ts', primary: 'new Bun.Redis()', secondary: 'Bun.subscribe()', pattern: 'Cache-aside pattern with 15-min TTL invalidation', tax: 'Mem: 20MB' },
  { id: 25, name: 'Deploy-WebHook-Trigger', file: 'blog/webhook-deploy.ts', primary: 'Bun.serve()', secondary: 'Bun.CryptoHasher', pattern: 'Secure webhook endpoint with atomic deployment', tax: 'Net: <1KB' },
];

const API_REFERENCE = [
  { api: 'Bun.serve()', ids: [1, 2, 6, 9, 14, 25], context: 'HTTP/WebSocket foundation', sla: '10.8ms p99', notes: 'Blog webhooks use HMAC validation' },
  { api: 'new URLPattern()', ids: [1], context: 'LSP endpoint routing', sla: '<0.03ms O(1)', notes: 'No changes in v2.4.1' },
  { api: 'Bun.file()', ids: [8, 13, 14, 19, 21, 23], context: 'File I/O & streaming', sla: '<5ms read/write', notes: 'Blog uses streaming for large posts' },
  { api: 'Bun.watch()', ids: [19], context: 'File-based hot-reload', sla: '<5ms propagation', notes: 'Polling reduced 100ms→50ms' },
  { api: 'Bun.build()', ids: [20], context: 'Static site generation', sla: '150 pages/sec', notes: '76% performance improvement' },
  { api: 'Bun.write()', ids: [20, 22], context: 'Atomic file writes', sla: '0.5ms/write', notes: 'Atomic XML generation for RSS' },
  { api: 'Bun.spawn()', ids: [14, 20], context: 'Process management', sla: '<100ms spawn', notes: '8-way parallelism enabled' },
  { api: 'Bun.CryptoHasher', ids: [4, 7, 12, 16, 23, 25], context: 'HMAC/SHA operations', sla: '<0.1ms hash', notes: 'Asset/webhook integrity' },
  { api: 'Bun.Redis', ids: [10, 12, 22, 24], context: 'Streams & caching', sla: '7.9x ioredis', notes: 'RSS & cache use native client' },
  { api: 'Bun.parseSync()', ids: [21], context: 'YAML parsing', sla: '<1ms/post', notes: 'Native YAML for frontmatter' },
  { api: 'Bun.subscribe()', ids: [10, 24], context: 'PubSub channels', sla: 'Real-time sync', notes: 'Cache invalidate via PubSub' },
  { api: 'bun:test', ids: [18], context: 'Snapshot testing', sla: '99.9% pass rate', notes: 'Blog test coverage validation' },
];

export const BlogInfraMatrix: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em]">
                  <BookText size={14} /> Golden Matrix Phase II
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Blog Infrastructure: Bun Native API Mapping</h2>
              <p className="text-slate-500 text-sm max-w-xl">
                 Formal mapping of peripheral blog microservices (#19-25) to Bun native APIs. This matrix serves as the authoritative reference for implementation and compliance.
              </p>
           </div>
           <div className="flex gap-4">
               <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center min-w-[140px]">
                  <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Native Coverage</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">97.2%</div>
                  <div className="text-[10px] font-mono text-emerald-500 mt-1">Zero Shims</div>
               </div>
               <div className="glass-panel p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center min-w-[140px]">
                  <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">Efficiency</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">-14% Heap</div>
                  <div className="text-[10px] font-mono text-indigo-500 mt-1">v2.4.1 Optimized</div>
               </div>
           </div>
        </div>
      </div>

      {/* Matrix 1: Infrastructure-to-Bun-API Mapping */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Layers size={16} className="text-indigo-500" /> Infrastructure-to-API Mapping (#19-25)
            </h3>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Golden Matrix Sequence</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 uppercase text-[9px] font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4">ID</th>
                <th className="px-4 py-4">Component</th>
                <th className="px-4 py-4">Primary Bun API</th>
                <th className="px-4 py-4">Secondary APIs</th>
                <th className="px-4 py-4">Pattern</th>
                <th className="px-6 py-4 text-right">Resource Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {INFRA_MAPPING.map((row) => (
                <tr key={row.id} className="hover:bg-indigo-500/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-indigo-500">{row.id}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{row.name}</span>
                        <code className="text-[9px] text-slate-500 font-mono italic">{row.file}</code>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                        {row.primary}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[10px] text-slate-500 font-mono">{row.secondary}</td>
                  <td className="px-4 py-4 text-[10px] text-slate-600 dark:text-slate-400 font-medium">{row.pattern}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded tracking-tighter text-slate-700 dark:text-slate-300">
                        {row.tax}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matrix 2: Bun Native API Reference Matrix */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} className="text-amber-500" /> Bun Native API: Infrastructure Reference Matrix
            </h3>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Unified Cross-Reference</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 uppercase text-[9px] font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4">Bun Native API</th>
                <th className="px-4 py-4">Infrastructure IDs</th>
                <th className="px-4 py-4">Usage Context</th>
                <th className="px-4 py-4">Performance SLA</th>
                <th className="px-6 py-4">v2.4.1 Release Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {API_REFERENCE.map((row, idx) => (
                <tr key={idx} className="hover:bg-amber-500/5 transition-colors group">
                  <td className="px-6 py-4">
                    <code className="text-xs font-black text-amber-600 dark:text-amber-400">{row.api}</code>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                        {row.ids.map(id => (
                            <span key={id} className={`px-1.5 py-0.5 rounded text-[9px] font-black ${id >= 19 ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                {id}
                            </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[10px] text-slate-600 dark:text-slate-400 font-medium">{row.context}</td>
                  <td className="px-4 py-4 text-[10px] font-mono font-bold text-sky-500">{row.sla}</td>
                  <td className="px-6 py-4 text-[10px] text-slate-500 italic flex items-center gap-1.5">
                    {row.notes}
                    <ArrowUpRight size={10} className="opacity-40" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-start gap-4">
          <Info size={20} className="text-indigo-400 shrink-0" />
          <div className="space-y-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Maintainer Stability Guarantee</span>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                 "The blog infrastructure in v2.4.1 represents our most mature use of Bun's native APIs. 97.2% native coverage has eliminated all unnecessary third-party dependencies. These mappings are contractual - re-validation required for any deviation."
              </p>
          </div>
      </div>
    </div>
  );
};
