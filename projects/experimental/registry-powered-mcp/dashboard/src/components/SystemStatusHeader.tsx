
import React, { useState, useEffect } from 'react';
import { Activity, Globe, Shield, Zap, AlertCircle } from 'lucide-react';

const EVENTS = [
  "SFO-1 Node: Registry lookup latency stabilized at 4.2ms",
  "Durable Object Sync: SFO -> LHR complete (28ms)",
  "WAF: Blocked potential dependency-confusion attack (Origin: HKG)",
  "MCP Runtime: Model inference context window expanded",
  "PoP Update: 12 nodes in APAC region upgraded to Bun v1.3.6",
  "DDoS: Edge mitigation active on 15 PoPs (Traffic scrubbed)",
];

export const SystemStatusHeader: React.FC = () => {
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setEventIndex(prev => (prev + 1) % EVENTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between gap-8 overflow-hidden">
      <div className="flex items-center gap-4 shrink-0">
         <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest border-r border-slate-800 pr-4">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Operational
         </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
             <Globe size={12} className="text-sky-500" />
             300 PoPs Active
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
             <Activity size={12} className="text-emerald-500" />
             Live Telemetry
          </div>
      </div>

      <div className="flex-1 flex items-center gap-3 overflow-hidden">
         <AlertCircle size={14} className="text-amber-500 shrink-0" />
         <div className="relative h-4 flex-1">
            {EVENTS.map((evt, i) => (
                <div 
                    key={i} 
                    className={`absolute inset-0 transition-all duration-700 flex items-center text-[10px] font-mono font-medium tracking-wide uppercase ${
                        i === eventIndex ? 'opacity-100 translate-y-0 text-slate-300' : 'opacity-0 -translate-y-4 text-slate-600'
                    }`}
                >
                    {evt}
                </div>
            ))}
         </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">8ms Latency</span>
          </div>
          <div className="flex items-center gap-2">
              <Shield size={14} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Hardened v2.5</span>
          </div>
      </div>
    </div>
  );
};
