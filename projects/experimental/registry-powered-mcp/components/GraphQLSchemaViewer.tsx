
import React, { useState } from 'react';
import { Code2, ShieldCheck, Zap, Info, Play, Loader2, CheckCircle, ShieldAlert, FileJson, BrainCircuit, Sparkles } from 'lucide-react';

const SCHEMA_DEFINITION = `
directive @trusted(level: Int = 1) on FIELD_DEFINITION
directive @sanitized on ARGUMENT_DEFINITION

type SystemMetrics {
  uptime: Int!
  latency: Float! @trusted(level: 4)
  throughput: Int!
}

type Query {
  "Retrieve hardened registry metadata"
  registry(
    id: ID! @sanitized,
    token: String! @trusted(level: 5)
  ): RegistryData

  "Real-time telemetry from edge nodes"
  telemetry(
    region: String @sanitized
  ): [SystemMetrics] @trusted(level: 2)
}

type RegistryData {
  package: String!
  version: String!
  integrity: String!
  trustedSources: [String]!
}
`;

export const GraphQLSchemaViewer: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimulationResult(null);
    
    setTimeout(() => {
      setSimulationResult({
        data: {
          telemetry: [
            { uptime: 86400, latency: 12.4, throughput: 2450 }
          ]
        },
        extensions: {
          queryLatency: "8.42ms",
          validationStatus: "TRUSTED_ENFORCED",
          node25Compat: true,
          directivesApplied: ["@trusted", "@sanitized"],
          aiOptimized: true
        }
      });
      setIsSimulating(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Schema Definition Panel */}
        <div className="flex-1 glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Code2 size={18} className="text-sky-500" />
              Hardened GraphQL Schema
            </h3>
            <div className="flex gap-2">
                <span className="text-[10px] bg-sky-500/10 text-sky-600 px-2 py-0.5 rounded border border-sky-500/20 font-bold">NODE 25 PARITY</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">DIRECTIVES ACTIVE</span>
            </div>
          </div>
          <div className="flex-1 p-4 bg-black/95 overflow-y-auto font-mono text-xs leading-relaxed">
            <pre className="text-slate-300">
              {SCHEMA_DEFINITION.split('\n').map((line, i) => {
                const isDirective = line.includes('@');
                const isType = line.startsWith('type ') || line.startsWith('directive ');
                return (
                  <div key={i} className="group flex gap-4 hover:bg-slate-800/30 transition-colors">
                    <span className="w-8 text-slate-600 select-none text-right pr-2">{i + 1}</span>
                    <span className={`
                        ${isDirective ? 'text-emerald-400 font-bold' : ''}
                        ${isType ? 'text-purple-400' : ''}
                        ${line.includes('"') ? 'text-amber-300 italic' : ''}
                    `}>
                        {line}
                    </span>
                  </div>
                );
              })}
            </pre>
          </div>
          <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/50 text-[10px] text-slate-500 flex justify-between items-center">
            <span className="flex items-center gap-1.5"><Info size={12}/> Schema pinned to core registry primitives</span>
            <span className="font-bold">v2.2.0 BASELINE POLICY</span>
          </div>
        </div>

        {/* Validation & Simulation Panel */}
        <div className="w-full md:w-80 space-y-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Security Directives</h4>
                <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">@trusted</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Enforces Level-based credential verification at resolver entry.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/10">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap size={14} className="text-sky-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">@sanitized</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Applied to 'region' argument to filter malicious input strings.</p>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BrainCircuit size={14} /> AI Operations Insight
                </h4>
                <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-amber-500/10">
                         <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-1">
                            <Sparkles size={12} />
                            <span className="text-[10px] font-bold">Optimization Suggestion</span>
                         </div>
                         <p className="text-[10px] text-slate-500 leading-relaxed italic">
                            "AI identifies high frequency queries for region 'AMER-1'. Suggesting automatic caching layer between GraphQL and R2 storage."
                         </p>
                    </div>
                </div>
            </div>

            <button 
                onClick={runSimulation}
                disabled={isSimulating}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-sky-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
            >
                {isSimulating ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="group-hover:translate-x-1 transition-transform" />}
                {isSimulating ? 'EXECUTING PROBE...' : 'SIMULATE SECURE QUERY'}
            </button>

            {simulationResult && (
                <div className="glass-panel p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4">
                         <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Query Response</h4>
                         <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">200 OK</span>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs">
                             <CheckCircle size={14} className="text-emerald-500" />
                             <span className="text-slate-700 dark:text-slate-200">Validation: <span className="font-mono text-emerald-500">{simulationResult.extensions.validationStatus}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                             <Zap size={14} className="text-sky-500" />
                             <span className="text-slate-700 dark:text-slate-200">Latency: <span className="font-mono text-sky-500">{simulationResult.extensions.queryLatency}</span></span>
                        </div>
                        
                        <div className="p-3 bg-black/80 rounded-lg font-mono text-[10px] text-slate-300 space-y-1">
                            <div className="text-indigo-400">"extensions": &#123;</div>
                            <div className="pl-4">"queryLatency": "{simulationResult.extensions.queryLatency}",</div>
                            <div className="pl-4">"validationStatus": "TRUSTED",</div>
                            <div className="pl-4">"aiOptimized": true</div>
                            <div className="text-indigo-400">&#125;</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
               <h5 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Node 25 Type Hardening</h5>
               <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-emerald-500">ACTIVE</span>
                    <span className="text-[10px] text-slate-400">@types/node@25 parity</span>
               </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
               <h5 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Telemetry Baseline</h5>
               <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-sky-500">ESTABLISHED</span>
                    <span className="text-[10px] text-slate-400">GraphQL / AI / R2</span>
               </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
               <h5 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Protocol Support</h5>
               <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-indigo-500">AUTO</span>
                    <span className="text-[10px] text-slate-400">Bun.serve().protocol verified</span>
               </div>
          </div>
      </div>
    </div>
  );
};
