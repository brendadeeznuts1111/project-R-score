import React, { useState, useEffect } from 'react';

interface InsightData {
  stats: {
    healthScore: number;
    totalFiles: number;
    complexity: string;
  };
  files: Array<{
    name: string;
    health: string;
    complexity: number;
    size: number;
  }>;
}

export const CodeInsights: React.FC = () => {
  const [insights, setInsights] = useState<InsightData | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch('/api/insights');
        const data = await response.json();
        if (data.success) {
          setInsights(data.insights);
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      }
    };

    fetchInsights();
  }, []);

  if (!insights) return <div className="text-gray-500 animate-pulse">Analyzing codebase...</div>;

  return (
    <section className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-xl">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center">
        <span className="text-cyan-400 mr-2">📊</span> Codebase Insights
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-xs mb-1 uppercase font-bold tracking-widest">Health Score</p>
          <p className={`text-4xl font-black ${insights.stats.healthScore > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
            {insights.stats.healthScore}%
          </p>
        </div>
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-xs mb-1 uppercase font-bold tracking-widest">Total Files</p>
          <p className="text-4xl font-black text-blue-400">{insights.stats.totalFiles}</p>
        </div>
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-xs mb-1 uppercase font-bold tracking-widest">Structure</p>
          <p className="text-4xl font-black text-purple-400">{insights.stats.complexity}</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-gray-500 uppercase font-black mb-2 tracking-tighter">Hotspots & Complexity</p>
        {insights.files.map((file, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-800/50 rounded hover:bg-gray-800 transition-colors border-l-2 border-cyan-500">
            <div className="flex flex-col">
              <span className="text-sm font-mono text-gray-300">{file.name}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex items-center space-x-4">
               <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase">Complexity</p>
                  <p className="text-xs font-bold text-cyan-400">{file.complexity}</p>
               </div>
               <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                 file.health === 'Good' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
               }`}>
                 {file.health}
               </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
