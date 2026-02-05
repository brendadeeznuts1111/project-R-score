
import React, { useState } from 'react';
import { FileJson, Copy, Check, Cpu, Terminal } from 'lucide-react';

interface TelemetryDebuggerProps {
  data: any;
}

export const TelemetryDebugger: React.FC<TelemetryDebuggerProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full shadow-xl">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
            <FileJson size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Telemetry Buffer</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Raw JSON Debugger</p>
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-300 ${
            copied ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 border border-transparent'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>

      <div className="flex-1 bg-black p-4 overflow-auto custom-scrollbar">
        <div className="relative group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
            <Terminal size={48} className="text-white" />
          </div>
          <pre className="text-[10px] font-mono text-amber-500/90 leading-tight selection:bg-indigo-500/30">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Cpu size={12} className="text-slate-500" />
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">30-Point Ring Buffer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[9px] font-mono text-slate-600 italic">SYSCALL_O1</span>
        </div>
      </div>
    </div>
  );
};
