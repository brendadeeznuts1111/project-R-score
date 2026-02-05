import React, { useState, useEffect } from 'react';

interface Phone {
  id: string;
  name: string;
  battery: number;
  status: 'online' | 'offline' | 'charging' | 'error';
  lastSeen: string;
}

/**
 * 📱 PHONE STATUS VIEW
 * Real-time monitoring of connected devices with Bun 1.2+ inspired visuals.
 */
export const PhoneStatusView: React.FC = () => {
  const [phones, setPhones] = useState<Phone[]>([
    { id: '1', name: 'iPhone 15 Pro', battery: 95, status: 'online', lastSeen: 'Just now' },
    { id: '2', name: 'Pixel 8', battery: 15, status: 'charging', lastSeen: '2m ago' },
    { id: '3', name: 'Samsung S24 Ultra', battery: 45, status: 'online', lastSeen: '5m ago' },
    { id: '4', name: 'Z-Fold 🦋', battery: 3, status: 'error', lastSeen: '10m ago' },
  ]);

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-2xl border border-gray-800">
      <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
        <span className="flex items-center">
          <span className="mr-2">📱</span> Live Phone Status
        </span>
        <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-widest">
          {phones.filter(p => p.status === 'online').length} Active
        </span>
      </h2>

      <div className="space-y-4">
        {phones.map((phone) => (
          <div key={phone.id} className="flex items-center justify-between p-3 rounded-md bg-black/40 border border-gray-800 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(phone.status)} animate-pulse`} />
              <div>
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{phone.name}</p>
                <p className="text-[10px] text-gray-500 font-mono italic">Seen: {phone.lastSeen}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-mono ${getBatteryColor(phone.battery)}`}>
                  {phone.status === 'charging' ? '⚡ ' : ''}{phone.battery}%
                </span>
                <div className="w-10 h-3 bg-gray-800 rounded-sm overflow-hidden border border-gray-700">
                  <div 
                    className={`h-full ${getBatteryBg(phone.battery)} transition-all duration-500`} 
                    style={{ width: `${phone.battery}%` }} 
                  />
                </div>
              </div>
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">
                {phone.status}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded transition-all border border-gray-700 hover:border-blue-500/50">
        Scan for Devices
      </button>
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]';
    case 'charging': return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]';
    case 'error': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    default: return 'bg-gray-500';
  }
};

const getBatteryColor = (battery: number) => {
  if (battery > 70) return 'text-green-400';
  if (battery > 20) return 'text-yellow-400';
  return 'text-red-500';
};

const getBatteryBg = (battery: number) => {
  if (battery > 70) return 'bg-green-500';
  if (battery > 20) return 'bg-yellow-500';
  return 'bg-red-500';
};
