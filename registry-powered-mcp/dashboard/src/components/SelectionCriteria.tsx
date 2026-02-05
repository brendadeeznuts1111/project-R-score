
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Scale, Shield, Zap, Maximize, UserCheck, Share2, HelpCircle, LayoutGrid, Info } from 'lucide-react';

const CRITERIA_DATA = [
  { subject: 'Cost', value: 4, fullMark: 5, description: 'Total cost of ownership' },
  { subject: 'Security', value: 5, fullMark: 5, description: 'Security and compliance requirements' },
  { subject: 'Performance', value: 3, fullMark: 5, description: 'Latency and throughput needs' },
  { subject: 'Scalability', value: 4, fullMark: 5, description: 'Ability to grow with usage' },
  { subject: 'DevExp', value: 3, fullMark: 5, description: 'Ease of use and tooling' },
  { subject: 'Integration', value: 4, fullMark: 5, description: 'Ecosystem integration capabilities' },
  { subject: 'Support', value: 2, fullMark: 5, description: 'Vendor support and community' },
  { subject: 'Features', value: 4, fullMark: 5, description: 'Required feature set' },
];

const getIcon = (subject: string) => {
  switch (subject) {
    case 'Cost': return <Scale size={16} />;
    case 'Security': return <Shield size={16} />;
    case 'Performance': return <Zap size={16} />;
    case 'Scalability': return <Maximize size={16} />;
    case 'DevExp': return <UserCheck size={16} />;
    case 'Integration': return <Share2 size={16} />;
    case 'Support': return <HelpCircle size={16} />;
    case 'Features': return <LayoutGrid size={16} />;
    default: return <Info size={16} />;
  }
};

export const SelectionCriteria: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart Visualization */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
          <div className="w-full mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Selection Matrix</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Weighted Decision Logic v1.0</p>
          </div>
          
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={CRITERIA_DATA}>
                <PolarGrid stroke="#94a3b8" strokeOpacity={0.1} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981', fontSize: '12px' }}
                />
                <Radar
                  name="Priority Weight"
                  dataKey="value"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Criteria Cards */}
        <div className="grid grid-cols-2 gap-4 h-full content-start">
          {CRITERIA_DATA.map((item) => (
            <div key={item.subject} className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500 group-hover:text-emerald-500 transition-colors">
                  {getIcon(item.subject)}
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full ${i < item.value ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-800'}`}
                    ></div>
                  ))}
                </div>
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{item.subject}</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">{item.description}</p>
            </div>
          ))}

          <div className="col-span-2 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-3">
            <Shield className="text-emerald-500 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Primary Strategy</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                "Security (5/5) and Integration (4/5) are the non-negotiables. Support (2/5) is deprioritized in favor of robust internal PTY and Edge toolchains."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
