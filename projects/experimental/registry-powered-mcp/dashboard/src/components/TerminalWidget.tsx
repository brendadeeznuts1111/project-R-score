
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Maximize2, Minimize2, Power, Zap, Cpu, Activity, Cookie, ShieldCheck, Beaker, Shield, AlertTriangle, Monitor, HardDrive, Clock, ChevronRight, Play, Square, Check } from 'lucide-react';
import { REGISTRY_MATRIX, EDGE_ROUTES } from '../constants';

interface TerminalWidgetProps {
    connectionUrl?: string;
    type: 'bash' | 'vim' | 'htop' | 'lsp';
}

interface SharedMemoryBuffer {
    id: string;
    size: number;
    offset: number;
    data: string[];
    lastWrite: number;
    permissions: 'rw' | 'r';
}

interface ProcessEntry {
    id: string;
    command: string;
    pid: number;
    status: 'running' | 'completed' | 'failed';
    startTime: number;
    endTime?: number;
    exitCode?: number;
    memoryUsage: number;
    output: string[];
}

interface TerminalHardwareState {
    cols: number;
    rows: number;
    mode: 'cooked' | 'raw';
    encoding: string;
    bufferSize: number;
}

export const TerminalWidget: React.FC<TerminalWidgetProps> = ({ connectionUrl, type }) => {
    const [lines, setLines] = useState<string[]>(['> Status: STANDBY (Ready to Spawn)']);
    const [isConnected, setIsConnected] = useState(false);
    const [isGlitching, setIsGlitching] = useState(false);
    const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
    const [bufferLevel, setBufferLevel] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // POSIX Shared Memory Simulation
    const [sharedBuffers, setSharedBuffers] = useState<SharedMemoryBuffer[]>([
        {
            id: '/dev/shm/terminal_buffer',
            size: 4096,
            offset: 0,
            data: [],
            lastWrite: Date.now(),
            permissions: 'rw'
        }
    ]);

    // Active Terminal Stack (Process Tracking)
    const [processStack, setProcessStack] = useState<ProcessEntry[]>([]);

    // Hardware UI HUD State
    const [hardwareState, setHardwareState] = useState<TerminalHardwareState>({
        cols: 80,
        rows: 24,
        mode: 'cooked',
        encoding: 'UTF-8',
        bufferSize: 4096
    });

    // Sequential Process Writing Simulation
    const [currentWriter, setCurrentWriter] = useState<string | null>(null);
    const [writeQueue, setWriteQueue] = useState<string[]>([]);

    // Bun v1.3.5 Terminal API Integration
    const [terminalDimensions, setTerminalDimensions] = useState({ cols: 80, rows: 24 });
    const [stringWidthAccuracy, setStringWidthAccuracy] = useState(true);

    // POSIX Shared Memory Operations
    const awaitUsing = async (resource: any, fn: (resource: any) => Promise<void>): Promise<void> => {
        try {
            await fn(resource);
        } finally {
            // Resource cleanup simulation
            console.log(`[POSIX] Resource cleanup: ${JSON.stringify(resource)}`);
        }
    };

    const writeToSharedBuffer = async (bufferId: string, data: string): Promise<void> => {
        return awaitUsing({ bufferId, data }, async (resource) => {
            setSharedBuffers(prev => prev.map(buffer => {
                if (buffer.id === resource.bufferId) {
                    const newData = [...buffer.data, resource.data];
                    const newOffset = buffer.offset + resource.data.length;
                    return {
                        ...buffer,
                        data: newData.slice(-10), // Keep last 10 entries
                        offset: newOffset,
                        lastWrite: Date.now()
                    };
                }
                return buffer;
            }));

            // Simulate sequential writing without TTY renegotiation
            // Demonstrate Bun.stringWidth accuracy (v1.3.5)
            const dataWidth = calculateStringWidth(resource.data);
            setLines(prev => [...prev, `[SHM] ${bufferId}: ${resource.data} (width: ${dataWidth})`]);
        });
    };

    const spawnProcess = (command: string): ProcessEntry => {
        const pid = Math.floor(Math.random() * 65535) + 1000;
        const process: ProcessEntry = {
            id: `process_${pid}`,
            command,
            pid,
            status: 'running',
            startTime: Date.now(),
            memoryUsage: Math.floor(Math.random() * 50) + 10,
            output: []
        };

        setProcessStack(prev => [process, ...prev.slice(0, 9)]); // Keep last 10 processes
        return process;
    };

    const completeProcess = (processId: string, exitCode: number = 0) => {
        setProcessStack(prev => prev.map(process => {
            if (process.id === processId) {
                return {
                    ...process,
                    status: exitCode === 0 ? 'completed' : 'failed',
                    endTime: Date.now(),
                    exitCode
                };
            }
            return process;
        }));
    };

    const resizeTerminal = (cols: number, rows: number) => {
        setHardwareState(prev => ({
            ...prev,
            cols,
            rows
        }));

        setTerminalDimensions({ cols, rows });

        setLines(prev => [...prev, `[TTY] Terminal resized: ${cols}x${rows} (Bun.Terminal API)`]);
    };

    // Bun.stringWidth integration for accurate text width calculations
    const calculateStringWidth = (text: string): number => {
        if (typeof Bun !== 'undefined' && Bun.stringWidth) {
            try {
                return Bun.stringWidth(text);
            } catch {
                // Fallback to simple length calculation
                return text.length;
            }
        }

        // Fallback: basic Unicode-aware width calculation
        return [...text].reduce((width, char) => {
            // Handle zero-width characters (Bun.stringWidth improvements)
            if (['\u00AD', '\u2060', '\u2061', '\u2062', '\u2063', '\u2064'].includes(char)) {
                return width; // Zero width
            }

            // Handle emoji and combining characters
            const code = char.codePointAt(0);
            if (code && code > 0x1F600 && code < 0x1F64F) {
                return width + 2; // Emoji width
            }

            // Handle ANSI escape sequences
            if (char === '\x1b' && text.includes('[', text.indexOf(char))) {
                return width; // Skip ANSI sequences
            }

            return width + 1;
        }, 0);
    };

    const toggleTerminalMode = () => {
        setHardwareState(prev => ({
            ...prev,
            mode: prev.mode === 'cooked' ? 'raw' : 'cooked'
        }));

        setLines(prev => [...prev, `[TTY] Mode switched to: ${hardwareState.mode === 'cooked' ? 'RAW' : 'COOKED'}`]);
    };

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
            setProcessStack([]);
            setSharedBuffers(prev => prev.map(buf => ({ ...buf, data: [], offset: 0 })));
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
                    `> [Bun.stringWidth] Enhanced accuracy enabled (v1.3.5)`,
                    `> [Terminal] Dimensions: ${terminalDimensions.cols}x${terminalDimensions.rows}`,
                    ...initLines[type],
                    `root@bun-registry:~/${type}# _`
                ]);
            }, 800);

            // VIM Process Simulation with Bun.Terminal API Demo
            if (type === 'vim') {
                const vimProcess = spawnProcess('vim file.txt');

                setTimeout(() => {
                    const vimOutputs = [
                        '> [Bun.Terminal] Creating PTY instance...',
                        '> [Bun.Terminal] Attaching to vim subprocess...',
                        '> [VIM] process.stdout.isTTY: true (confirmed)',
                        `> [Bun.Terminal] cols: ${terminalDimensions.cols}, rows: ${terminalDimensions.rows}`,
                        '> [Bun.Terminal] Interactive mode enabled',
                        '> [VIM] Cursor positioning and colors working',
                        '> [Bun.Terminal] Resize handling active'
                    ];

                    vimOutputs.forEach((output, i) => {
                        setTimeout(() => {
                            writeToSharedBuffer('/dev/shm/terminal_buffer', output);
                            setLines(prev => [...prev, output]);

                            setProcessStack(prev => prev.map(p =>
                                p.id === vimProcess.id
                                    ? { ...p, output: [...p.output.slice(-4), output] }
                                    : p
                            ));
                        }, i * 250);
                    });

                    setTimeout(() => {
                        completeProcess(vimProcess.id, 0);
                    }, vimOutputs.length * 250 + 500);
                }, 500);
            }

            // POSIX Shared Memory Process Simulation
            if (type === 'htop') {
                // Spawn HTOP process
                const htopProcess = spawnProcess('htop');

                interval = setInterval(() => {
                    const cpu = Math.floor(Math.random() * 20) + 5;
                    const mem = Math.floor(Math.random() * 10) + 15;
                    const output = `[HTOP] MEM: ${mem}MB/128MB | CPU: [|||     ] ${cpu}% | SWP: 0.0%`;

                    // Write to shared memory buffer
                    writeToSharedBuffer('/dev/shm/terminal_buffer', output);

                    setLines(prev => {
                        const newLines = [...prev, output];
                        if (newLines.length > 20) return newLines.slice(newLines.length - 20);
                        return newLines;
                    });

                    // Update process output
                    setProcessStack(prev => prev.map(p =>
                        p.id === htopProcess.id
                            ? { ...p, output: [...p.output.slice(-4), output] }
                            : p
                    ));
                }, 1000);
            }

            // LSP Process Simulation
            if (type === 'lsp') {
                const lspProcess = spawnProcess('typescript-language-server');

                setTimeout(() => {
                    const outputs = [
                        '> [LSP] Pre-indexing workspace (5 markdown files)...',
                        '> [LSP] Detected untagged code blocks in LSP_IMPLEMENTATION_STATUS.md',
                        '> [LSP] Spawning \'typescript-language-server\' via Bun.spawn()...',
                        '> [LSP] Activation Time: 85ms (Target: <100ms) [PASS]',
                        '> [LSP] Diagnostics: 0 errors, 2 warnings (missing tags).'
                    ];

                    outputs.forEach((output, i) => {
                        setTimeout(() => {
                            writeToSharedBuffer('/dev/shm/terminal_buffer', output);
                            setLines(prev => [...prev, output]);

                            setProcessStack(prev => prev.map(p =>
                                p.id === lspProcess.id
                                    ? { ...p, output: [...p.output.slice(-4), output] }
                                    : p
                            ));
                        }, i * 200);
                    });

                    setTimeout(() => {
                        completeProcess(lspProcess.id, 0);
                    }, outputs.length * 200 + 500);
                }, 500);
            }

            // BASH Process Simulation with Sequential Writing
            if (type === 'bash') {
                const bashProcess = spawnProcess('bun update');

                setTimeout(() => {
                    const outputs = [
                        '> [BASH] bun update --interactive',
                        '> [BASH] 1. semver: npm:@jsr/std__semver@1.0.5 -> 1.0.6',
                        '> [BASH] 2. no-deps: npm:@types/no-deps@^1.0.0 -> ^2.0.0',
                        `> [Bun.stringWidth] 🇺🇸 width: ${calculateStringWidth('🇺🇸')} (flag emoji)`,
                        `> [Bun.stringWidth] 👋🏽 width: ${calculateStringWidth('👋🏽')} (emoji + skin tone)`,
                        `> [Bun.stringWidth] 👨‍👩‍👧 width: ${calculateStringWidth('👨‍👩‍👧')} (ZWJ sequence)`,
                        `> [Bun.stringWidth] \u2060 width: ${calculateStringWidth('\u2060')} (word joiner)`,
                        '> [BASH] lockfile saved. Alias prefixes preserved.'
                    ];

                    outputs.forEach((output, i) => {
                        setTimeout(() => {
                            writeToSharedBuffer('/dev/shm/terminal_buffer', output);
                            setLines(prev => [...prev, output]);

                            setProcessStack(prev => prev.map(p =>
                                p.id === bashProcess.id
                                    ? { ...p, output: [...p.output.slice(-4), output] }
                                    : p
                            ));
                        }, i * 300);
                    });

                    setTimeout(() => {
                        completeProcess(bashProcess.id, 0);
                    }, outputs.length * 300 + 500);
                }, 500);
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
        <div className={`glass-panel rounded-xl overflow-hidden flex flex-row h-[500px] border border-slate-800 shadow-xl group relative ${isConnected ? '' : 'border-slate-700/50'}`}>
            {/* POSIX Shared Memory Buffer Visualization */}
            <div className="w-80 border-r border-slate-800 flex flex-col">
                <div className="p-3 border-b border-slate-800 bg-slate-900/80">
                    <div className="flex items-center gap-2 mb-2">
                        <HardDrive size={14} className="text-blue-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Shared Memory</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Sequential process writing without TTY renegotiation</div>
                </div>

                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {sharedBuffers.map((buffer, index) => (
                        <div key={buffer.id} className="glass-panel p-3 rounded border border-slate-700">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-[10px] font-mono text-blue-400 truncate">{buffer.id}</div>
                                <div className="text-[9px] text-slate-500">{buffer.permissions}</div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] text-slate-400">
                                    <span>Size: {buffer.size}B</span>
                                    <span>Offset: {buffer.offset}</span>
                                </div>

                                <div className="w-full h-16 bg-slate-900 rounded border border-slate-700 overflow-hidden relative">
                                    {buffer.data.map((entry, i) => (
                                        <div
                                            key={i}
                                            className="absolute left-0 right-0 text-[8px] font-mono text-emerald-400 px-1 truncate"
                                            style={{
                                                top: `${(i * 12) + 2}px`,
                                                height: '10px',
                                                lineHeight: '10px'
                                            }}
                                        >
                                            {entry}
                                        </div>
                                    ))}

                                    {buffer.data.length === 0 && (
                                        <div className="flex items-center justify-center h-full text-[9px] text-slate-600">
                                            Buffer empty
                                        </div>
                                    )}
                                </div>

                                <div className="text-[8px] text-slate-500">
                                    Last write: {new Date(buffer.lastWrite).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Terminal Area */}
            <div className="flex-1 flex flex-col">
                {/* Hardware UI HUD */}
                <div className="p-3 border-b border-slate-800 bg-slate-900/80">
                    <div className="flex justify-between items-center">
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

                        {/* Hardware HUD */}
                        <div className="flex items-center gap-4 text-[9px] font-mono text-slate-400">
                            <div className="flex items-center gap-1">
                                <Monitor size={10} />
                                <span>COLS: {hardwareState.cols}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Monitor size={10} />
                                <span>ROWS: {hardwareState.rows}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Activity size={10} />
                                <span className="uppercase">{hardwareState.mode}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => resizeTerminal(120, 30)}
                                className="text-xs px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors text-slate-400 hover:text-slate-300"
                                title="Resize to 120x30"
                            >
                                120x30
                            </button>
                            <button
                                onClick={toggleTerminalMode}
                                className="text-xs px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors text-slate-400 hover:text-slate-300"
                                title="Toggle raw/cooked mode"
                            >
                                {hardwareState.mode === 'cooked' ? 'RAW' : 'COOKED'}
                            </button>
                            <button
                                onClick={handleSpawn}
                                className={`text-xs px-3 py-1 rounded border transition-all duration-200 font-bold uppercase tracking-tighter shadow-[0_0_10px_rgba(0,0,0,0)] hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] ${isConnected ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'}`}
                            >
                                {isConnected ? <span className="flex items-center gap-1"><Power size={12}/> Kill</span> : <span className="flex items-center gap-1"><Power size={12}/> Spawn</span>}
                            </button>
                        </div>
                    </div>
            </div>

                {/* Terminal Content */}
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

            {/* Active Terminal Stack (Process Tracking) */}
            <div className="w-80 border-l border-slate-800 flex flex-col">
                <div className="p-3 border-b border-slate-800 bg-slate-900/80">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} className="text-purple-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Active Terminal Stack</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Process history within this terminal instance</div>

                    {/* Bun v1.3.5 Terminal API Status */}
                    <div className="mt-3 p-2 rounded border border-cyan-500/20 bg-cyan-500/5">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${stringWidthAccuracy ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Bun.Terminal API</span>
                        </div>
                        <div className="text-[8px] text-slate-400">
                            PTY: {terminalDimensions.cols}x{terminalDimensions.rows} • StringWidth: {stringWidthAccuracy ? 'Enhanced' : 'Basic'}
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    {processStack.length === 0 ? (
                        <div className="text-center text-slate-600 text-xs py-8">
                            No active processes
                        </div>
                    ) : (
                        processStack.map((process, index) => (
                            <div key={process.id} className={`p-3 rounded border transition-all ${
                                process.status === 'running'
                                    ? 'border-blue-500/30 bg-blue-500/5'
                                    : process.status === 'completed'
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : 'border-red-500/30 bg-red-500/5'
                            }`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {process.status === 'running' && <Play size={12} className="text-blue-400 animate-pulse" />}
                                        {process.status === 'completed' && <Check size={12} className="text-emerald-400" />}
                                        {process.status === 'failed' && <Square size={12} className="text-red-400" />}
                                        <span className="text-xs font-bold text-slate-200">{process.command}</span>
                                    </div>
                                    <div className="text-[8px] text-slate-500 font-mono">PID {process.pid}</div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] text-slate-400">
                                        <span>Status: <span className={`capitalize ${
                                            process.status === 'running' ? 'text-blue-400' :
                                            process.status === 'completed' ? 'text-emerald-400' : 'text-red-400'
                                        }`}>{process.status}</span></span>
                                        <span>{process.memoryUsage}MB</span>
                                    </div>

                                    {process.endTime && (
                                        <div className="text-[8px] text-slate-500">
                                            Duration: {((process.endTime - process.startTime) / 1000).toFixed(1)}s
                                            {process.exitCode !== undefined && ` (exit: ${process.exitCode})`}
                                        </div>
                                    )}

                                    {!process.endTime && (
                                        <div className="text-[8px] text-blue-400">
                                            Started: {new Date(process.startTime).toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

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
