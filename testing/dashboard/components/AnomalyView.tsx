import React, { useState, useEffect } from 'react';

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  threshold: number;
  actual: number;
  recommendation: string;
}

/**
 * 🚨 Real-time Anomaly Dashboard Component
 * Displays active system violations and AI-driven recommendations.
 */
export const AnomalyView: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = async () => {
    try {
      const response = await fetch('/api/anomalies');
      const data = await response.json();
      if (data.success) {
        setAnomalies(data.anomalies);
      }
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && anomalies.length === 0) {
    return <div className="text-gray-500 animate-pulse text-sm">Scanning for anomalies...</div>;
  }

  if (anomalies.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-green-900/30 p-4 rounded-lg flex items-center">
        <span className="text-green-500 mr-3 text-xl">✅</span>
        <div>
          <p className="text-green-400 font-bold text-sm">System Healthy</p>
          <p className="text-gray-500 text-xs mt-1">No active anomalies or violations detected in the last scan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center">
        <span className="text-red-500 mr-2 animate-ping">●</span> Active Anomalies
      </h3>
      
      {anomalies.map((anomaly, idx) => (
        <div 
          key={idx} 
          className={`p-4 rounded-lg border shadow-xl transition-all duration-300 ${
            anomaly.severity === 'critical' ? 'bg-red-900/20 border-red-500/50' : 
            anomaly.severity === 'high' ? 'bg-orange-900/20 border-orange-500/50' : 
            'bg-yellow-900/20 border-yellow-500/50'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                   anomaly.severity === 'critical' ? 'bg-red-600 text-white' : 
                   anomaly.severity === 'high' ? 'bg-orange-600 text-white' : 
                   'bg-yellow-600 text-black'
                }`}>
                  {anomaly.severity}
                </span>
                <span className="text-white font-bold">{anomaly.type}</span>
              </div>
              <p className="text-gray-400 text-xs mt-2 font-mono">
                Metric: <span className="text-white">{anomaly.metric}</span> | 
                Actual: <span className="text-red-400">{anomaly.actual}</span> | 
                Threshold: <span className="text-gray-500">{anomaly.threshold}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 bg-black/40 p-3 rounded border border-white/5">
            <p className="text-xs text-blue-300 flex items-start">
              <span className="mr-2">💡</span>
              <span className="font-medium">Recommendation: {anomaly.recommendation}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
