
import React, { useState } from 'react';
import { Plug, Download, CheckCircle2, Play, Code, Database, Globe, Lock, Cpu, Layers, Zap, Shield, Search, GitBranch, Box } from 'lucide-react';

interface Blueprint {
  id: string;
  source: 'core' | 'external';
  description: string;
  status: 'active' | 'loading' | 'error';
}

const LIFECYCLE_STEPS = [
  { step: 'Discovery', desc: 'Locate source', icon: Globe, color: 'text-sky-500' },
  { step: 'Import', desc: 'Dynamic import()', icon: Download, color: 'text-indigo-500' },
  { step: 'Validation', desc: 'Check Contract', icon: CheckCircle2, color: 'text-emerald-500' },
  { step: 'Registration', desc: 'Assign to Registry', icon: Database, color: 'text-amber-500' },
];

const PLUGIN_MATRIX = [
  { feature: 'Execution', behavior: 'BlueprintRegistry[id].generate(name)', benefit: 'Identical performance to native/local templates.', icon: Zap, color: 'text-amber-500' },
  { feature: 'Isolation', behavior: 'Sandbox via Module Scope', benefit: "Plugins cannot interfere with each other's internal variables.", icon: Shield, color: 'text-emerald-500' },
  { feature: 'Resolution', behavior: 'Standard PropertyKey lookup', benefit: 'Seamlessly works with ProjectProvisioner.deploy().', icon: Search, color: 'text-sky-500' },
  { feature: 'Versioning', behavior: 'Controlled by sourceUrl', benefit: 'Can load specific versions (e.g., cdn.io/tpl@1.2.0.ts).', icon: GitBranch, color: 'text-purple-500' },
];

const MOCK_CODE = `/**
 * lib/blueprint-loader.ts
 * Manages the dynamic injection of third-party project architectures.
 */

// 🔒 Internal base logic hidden via Symbol
// This prevents iteration/enumeration by standard loops
const INTERNAL_BASE = Symbol("base");
BlueprintRegistry[INTERNAL_BASE] = { 
  /* hidden base logic */ 
  version: "2.4.1",
  protected: true
};

export const BlueprintLoader = {
  async registerExternal(id: string, sourceUrl: string): Promise<void> {
    try {
      // 1. Fetch the remote logic
      const module = await import(sourceUrl);
      const externalBlueprint = module.default;

      // 2. Structural Validation
      if (typeof externalBlueprint.generate !== "function") {
        throw new Error(\`[Loader] Invalid IBlueprint contract.\`);
      }

      // 3. Dynamic Injection
      BlueprintRegistry[id] = {
        id: id,
        description: externalBlueprint.description,
        generate: externalBlueprint.generate,
      };
    } catch (error) {
      console.error(\`[Loader] Failed to load plugin [\${id}]:\`, error);
    }
  }
};`;

