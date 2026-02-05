import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface FeatureMatrixProps {
  features: string[];
}

export const FeatureMatrix: React.FC<FeatureMatrixProps> = ({ features }) => {
  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
          Feature Matrix
        </h3>
        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
          {features.length} ACTIVE
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {features.map((feature) => (
          <div 
            key={feature} 
            className="group flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-all hover:bg-white dark:hover:bg-slate-800/60 shadow-sm dark:shadow-none"
          >
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
              {feature.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
         {/* Simulate a disabled feature for contrast */}
         <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800/50 opacity-60">
            <Circle size={16} className="text-slate-400 dark:text-slate-600 shrink-0" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">LEGACY MODE</span>
         </div>
      </div>
    </div>
  );
};