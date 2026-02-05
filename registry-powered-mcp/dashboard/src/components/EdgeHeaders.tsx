
import React from 'react';
import { Terminal, ShieldCheck, Activity, Cpu } from 'lucide-react';

export const EdgeHeaders: React.FC = () => {
  const headerSpecs = [
    {
      group: "Performance & Routing",
      icon: <Activity size={16} className="text-sky-500" />,
      items: [
        { key: "X-Edge-PoP", value: "ORD-01", desc: "Target 300 Global PoPs" },
        { key: "X-Runtime-Core", value: "Bun/1.1 (v2.4.1)", desc: "SIMD-Optimized" },
        { key: "X-Router-Engine", value: "Native-URLPattern", desc: "O(1) Route Match" },
        { key: "Server-Timing", value: "edge;dur=10.8", desc: "Telemetry tracking" }
      ]
    },
    {
      group: "Security & State",
      icon: <ShieldCheck size={16} className="text-emerald-500" />,
      items: [
        { key: "X-DO-Sync-ID", value: "state_uuid_v4", desc: "Durable Object Anchor" },
        { key: "X-Registry-Auth", value: "nexus_prime_gen", desc: "Safe Prime RFC 3526" },
        { key: "X-Proxy-Status", value: "Auth-Header-Inject", desc: "Secure Edge Proxy" },
        { key: "X-Complexity", value: "O(log⁴ n)", desc: "Crypto Signature" }
      ]
    },
    {
      group: "Protocol & PTY",
      icon: <Terminal size={16} className="text-indigo-500" />,
      items: [
        { key: "Upgrade", value: "websocket", desc: "WS Bridge Transition" },
        { key: "Connection", value: "keep-alive", desc: "RFC 7230 Compliance" },
        { key: "Sec-WS-Protocol", value: "mcp-v2", desc: "ANSI/VT100 Sequence" },
        { key: "X-Buffer-Mode", value: "Zero-Copy", desc: "Pointer Guard Active" }
      ]
    }
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 mt-8">
      <div className="flex items-center gap-2 mb-6">
        <Cpu size={18} className="text-slate-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
          Edge Header Injection Strategy
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {headerSpecs.map((spec, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              {spec.icon}
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {spec.group}
              </span>
            </div>
            <div className="space-y-2">
              {spec.items.map((header, j) => (
                <div 
                  key={j} 
                  className="p-3 rounded-lg bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 group hover:border-sky-500/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <code className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                      {header.key}
                    </code>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate">
                    {header.value}
                  </div>
                  <div className="text-[9px] text-slate-400 italic mt-1">
                    // {header.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
