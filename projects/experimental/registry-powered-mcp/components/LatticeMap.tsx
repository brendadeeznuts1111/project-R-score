
import React, { useState, useEffect } from 'react';
import { Globe, Shield, Zap, Activity, Info, Map as MapIcon, Wifi, RefreshCw, Layers } from 'lucide-react';

interface PopNode {
  id: string;
  name: string;
  coords: [number, number]; // [x, y] percentage
  status: 'online' | 'warning' | 'critical';
  latency: string;
  load: string;
}

const NODES: PopNode[] = [
  { id: 'SFO-1', name: 'San Francisco', coords: [15, 35], status: 'online', latency: '4ms', load: '12%' },
  { id: 'IAD-1', name: 'Washington DC', coords: [28, 38], status: 'online', latency: '8ms', load: '45%' },
  { id: 'LHR-1', name: 'London', coords: [48, 25], status: 'online', latency: '12ms', load: '22%' },
  { id: 'FRA-1', name: 'Frankfurt', coords: [52, 28], status: 'warning', latency: '22ms', load: '88%' },
  { id: 'HND-1', name: 'Tokyo', coords: [85, 38], status: 'online', latency: '5ms', load: '18%' },
  { id: 'SIN-1', name: 'Singapore', coords: [78, 65], status: 'online', latency: '9ms', load: '31%' },
  { id: 'SYD-1', name: 'Sydney', coords: [88, 85], status: 'online', latency: '15ms', load: '10%' },
  { id: 'GRU-1', name: 'Sao Paulo', coords: [32, 75], status: 'online', latency: '28ms', load: '5%' },
  { id: 'BOM-1', name: 'Mumbai', coords: [70, 52], status: 'online', latency: '18ms', load: '41%' },
  { id: 'CPT-1', name: 'Cape Town', coords: [54, 82], status: 'online', latency: '35ms', load: '12%' },
];

export const LatticeMap: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<PopNode | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => (p + 1) % 100), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full min-h-[600px] shadow-2xl relative">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
            <MapIcon size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tighter italic">Global Edge Lattice v2.5</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">300 Nodes • Zero-Latency Durable Sync</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <Layers size={14} className="text-sky-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Durable Sync Active</span>
           </div>
           <div className="flex items-center gap-2">
              <RefreshCw size={14} className="text-emerald-500 animate-spin-slow" />
              <span className="text-[10px] font-mono text-emerald-500">CONSENSUS_STABLE</span>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 relative overflow-hidden group cursor-crosshair">
        {/* Abstract Lattice Mesh backdrop */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2),transparent_70%)]"></div>
            <div className="w-full h-full cyber-grid scale-150"></div>
        </div>

        {/* Sync Lines (SVG pathing) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {NODES.map((node, i) => (
             <line 
                key={i}
                x1="50%" y1="50%"
                x2={`${node.coords[0]}%`} y2={`${node.coords[1]}%`}
                stroke="url(#syncGradient)"
                strokeWidth="1"
                strokeDasharray="10 5"
                className="animate-[dash_10s_linear_infinite] opacity-20"
             />
          ))}
          <defs>
            <linearGradient id="syncGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Nodes */}
        {NODES.map((node) => (
          <div 
            key={node.id}
            onMouseEnter={() => setHoveredNode(node)}
            onMouseLeave={() => setHoveredNode(null)}
            className="absolute z-20 group/node transition-all duration-300"
            style={{ left: `${node.coords[0]}%`, top: `${node.coords[1]}%` }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
                <div className={`absolute -inset-6 rounded-full transition-all duration-1000 ${node.status === 'warning' ? 'bg-amber-500/20' : 'bg-indigo-500/10'} ${pulse % 20 === 0 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}></div>
                <div className={`w-4 h-4 rounded-full border-2 border-white/20 transition-all group-hover/node:scale-150 group-hover/node:shadow-[0_0_20px_rgba(99,102,241,0.8)] ${node.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            </div>
          </div>
        ))}

        {/* Enhanced Tooltip */}
        {hoveredNode && (
          <div 
            className="absolute z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{ left: `${hoveredNode.coords[0]}%`, top: `${hoveredNode.coords[1]}%`, transform: 'translate(20px, -50%)' }}
          >
            <div className="glass-panel bg-slate-900/95 border border-indigo-500/50 p-5 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] min-w-[240px] backdrop-blur-2xl">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">{hoveredNode.id} • EDGE_CORE</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${hoveredNode.status === 'warning' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white'}`}>
                        {hoveredNode.status}
                    </span>
                  </div>
               </div>
               <h4 className="text-lg font-black text-white mb-5 tracking-tight italic">{hoveredNode.name}</h4>
               
               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Edge Latency</span>
                      <span className="text-emerald-400 font-mono font-bold">{hoveredNode.latency}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Durable Cache</span>
                      <span className="text-indigo-400 font-mono font-bold">SYNC_OK</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">System Load</span>
                      <span className={hoveredNode.status === 'warning' ? 'text-amber-400' : 'text-sky-400'}>{hoveredNode.load}</span>
                  </div>
                  <div className="pt-3 mt-1 border-t border-white/10 flex items-center gap-3">
                      <Wifi size={12} className="text-indigo-500" />
                      <span className="text-[10px] text-slate-500 font-mono font-medium">BUN_SERVE:1.2.4</span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* PoP Heat Panel */}
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-black/60 backdrop-blur-xl flex items-center gap-4 shadow-2xl">
                <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                    <Activity size={20} className="text-white" />
                </div>
                <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consensus Rate</div>
                    <div className="text-xl font-black text-white italic tracking-tighter">99.98% STABLE</div>
                </div>
            </div>
        </div>

        {/* Global Topology Legend */}
        <div className="absolute bottom-6 right-6 z-20 w-56 glass-panel p-5 rounded-3xl border border-white/5 bg-black/60 backdrop-blur-xl shadow-2xl">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Layers size={14} className="text-indigo-500" /> Topology Breakdown
            </h4>
            <div className="space-y-4">
                {[
                    { label: 'AMER', count: 120, health: 100 },
                    { label: 'EMEA', count: 85, health: 98 },
                    { label: 'APAC', count: 95, health: 100 },
                ].map(reg => (
                    <div key={reg.label} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black">
                            <span className="text-slate-400">{reg.label} ({reg.count} Nodes)</span>
                            <span className="text-emerald-500">{reg.health}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${reg.health}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-10 z-20">
         <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-2 uppercase tracking-widest font-black">
                <Zap size={14} /> DO-SYNC-PULSE: v2.5.1
            </span>
            <div className="h-4 w-px bg-slate-800"></div>
            <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-black">
                PROTOCOL: TLS 1.3 / QUIC-ENABLED
            </span>
         </div>
         <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest italic font-bold">
            Hyper-Scaled Edge Architecture (No-Cold-Start Region: ORD-1)
         </span>
      </div>
    </div>
  );
};
