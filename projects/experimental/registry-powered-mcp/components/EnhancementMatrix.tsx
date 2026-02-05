
import React, { useState } from 'react';
import { BadgeCheck, Globe, Shield, Terminal, FileCode, Server, Layout, Database, Box, Zap, Beaker, Braces, Cpu, Activity, ArrowLeftRight, Rss, Lock, Gauge, Layers } from 'lucide-react';

interface Enhancement {
  property: string;
  type: string;
  protocol: string;
  signature: string; // Renamed from complexity to allow for implComplexity
  impact: string;
  version: string;
  securityLevel: 'High' | 'Medium' | 'Low';
  performanceImpact: string;
  implComplexity: 'High' | 'Medium' | 'Low';
  useCases: string[];
}

const DATA: Enhancement[] = [
  { 
    property: 'Edge Routing', type: 'Pattern Matching', protocol: 'URLPattern', signature: 'exec() / test()', impact: 'Zero-overhead dispatch', version: '1.1.x+',
    securityLevel: 'Medium', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'Low', useCases: ['API routing', 'microservices']
  },
  { 
    property: 'Wildcard Sync', type: 'Networking', protocol: 'Wildcard (*)', signature: 'groups[0]', impact: 'Instant path extraction', version: '1.2.0+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡⚡⚡', implComplexity: 'Low', useCases: ['Dynamic routing', 'REST APIs']
  },
  { 
    property: 'Type Validation', type: 'Security', protocol: 'Regex Groups', signature: 'hasRegExpGroups', impact: 'Prevents route injection', version: '1.2.4+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡', implComplexity: 'Medium', useCases: ['Input sanitization', 'API security']
  },
  { 
    property: 'WS Cookie Sync', type: 'Networking', protocol: 'RFC 6265', signature: 'Native C++', impact: 'Zero-JS parsing overhead', version: '2.4.1+',
    securityLevel: 'Medium', performanceImpact: '⚡⚡⚡⚡⚡', implComplexity: 'High', useCases: ['Session management', 'auth']
  },
  { 
    property: 'State Anchoring', type: 'Security', protocol: 'Bun.CookieMap', signature: 'req.cookies', impact: 'Auto-applied to Response', version: '2.4.1+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'Medium', useCases: ['Secure state management']
  },
  { 
    property: 'Partitioned State', type: 'Security', protocol: 'CHIPS', signature: 'partitioned: true', impact: 'Secure cross-origin tools', version: '2.4.1+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'Medium', useCases: ['Multi-tenant apps', 'isolation']
  },
  { 
    property: 'Lattice-Event-Stream', type: 'Data Plane', protocol: 'RSS 2.0 / XML', signature: 'SIMD-Template', impact: 'Real-time PoP/Registry state', version: '2.4.1+',
    securityLevel: 'Medium', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'High', useCases: ['Real-time data sync', 'event sourcing']
  },
  { 
    property: 'Secure Proxy', type: 'Networking', protocol: 'HTTP Connect', signature: 'Tunnel', impact: 'Encrypted Auth Injection', version: '1.1.x+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'Medium', useCases: ['API gateway', 'reverse proxy']
  },
  { 
    property: 'Keep-Alive Fix', type: 'Networking', protocol: 'RFC 7230', signature: 'Socket Reuse', impact: 'Eliminates 3-way Handshake', version: '1.1.x+',
    securityLevel: 'Medium', performanceImpact: '⚡⚡⚡⚡⚡', implComplexity: 'Low', useCases: ['High-throughput services']
  },
  { 
    property: 'Fetch Preconnect', type: 'Networking', protocol: 'TCP/TLS', signature: 'Hint-based', impact: 'Eliminates connection setup', version: '1.2+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡⚡⚡', implComplexity: 'Low', useCases: ['Performance optimization']
  },
  { 
    property: 'Safe Prime Gen', type: 'Crypto', protocol: 'RFC 3526 / FIPS', signature: 'O(log⁴ n)', impact: 'Thread-safe background pool', version: '1.3.6+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡', implComplexity: 'High', useCases: ['Cryptographic operations']
  },
  { 
    property: 'ECDH Primitives', type: 'Crypto', protocol: 'NIST SP 800-56A', signature: '(curve) => ECDH', impact: 'Native C++ Bindings (OpenSSL)', version: '1.3.6+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'High', useCases: ['Secure communications']
  },
  { 
    property: 'WS Close Guard', type: 'Networking', protocol: 'RFC 6455 §5.4', signature: 'Buffer.allocUnsafe', impact: 'Prevents Pointer Panic/Segfault', version: '1.3.6+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'Medium', useCases: ['WebSocket stability']
  },
  { 
    property: 'TypedArray.every', type: 'Performance', protocol: 'ES2023', signature: 'SIMD-optimized', impact: 'Instant binary validation', version: '1.3.6+',
    securityLevel: 'Medium', performanceImpact: '⚡⚡⚡⚡⚡', implComplexity: 'Low', useCases: ['Binary data processing']
  },
  { 
    property: 'PTY Console', type: 'Logging', protocol: 'VT100 / ANSI', signature: 'Non-blocking', impact: 'stdout buffer optimization', version: '1.3.6+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'Medium', useCases: ['Debugging', 'terminal apps']
  },
  { 
    property: 'Vitest vi mock', type: 'Testing', protocol: 'Jest/Vitest', signature: 'JIT-based Proxy', impact: 'Module mocking foundation', version: '1.3.1+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡', implComplexity: 'Medium', useCases: ['Unit testing', 'mocking']
  },
  { 
    property: 'Failure Filter', type: 'Testing', protocol: 'CI Pipeline', signature: 'O(n) where n=fails', impact: 'Clean logs for large suites', version: '1.3.1+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡', implComplexity: 'Low', useCases: ['Test optimization']
  },
  { 
    property: 'Public Hoisting', type: 'Package Mgmt', protocol: 'Symlink', signature: 'Explicit Opt-in', impact: 'Reduces node_modules depth', version: '1.2.0+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡⚡', implComplexity: 'Low', useCases: ['Package management']
  },
  { 
    property: 'Interactive Alias', type: 'Package Mgmt', protocol: 'CLI State', signature: 'AST Preserve', impact: 'Keeps npm: prefixes on update', version: '1.2.2+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡', implComplexity: 'Medium', useCases: ['Package resolution']
  },
  { 
    property: 'Quoted Env', type: 'Configuration', protocol: 'POSIX Shell', signature: '"${TOKEN}"', impact: 'String literal tokenization', version: '1.3.6+',
    securityLevel: 'Medium', performanceImpact: '⚡⚡⚡', implComplexity: 'Low', useCases: ['Environment config']
  },
  { 
    property: 'Optional Env (?)', type: 'Configuration', protocol: 'Bash-style', signature: '${VAR?}', impact: 'Null-pointer guard in config', version: '1.3.6+',
    securityLevel: 'Medium', performanceImpact: '⚡⚡⚡', implComplexity: 'Low', useCases: ['Config validation']
  },
  { 
    property: 'Registry :email', type: 'Auth', protocol: 'Auth0 / Nexus', signature: '//registry/:email', impact: 'Plaintext string mapping', version: '1.3.6+',
    securityLevel: 'High', performanceImpact: '⚡⚡⚡', implComplexity: 'Medium', useCases: ['Auth integration']
  },
  { 
    property: 'PeerDep Skip', type: 'Performance', protocol: 'Graph Resolve', signature: 'O(1) startup', impact: 'Removes 50ms sleep lag', version: '1.3.6+',
    securityLevel: 'Low', performanceImpact: '⚡⚡⚡⚡⚡', implComplexity: 'Low', useCases: ['Startup optimization']
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Routing': 
    case 'Pattern Matching': return <ArrowLeftRight size={14} className="text-pink-500" />;
    case 'Networking': return <Globe size={14} className="text-blue-500" />;
    case 'Crypto': 
    case 'Security': return <Shield size={14} className="text-red-500" />;
    case 'Performance': return <Zap size={14} className="text-amber-500" />;
    case 'Logging': return <Terminal size={14} className="text-slate-500" />;
    case 'Testing': return <Beaker size={14} className="text-rose-500" />;
    case 'Package Mgmt': return <Box size={14} className="text-orange-500" />;
    case 'Configuration': return <FileCode size={14} className="text-sky-600" />;
    case 'Auth': return <Server size={14} className="text-green-500" />;
    case 'Data Plane': return <Rss size={14} className="text-emerald-500" />;
    default: return <Layout size={14} className="text-purple-500" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Routing': 
    case 'Pattern Matching': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
    case 'Networking': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'Crypto': 
    case 'Security': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'Performance': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'Testing': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    case 'Package Mgmt': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    case 'Configuration': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
    case 'Data Plane': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  }
};

