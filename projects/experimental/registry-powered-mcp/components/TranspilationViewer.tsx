
import React, { useState, useEffect } from 'react';
import { FileCode, ArrowRight, Zap, Settings, Code, FileJson, Layers, Cpu, Check, Play } from 'lucide-react';

const PRESETS = {
  typescript: {
    label: 'TypeScript (TSX)',
    loader: 'tsx',
    input: `import { type User } from "./types";

interface Props {
  user: User;
  isActive?: boolean;
}

export const UserBadge = ({ user, isActive = false }: Props) => {
  const label: string = isActive ? "Active" : "Offline";
  return (
    <div className="badge">
      <span className="status">{label}</span>
      {user.name}
    </div>
  );
};`,
    output: `import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

export const UserBadge = ({ user, isActive = false }) => {
  const label = isActive ? "Active" : "Offline";
  return _jsxs("div", {
    className: "badge",
    children: [_jsx("span", {
      className: "status",
      children: label
    }), user.name]
  });
};`
  },
  dce: {
    label: 'Dead Code Elimination',
    loader: 'js',
    input: `export function app() {
  if (process.env.NODE_ENV === 'production') {
    return initProd();
  } else {
    // This branch removed when define: { "process.env.NODE_ENV": "production" }
    return initDev();
  }
}

if (false) {
  console.log("This is removed entirely");
}`,
    output: `export function app() {
  return initProd();
}`
  },
  macros: {
    label: 'Bun Macros',
    loader: 'tsx',
    input: `// Import runs at build-time
import { random } from './utils/random.ts' with { type: 'macro' };

export const CONFIG = {
  id: random(), // Replaced with static value
  timestamp: Date.now()
};`,
    output: `export const CONFIG = {
  id: "a1b2-c3d4-e5f6", 
  timestamp: Date.now()
};`
  }
};

export const TranspilationViewer: React.FC = () => {
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS>('typescript');
  const [isMinified, setIsMinified] = useState(false);
  const [latency, setLatency] = useState('0.12ms');
  const [isTranspiling, setIsTranspiling] = useState(false);

  useEffect(() => {
    // Simulate ultra-fast transpilation on preset change
    setIsTranspiling(true);
    const timeout = setTimeout(() => {
        setIsTranspiling(false);
        setLatency((Math.random() * 0.2 + 0.05).toFixed(2) + 'ms');
    }, 150);
    return () => clearTimeout(timeout);
  }, [activePreset, isMinified]);

  const currentOutput = isMinified 
    ? PRESETS[activePreset].output.replace(/\s+/g, ' ').trim() 
    : PRESETS[activePreset].output;

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
            <FileCode size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                Native Transpiler
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Bun.Transpiler</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">TS • JSX • Macros • DCE</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
                <button
                    key={key}
                    onClick={() => setActivePreset(key)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                        activePreset === key 
                        ? 'bg-indigo-500 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                    {PRESETS[key].label}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 bg-slate-50 dark:bg-black/20 p-6">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Input Pane */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Code size={12} /> Source
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                        loader: {PRESETS[activePreset].loader}
                    </span>
                </div>
                <div className="relative group flex-1">
                    <div className="absolute inset-0 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner"></div>
                    <pre className="relative z-10 p-4 font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 overflow-x-auto h-[300px]">
                        {PRESETS[activePreset].input}
                    </pre>
                </div>
            </div>

            {/* Output Pane */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={12} /> Transpiled Output
                    </span>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Minify</span>
                            <div 
                                onClick={() => setIsMinified(!isMinified)}
                                className={`w-6 h-3 rounded-full relative transition-colors ${isMinified ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform ${isMinified ? 'left-3.5' : 'left-0.5'}`}></div>
                            </div>
                        </label>
                    </div>
                </div>
                <div className="relative group flex-1">
                    <div className="absolute inset-0 bg-slate-900 rounded-xl border border-slate-800 shadow-inner flex flex-col">
                        <pre className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-x-auto h-[300px] scrollbar-thin">
                            {isTranspiling ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2 animate-pulse">
                                        <Zap size={24} className="text-amber-500" />
                                        <span className="text-xs font-bold text-slate-500">Optimizing AST...</span>
                                    </div>
                                </div>
                            ) : (
                                currentOutput
                            )}
                        </pre>
                        
                        <div className="p-3 border-t border-white/5 bg-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <Cpu size={10} /> Zig Native
                                </span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <FileJson size={10} /> Zero-Copy
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {latency}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};
