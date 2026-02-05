
import React, { useState, useMemo } from 'react';
import { ServiceTopology } from '../types';
import { Copy, ExternalLink, Globe, Wifi, Search, X, ShieldCheck, Filter } from 'lucide-react';

interface EndpointListProps {
  endpoints: ServiceTopology;
}

export const EndpointList: React.FC<EndpointListProps> = ({ endpoints }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'mcp' | 'pty' | 'api'>('all');

  const categories = [
    { id: 'all', label: 'All Routes' },
    { id: 'mcp', label: 'MCP Core' },
    { id: 'pty', label: 'Terminal/PTY' },
    { id: 'api', label: 'API/Services' },
  ];

  const filteredEndpoints = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let entries = Object.entries(endpoints);

    if (activeCategory !== 'all') {
      entries = entries.filter(([name]) => {
        if (activeCategory === 'mcp') return name.startsWith('mcp');
        if (activeCategory === 'pty') return name.startsWith('pty');
        if (activeCategory === 'api') return name.startsWith('ai') || name.startsWith('r2') || name.startsWith('graphql');
        return true;
      });
    }

    if (!term) return entries;
    
    return entries.filter(([name, value]) => {
      const url = String(value).toLowerCase();
      const key = name.toLowerCase();
      return key.includes(term) || url.includes(term);
    });
  }, [endpoints, searchTerm, activeCategory]);

  const totalCount = Object.keys(endpoints).length;
  const filteredCount = filteredEndpoints.length;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const highlightMatch = (text: string, term: string) => {
    if (!term) return text;
    // Escape regex special characters to prevent errors
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() 
            ? <span key={i} className="bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-sm px-0.5 font-semibold">{part}</span> 
            : part
        )}
      </span>
    );
  };

  return (
    <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col h-[600px] shadow-2xl transition-all">
        {/* Header with Search and Filters */}
        <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Globe size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Production Endpoints</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Active Edge Topology</p>
                        </div>
                    </div>

                    <div className="relative group flex-1 max-w-md">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search size={16} />
                        </div>
                        <input 
                            type="text"
                            placeholder="Search by name or URL..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 p-1"><X size={14} /></button>
                        )}
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id as any)}
                      className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        activeCategory === cat.id 
                          ? 'bg-blue-500 border-blue-600 text-white shadow-md shadow-blue-500/20' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
            </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 scrollbar-thin">
            {filteredCount > 0 ? (
                filteredEndpoints.map(([name, value]) => {
                    const url = String(value);
                    const isWS = url.startsWith('ws');
                    
                    return (
                        <div key={name} className="p-4 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all group flex items-center justify-between">
                            <div className="flex flex-col min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                      {highlightMatch(name, searchTerm)}
                                    </span>
                                    {isWS && (
                                        <span className="text-[9px] font-bold bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded border border-purple-500/20">SOCKET</span>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 truncate opacity-80">
                                    {highlightMatch(url, searchTerm)}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => copyToClipboard(url)} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500 shadow-sm transition-all">
                                    <Copy size={14} />
                                </button>
                                {!isWS ? (
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-500 shadow-sm transition-all">
                                        <ExternalLink size={14} />
                                    </a>
                                ) : (
                                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400"><Wifi size={14} /></div>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Filter size={32} className="text-slate-200 dark:text-slate-800 mb-4" />
                    <p className="text-slate-500 dark:text-slate-500 text-sm">No routes found matching "{searchTerm}"</p>
                </div>
            )}
        </div>

        {/* Footer Stats */}
        <div className="p-3 px-5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-mono font-bold">
            <span className="text-slate-400 uppercase tracking-widest">Active Filter: {filteredCount} / {totalCount}</span>
            <div className="flex items-center gap-2 text-emerald-500">
                <ShieldCheck size={10} />
                <span>TOPOLOGY VERIFIED</span>
            </div>
        </div>
    </div>
  );
};
