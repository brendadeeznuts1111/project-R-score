
import React, { useState, useEffect } from 'react';
import { Terminal, Activity, Zap, ShieldCheck, ArrowRight, Hash } from 'lucide-react';

interface Request {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS';
  path: string;
  latency: string;
  region: string;
  status: number;
}

const REGIONS = ['ORD-1', 'SFO-1', 'LHR-1', 'FRA-1', 'HND-1', 'SIN-1'];
const PATHS = ['/mcp/registry', '/mcp/health', '/api/ai', '/pty/bash', '/graphql', '/rss/all'];
const METHODS: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS'> = ['GET', 'POST', 'WS', 'GET', 'GET'];

export const RequestStream: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newReq: Request = {
        id: Math.random().toString(36).substring(7).toUpperCase(),
        method: METHODS[Math.floor(Math.random() * METHODS.length)],
        path: PATHS[Math.floor(Math.random() * PATHS.length)],
        latency: (Math.random() * 15 + 2).toFixed(1) + 'ms',
        region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
        status: Math.random() > 0.95 ? 403 : 200
      };
      setRequests(prev => [newReq, ...prev].slice(0, 15));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} className="text-emerald-500 animate-pulse" /> Live Request Pulse
        </h3>
        <span className="text-[9px] font-mono text-slate-500">v2.4.1</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-slate-950 p-4 font-mono text-[10px] space-y-2 overflow-y-auto no-scrollbar">
            {requests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 animate-in slide-in-from-top-1 duration-300">
                    <span className={`w-8 font-black ${req.method === 'WS' ? 'text-purple-500' : 'text-sky-500'}`}>{req.method}</span>
                    <span className="flex-1 text-slate-400 truncate">{req.path}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">{req.region}</span>
                    <span className={`font-bold ${req.status === 200 ? 'text-emerald-500' : 'text-rose-500'}`}>{req.latency}</span>
                </div>
            ))}
            {requests.length === 0 && (
                <div className="h-full flex items-center justify-center italic text-slate-700">Awaiting edge handshakes...</div>
            )}
        </div>
      </div>
    </div>
  );
};
