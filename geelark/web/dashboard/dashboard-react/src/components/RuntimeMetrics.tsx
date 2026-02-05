import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Clock } from 'lucide-react';
import { api, Metrics } from '../lib/api';

export const RuntimeMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial metrics fetch
    api.getMetrics().then(setMetrics).catch(console.error);

    // Connect to WebSocket for real-time updates
    api.connectWebSocket();

    // Subscribe to metrics updates
    const unsubscribe = api.onMetrics((newMetrics) => {
      setMetrics(newMetrics);
      setConnected(true);
    });

    // Health check interval
    const healthInterval = setInterval(async () => {
      try {
        const health = await api.healthCheck();
        setConnected(health.status === 'healthy');
      } catch {
        setConnected(false);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(healthInterval);
    };
  }, []);

  if (!metrics) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Activity className="w-4 h-4 animate-pulse" />
          Loading metrics...
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatCpu = (cpu: { user: number; system: number }) => {
    const total = (cpu.user + cpu.system) / 1000000; // Convert to seconds
    return `${total.toFixed(2)}s`;
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${connected ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Runtime Metrics
          </span>
        </div>
        <div className={`text-[9px] font-black uppercase ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? '● Connected' : '○ Disconnected'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Uptime */}
        <div className="bg-slate-950/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">Uptime</span>
          </div>
          <div className="text-xs font-bold text-slate-300">{formatUptime(metrics.uptime)}</div>
        </div>

        {/* Memory */}
        <div className="bg-slate-950/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <HardDrive className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">Memory</span>
          </div>
          <div className="text-xs font-bold text-slate-300">
            {formatBytes(metrics.memory.heapUsed)} / {formatBytes(metrics.memory.heapTotal)}
          </div>
        </div>

        {/* RSS */}
        <div className="bg-slate-950/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Cpu className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">RSS</span>
          </div>
          <div className="text-xs font-bold text-slate-300">{formatBytes(metrics.memory.rss)}</div>
        </div>

        {/* CPU */}
        <div className="bg-slate-950/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Activity className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase">CPU Time</span>
          </div>
          <div className="text-xs font-bold text-slate-300">{formatCpu(metrics.cpu)}</div>
        </div>
      </div>

      {/* System Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
        <div className="flex gap-3 text-[9px] text-slate-600 font-mono">
          <span>{metrics.platform}-{metrics.arch}</span>
          <span>PID: {metrics.pid}</span>
        </div>
        <div className="text-[9px] text-slate-600 font-mono">
          {metrics.nodeVersion}
        </div>
      </div>
    </div>
  );
};
