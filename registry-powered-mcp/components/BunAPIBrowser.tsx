
import React, { useState, useMemo } from 'react';
import { Search, Code2, Terminal, Server, Database, Globe, Cpu, FileCode, Hash, Play, Box, Layers, Zap, Archive, Key, Share2, Library, BookOpen, Repeat, Package } from 'lucide-react';

interface ApiItem {
    topic: string;
    apis: string[];
    desc: string;
}

interface ApiCategory {
    id: string;
    title: string;
    icon: React.ElementType;
    color: string;
    items: ApiItem[];
}

const API_DATA: ApiCategory[] = [
    {
        id: 'runtime',
        title: 'Core Runtime',
        icon: Terminal,
        color: 'text-emerald-500',
        items: [
            { topic: 'HTTP Server', apis: ['Bun.serve'], desc: 'High-performance HTTP/1.1 & H2 server' },
            { topic: 'Shell', apis: ['$'], desc: 'Cross-platform shell automation with template literals' },
            { topic: 'Bundler', apis: ['Bun.build'], desc: 'Native fast bundler for JS/TS' },
            { topic: 'File I/O', apis: ['Bun.file', 'Bun.write', 'Bun.stdin', 'Bun.stdout'], desc: 'Optimized filesystem operations' },
            { topic: 'Child Processes', apis: ['Bun.spawn', 'Bun.spawnSync'], desc: 'Non-blocking process orchestration' },
            { topic: 'Transpiler', apis: ['Bun.Transpiler'], desc: 'Fast TypeScript/JSX transpilation' },
            { topic: 'Workers', apis: ['new Worker()'], desc: 'Multithreaded background tasks' },
            { topic: 'Plugins', apis: ['Bun.plugin'], desc: 'Extend runtime capabilities' },
        ]
    },
    {
        id: 'networking',
        title: 'Networking',
        icon: Globe,
        color: 'text-sky-500',
        items: [
            { topic: 'Fetch Preconnect', apis: ['fetch({ preconnect: true })'], desc: 'Warm up TCP/TLS connections before requests' },
            { topic: 'TCP Sockets', apis: ['Bun.listen', 'Bun.connect'], desc: 'Low-level TCP server/client primitives' },
            { topic: 'UDP Sockets', apis: ['Bun.udpSocket'], desc: 'Datagram socket support' },
            { topic: 'WebSockets', apis: ['new WebSocket()', 'Bun.serve'], desc: 'Standard WebSocket client & server' },
            { topic: 'DNS', apis: ['Bun.dns.lookup', 'Bun.dns.prefetch'], desc: 'Asynchronous DNS resolution' },
            { topic: 'Routing', apis: ['Bun.FileSystemRouter'], desc: 'File-system based routing table' },
            { topic: 'Cookie Map', apis: ['Bun.CookieMap'], desc: 'Fast, native C++ Map for O(1) cookie manipulation in Bun.serve().' },
            { topic: 'Cookie State', apis: ['Bun.Cookie'], desc: 'Native RFC 6265 implementation supporting partitioned (CHIPS) attributes.' },
            { topic: 'HTTP/25', apis: ['RFC 7230'], desc: 'Verified RFC 7230 Keep-Alive reuse across the 300 PoP lattice.' },
        ]
    },
    {
        id: 'pm',
        title: 'Package Manager',
        icon: Package,
        color: 'text-orange-500',
        items: [
            { topic: 'Installation', apis: ['Bun.install'], desc: 'Programmatic package installation with cache optimization' },
            { topic: 'Publishing', apis: ['Bun.publish'], desc: 'Publish packages to registry via API' },
            { topic: 'Resolution', apis: ['Bun.resolve'], desc: 'Resolve package path from registry' },
            { topic: 'Manifest IO', apis: ['bun pm pkg get', 'bun pm pkg set'], desc: 'Read and modify package.json properties' },
            { topic: 'Manifest Maintenance', apis: ['bun pm pkg fix', 'bun pm pkg delete'], desc: 'Auto-fix issues and remove properties' },
            { topic: 'Global Cache', apis: ['Bun.cache.check', 'BUN_INSTALL_CACHE_DIR'], desc: 'Verify cache status and configuration' },
            { topic: 'Temp Storage', apis: ['Bun.createTempDir'], desc: 'Create temporary directories for operations' },
        ]
    },
    {
        id: 'data',
        title: 'Data & Storage',
        icon: Database,
        color: 'text-amber-500',
        items: [
            { topic: 'S3 Client', apis: ['s3', 's3.file', 's3.write'], desc: 'Native S3 client with Content-Disposition support' },
            { topic: 'SQLite', apis: ['bun:sqlite'], desc: 'Built-in high-performance SQLite driver' },
            { topic: 'PostgreSQL', apis: ['Bun.sql'], desc: 'Native high-performance PostgreSQL driver' },
            { topic: 'Redis (Valkey)', apis: ['Bun.RedisClient'], desc: 'Native Redis client implementation' },
            { topic: 'Streaming HTML', apis: ['HTMLRewriter'], desc: 'High-speed HTML transformation' },
            { topic: 'FFI', apis: ['bun:ffi'], desc: 'Foreign Function Interface for C/Rust/Zig' },
        ]
    },
    {
        id: 'utils',
        title: 'Utilities & Crypto',
        icon: Hash,
        color: 'text-indigo-500',
        items: [
            { topic: 'Hashing', apis: ['Bun.password', 'Bun.hash', 'Bun.sha'], desc: 'Native crypto and hashing utilities' },
            { topic: 'Testing', apis: ['bun:test'], desc: 'Fast, Jest-compatible test runner' },
            { topic: 'Glob', apis: ['Bun.Glob'], desc: 'Fast glob pattern matching' },
            { topic: 'Sleep & Timing', apis: ['Bun.sleep', 'Bun.nanoseconds'], desc: 'High-precision timing primitives' },
            { topic: 'UUID', apis: ['Bun.randomUUIDv7'], desc: 'Native UUID generation' },
            { topic: 'Env', apis: ['Bun.env'], desc: 'Environment variable access' },
        ]
    },
    {
        id: 'processing',
        title: 'Data Processing',
        icon: Layers,
        color: 'text-rose-500',
        items: [
            { topic: 'Compression', apis: ['Bun.gzipSync', 'Bun.deflateSync', 'Bun.zstdCompress'], desc: 'Native compression algorithms (Gzip, Zstd)' },
            { topic: 'Streams', apis: ['Bun.readableStreamTo*'], desc: 'Utilities for stream conversion' },
            { topic: 'Comparison', apis: ['Bun.deepEquals', 'Bun.peek'], desc: 'Deep equality and inspection' },
            { topic: 'Parsing', apis: ['Bun.semver', 'Bun.TOML'], desc: 'Native parsers for SemVer, TOML' },
            { topic: 'HTML', apis: ['Bun.escapeHTML'], desc: 'Fast HTML escaping' },
        ]
    }
];

