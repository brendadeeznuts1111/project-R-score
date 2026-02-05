
import React, { useEffect, useState, useRef } from 'react';
import { Sparkline } from './Sparkline';
import { ShieldCheck, Zap, Activity, Box, Sparkles, Globe, BarChart3 } from 'lucide-react';
import { EnhanceWithAIButton } from './EnhanceWithAIButton';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  secondaryValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'sky' | 'amber' | 'emerald' | 'purple' | 'rose' | 'indigo';
  sparklineData?: number[];
  variant?: 'default' | 'jitter' | 'mesh' | 'parser' | 'kernel' | 'oscilloscope';
  rawValue?: number;
  footerTags?: string[];
  /** Enable AI enhancement button */
  enableAI?: boolean;
  /** Additional context for AI analysis */
  aiContext?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subValue,
  secondaryValue,
  icon,
  trend,
  color = 'sky',
  sparklineData,
  variant = 'default',
  rawValue = 0,
  footerTags = [],
  enableAI = false,
  aiContext,
}) => {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [nanoTime, setNanoTime] = useState(0);
  const [wavePos, setWavePos] = useState(0);
  
  const theme = {
    sky: { border: 'border-sky-500/20', bg: 'bg-sky-500/5', text: 'text-sky-500 dark:text-sky-400', glow: 'shadow-sky-500/10', hex: '#38bdf8' },
    amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-500 dark:text-amber-400', glow: 'shadow-amber-500/10', hex: '#fbbf24' },
    emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-500 dark:text-emerald-400', glow: 'shadow-emerald-500/10', hex: '#34d399' },
    purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/5', text: 'text-purple-500 dark:text-purple-400', glow: 'shadow-purple-500/10', hex: '#a78bfa' },
    rose: { border: 'border-rose-500/20', bg: 'bg-rose-500/5', text: 'text-rose-500 dark:text-rose-400', glow: 'shadow-rose-500/10', hex: '#fb7185' },
    indigo: { border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', text: 'text-indigo-500 dark:text-indigo-400', glow: 'shadow-indigo-500/10', hex: '#6366f1' },
  };

  const t = theme[color as keyof typeof theme] || theme.sky;

  useEffect(() => {
    if (variant === 'mesh') {
      const interval = setInterval(() => {
        const nodes = Array.from({ length: 5 }, () => Math.floor(Math.random() * 20));
        setActiveNodes(nodes);
      }, 2000);
      return () => clearInterval(interval);
    }
    if (variant === 'oscilloscope') {
        const interval = setInterval(() => setWavePos(p => (p + 1) % 100), 50);
        return () => clearInterval(interval);
    }
  }, [variant]);

  useEffect(() => {
    if (variant === 'kernel') {
        let frame: number;
        const update = () => {
            setNanoTime(prev => (prev + 13) % 999);
            frame = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(frame);
    }
  }, [variant]);

  return (
    <div className={`
        relative overflow-hidden rounded-2xl border ${t.border} ${t.bg} 
        backdrop-blur-md p-6 transition-all duration-500 
        hover:scale-[1.03] hover:shadow-2xl ${t.glow} hover:border-opacity-100
        group h-full flex flex-col justify-between
    `}>
      {variant === 'oscilloscope' && (
          <div className="absolute inset-x-0 bottom-0 h-12 opacity-10 pointer-events-none">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                  <path 
                    d={`M0 10 Q 25 ${10 + Math.sin(wavePos/10)*10} 50 10 T 100 10`} 
                    stroke="currentColor" 
                    strokeWidth="0.5" 
                    fill="none" 
                    className={t.text} 
                  />
              </svg>
          </div>
      )}

      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="z-10">
             <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1.5 tracking-[0.2em] uppercase flex items-center gap-2 italic">
                {title}
                {variant === 'oscilloscope' && <BarChart3 size={12} className="text-indigo-400 animate-pulse" />}
             </h3>
             <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic telemetry-value">
                    {value}
                    {variant === 'kernel' && <span className="text-xs font-mono text-slate-500 opacity-40">.{nanoTime.toString().padStart(3, '0')}ns</span>}
                </span>
                {subValue && variant !== 'mesh' && <span className="text-[10px] font-mono font-bold opacity-60 text-slate-500 dark:text-slate-400">{subValue}</span>}
              </div>
              
              {variant === 'parser' && (
                  <div className="mt-3 w-full max-w-[160px]">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-tighter">
                          <span className={`${t.text} tracking-widest`}>{value}</span>
                          <span>{footerTags[0]?.split(':')[1]?.trim() || '128MB'} CAP</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${t.text.replace('text', 'bg')} transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]`}
                            style={{ width: `${Math.min(100, (rawValue / (parseInt(footerTags[0]?.split(':')[1]) || 128)) * 100)}%` }}
                          ></div>
                      </div>
                      <div className={`text-[9px] font-black ${t.text} mt-1.5 uppercase tracking-widest italic`}>Pressure: {rawValue > 90 ? 'Critical' : rawValue > 60 ? 'Active' : 'Nominal'}</div>
                  </div>
              )}

              {variant === 'mesh' && (
                  <div className="flex gap-1.5 flex-wrap w-28 mt-3 opacity-90">
                      {Array.from({length: 20}).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-2 h-2 rounded-sm transition-all duration-500 ${activeNodes.includes(i) ? 'bg-emerald-400 rotate-45 scale-125 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-slate-800'}`} 
                          />
                      ))}
                  </div>
              )}

              {secondaryValue && variant !== 'parser' && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${color === 'rose' ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{secondaryValue}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`
              p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${t.text}
              shadow-xl dark:shadow-none group-hover:scale-110 transition-transform relative group-hover:rotate-6 z-10
            `}>
                {icon}
                {variant === 'mesh' && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>}
            </div>
            {enableAI && (
              <EnhanceWithAIButton
                title={title}
                context={aiContext || `Metric: ${title}\nValue: ${value}\nTrend: ${trend || 'neutral'}\nRaw Value: ${rawValue}\nTags: ${footerTags.join(', ')}`}
                size="sm"
                variant="subtle"
              />
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-end mt-4 relative z-0">
         <div className="flex flex-col gap-1.5">
             {trend && variant !== 'mesh' && (
                <div className="flex items-center gap-2 text-[10px] font-black">
                    <span className={`
                        flex items-center gap-1.5 px-2 py-0.5 rounded-lg border
                        ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : trend === 'down' ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20'}
                    `}>
                        {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '•'} 
                    </span>
                    {variant === 'jitter' && trend === 'down' && <span className="text-emerald-500 text-[10px] animate-pulse font-black tracking-widest uppercase">SYSCALL_FAST</span>}
                </div>
              )}
              
              {footerTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                      {footerTags.map((tag, i) => (
                          <span key={i} className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 whitespace-nowrap uppercase tracking-tighter">
                              {tag}
                          </span>
                      ))}
                  </div>
              )}
         </div>
          
          {sparklineData && variant !== 'oscilloscope' && (
             <div className="absolute right-0 bottom-0 opacity-60 group-hover:opacity-100 transition-opacity">
                 <Sparkline 
                    data={sparklineData} 
                    color={t.hex} 
                    width={100} 
                    height={40} 
                />
             </div>
          )}
      </div>
    </div>
  );
};
