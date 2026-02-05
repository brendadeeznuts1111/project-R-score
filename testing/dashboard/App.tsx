import React from 'react';
import { MetricsDisplay } from './components/MetricsDisplay';
import { TerminalView } from './components/TerminalView';
import { FeatureMatrix } from './components/FeatureMatrix';
import { CodeInsights } from './components/CodeInsights';
import { AnomalyView } from './components/AnomalyView';
import { PhoneStatusView } from './components/PhoneStatusView';

/**
 * 🏠 Dashboard Root Component - control center layout
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-black p-8 font-sans text-white">
      <header className="mb-8 border-b border-gray-800 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black flex items-center tracking-tight">
            <span className="text-blue-500 mr-3 animate-pulse">🚀</span> DEV-HQ <span className="text-gray-500 ml-2 font-light">SYSTEM CONTROL</span>
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Enterprise Phone Management & Automation v2.0</p>
        </div>
        <div className="flex space-x-4">
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-bold">System Status</p>
            <p className="text-green-400 font-mono">● OPERATIONAL</p>
          </div>
          <div className="text-right border-l border-gray-800 pl-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Region</p>
            <p className="text-blue-400 font-mono">US-EAST-1</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Metrics (Full Height) */}
          <div className="lg:col-span-2 space-y-8">
            <MetricsDisplay />
            <CodeInsights />
            <FeatureMatrix />
          </div>
          
          {/* Actions and Logs */}
          <div className="space-y-8">
            <section className="bg-gray-900 p-6 rounded-lg shadow-2xl border border-gray-800">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <span className="mr-2">🔧</span> System Control
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <ActionButton 
                  label="Inject Latency Chaos" 
                  color="purple" 
                  description="Measure resilience under load" 
                  onClick={() => fetch('/api/chaos/run', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario: 'latency_simulation' }) 
                  })} 
                />
                <ActionButton 
                  label="Run Quality Gates" 
                  color="green" 
                  description="Enforce reliability standards" 
                  onClick={() => fetch('/api/quality/check')} 
                />
                <ActionButton label="Trigger Auto-Scale" color="blue" description="AI-driven resource optimization" />
                <ActionButton label="Emergency Stop" color="red" description="Immediate system halt" />
              </div>
            </section>

            <section>
              <PhoneStatusView />
            </section>

            <section className="bg-gray-900 p-6 rounded-lg shadow-2xl border border-gray-800">
              <AnomalyView />
            </section>

            <section className="bg-gray-900 p-6 rounded-lg shadow-2xl border border-gray-800">
              <h2 className="text-xl font-bold mb-4">📈 Business IQ</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-green-400 font-mono">98.2%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Total Revenue</span>
                  <span className="text-white font-mono">$12,402</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Active Tasks</span>
                  <span className="text-blue-400 font-mono">154</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section>
          <TerminalView />
        </section>
      </main>

      <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs tracking-widest uppercase">
        &copy; 2026 Phone Management System • Powered by Bun v1.2.0 • Zero-Trust Architecture Enabled
      </footer>
    </div>
  );
};

const ActionButton: React.FC<{ 
  label: string; 
  color: string; 
  description: string;
  onClick?: () => void;
}> = ({ label, color, description, onClick }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20',
    green: 'bg-green-600 hover:bg-green-500 shadow-green-900/20',
    red: 'bg-red-600 hover:bg-red-500 shadow-red-900/20',
    purple: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'
  };

  return (
    <button 
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg transition-all duration-200 shadow-lg ${colors[color] || 'bg-gray-700'}`}
    >
      <p className="font-bold text-white text-sm">{label}</p>
      <p className="text-xs text-white/70 mt-1">{description}</p>
    </button>
  );
};

export default App;