export const BunAPIBrowser: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        
        return API_DATA.map(category => ({
            ...category,
            items: category.items.filter(item => {
                const matchesSearch = 
                    item.topic.toLowerCase().includes(term) || 
                    item.apis.some(api => api.toLowerCase().includes(term)) ||
                    item.desc.toLowerCase().includes(term);
                
                const matchesCategory = activeCategory === 'all' || category.id === activeCategory;
                
                return matchesSearch && matchesCategory;
            })
        })).filter(category => category.items.length > 0);
    }, [searchTerm, activeCategory]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-3xl rounded-full -z-10"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em]">
                            <Library size={14} /> Native API Reference
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Bun Native Primitives</h2>
                        <p className="text-slate-500 text-sm max-w-xl">
                            Explore the optimized, native APIs built directly into the Bun runtime. These primitives offer significant performance advantages over polyfills.
                        </p>
                    </div>
                    
                    <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center min-w-[140px]">
                         <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Runtime Version</div>
                         <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Bun v1.12.0</div>
                         <div className="text-[10px] font-mono text-emerald-500 mt-1">{"Production Ready"}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeCategory === 'all' 
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                        >
                            <BookOpen size={12} />
                            All APIs
                        </button>
                        {API_DATA.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeCategory === cat.id 
                                    ? `bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg border border-slate-200 dark:border-slate-700` 
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                            >
                                <cat.icon size={12} className={activeCategory === cat.id ? cat.color : ''} />
                                {cat.title}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search APIs (e.g., serve, sqlite, ffi)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredData.map(category => (
                    <React.Fragment key={category.id}>
                        {category.items.map((item, idx) => (
                            <div key={`${category.id}-${idx}`} className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-all group flex flex-col h-full animate-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-900 ${category.color} bg-opacity-10`}>
                                            <category.icon size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{category.title}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Share2 size={14} className="text-slate-400 hover:text-emerald-500 cursor-pointer" />
                                    </div>
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{item.topic}</h3>
                                <p className="text-xs text-slate-500 mb-4 flex-1 leading-relaxed">{item.desc}</p>
                                
                                <div className="space-y-2">
                                    {item.apis.map(api => (
                                        <div key={api} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
                                            <code className="text-xs font-mono text-indigo-500 font-bold">{api}</code>
                                            <Code2 size={12} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>

            {filteredData.length === 0 && (
                <div className="text-center py-20 opacity-50">
                    <Database size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500">No APIs found</h3>
                    <p className="text-sm text-slate-400">Try adjusting your search terms.</p>
                </div>
            )}
        </div>
    );
};
