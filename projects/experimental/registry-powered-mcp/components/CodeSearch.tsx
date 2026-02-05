
import React, { useState, useMemo } from 'react';
import { Search, Zap, Cpu, Activity, Clock, FileCode, Loader2, ArrowRight, Filter, Calendar, FileType, SlidersHorizontal } from 'lucide-react';

export const CodeSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  
  // Filter States
  const [activeType, setActiveType] = useState<'ALL' | 'TS' | 'RUST' | 'CONFIG'>('ALL');
  const [activeDate, setActiveDate] = useState<'ANY' | '24H' | '7D' | '30D'>('ANY');

  const mockData = useMemo(() => {
    const now = Date.now();
    const hour = 3600 * 1000;
    const day = 24 * hour;

    return [
      { 
        file: 'src/routes/pty.ts', 
        type: 'TS',
        timestamp: new Date(now - 10 * 60 * 1000).toISOString(), // 10 mins ago
        line: 12, 
        content: 'const ptyPattern = new URLPattern({ pathname: "/mcp/pty/:id" });', 
        match: 'URLPattern' 
      },
      { 
        file: 'src/gateway/proxy.ts', 
        type: 'TS',
        timestamp: new Date(now - 15 * 60 * 1000).toISOString(), // 15 mins ago
        line: 45, 
        content: 'headers: { "Proxy-Authorization": `Bearer ${process.env.TOKEN}` }', 
        match: 'Proxy-Authorization' 
      },
      { 
        file: 'src/telemetry/agent.ts', 
        type: 'TS',
        timestamp: new Date(now - 20 * 60 * 1000).toISOString(), // 20 mins ago
        line: 8, 
        content: 'const metricsAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });', 
        match: 'keepAlive' 
      },
      { 
        file: 'src/runtime/server.ts', 
        type: 'TS',
        timestamp: new Date(now - 2 * hour).toISOString(), // 2 hours ago
        line: 142, 
        content: 'export const serve = (port: number) => Bun.serve({', 
        match: 'Bun.serve' 
      },
      { 
        file: 'src/mcp/registry.ts', 
        type: 'TS',
        timestamp: new Date(now - 5 * day).toISOString(), // 5 days ago
        line: 85, 
        content: 'const router = new URLPattern({ pathname: "/mcp/:id" });', 
        match: 'URLPattern' 
      },
      { 
        file: 'src/security/sandbox.rs', 
        type: 'RUST',
        timestamp: new Date(now - 12 * hour).toISOString(), // 12 hours ago
        line: 12, 
        content: 'let ctx = node.vm.create_context(isolate: true);', 
        match: 'node.vm' 
      },
      { 
        file: 'src/utils/compression.ts', 
        type: 'TS',
        timestamp: new Date(now - 45 * day).toISOString(), // 45 days ago
        line: 55, 
        content: 'return new CompressionStream("zstd");', 
        match: 'zstd' 
      },
      { 
        file: 'bunfig.toml', 
        type: 'CONFIG',
        timestamp: new Date(now - 1 * day).toISOString(), // 1 day ago
        line: 24, 
        content: 'preload = ["./preload.ts"]', 
        match: 'preload' 
      },
      { 
        file: 'src/storage/uploads.ts', 
        type: 'TS',
        timestamp: new Date(now - 3 * hour).toISOString(), // 3 hours ago
        line: 24, 
        content: 'await s3.write("img.png", data, { contentDisposition: "inline" });', 
        match: 'contentDisposition' 
      },
    ];
  }, []);

  const handleSearch = () => {
    // If no query, we might still want to show recent files if filters are applied, 
    // but typically code search requires a query. We'll allow empty query if filters are non-default.
    if (!query.trim() && activeType === 'ALL' && activeDate === 'ANY') return;
    
    setIsSearching(true);
    setResults([]);
    
    // Simulate high-speed search with filtering logic
    setTimeout(() => {
      const now = Date.now();
      
      const filtered = mockData.filter(item => {
        // 1. Text Match
        const textMatch = !query.trim() || 
          item.file.toLowerCase().includes(query.toLowerCase()) || 
          item.content.toLowerCase().includes(query.toLowerCase());

        // 2. Type Match
        const typeMatch = activeType === 'ALL' || item.type === activeType;

        // 3. Date Match
        let dateMatch = true;
        const itemTime = new Date(item.timestamp).getTime();
        const diff = now - itemTime;
        const hour = 3600 * 1000;
        const day = 24 * hour;

        if (activeDate === '24H') dateMatch = diff <= 24 * hour;
        else if (activeDate === '7D') dateMatch = diff <= 7 * day;
        else if (activeDate === '30D') dateMatch = diff <= 30 * day;

        return textMatch && typeMatch && dateMatch;
      });

      setResults(filtered);
      setIsSearching(false);
    }, 400); // 400ms simulated latency
  };

  // Trigger search when filters change if there is a query present
  React.useEffect(() => {
    if (query.trim()) {
      handleSearch();
    }
  }, [activeType, activeDate]);

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/5 blur-3xl rounded-full -z-10"></div>
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.3em]">
                    <Zap size={14} /> 175x Faster Than Grep
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Rapid Code Search</h2>
                <p className="text-slate-500 text-sm">Instantaneous indexing across 300 global edge points.</p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                      type="text" 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search codebase, patterns, or tokens..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-32 text-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-xl"
                  />
                  <button 
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'SEARCH'}
                  </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 p-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                 <div className="flex items-center gap-3 px-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filters</span>
                 </div>
                 <div className="h-auto w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>
                 
                 {/* File Type */}
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 font-mono hidden md:block">TYPE:</span>
                    <div className="flex gap-1">
                      {['ALL', 'TS', 'RUST', 'CONFIG'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setActiveType(type as any)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            activeType === type 
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-emerald-500'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="h-auto w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                 {/* Date Range */}
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 font-mono hidden md:block">TIME:</span>
                    <div className="flex gap-1">
                      {['ANY', '24H', '7D', '30D'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setActiveDate(range as any)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            activeDate === range 
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-sky-500'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                 </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Cpu size={12}/> KQueue Loop</span>
                <span className="flex items-center gap-1.5"><Activity size={12}/> Parallel Indexing</span>
                <span className="flex items-center gap-1.5"><Clock size={12}/> 85ns Match</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {results.length > 0 ? (
          results.map((res, i) => (
            <div key={i} className="glass-panel p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-all group animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                            <FileCode size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center gap-2">
                              {res.file}
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                                res.type === 'TS' ? 'bg-blue-500/10 text-blue-500' :
                                res.type === 'RUST' ? 'bg-orange-500/10 text-orange-500' :
                                'bg-slate-500/10 text-slate-500'
                              }`}>
                                {res.type}
                              </span>
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono">Line {res.line}</span>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock size={10} /> {formatTimeAgo(res.timestamp)}
                              </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">MATCH: {res.match}</span>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-lg font-mono text-[13px] border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 mr-4 select-none">{res.line}</span>
                    <span className="text-slate-700 dark:text-slate-300">
                        {res.content.split(res.match).map((part: string, j: number, arr: string[]) => (
                            <React.Fragment key={j}>
                                {part}
                                {j < arr.length - 1 && <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-sm px-0.5">{res.match}</span>}
                            </React.Fragment>
                        ))}
                    </span>
                </div>
            </div>
          ))
        ) : query && !isSearching ? (
          <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Zap size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
              <p className="text-slate-500 font-medium">No matches found.</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or query.</p>
              <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">Search complexity: O(1) via Edge-Caching</p>
          </div>
        ) : !query && (
          <div className="text-center py-20 opacity-50">
             <SlidersHorizontal size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
             <p className="text-sm text-slate-500">Enter a query or select filters to begin search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
