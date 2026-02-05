
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bell, 
  Shield, 
  Zap, 
  Activity, 
  Users, 
  Globe, 
  ExternalLink, 
  Bot, 
  Command, 
  Lock, 
  User, 
  Settings, 
  RefreshCw, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle2,
  List,
  Server,
  Terminal,
  Clock,
  Radio,
  Power
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  msg: string;
  time: string;
  target: string;
  pop: string;
  status: 'delivered' | 'failed' | 'retrying';
}

const INITIAL_ALERTS: Alert[] = [
  { id: 'tg-01', type: 'critical', msg: 'SFO-1 Latency > 200ms', time: '12:04:12', target: '@mcp_ops', pop: 'SFO-1', status: 'delivered' },
  { id: 'tg-02', type: 'info', msg: 'New Package: @mcp/core-runtime v1.3.6', time: '11:58:33', target: '@mcp_public', pop: 'GLOBAL', status: 'delivered' },
  { id: 'tg-03', type: 'warning', msg: 'WAF: Rate limit exceeded (IP: 45.12.9.1)', time: '11:45:10', target: '@mcp_security', pop: 'LHR-1', status: 'delivered' },
  { id: 'tg-04', type: 'info', msg: 'NODE_ORD_01 Heartbeat Stable', time: '11:32:05', target: '@mcp_ops', pop: 'ORD-1', status: 'delivered' },
];

