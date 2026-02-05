import React, { useState, useEffect } from 'react';

interface MetricPort {
  command: string;
  pid: string;
  user: string;
  name: string;
}

interface AdbDevice {
  id: string;
  status: string;
}

interface AdbDevice {
  id: string;
  status: string;
  battery?: number;
  lastSeen?: number;
}

interface MetricsData {
  system: {
    cpu?: { user: number; system: number };
    memory: any;
  };
  proxy: {
    dns: any;
    uptime: number;
  };
  ports?: MetricPort[];
  devices?: AdbDevice[];
}

/**
 * 📊 LIVE WEBSOCKET METRICS DISPLAY
 * Real-time system monitoring with Bun WebSockets and Filtering
 */
export const MetricsDisplay: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [portFilter, setPortFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect to the metrics bridge port (3001)
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:3001`);

    ws.onopen = () => {
      console.log('Connected to metrics stream');
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'metrics_update') {
        setMetrics(payload);
      }
    };

    ws.onclose = () => console.log('Metrics stream disconnected');
    setSocket(ws);

    return () => ws.close();
  }, []);

  if (!metrics) return (
    <div className="bg-gray-900 border border-gray-800 p-8 rounded-lg text-center">
      <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Bridging System WebSocket...</p>
    </div>
  );

  const filteredPorts = (metrics.ports || []).filter(port => 
    port.command.toLowerCase().includes(portFilter.toLowerCase()) || 
    port.name.toLowerCase().includes(portFilter.toLowerCase()) ||
    port.pid.includes(portFilter)
  );

  const filteredDevices = (metrics.devices || []).filter(device => 
    device.id.toLowerCase().includes(deviceFilter.toLowerCase()) ||
    device.status.toLowerCase().includes(deviceFilter.toLowerCase())
  );

  const dnsStats = metrics.proxy.dns;

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <section className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-blue-400 mr-2">🖥️</span> System Resource (Live)
          </span>
          <div className="flex items-center space-x-4">
            {metrics.system.scaling && (
              <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50 font-mono">
                AI: {metrics.system.scaling.action.toUpperCase()} ({metrics.system.scaling.confidence * 100}%)
              </span>
            )}
            <span className="text-[10px] text-blue-400 font-mono animate-pulse">● STREAMING</span>
          </div>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="DNS Hit Rate" value={`${(dnsStats.hitRate * 100).toFixed(1)}%`} progress={dnsStats.hitRate * 100} color="green" />
          <MetricCard title="Memory" value={`${Math.round(metrics.system.memory.rss / 1024 / 1024)} MB`} subValue="RSS" color="blue" />
          <MetricCard title="Uptime" value={`${Math.floor(metrics.proxy.uptime / 60)}m`} subValue="running" color="purple" />
          <MetricCard title="Scaling Reason" value={metrics.system.scaling?.reason || 'Stable'} subValue="auto-scaler" color="blue" />
        </div>
      </section>

      {/* Real-time Ports & Devices */}
      <section className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-purple-400 mr-2">🌐</span> Network & ADB Devices
          </span>
          <div className="flex space-x-4">
            <span className="text-purple-500 text-[10px] font-mono uppercase tracking-tighter">{(metrics.ports || []).length} Ports</span>
            <span className="text-green-500 text-[10px] font-mono uppercase tracking-tighter">{(metrics.devices || []).length} Devices</span>
          </div>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Listening Ports */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Live Listening Ports</p>
              <input 
                type="text" 
                placeholder="Filter ports..."
                value={portFilter}
                onChange={(e) => setPortFilter(e.target.value)}
                className="bg-black/40 border border-gray-800 text-[9px] px-2 py-1 rounded text-gray-400 focus:border-purple-500 outline-none transition-all w-24"
              />
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-2 pr-2">
              {filteredPorts.map((port, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-black/40 rounded border border-gray-800 text-[11px] font-mono group hover:border-purple-500/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="text-purple-400 w-16 truncate">{port.command}</span>
                    <span className="text-gray-500">PID: {port.pid}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-bold group-hover:text-purple-300">{port.name}</span>
                    <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1 rounded uppercase tracking-tighter">Listen</span>
                  </div>
                </div>
              ))}
              {filteredPorts.length === 0 && (
                <div className="text-center py-4 text-gray-600 italic text-xs border border-dashed border-gray-800 rounded">
                  {metrics.ports.length === 0 ? "No active listener" : "No match found"}
                </div>
              )}
            </div>
          </div>

          {/* ADB Devices */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Connected Mobile Devices</p>
              <input 
                type="text" 
                placeholder="Filter devices..."
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="bg-black/40 border border-gray-800 text-[9px] px-2 py-1 rounded text-gray-400 focus:border-green-500 outline-none transition-all w-24"
              />
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-2 pr-2">
              {filteredDevices.map((device, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-black/40 rounded border border-gray-800 text-[11px] font-mono group hover:border-green-500/50 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-3">
                      <span className="text-green-400">📱 {device.id}</span>
                    </div>
                    {device.battery !== undefined && device.battery !== -1 && (
                      <span className="text-[9px] text-gray-500 mt-0.5">🔋 {device.battery}%</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'device' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                    <span className="text-white font-bold uppercase text-[9px]">{device.status}</span>
                  </div>
                </div>
              ))}
              {filteredDevices.length === 0 && (
                <div className="text-center py-4 text-gray-600 italic text-xs border border-dashed border-gray-800 rounded">
                  {metrics.devices.length === 0 ? "No device connected" : "No match found"}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string | number; subValue?: string; progress?: number; color?: string }> = ({ title, value, subValue, progress, color = 'blue' }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    green: 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
    yellow: 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
    red: 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    purple: 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
  };

  const textColorMap: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400'
  };

  return (
    <div className="bg-gray-800 p-4 rounded border border-gray-700">
      <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">{title}</p>
      <div className="flex items-baseline space-x-2">
        <p className={`text-2xl font-mono ${textColorMap[color] || 'text-white'}`}>{value}</p>
        {subValue && <span className="text-gray-500 text-xs tracking-tighter">{subValue}</span>}
      </div>
      {progress !== undefined && (
        <div className="w-full bg-gray-700 h-1 mt-3 rounded-full overflow-hidden border border-black/20">
          <div 
            className={`${colorMap[color]} h-full rounded-full transition-all duration-300 ease-out`} 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};
