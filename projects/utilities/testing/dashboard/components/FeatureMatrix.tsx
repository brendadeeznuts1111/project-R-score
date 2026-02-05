import React, { useState, useEffect } from 'react';

interface FeatureStatus {
  id: string;
  name: string;
  enabled: boolean;
  badge: string;
  category: string;
  description: string;
  criticalLevel: string;
  logHook: string;
}

/**
 * 🛠️ Comprehensive Feature Flag Matrix Component
 * Synchronized with the status matrix and critical tracking
 */
export const FeatureMatrix: React.FC = () => {
  const [features, setFeatures] = useState<FeatureStatus[]>([]);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await fetch('/api/features');
        const data = await response.json();
        setFeatures(data.features || []);
      } catch (error) {
        console.error('Failed to fetch features:', error);
      }
    };

    fetchFeatures();
    const interval = setInterval(fetchFeatures, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/50 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🚩</span> System Configuration Matrix
        </h3>
        <div className="flex space-x-2">
            <span className="text-[10px] font-mono text-gray-400 bg-black/50 px-2 py-1 rounded border border-gray-700">
            {features.length} FLAGS ACTIVE
            </span>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-900/20 px-2 py-1 rounded border border-blue-800/50 uppercase">
            Zero-Trust Enabled
            </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-black/30 text-gray-500 uppercase text-[10px] font-black tracking-tighter">
              <th className="px-6 py-3">Feature Definition</th>
              <th className="px-6 py-3 text-center">Live Status</th>
              <th className="px-6 py-3">Critical Level</th>
              <th className="px-6 py-3">Log Hook</th>
              <th className="px-6 py-3 hidden xl:table-cell">Operation Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {features.map(feature => (
              <tr key={feature.id} className="hover:bg-blue-900/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-white font-bold tracking-tight">{feature.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{feature.category}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
                    feature.enabled 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                      : 'bg-gray-800/50 text-gray-600 border border-gray-700'
                  }`}>
                    {feature.badge}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold ${
                    feature.criticalLevel.includes('Critical') ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {feature.criticalLevel}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-[10px] bg-black/50 px-1.5 py-0.5 rounded text-purple-400 border border-purple-900/30">
                    {feature.logHook}
                  </code>
                </td>
                <td className="px-6 py-4 hidden xl:table-cell max-w-xs overflow-hidden text-ellipsis">
                  <span className="text-gray-500 text-xs italic">{feature.description}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
