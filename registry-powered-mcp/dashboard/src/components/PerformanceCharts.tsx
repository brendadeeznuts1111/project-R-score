
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: '00:00', latency: 12, reqs: 2400 },
  { name: '04:00', latency: 15, reqs: 1398 },
  { name: '08:00', latency: 28, reqs: 9800 },
  { name: '12:00', latency: 45, reqs: 15000 },
  { name: '16:00', latency: 32, reqs: 12000 },
  { name: '20:00', latency: 20, reqs: 8000 },
  { name: '23:59', latency: 14, reqs: 4000 },
];

export const PerformanceCharts: React.FC = () => {
  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-200/50 dark:border-slate-800/50 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        Traffic & Latency
      </h3>
      <div className="flex-1 w-full min-h-[250px] relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
            />
            <Area type="monotone" dataKey="reqs" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReqs)" />
            <Area type="monotone" dataKey="latency" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorLatency)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