export const PluginArchitectureView: React.FC = () => {
  const [registry, setRegistry] = useState<Blueprint[]>([
    { id: 'next-app', source: 'core', description: 'Standard Next.js App', status: 'active' },
    { id: 'react-lib', source: 'core', description: 'React Component Library', status: 'active' },
    { id: 'elysia-api', source: 'core', description: 'ElysiaJS API Server', status: 'active' },
  ]);
  
  const [loadingStep, setLoadingStep] = useState<number>(-1);
  const [pluginUrl, setPluginUrl] = useState('https://cdn.internal.org/blueprints/auth-template.ts');
  const [pluginId, setPluginId] = useState('org-auth');

  const handleInject = () => {
    if (registry.some(b => b.id === pluginId)) return;
    
    setLoadingStep(0);
    
    // Simulate Lifecycle
    setTimeout(() => setLoadingStep(1), 600);
    setTimeout(() => setLoadingStep(2), 1200);
    setTimeout(() => setLoadingStep(3), 1800);
    
    setTimeout(() => {
      setLoadingStep(-1);
      setRegistry(prev => [
        ...prev,
        { id: pluginId, source: 'external', description: 'Secure Auth Service (Golden Path)', status: 'active' }
      ]);
    }, 2400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Plug size={14} /> Plugin Architecture
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Dynamic Extension Engine</h2>
                <p className="text-slate-500 text-sm max-w-xl">
                    Transform the core engine into a pluggable platform. Inject "Golden Path" templates at runtime via remote URLs, npm packages, or local overrides.
                </p>
            </div>
            
            <div className="flex gap-4">
                <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Architecture</div>
                    <div className="text-lg font-black text-slate-800 dark:text-slate-100">Event-Driven</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Registry</div>
                    <div className="text-lg font-black text-emerald-500">Mutable</div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Loader */}
        <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500"><Download size={20} /></div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Plugin Loader</h3>
                </div>

                <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Plugin ID</label>
                        <input 
                            type="text" 
                            value={pluginId}
                            onChange={(e) => setPluginId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Source URL (Remote/CDN)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={pluginUrl}
                                onChange={(e) => setPluginUrl(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            />
                            <button 
                                onClick={handleInject}
                                disabled={loadingStep !== -1}
                                className="bg-sky-500 hover:bg-sky-400 text-white px-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play size={16} className={loadingStep !== -1 ? 'hidden' : 'block'} />
                                {loadingStep !== -1 && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifecycle Sequence</span>
                        </div>
                        <div className="flex items-center justify-between relative">
                            {/* Connector Line */}
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -z-10"></div>
                            
                            {LIFECYCLE_STEPS.map((step, idx) => {
                                const isActive = loadingStep === idx;
                                const isCompleted = loadingStep > idx || (loadingStep === -1 && registry.some(b => b.id === pluginId));
                                return (
                                    <div key={step.step} className="flex flex-col items-center gap-2 bg-white dark:bg-slate-950 px-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                            isActive ? 'border-sky-500 bg-sky-500 text-white scale-110' : 
                                            isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 
                                            'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900'
                                        }`}>
                                            <step.icon size={14} />
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase transition-colors ${isActive ? step.color : 'text-slate-400'}`}>
                                            {step.step}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Registry Visualizer */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Database size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Blueprint Registry</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">In-Memory Store</p>
                    </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                    Total: {registry.length}
                </div>
            </div>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative">
                <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                    <span className="w-24 pl-2">ID</span>
                    <span className="w-20">Source</span>
                    <span className="flex-1">Description</span>
                    <span className="w-16 text-center">Status</span>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {registry.map((bp) => (
                        <div key={bp.id} className={`flex items-center p-2 rounded-lg text-xs border transition-all ${
                            bp.source === 'external' 
                            ? 'bg-indigo-500/5 border-indigo-500/20' 
                            : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                        }`}>
                            <div className="w-24 font-mono font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{bp.id}</div>
                            <div className="w-20">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    bp.source === 'core' ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-indigo-500 text-white'
                                }`}>
                                    {bp.source}
                                </span>
                            </div>
                            <div className="flex-1 text-slate-500 truncate pr-2">{bp.description}</div>
                            <div className="w-16 flex justify-center">
                                {bp.status === 'active' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Internal Symbol Indicator */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/80 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-white/10 shadow-lg backdrop-blur-sm">
                    <Lock size={10} className="text-amber-500" />
                    Symbol(base) logic hidden
                </div>
            </div>
        </div>
      </div>

      {/* External Plugin Matrix */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Box size={20} /></div>
              <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">External Plugin Matrix</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Runtime Behavior & Constraints</p>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLUGIN_MATRIX.map((item) => (
                  <div key={item.feature} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
                      <div className="flex items-center gap-2 mb-3">
                          <item.icon size={16} className={item.color} />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{item.feature}</span>
                      </div>
                      <div className="space-y-2">
                          <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                              <code className="text-[10px] font-mono text-slate-600 dark:text-slate-400 break-words leading-tight">{item.behavior}</code>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                              {item.benefit}
                          </p>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Code Viewer */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-emerald-500/10 rounded text-emerald-500"><Code size={14} /></div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Implementation Detail: BlueprintLoader</span>
             </div>
             <span className="text-[9px] font-mono text-slate-400">TypeScript</span>
          </div>
          <div className="bg-slate-950 p-6 overflow-x-auto">
              <pre className="text-xs font-mono leading-relaxed text-slate-300">
                  {MOCK_CODE.split('\n').map((line, i) => (
                      <div key={i} className="flex gap-4">
                          <span className="text-slate-700 select-none w-6 text-right">{i+1}</span>
                          <span className={line.includes('//') ? 'text-slate-500' : line.includes('INTERNAL_BASE') ? 'text-amber-400 font-bold' : line.includes('import') || line.includes('export') ? 'text-indigo-400' : ''}>
                              {line}
                          </span>
                      </div>
                  ))}
              </pre>
          </div>
      </div>
    </div>
  );
};
