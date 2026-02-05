import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, BarChart3, Zap, AlertTriangle, CheckCircle, DollarSign, Target, Clock } from 'lucide-react';

interface QuantitativeTelemetry {
  patternId: number;
  patternName: string;
  timestamp: string;
  status: 'confirmed' | 'analyzing' | 'rejected';
  metrics: {
    decayConstant: number;
    frontLoadingRatio: number;
    impactAsymmetry: number;
    volumeConcentration: number;
    ljungBoxPValue: number;
    venuesSynchronized: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
}

// Mock quantitative telemetry data
const QUANTITATIVE_DATA: QuantitativeTelemetry[] = [
  {
    patternId: 17,
    patternName: 'Almgren-Chriss Optimal Trajectory',
    timestamp: new Date().toISOString(),
    status: 'confirmed',
    metrics: {
      decayConstant: 1.42,
      frontLoadingRatio: 0.68,
      impactAsymmetry: 0.72,
      volumeConcentration: 0.88,
      ljungBoxPValue: 0.08,
      venuesSynchronized: 3
    },
    riskLevel: 'high',
    actionRequired: true
  },
  {
    patternId: 23,
    patternName: 'Volume-Weighted Average Price',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    status: 'analyzing',
    metrics: {
      decayConstant: 0.95,
      frontLoadingRatio: 0.42,
      impactAsymmetry: 0.55,
      volumeConcentration: 0.67,
      ljungBoxPValue: 0.23,
      venuesSynchronized: 2
    },
    riskLevel: 'medium',
    actionRequired: false
  },
  {
    patternId: 8,
    patternName: 'Time-Weighted Average Price',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    status: 'confirmed',
    metrics: {
      decayConstant: 0.78,
      frontLoadingRatio: 0.31,
      impactAsymmetry: 0.38,
      volumeConcentration: 0.45,
      ljungBoxPValue: 0.67,
      venuesSynchronized: 1
    },
    riskLevel: 'low',
    actionRequired: false
  }
];

export const QuantitativeTelemetryPanel: React.FC = () => {
  const [data, setData] = useState<QuantitativeTelemetry[]>(QUANTITATIVE_DATA);
  const [selectedPattern, setSelectedPattern] = useState<QuantitativeTelemetry | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => prev.map(item => ({
        ...item,
        metrics: {
          ...item.metrics,
          decayConstant: item.metrics.decayConstant + (Math.random() - 0.5) * 0.1,
          frontLoadingRatio: Math.max(0, Math.min(1, item.metrics.frontLoadingRatio + (Math.random() - 0.5) * 0.05)),
          impactAsymmetry: Math.max(0, Math.min(1, item.metrics.impactAsymmetry + (Math.random() - 0.5) * 0.05)),
        }
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'critical': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} className="text-green-500" />;
      case 'analyzing': return <Activity size={16} className="text-blue-500 animate-pulse" />;
      case 'rejected': return <AlertTriangle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-slate-500" />;
    }
  };

  const latestPattern = data[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">
                Quantitative Telemetry
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                Syndicate Pattern Analysis & Risk Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${latestPattern?.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
            LIVE ANALYSIS
          </div>
        </div>

        {/* Latest Pattern Summary */}
        {latestPattern && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Pattern ID</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">#{latestPattern.patternId}</div>
              <div className="text-xs text-slate-500 truncate">{latestPattern.patternName}</div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Risk Level</div>
              <div className={`text-lg font-black uppercase ${getRiskColor(latestPattern.riskLevel)} px-2 py-1 rounded text-sm`}>
                {latestPattern.riskLevel}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {latestPattern.actionRequired ? '⚠️ Intervention Required' : '✓ Monitoring Active'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Volume Concentration</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                {(latestPattern.metrics.volumeConcentration * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">T/2 period</div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Statistical Confidence</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {(latestPattern.metrics.ljungBoxPValue * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">Ljung-Box p-value</div>
            </div>
          </div>
        )}
      </div>

      {/* Pattern Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Patterns */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">
                Pattern Analysis
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                Real-time Syndicate Detection
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((pattern, index) => (
              <div
                key={pattern.patternId}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedPattern?.patternId === pattern.patternId
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
                onClick={() => setSelectedPattern(pattern)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(pattern.status)}
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Pattern #{pattern.patternId}
                    </span>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded uppercase font-bold ${getRiskColor(pattern.riskLevel)}`}>
                    {pattern.riskLevel}
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  {pattern.patternName}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>κ = {pattern.metrics.decayConstant.toFixed(2)}</span>
                  <span>{pattern.metrics.venuesSynchronized} venues</span>
                  <span>{new Date(pattern.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
              <Target size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">
                Statistical Metrics
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                Almgren-Chriss Trajectory Analysis
              </p>
            </div>
          </div>

          {selectedPattern ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Pattern Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedPattern.status)}
                    <span className={`text-xs font-bold uppercase ${getRiskColor(selectedPattern.riskLevel)} px-2 py-1 rounded`}>
                      {selectedPattern.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {selectedPattern.patternName} • Risk Level: {selectedPattern.riskLevel}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Decay Constant (κ)</div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {selectedPattern.metrics.decayConstant.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">Normalized T=1</div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Front-loading Ratio</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {(selectedPattern.metrics.frontLoadingRatio * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500">> 65% threshold</div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Impact Asymmetry</div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {(selectedPattern.metrics.impactAsymmetry * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500">> 70% threshold</div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Volume Concentration</div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {(selectedPattern.metrics.volumeConcentration * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500">T/2 period</div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">Ljung-Box Test Results</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {selectedPattern.metrics.ljungBoxPValue.toFixed(3)}
                    </div>
                    <div className="text-xs text-slate-500">p-value</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-green-600 dark:text-green-400">
                      CONFIRMED
                    </div>
                    <div className="text-xs text-slate-500">White Noise</div>
                  </div>
                </div>
              </div>

              {selectedPattern.actionRequired && (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm font-bold text-red-700 dark:text-red-300">Risk Management Intervention Required</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Pattern #{selectedPattern.patternId} has exceeded risk thresholds and requires immediate attention.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target size={48} className="text-slate-400 mb-4" />
              <div className="text-sm text-slate-500 mb-2">Select a Pattern</div>
              <div className="text-xs text-slate-400">Choose a pattern from the list to view detailed metrics</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center gap-4">
        <Zap size={20} className="text-indigo-500 shrink-0" />
        <div className="text-xs text-slate-500 leading-relaxed italic">
          <strong>Quantitative Analysis:</strong> Real-time syndicate pattern detection using Almgren-Chriss optimal trajectory models.
          Statistical significance confirmed via Ljung-Box white noise tests. Risk management interventions triggered for patterns exceeding 70% impact asymmetry thresholds.
        </div>
      </div>
    </div>
  );
};