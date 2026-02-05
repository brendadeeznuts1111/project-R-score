
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Maximize2, Minimize2, Power, Zap, Cpu, Activity, Cookie, ShieldCheck, Beaker, Shield, AlertTriangle } from 'lucide-react';
import { REGISTRY_MATRIX, EDGE_ROUTES } from '../constants';

interface TerminalWidgetProps {
    connectionUrl?: string;
    type: 'bash' | 'vim' | 'htop' | 'lsp';
}

export const TerminalWidget: React.FC<TerminalWidgetProps> = ({ connectionUrl, type }) => {
    const [lines, setLines] = useState<string[]>(['> Status: STANDBY (Ready to Spawn)']);
    const [isConnected, setIsConnected] = useState(false);
    const [isGlitching, setIsGlitching] = useState(false);
    const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
    const [bufferLevel, setBufferLevel] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSpawn = () => {
        if (!isConnected) {
            setIsGlitching(true);
            setTimeout(() => {
                setIsGlitching(false);
                setIsConnected(true);
            }, 400);
        } else {
            setIsConnected(false);
            setLines(['> Session Disconnected.', '> Status: STANDBY (Ready to Spawn)']);
            setBufferLevel(0);
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        let hbInterval: ReturnType<typeof setInterval>;
        let bufferInterval: ReturnType<typeof setInterval>;
        let rssInterval: ReturnType<typeof setInterval>;
        
        if (isConnected) {
            setLines(prev => [
                ...prev, 
                `> Connecting to ${connectionUrl || 'local socket'} via WebSocket Bridge...`,
                `> INITIALIZING_WS_BRIDGE...`,
                `> ACCESSING: ${REGISTRY_MATRIX.COOKIES.ENGINE}`,
                `> ANCHORING_SESSION: ${REGISTRY_MATRIX.COOKIES.SESSION_NAME}=TOKEN_AUTH_SUCCESS`,
                `> ENFORCING_FRAGMENT_GUARD: RFC 6455 §5.4`,
                `> PTY_V2_READY: Connection Upgraded.`
            ]);
            
            // Initial connection sequence
            setTimeout(() => {
                // Apply Matrix Logic
                if (REGISTRY_MATRIX.FEATURES.FRAGMENT_GUARD.status === "ACTIVE") {
                     setLines(prev => [...prev, `> [SECURITY] Fragment Guard v${REGISTRY_MATRIX.FEATURES.FRAGMENT_GUARD.version} Active`]);
                     setLines(prev => [...prev, `> [BRIDGE] Applying ${REGISTRY_MATRIX.PROTOCOL_SIGNATURES.WS_BRIDGE} logic...`]);
                }

                // Simulate URLPattern Dispatcher
                // We simulate the server-side router logic here for telemetry visualization
                const requestUrl = `https://api.bun.sh/pty/${type}/session_${Math.floor(Math.random() * 9000) + 1000}`;
                const ptyMatch = EDGE_ROUTES.PTY_SESSION.exec(requestUrl);
                
                if (ptyMatch) {
                    const { program, id } = ptyMatch.pathname.groups || { program: type, id: 'unknown' };
                    setLines(prev => [...prev, `> [ROUTER] URLPattern Matched: /pty/${program}/${id}`]);
                    setLines(prev => [...prev, `> [DISPATCH] Upgrading to ${program} via Durable Object (85ns latency)...`]);
                } else {
                    setLines(prev => [...prev, `> [ROUTER] Route Mismatch: Falling back to legacy regex.`]);
                }

                const initLines = {
                    vim: [
                        `> [VIM] Loading native mouse support...`,
                        `> [VIM] Ripgrep-auto-save enabled (Search: 12ms).`,
                        `> [VIM] HistoryCLI buffer synchronized.`
                    ],
                    htop: [
                        `> [HTOP] Calibrating real-time 60fps telemetry...`,
                        `> [HTOP] Mapping R2 archive routes...`,
                        `> [HTOP] Worker streaming active.`
                    ],
                    bash: [
                        `> [BASH] bun update --interactive`,
                        `> [BASH] 1. semver: npm:@jsr/std__semver@1.0.5 -> 1.0.6`,
                        `> [BASH] 2. no-deps: npm:@types/no-deps@^1.0.0 -> ^2.0.0`,
                        `> [BASH] lockfile saved. Alias prefixes preserved.`
                    ],
                    lsp: [
                        `> [LSP] Bun v1.3.5+ Runtime Detected. Optimized Mode.`,
                        `> [LSP] Activator: Singleton Queue initialized.`,
                        `> [LSP] Pre-indexing workspace (5 markdown files)...`,
                        `> [LSP] Detected untagged code blocks in LSP_IMPLEMENTATION_STATUS.md`,
                        `> [LSP] Spawning 'typescript-language-server' via Bun.spawn()...`,
                        `> [LSP] Activation Time: 85ms (Target: <100ms) [PASS]`,
                        `> [LSP] Diagnostics: 0 errors, 2 warnings (missing tags).`
                    ]
                };
                
                setLines(prev => [
                    ...prev, 
                    `> Bridge established. Security Layer v1.3.6 Active.`, 
                    ...initLines[type],
                    `root@bun-registry:~/${type}# _`
                ]);
            }, 800);

            // HTOP Dynamic Update & Buffer Simulation
            if (type === 'htop') {
                interval = setInterval(() => {
                    const cpu = Math.floor(Math.random() * 20) + 5;
                    const mem = Math.floor(Math.random() * 10) + 15;
                    setLines(prev => {
                        const newLines = [...prev, `[HTOP] MEM: ${mem}MB/128MB | CPU: [|||     ] ${cpu}% | SWP: 0.0%` ];
                        if (newLines.length > 20) return newLines.slice(newLines.length - 20);
                        return newLines;
                    });
                }, 1000);
            }

            // Buffer fluctuation simulation
            bufferInterval = setInterval(() => {
                setBufferLevel(prev => {
                    const next = Math.max(0, Math.min(100, prev + (Math.random() * 40 - 20)));
                    return next;
                });
            }, 500);

            // 30s Heartbeat (INFRA-05)
            hbInterval = setInterval(() => {
                const now = new Date();
                setLastHeartbeat(now);
                setLines(prev => [
                    ...prev, 
                    `> [ws] 📶 PING payload: { t: ${now.getTime()} }`,
                    `> [ws] 📶 PONG (latency: 4ms) - Connection Stable`
                ]);
            }, 30000);

            // Lattice-Event-Stream Simulation
            rssInterval = setInterval(() => {
                // Simulate an RSS fetch event occasionally
                if (Math.random() > 0.7) {
                    setLines(prev => [
                        ...prev,
                        `> SYSCALL: STREAM_POLL => [Lattice-Event-Stream] 50_ITEMS_LOADED_OK`
                    ]);
                }
            }, 12000); // Check every 12s

        } else {
             setLastHeartbeat(null);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (hbInterval) clearInterval(hbInterval);
            if (bufferInterval) clearInterval(bufferInterval);
            if (rssInterval) clearInterval(rssInterval);
        };
    }, [isConnected, connectionUrl, type]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div className={`glass-panel rounded-xl overflow-hidden flex flex-col h-[400px] border border-slate-800 shadow-xl group relative ${isConnected ? '' : 'border-slate-700/50'}`}>
            
            {/* Scanline Overlay for Ghost Terminal */}
            {!isConnected && !isGlitching && (
                <div className="absolute inset-0 z-10 pointer-events-none scanlines opacity-50 bg-black/40">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-slate-600 font-black text-4xl opacity-20 uppercase tracking-[0.5em] -rotate-12 select-none">
                            Signal Lost
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900/80 p-3 border-b border-slate-800 flex justify-between items-center transition-colors group-hover:bg-slate-900 z-20">
                <div className="flex items-center gap-2">
                    <Terminal size={16} className={isConnected ? "text-emerald-500" : "text-slate-500"} />
                    <span className="text-xs font-mono text-slate-300">root@bun-registry:~/{type}</span>
                    {isConnected && (
                        <div className="flex items-center gap-3 ml-2">
                            <span className="text-[10px] text-sky-400 flex items-center gap-1 font-bold">
                                <Zap size={10} /> WS_BRIDGE
                            </span>
                            <span className="text-[10px] text-rose-400 flex items-center gap-1 font-bold">
                                <Beaker size={10} /> TEST_RUNNER_1.3.1
                            </span>
                            {lastHeartbeat && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
                                    📶 LIVE
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSpawn}
                        className={`text-xs px-3 py-1 rounded border transition-all duration-200 font-bold uppercase tracking-tighter shadow-[0_0_10px_rgba(0,0,0,0)] hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] ${isConnected ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'}`}
                    >
                        {isConnected ? <span className="flex items-center gap-1"><Power size={12}/> Kill</span> : <span className="flex items-center gap-1"><Power size={12}/> Spawn</span>}
                    </button>
                </div>
            </div>
            
            <div 
                ref={scrollRef}
                className={`flex-1 bg-black p-4 font-mono text-[13px] overflow-y-auto selection:bg-emerald-500/20 relative ${isGlitching ? 'glitch bg-slate-900' : 'text-emerald-500/90'}`}
            >
                {lines.map((line, i) => (
                    <div key={i} className={`mb-1 ${line.startsWith('[HTOP]') ? 'text-sky-400' : line.includes('📶') ? 'text-slate-500' : ''} ${isGlitching ? 'opacity-50' : ''}`}>{line}</div>
                ))}
                {isConnected && (
                    <div className="animate-pulse inline-block w-2 h-4 bg-emerald-500/50"></div>
                )}
            </div>

            {/* Footer with Fragment Guard Visualizer */}
            <div className="p-2 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-4 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase">
                        <ShieldCheck size={10} className={bufferLevel > 80 ? "text-rose-500 animate-pulse" : "text-emerald-500"} /> 
                        Fragment Guard
                    </div>
                    {/* Visual Buffer Bar */}
                    <div className="flex items-center gap-2 w-32">
                        <span className="text-[8px] font-mono text-slate-600">BUF:</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ${bufferLevel > 80 ? 'bg-rose-500' : bufferLevel > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${isConnected ? bufferLevel : 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Cpu size={10} className="text-slate-600" />
                    <span className="text-[9px] text-slate-600 font-mono">{REGISTRY_MATRIX.RUNTIME.VERSION}</span>
                </div>
            </div>
        </div>
    );
};
