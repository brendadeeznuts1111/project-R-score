
import React from 'react';
// Added Clock to the imports from lucide-react
import { Table, Zap, Activity, Cpu, Database, BarChart3, ShieldCheck, Gauge, Clock } from 'lucide-react';

interface PerformanceRow {
  task: string;
  p50: string;
  p99: string;
  throughput: string;
  memory: string;
  cpu: string;
  cacheHit: string;
  records: string;
  threads: number;
  score: string;
}

const MATRIX_DATA: PerformanceRow[] = [
  { task: 'Simple Filter', p50: '0.8ms', p99: '1.2ms', throughput: '1,250,000', memory: '2.1', cpu: '15', cacheHit: '98', records: '100k', threads: 8, score: '🟢 94/100' },
  { task: 'Complex Filter', p50: '2.3ms', p99: '3.5ms', throughput: '434,783', memory: '4.8', cpu: '28', cacheHit: '92', records: '100k', threads: 8, score: '🟢 89/100' },
  { task: 'Aggregation', p50: '3.7ms', p99: '5.1ms', throughput: '270,270', memory: '8.2', cpu: '35', cacheHit: '85', records: '100k', threads: 8, score: '🟡 82/100' },
  { task: 'Timeline Generation', p50: '4.2ms', p99: '6.0ms', throughput: '238,095', memory: '12.5', cpu: '42', cacheHit: '78', records: '100k', threads: 8, score: '🟡 79/100' },
  { task: 'Community Monitoring', p50: '5.8ms', p99: '8.5ms', throughput: '172,414', memory: '18.3', cpu: '51', cacheHit: '72', records: '100k', threads: 8, score: '🟡 75/100' },
  { task: 'Real-time Analytics', p50: '7.2ms', p99: '10.8ms', throughput: '138,889', memory: '24.6', cpu: '58', cacheHit: '65', records: '100k', threads: 8, score: '🟡 71/100' },
  { task: 'Cross-cluster Join', p50: '9.8ms', p99: '14.5ms', throughput: '102,041', memory: '31.2', cpu: '65', cacheHit: '58', records: '100k', threads: 8, score: '🟡 68/100' },
  { task: 'ML Inference', p50: '12.5ms', p99: '18.8ms', throughput: '80,000', memory: '42.7', cpu: '72', cacheHit: '45', records: '100k', threads: 8, score: '🔴 52/100' },
];

export const PerformanceMatrix: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-2xl animate-in fade-in duration-700">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tighter italic">High-Fidelity Analytics Matrix</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Operational Benchmarking v2.0</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Efficiency Target</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">99.4%</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4">Task Module</th>
              <th className="px-4 py-4"><span className="flex items-center gap-1"><Clock size={10}/> P50</span></th>
              <th className="px-4 py-4"><span className="flex items-center gap-1"><Gauge size={10}/> P99</span></th>
              <th className="px-4 py-4 text-right">Throughput</th>
              <th className="px-4 py-4 text-right">Mem (MB)</th>
              <th className="px-4 py-4 text-right">CPU %</th>
              <th className="px-4 py-4 text-right">Cache %</th>
              <th className="px-4 py-4 text-right">Records</th>
              <th className="px-4 py-4 text-center">Threads</th>
              <th className="px-6 py-4 text-right">Quality Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {MATRIX_DATA.map((row, idx) => (
              <tr key={idx} className="hover:bg-indigo-500/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full group-hover:scale-y-125 transition-transform"></div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{row.task}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs font-mono text-sky-500 font-bold">{row.p50}</td>
                <td className="px-4 py-4 text-xs font-mono text-purple-500 font-bold">{row.p99}</td>
                <td className="px-4 py-4 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{row.throughput} <span className="opacity-40 font-sans italic text-[8px]">ops/s</span></td>
                <td className="px-4 py-4 text-xs font-mono text-right text-amber-500">{row.memory}</td>
                <td className="px-4 py-4 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{row.cpu}</td>
                <td className="px-4 py-4 text-xs font-mono text-right text-emerald-500">{row.cacheHit}%</td>
                <td className="px-4 py-4 text-xs font-mono text-right text-slate-500">{row.records}</td>
                <td className="px-4 py-4 text-xs font-mono text-center text-indigo-400">{row.threads}</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black tracking-tighter">
                    {row.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Activity size={12} className="text-emerald-500" />
            REAL-TIME TELEMETRY STREAMING
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Database size={12} className="text-sky-500" />
            POOL: k8s-mcp-cluster-01
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Integrity Verified</span>
        </div>
      </div>
    </div>
  );
};
