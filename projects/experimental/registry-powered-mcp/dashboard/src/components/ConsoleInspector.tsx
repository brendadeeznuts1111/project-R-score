
import React, { useState, useMemo } from 'react';
import { Box, Layers, Sliders, Code, Info } from 'lucide-react';

export const ConsoleInspector: React.FC = () => {
  const [depth, setDepth] = useState(2);
  const nested = { a: { b: { c: { d: "deep" } } } };

  const getInspectedOutput = (d: number) => {
    // Mimic Bun's console.log behavior for the demo
    if (d === 1) return `{ a: [Object] }`;
    if (d === 2) return `{ a: { b: [Object] } }`;
    if (d === 3) return `{ a: { b: { c: [Object] } } }`;
    return `{ a: { b: { c: { d: 'deep' } } } }`;
  };

  const output = useMemo(() => getInspectedOutput(depth), [depth]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl animate-in fade-in duration-500">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Object Inspection Depth</h3>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Runtime Console Primitives</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sliders size={14} /> INSPECTION DEPTH: <span className="text-amber-500">{depth}</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="4" 
              step="1" 
              value={depth} 
              onChange={(e) => setDepth(parseInt(e.target.value))}
              className="w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                <Code size={12}/> Input Object
              </span>
              <div className="p-3 bg-black/90 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 shadow-inner">
                <pre>const nested = {"{"} a: {"{"} b: {"{"} c: {"{"} d: "deep" {"}"} {"}"} {"}"} {"}"};</pre>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                <Box size={12}/> Console Output
              </span>
              <div className="p-3 bg-slate-900 rounded-xl border border-amber-500/20 font-mono text-[11px] text-amber-400 shadow-lg shadow-amber-500/5 min-h-[40px] flex items-center">
                {output}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start">
          <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed italic">
            Bun's default console inspection depth is 2. You can increase this globally in your <code className="text-amber-600 font-bold">bunfig.toml</code> or per-call using <code className="text-amber-600 font-bold">Bun.inspect(obj, {"{ depth: n }"})</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
