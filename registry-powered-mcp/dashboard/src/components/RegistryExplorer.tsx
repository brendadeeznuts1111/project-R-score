
import React, { useState, useMemo } from 'react';
import { RegistryPackage } from '../types';
import { Box, Search, X, ShieldCheck, ChevronRight, Zap, Database, ShieldAlert, CheckCircle2, Settings, List, Server, Globe, User, Users, GitBranch, History, FileDiff, Link as LinkIcon, Lock, Tag, Archive, Fingerprint, HardDrive } from 'lucide-react';
import { validatePackage } from '../services/registryValidation';
import { EnterpriseRegistryConfig } from './EnterpriseRegistryConfig';

interface RegistryExplorerProps {
  packages: RegistryPackage[];
}

export const RegistryExplorer: React.FC<RegistryExplorerProps> = ({ packages }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'explorer' | 'config'>('explorer');
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return packages;
    return packages.filter(p => 
      p.name.toLowerCase().includes(term) || 
      Object.keys(p.dependencies).some(d => d.toLowerCase().includes(term))
    );
  }, [packages, searchTerm]);

  const getValidationStatus = (pkg: RegistryPackage) => {
    const mockDataForValidation = {
      package: pkg.name,
      version: pkg.version,
      dependencies: pkg.dependencies,
      trustedSources: ["npm:", "github:", "git:", "link:"],
      types: {
        compatibility: {
          node: pkg.types.compatibility.node
        }
      }
    };
    return validatePackage(mockDataForValidation);
  };

  const getProtocolBadge = (protocol: string) => {
    switch (protocol) {
      case 'npm': return <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">NPM</span>;
      case 'jsr': return <span className="text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20">JSR</span>;
      case 'workspace': return <span className="text-[9px] font-black uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded border border-blue-500/20">WORKSPACE</span>;
      default: return <span className="text-[9px] font-black uppercase bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded border border-slate-500/20">{protocol}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <button 
                  onClick={() => setViewMode('explorer')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'explorer' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}
              >
                  <List size={14} /> EXPLORER
              </button>
              <button 
                  onClick={() => setViewMode('config')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'config' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}
              >
                  <Server size={14} /> ENTERPRISE SCOPES
              </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <Database size={12} className="text-emerald-500" />
              REGISTRY_POOL: {packages.length} NODES | VERSION: 2.0
          </div>
      </div>

      {viewMode === 'explorer' ? (
        <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col min-h-[600px] shadow-2xl">
          <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Database size={20} className="text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Package Registry</h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Type-Safe Hub v2.0</p>
                </div>
              </div>

              <div className="relative group flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search packages, dependencies, or protocols..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-700 dark:text-slate-200"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"><X size={14}/></button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 scrollbar-thin">
            {filtered.length > 0 ? (
              filtered.map(pkg => {
                const validation = getValidationStatus(pkg);
                const isExpanded = expandedPackage === pkg.name;
                
                return (
                  <div key={pkg.name} className="group">
                    <div 
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer ${isExpanded ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''}`}
                      onClick={() => setExpandedPackage(isExpanded ? null : pkg.name)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 w-full">
                          {/* Icon Column */}
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                              <Box size={24} />
                            </div>
                            {validation.success ? (
                               <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900 shadow-sm" title="Zod Schema Verified">
                                  <CheckCircle2 size={10} />
                               </div>
                            ) : (
                              <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900 shadow-sm" title="Validation Failed">
                                  <ShieldAlert size={10} />
                               </div>
                            )}
                          </div>

                          {/* Content Column */}
                          <div className="flex-1 min-w-0">
                            {/* Title Row */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{pkg.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">v{pkg.version}</span>
                              {getProtocolBadge(pkg.protocol)}
                              {validation.success && (
                                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter ml-auto md:ml-0">Verified</span>
                              )}
                            </div>

                            {/* Meta Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 text-[10px] text-slate-500">
                                {pkg.author && (
                                    <div className="flex items-center gap-1.5">
                                        <User size={12} className="text-slate-400" />
                                        <span>{pkg.author}</span>
                                    </div>
                                )}
                                {pkg.maintainers && pkg.maintainers.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <Users size={12} className="text-slate-400" />
                                        <span>{pkg.maintainers.length} maintainers</span>
                                    </div>
                                )}
                                {pkg.homepage && (
                                    <a href={pkg.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors" onClick={e => e.stopPropagation()}>
                                        <Globe size={12} className="text-slate-400" />
                                        <span className="truncate max-w-[150px]">Homepage</span>
                                    </a>
                                )}
                                {pkg.repository && (
                                    <a href={pkg.repository} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors" onClick={e => e.stopPropagation()}>
                                        <GitBranch size={12} className="text-slate-400" />
                                        <span className="truncate max-w-[150px]">Repository</span>
                                    </a>
                                )}
                                {pkg.license && (
                                    <div className="flex items-center gap-1.5">
                                        <Lock size={12} className="text-slate-400" />
                                        <span>{pkg.license}</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-1">{pkg.description}</p>

                            {/* Keywords */}
                            {pkg.keywords && pkg.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {pkg.keywords.map(kw => (
                                        <span key={kw} className="text-[9px] text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Dependencies Row */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${pkg.types.compatibility.node === '25' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                NODE {pkg.types.compatibility.node}
                              </span>
                              {Object.keys(pkg.dependencies).slice(0, 3).map(dep => (
                                <span key={dep} className="text-[9px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                  {dep}@{pkg.dependencies[dep]}
                                </span>
                              ))}
                              {Object.keys(pkg.dependencies).length > 3 && (
                                <span className="text-[9px] text-slate-400 px-1.5 py-0.5">+{Object.keys(pkg.dependencies).length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chevron */}
                        <div className="flex items-center pl-2">
                          <button className={`p-2 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-indigo-500' : 'text-slate-300'}`}>
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-16 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/50 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left: Changes & History */}
                              <div className="space-y-4">
                                  <div className="space-y-2">
                                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                          <FileDiff size={12} className="text-amber-500" /> Recent Changes
                                      </h5>
                                      <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono">
                                          {pkg.recentChanges || "No recent changes logged."}
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                          <History size={12} className="text-sky-500" /> Version History
                                      </h5>
                                      <div className="space-y-1">
                                          {pkg.history && pkg.history.length > 0 ? pkg.history.map((h, i) => (
                                              <div key={i} className="flex justify-between items-center p-2 rounded bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-[10px]">
                                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">v{h.version}</span>
                                                  <span className="text-slate-500">{h.date}</span>
                                              </div>
                                          )) : (
                                              <div className="text-[10px] text-slate-400 italic">No history available.</div>
                                          )}
                                      </div>
                                  </div>
                              </div>

                              {/* Right: Full Dependencies & Config */}
                              <div className="space-y-4">
                                  <div className="space-y-2">
                                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                          <LinkIcon size={12} className="text-emerald-500" /> Full Dependencies
                                      </h5>
                                      <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                                          {Object.entries(pkg.dependencies).map(([dep, ver]) => (
                                              <span key={dep} className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                                  {dep}: <span className="text-indigo-500">{ver}</span>
                                              </span>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex items-start gap-3">
                                      <Settings size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                                      <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Configuration</span>
                                          <p className="text-[10px] text-slate-500">
                                              Type definitions are located at <code className="text-slate-700 dark:text-slate-300">{pkg.types.definitions}</code>.
                                              Compatible with Node.js {pkg.types.compatibility.node}.
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Distribution & Tags Row */}
                          {(pkg.dist || pkg.distTags) && (
                              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {pkg.dist && (
                                      <div className="space-y-2">
                                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                              <Archive size={12} className="text-purple-500" /> Distribution (dist)
                                          </h5>
                                          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1">
                                              <div className="flex gap-2">
                                                  <span className="text-slate-500 w-16 shrink-0">.tarball:</span>
                                                  <span className="text-emerald-400 truncate">{pkg.dist.tarball}</span>
                                              </div>
                                              <div className="flex gap-2">
                                                  <span className="text-slate-500 w-16 shrink-0">.shasum:</span>
                                                  <span className="text-sky-400 truncate">{pkg.dist.shasum}</span>
                                              </div>
                                              <div className="flex gap-2">
                                                  <span className="text-slate-500 w-16 shrink-0">.integrity:</span>
                                                  <span className="text-amber-400 truncate">{pkg.dist.integrity}</span>
                                              </div>
                                              <div className="flex gap-2">
                                                  <span className="text-slate-500 w-16 shrink-0">.size:</span>
                                                  <span className="text-slate-300">{pkg.dist.unpackedSize}</span>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                                  {pkg.distTags && (
                                      <div className="space-y-2">
                                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                              <Tag size={12} className="text-rose-500" /> Dist Tags
                                          </h5>
                                          <div className="grid grid-cols-2 gap-2">
                                              {Object.entries(pkg.distTags).map(([tag, ver]) => (
                                                  <div key={tag} className="flex justify-between items-center p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px]">
                                                      <span className="font-bold text-slate-600 dark:text-slate-400 uppercase">{tag}</span>
                                                      <span className="font-mono text-indigo-500">{ver}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-300">
                <Search size={48} className="text-slate-200 dark:text-slate-800 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No packages found matching your criteria</p>
                <p className="text-xs text-slate-400 mt-1">Registry is isolated and filtered.</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-mono px-5">
            <span className="text-slate-400 uppercase tracking-widest">Registry Instance: Operational</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-indigo-500 font-bold">
                <Zap size={10} />
                <span>JSC LOAD ISOLATED</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500 font-bold">
                <ShieldCheck size={10} />
                <span>ZOD VALIDATION ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EnterpriseRegistryConfig />
      )}
    </div>
  );
};