const getSecurityColor = (level: string) => {
    switch (level) {
        case 'High': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
        case 'Medium': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
        case 'Low': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        default: return 'text-slate-500';
    }
};

const getComplexityColor = (level: string) => {
    switch (level) {
        case 'High': return 'text-rose-500';
        case 'Medium': return 'text-amber-500';
        case 'Low': return 'text-emerald-500';
        default: return 'text-slate-500';
    }
};

const getPerformanceColor = (impact: string) => {
    const count = (impact.match(/⚡/g) || []).length;
    if (count >= 5) return 'text-purple-500';
    if (count >= 4) return 'text-sky-500';
    if (count >= 3) return 'text-amber-500';
    return 'text-slate-400';
};

export const EnhancementMatrix: React.FC = () => {
  return (
    <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 gap-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BadgeCheck size={18} className="text-emerald-500" />
          Enhanced Production Protocol & Runtime Matrix
        </h3>
        <div className="flex gap-2 text-xs">
           <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase">v2.4.1 Topology</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 tracking-wider font-bold">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap min-w-[140px]">Property</th>
              <th className="px-4 py-3 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 whitespace-nowrap">Protocol</th>
              <th className="px-4 py-3 text-center">Sec</th>
              <th className="px-4 py-3 text-center">Perf</th>
              <th className="px-4 py-3 text-center">Cpx</th>
              <th className="px-4 py-3">Use Cases</th>
              <th className="px-4 py-3">Signature</th>
              <th className="px-4 py-3">Impact</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Ver.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 text-xs">
            {DATA.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap group-hover:text-emerald-500 transition-colors">
                  {item.property}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wide ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                    {item.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                  {item.protocol}
                </td>
                
                {/* Security */}
                <td className="px-4 py-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${getSecurityColor(item.securityLevel)}`}>
                        {item.securityLevel}
                    </span>
                </td>

                {/* Performance */}
                <td className="px-4 py-3 text-center">
                    <span className={`text-xs ${getPerformanceColor(item.performanceImpact)} tracking-tighter`} title={item.performanceImpact}>
                        {item.performanceImpact}
                    </span>
                </td>

                {/* Complexity */}
                <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                        <span className={`text-[10px] font-bold ${getComplexityColor(item.implComplexity)}`}>
                            {item.implComplexity === 'High' ? '🔴' : item.implComplexity === 'Medium' ? '🟡' : '🟢'}
                        </span>
                    </div>
                </td>

                {/* Use Cases */}
                <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {item.useCases.map((uc, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                {uc}
                            </span>
                        ))}
                    </div>
                </td>

                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-[10px] truncate max-w-[120px]" title={item.signature}>
                  {item.signature}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={item.impact}>
                  {item.impact}
                </td>
                <td className="px-4 py-3 text-[10px] font-black text-slate-400 whitespace-nowrap text-right">
                  {item.version}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800/50 text-[10px] text-slate-500 dark:text-slate-400 flex flex-col md:flex-row justify-between gap-2">
           <div className="flex items-center gap-4">
               <span className="flex items-center gap-2"><Lock size={12}/> Security Audited</span>
               <span className="flex items-center gap-2"><Gauge size={12}/> Performance Benchmarked</span>
               <span className="flex items-center gap-2"><Layers size={12}/> Complexity Rated</span>
           </div>
           <span className="font-bold text-indigo-500 uppercase tracking-widest">v2.4.1 Operational Matrix</span>
       </div>
    </div>
  );
};
