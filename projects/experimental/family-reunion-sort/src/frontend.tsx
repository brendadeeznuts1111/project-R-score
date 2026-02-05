import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { STATUS_COLORS, CATEGORY_COLORS } from './constants/colors';
import './index.css';

interface SystemStatus {
  system: string;
  timestamp: string;
  scope: string;
  domain: string;
  platform: string;
}

interface Dispute {
  id: string;
  status: string;
  reason: string;
  amount: number;
  createdAt: string;
}

const App = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, disputesRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/disputes')
        ]);
        
        const statusData = await statusRes.json();
        const disputesData = await disputesRes.json();
        
        setStatus(statusData);
        setDisputes(disputesData.disputes || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#1f2937]">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#3b82f6]"></div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-[#3b82f6]">Enterprise Dispute Dashboard</h1>
          <p className="text-gray-400 mt-2">Venmo QR Code System Monitoring</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end">
            <span className="status-indicator bg-[#22c55e]"></span>
            <span className="text-sm font-medium uppercase tracking-wider">{status?.system}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{status?.domain} | {status?.platform}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Total Disputes</h3>
          <p className="text-3xl font-bold">{disputes.length}</p>
          <div className="mt-4 text-xs text-[#22c55e]">+5% from last week</div>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">MRR Impact</h3>
          <p className="text-3xl font-bold text-[#ef4444]">-$1,240.50</p>
          <div className="mt-4 text-xs text-gray-500">Projected loss this month</div>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Avg Resolution Time</h3>
          <p className="text-3xl font-bold">24.2s</p>
          <div className="mt-4 text-xs text-[#22c55e]">Meets 28-second rule</div>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Active Disputes</h2>
          <button className="btn-primary text-sm">Create New Dispute</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
              <tr>
                <th className="pb-4 px-2">ID</th>
                <th className="pb-4 px-2">Status</th>
                <th className="pb-4 px-2">Reason</th>
                <th className="pb-4 px-2">Created</th>
                <th className="pb-4 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="py-4 px-2 font-mono text-sm">{dispute.id}</td>
                  <td className="py-4 px-2">
                    <span className="px-2 py-1 rounded text-xs font-bold" 
                          style={{ backgroundColor: `${STATUS_COLORS.success}20`, color: STATUS_COLORS.success }}>
                      {dispute.status}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-gray-300">{dispute.reason}</td>
                  <td className="py-4 px-2 text-gray-400 text-sm">{new Date(dispute.createdAt).toLocaleString()}</td>
                  <td className="py-4 px-2 text-right">
                    <button className="text-[#3b82f6] hover:underline text-sm">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