export const TelegramIntegration: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [showToken, setShowToken] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [targetChannel, setTargetChannel] = useState('@mcp_ops');
  const [botStatus, setBotStatus] = useState<'online' | 'offline'>('online');
  const [webhookHealth, setWebhookHealth] = useState(99.8);

  const sendTestAlert = (template?: string) => {
    const message = template || testMsg;
    if (!message.trim() || isSending) return;

    setIsSending(true);
    
    // Simulate Edge Worker Dispatch
    setTimeout(() => {
      const newAlert: Alert = {
        id: `tg-${Math.random().toString(36).substr(2, 5)}`,
        type: template ? 'warning' : 'info',
        msg: message,
        time: new Date().toLocaleTimeString(),
        target: targetChannel,
        pop: 'ORD-1',
        status: 'delivered'
      };
      setAlerts(prev => [newAlert, ...prev].slice(0, 10));
      setIsSending(false);
      setTestMsg('');
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      {/* Hero Control Plane */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-500 font-black text-[10px] uppercase tracking-[0.3em]">
              <MessageSquare size={14} /> Notification Gateway
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Telegram: Comms_Control_v2.5</h2>
            <p className="text-slate-500 text-sm max-w-xl">
              Bridge infrastructure telemetry to secure Telegram channels via Cloudflare Workers. Native HMAC signature verification and rate-limiting enabled.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center min-w-[140px]">
              <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Bot Status</div>
              <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${botStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  <div className="text-xl font-black text-slate-800 dark:text-white uppercase italic">{botStatus}</div>
              </div>
              <div className="text-[9px] font-mono text-emerald-500 mt-1 uppercase tracking-tighter">API_V3_READY</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-center min-w-[140px]">
              <div className="text-[10px] font-black text-sky-600 uppercase mb-1">Delivery Rate</div>
              <div className="text-xl font-black text-slate-800 dark:text-white italic">{webhookHealth}%</div>
              <div className="text-[9px] font-mono text-sky-500 mt-1 uppercase tracking-tighter">Edge_Latency: 12ms</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Wing */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Settings size={18} />
              </div>
              <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Bot Identity & Secrets</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bot Token</label>
                  <button onClick={() => setShowToken(!showToken)} className="text-indigo-500 hover:text-indigo-400">
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-mono text-[10px] text-slate-500 overflow-hidden truncate">
                  {showToken ? '7128394562:AAF_zY8jL2kX7mQ3vP9rW5sT1uV4xO6...' : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Edge Webhook Target</label>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between">
                   <code className="text-[10px] text-sky-500 font-bold truncate">https://hub.workers.dev/tg/hook</code>
                   <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">CONNECTED</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-3">
                <ShieldCheck size={16} className="text-indigo-500 mt-0.5" />
                <div>
                   <span className="text-[10px] font-black text-indigo-500 uppercase">Integrity Guard</span>
                   <p className="text-[9px] text-slate-500 italic mt-1 leading-relaxed">
                     X-Telegram-Bot-Api-Secret-Token is enforced for all incoming dispatch requests.
                   </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setBotStatus(s => s === 'online' ? 'offline' : 'online')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${botStatus === 'online' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                >
                  <Power size={12} /> {botStatus === 'online' ? 'Kill Bot' : 'Spawn Bot'}
                </button>
                <button className="flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <RefreshCw size={12} /> Rotate HMAC
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/20 shadow-xl">
             <div className="flex items-center gap-3 mb-4 text-slate-400">
                <Radio size={18} className="animate-pulse text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Global Target Channels</span>
             </div>
             <div className="space-y-2">
                {[
                  { name: '@mcp_ops', type: 'Private', status: 'Ready' },
                  { name: '@mcp_security', type: 'Vault', status: 'Ready' },
                  { name: '@mcp_public', type: 'Broadcast', status: 'Read-Only' }
                ].map(chan => (
                  <div key={chan.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-slate-800">
                     <div className="flex flex-col">
                        <span className="text-[11px] font-mono text-slate-300">{chan.name}</span>
                        <span className="text-[8px] text-slate-500 uppercase font-black">{chan.type}</span>
                     </div>
                     <span className="text-[9px] text-emerald-500 font-bold">{chan.status}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Center: Live Alert Stream */}
        <div className="lg:col-span-5 space-y-6 flex flex-col h-[700px]">
          <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col flex-1 shadow-2xl bg-black/40">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                  <Bell size={18} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Live Broadcast Feed</h3>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[9px] font-mono text-slate-500 uppercase">Edge_Listener: OK</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
               {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-sky-500/30 transition-all group relative overflow-hidden shadow-sm">
                    <div className={`absolute top-0 left-0 w-1 h-full ${alert.type === 'critical' ? 'bg-rose-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-sky-500'}`}></div>
                    <div className="flex items-start justify-between relative z-10 pl-2">
                      <div className="space-y-1">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{alert.msg}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock size={10} /> {alert.time}
                          </span>
                          <span className="text-[9px] text-sky-500 font-bold uppercase">{alert.target}</span>
                          <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-black">POP: {alert.pop}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                         <CheckCircle2 size={12} className="text-emerald-500" />
                         <span className="text-[8px] font-black text-slate-500 uppercase">{alert.status}</span>
                      </div>
                    </div>
                  </div>
               ))}
            </div>
            
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-center items-center">
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">Payload integrity verified via Edge-Secret</span>
            </div>
          </div>
        </div>

        {/* Right: Command & Dispatch Wing */}
        <div className="lg:col-span-3 space-y-6">
           <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl bg-indigo-500/5 border-indigo-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                  <Terminal size={18} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Test Dispatch Center</h3>
              </div>

              <div className="space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Channel</label>
                       <select 
                          value={targetChannel}
                          onChange={(e) => setTargetChannel(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                       >
                          <option value="@mcp_ops">@mcp_ops</option>
                          <option value="@mcp_security">@mcp_security</option>
                          <option value="@mcp_public">@mcp_public</option>
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message Payload</label>
                       <textarea 
                          value={testMsg}
                          onChange={(e) => setTestMsg(e.target.value)}
                          placeholder="Enter debug payload..."
                          className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                       />
                    </div>
                 </div>

                 <button 
                    onClick={() => sendTestAlert()}
                    disabled={!testMsg.trim() || isSending}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                 >
                    {isSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    Dispatch Probe
                 </button>

                 <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

                 <div className="space-y-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operational Templates</span>
                    {[
                      { label: 'Latency Spike', icon: Zap, color: 'text-amber-500' },
                      { label: 'WAF Lockdown', icon: Shield, color: 'text-rose-500' },
                      { label: 'Sync Complete', icon: RefreshCw, color: 'text-emerald-500' }
                    ].map(tpl => (
                      <button 
                        key={tpl.label}
                        onClick={() => sendTestAlert(`TEMPLATE_TRIGGER: ${tpl.label.toUpperCase()}_DETECTED`)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-indigo-500/50 transition-all group"
                      >
                         <div className="flex items-center gap-3">
                            <tpl.icon size={14} className={tpl.color} />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-200 transition-colors uppercase">{tpl.label}</span>
                         </div>
                         <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                 </div>
              </div>
           </div>

           <div className="p-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase">
                <CheckCircle2 size={14} /> Compliance Verified
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed italic">
                Outgoing traffic is routed via a dedicated VPC egress proxy to ensure persistent IP identity for Telegram whitelist requirements.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
