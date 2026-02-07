#!/usr/bin/env bun

/**
 * Enhanced Watch Engine v3.14 - Production-Hardened, Zero-Dependency
 * 
 * Tier-1380 optimization complete with adaptive debounce, health checks,
 * and real-time dashboard for Bun --watch + --filter integration.
 */

import { Glob, stringWidth } from 'bun';

// Type assertions for Bun APIs
const BunAPI = globalThis as any;
const watch = BunAPI.Bun?.watch || (() => { throw new Error('watch not available'); });
const spawn = BunAPI.Bun?.spawn || (() => { throw new Error('spawn not available'); });
const serve = BunAPI.Bun?.serve || (() => { throw new Error('serve not available'); });
const sleep = BunAPI.Bun?.sleep || ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)));
const inspect = BunAPI.Bun?.inspect || ((obj: any) => JSON.stringify(obj, null, 2));

// Enhanced interfaces
interface WatchSession {
  id: string;
  pattern: string;
  script: string;
  packages: PackageRef[];
  startTime: number;
  restartCount: number;
  lastChange: number;
  status: 'active' | 'restarting' | 'error' | 'stopped';
  metrics: {
    totalRestarts: number;
    avgRestartMs: number;
    errors: number;
  };
}

interface PackageRef {
  name: string;
  path: string;
  status: 'idle' | 'running' | 'error';
  lastRestart: number;
  pid?: number;
  watcher?: ReturnType<typeof watch>;
}

interface WatchOptions {
  debounceMs?: number;
  clearScreen?: boolean;
  parallel?: boolean;
  maxRestarts?: number;
  healthCheckUrl?: string;
  hotReload?: boolean;
  smolMode?: boolean;
  consoleDepth?: number;
}

// Global session management
const sessions = new Map<string, WatchSession>();

// Enhanced color utilities
const c = {
  red: (s: string) => `\x1b[38;2;255;100;100m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;2;100;255;100m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[38;2;100;200;255m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[38;2;255;255;100m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[38;2;100;150;255m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[38;2;255;100;255m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// 🎯 ENHANCED: Smart file filtering with .gitignore support
async function loadGitignore(basePath: string): Promise<Set<string>> {
  const gitignorePath = `${basePath}/.gitignore`;
  const file = BunAPI.Bun.file(gitignorePath);
  if (!(await file.exists())) return new Set();
  
  const content = await file.text();
  return new Set(
    content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
  );
}

function shouldIgnore(filename: string, gitignore: Set<string>): boolean {
  if (!filename) return true;
  
  const builtins = ['node_modules', '.git', 'dist', 'build', '.env', '.log', '.tmp', 'coverage', '.next', '.nuxt'];
  if (builtins.some(b => filename.includes(b))) return true;
  
  // Check gitignore patterns
  for (const pattern of Array.from(gitignore)) {
    if (filename.includes(pattern.replace('*', ''))) return true;
  }
  
  return false;
}

// 🚀 ENHANCED: Adaptive debounce with burst detection
class AdaptiveDebounce {
  private timers = new Map<string, number>();
  private burstCount = new Map<string, number>();
  
  async wait(key: string, baseMs: number = 100): Promise<boolean> {
    const now = Date.now();
    const last = this.timers.get(key) || 0;
    const burst = (this.burstCount.get(key) || 0) + 1;
    
    // Adaptive: more changes = longer debounce
    const adaptiveMs = Math.min(baseMs * Math.log2(burst + 1), 1000);
    
    if (now - last < adaptiveMs) {
      await sleep(adaptiveMs - (now - last));
      this.burstCount.set(key, burst);
      return false; // Skipped (too rapid)
    }
    
    this.timers.set(key, now);
    this.burstCount.set(key, 0);
    return true; // Proceed
  }
}

const debounce = new AdaptiveDebounce();

// 💎 ENHANCED: Session management with health checks
export async function createWatchSession(
  pattern: string,
  script: string,
  opts: WatchOptions = {}
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const packages = await discoverWorkspacePackages();
  const glob = new Glob(pattern);
  const matched = packages.filter(p => glob.match(p.name));
  
  if (matched.length === 0) {
    console.log(c.yellow(`⚠️  No packages match: ${pattern}`));
    return '';
  }

  const session: WatchSession = {
    id: sessionId,
    pattern,
    script,
    packages: matched.map(p => ({
      name: p.name,
      path: p.path,
      status: 'idle',
      lastRestart: 0
    })),
    startTime: Date.now(),
    restartCount: 0,
    lastChange: 0,
    status: 'active',
    metrics: { totalRestarts: 0, avgRestartMs: 0, errors: 0 }
  };

  sessions.set(sessionId, session);

  // Setup watchers
  await Promise.all(session.packages.map(pkg => 
    setupPackageWatcher(session, pkg, opts)
  ));

  // Health check loop
  if (opts.healthCheckUrl) {
    startHealthCheck(session, opts.healthCheckUrl);
  }

  renderSessionDashboard(session);
  return sessionId;
}

async function setupPackageWatcher(
  session: WatchSession,
  pkg: PackageRef,
  opts: WatchOptions
): Promise<void> {
  const gitignore = await loadGitignore(pkg.path);
  
  pkg.watcher = watch(pkg.path, { recursive: true }, async (event, filename) => {
    if (shouldIgnore(filename || '', gitignore)) return;
    
    const shouldProceed = await debounce.wait(`${pkg.name}:${filename}`, opts.debounceMs);
    if (!shouldProceed) return;

    session.lastChange = Date.now();
    session.status = 'restarting';
    pkg.status = 'running';

    if (opts.clearScreen) console.clear();
    
    const startMs = performance.now();
    
    console.log(c.cyan(`\n[${fmtTime()}] 🔄 ${pkg.name}: ${event} ${c.bold(filename || '')}`));

    try {
      // Kill existing process if any
      if (pkg.pid) {
        try { process.kill(pkg.pid, 'SIGTERM'); } catch {}
      }

      const proc = spawn({
        cmd: opts.smolMode ? ['bun', '--smol', 'run', session.script] : ['bun', 'run', session.script],
        cwd: pkg.path,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { 
          ...BunAPI.Bun.env, 
          FORCE_COLOR: '1',
          BUN_WATCH_SESSION: session.id,
          BUN_WATCH_PACKAGE: pkg.name,
          ...(opts.consoleDepth && { BUN_CONSOLE_DEPTH: String(opts.consoleDepth) }),
          ...(opts.hotReload && { BUN_HOT_RELOAD: '1' })
        }
      });

      pkg.pid = proc.pid;

      // Stream output with package prefix
      streamWithPrefix(proc.stdout, pkg.name, 'stdout');
      streamWithPrefix(proc.stderr, pkg.name, 'stderr');

      const exitCode = await proc.exited;
      const duration = performance.now() - startMs;
      
      // Update metrics
      session.metrics.totalRestarts++;
      session.metrics.avgRestartMs = 
        (session.metrics.avgRestartMs * (session.metrics.totalRestarts - 1) + duration) 
        / session.metrics.totalRestarts;

      if (exitCode === 0) {
        pkg.status = 'idle';
        console.log(c.green(`[${fmtTime()}] ✅ ${pkg.name} ready (${duration.toFixed(0)}ms)`));
      } else {
        pkg.status = 'error';
        session.metrics.errors++;
        console.log(c.red(`[${fmtTime()}] ❌ ${pkg.name} exited ${exitCode}`));
      }

      session.restartCount++;

    } catch (err) {
      pkg.status = 'error';
      session.metrics.errors++;
      console.error(c.red(`[${fmtTime()}] 💥 ${pkg.name} error: ${err}`));
    }

    updateSessionDashboard(session);
  });
}

function streamWithPrefix(stream: ReadableStream, pkgName: string, type: 'stdout' | 'stderr'): void {
  const color = type === 'stderr' ? c.red : (s: string) => s;
  const prefix = c.cyan(`[${pkgName}]`);
  
  (async () => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.trim().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`${prefix} ${color(line)}`);
          }
        });
      }
    } finally {
      reader.releaseLock();
    }
  })();
}

// 📊 ENHANCED: Real-time dashboard with Bun.inspect
function renderSessionDashboard(session: WatchSession): void {
  if (!sessions.has(session.id)) return; // Session was stopped
  
  console.clear();
  console.log(c.bold(`\n👁️  WATCH SESSION: ${session.pattern}\n`));
  
  const tableData = session.packages.map(p => [
    p.name,
    getStatusIcon(p.status),
    p.pid || '-',
    p.lastRestart ? fmtTime(p.lastRestart) : '-',
    `${Math.round(performance.now() - session.startTime / 1000)}s`
  ]);

  console.log(inspect.table(tableData, {
    headers: ['Package', 'Status', 'PID', 'Last Restart', 'Uptime'],
    colors: true
  }));

  console.log(c.bold(`\n📈 Metrics:`));
  console.log(`  Restarts: ${session.metrics.totalRestarts} | ` +
    `Avg: ${session.metrics.avgRestartMs.toFixed(0)}ms | ` +
    `Errors: ${session.metrics.errors > 0 ? c.red(String(session.metrics.errors)) : '0'}`);
  
  console.log(c.bold(`\n⚡ Performance:`));
  console.log(`  Session: ${session.id} | ` +
    `Packages: ${session.packages.length} | ` +
    `Pattern: ${c.cyan(session.pattern)} | ` +
    `Script: ${c.green(session.script)}`);
  
  console.log(c.yellow(`\nPress Ctrl+C to stop\n`));
}

function updateSessionDashboard(session: WatchSession): void {
  // Throttle dashboard updates
  if (Date.now() - session.lastChange < 100) return;
  renderSessionDashboard(session);
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    idle: '⏸️',
    running: '🔄',
    error: '❌'
  };
  return icons[status] || '❓';
}

function fmtTime(ts?: number): string {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString('en-US', { hour12: false });
}

async function discoverWorkspacePackages(): Promise<Array<{name: string, path: string}>> {
  // Read from package.json workspaces or bun.lockb
  const pkg = await BunAPI.Bun.file('package.json').json();
  const patterns = pkg.workspaces || ['packages/*'];
  
  const packages: Array<{name: string, path: string}> = [];
  
  for (const pattern of patterns) {
    const glob = new Glob(pattern);
    for await (const path of glob.scan('.')) {
      const pkgPath = `${path}/package.json`;
      const pkgFile = BunAPI.Bun.file(pkgPath);
      if (await pkgFile.exists()) {
        const { name } = await pkgFile.json();
        packages.push({ name, path });
      }
    }
  }
  
  return packages;
}

// 🏥 ENHANCED: Health check with automatic recovery
function startHealthCheck(session: WatchSession, url: string): void {
  setInterval(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      console.log(c.yellow(`[${fmtTime()}] ⚠️  Health check failed, triggering restart...`));
      // Trigger restart of all packages
      session.packages.forEach(p => {
        if (p.pid) {
          try { process.kill(p.pid, 'SIGTERM'); } catch {}
        }
      });
    }
  }, 30000);
}

// 🌐 ENHANCED: WebSocket dashboard for remote monitoring
export function startWebSocketDashboard(port: number = 3001): void {
  serve({
    port,
    fetch(req, server) {
      if (req.url.endsWith('/ws')) {
        server.upgrade(req);
        return undefined;
      }
      
      if (req.url === '/') {
        return new Response(getWatchDashboardHTML(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      return new Response('Watch Dashboard API', { status: 200 });
    },
    websocket: {
      open(ws) {
        console.log(c.blue(`📡 Dashboard client connected`));
        // Send initial state
        ws.send(JSON.stringify({
          type: 'init',
          sessions: Array.from(sessions.values())
        }));
      },
      message(ws, msg) {
        try {
          const { action, pattern, script, options } = JSON.parse(msg as string);
          
          switch (action) {
            case 'start':
              createWatchSession(pattern, script, options).then(sessionId => {
                ws.send(JSON.stringify({ 
                  type: 'started', 
                  sessionId,
                  sessions: Array.from(sessions.values())
                }));
              });
              break;
              
            case 'stop':
              const session = Array.from(sessions.values()).find(s => s.pattern === pattern);
              if (session) {
                stopWatchSession(session.id);
                ws.send(JSON.stringify({ 
                  type: 'stopped', 
                  sessionId: session.id,
                  sessions: Array.from(sessions.values())
                }));
              }
              break;
              
            case 'list':
              ws.send(JSON.stringify({ 
                type: 'sessions',
                sessions: Array.from(sessions.values())
              }));
              break;
          }
        } catch (error) {
          ws.send(JSON.stringify({ type: 'error', message: String(error) }));
        }
      },
      close(ws) {
        console.log(c.yellow(`📡 Dashboard client disconnected`));
      }
    }
  });
  
  console.log(c.green(`🌐 Watch dashboard running on http://localhost:${port}`));
}

function getWatchDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>👁️ Bun Watch Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; background: linear-gradient(45deg, #00ff88, #00aaff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .controls { background: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; color: #00ff88; }
        input, select { width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; }
        button { background: #00ff88; color: #000; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        button:hover { background: #00cc6a; }
        .sessions { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .session { background: #1a1a1a; border-radius: 8px; padding: 20px; border-left: 4px solid #00ff88; }
        .session.error { border-left-color: #ff4444; }
        .session.restarting { border-left-color: #ffaa00; }
        .session h3 { margin-bottom: 15px; color: #00ff88; }
        .packages { margin-top: 15px; }
        .package { background: #2a2a2a; padding: 10px; margin: 5px 0; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
        .package.running { border-left: 3px solid #ffaa00; }
        .package.error { border-left: 3px solid #ff4444; }
        .package.idle { border-left: 3px solid #00ff88; }
        .metrics { margin-top: 15px; font-size: 0.9em; color: #aaa; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
        .status.active { background: #00ff88; color: #000; }
        .status.error { background: #ff4444; color: #fff; }
        .status.restarting { background: #ffaa00; color: #000; }
        .status.stopped { background: #666; color: #fff; }
        .connection { position: fixed; top: 20px; right: 20px; padding: 10px; border-radius: 20px; font-size: 0.8em; }
        .connection.connected { background: #00ff88; color: #000; }
        .connection.disconnected { background: #ff4444; color: #fff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👁️ Bun Watch Dashboard</h1>
            <p>Real-time monitoring of --watch + --filter sessions</p>
        </div>
        
        <div class="controls">
            <h3>Start New Watch Session</h3>
            <form id="watchForm">
                <div class="form-group">
                    <label for="pattern">Pattern:</label>
                    <input type="text" id="pattern" value="*" placeholder="e.g., app-*, lib-*">
                </div>
                <div class="form-group">
                    <label for="script">Script:</label>
                    <input type="text" id="script" value="dev" placeholder="e.g., dev, build, test">
                </div>
                <div class="form-group">
                    <label>Options:</label>
                    <label style="font-weight: normal;">
                        <input type="checkbox" id="clearScreen" checked> Clear Screen
                    </label>
                    <label style="font-weight: normal;">
                        <input type="checkbox" id="parallel" checked> Parallel
                    </label>
                    <label style="font-weight: normal;">
                        <input type="checkbox" id="hotReload"> Hot Reload
                    </label>
                    <label style="font-weight: normal;">
                        <input type="checkbox" id="smolMode"> Smol Mode
                    </label>
                </div>
                <button type="submit">🚀 Start Watch Session</button>
            </form>
        </div>
        
        <div id="sessions" class="sessions"></div>
    </div>
    
    <div id="connection" class="connection disconnected">🔌 Disconnected</div>

    <script>
        let ws;
        let sessions = new Map();
        
        function connect() {
            ws = new WebSocket('ws://localhost:3001/ws');
            
            ws.onopen = () => {
                document.getElementById('connection').className = 'connection connected';
                document.getElementById('connection').textContent = '🔌 Connected';
                console.log('Connected to watch dashboard');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = () => {
                document.getElementById('connection').className = 'connection disconnected';
                document.getElementById('connection').textContent = '🔌 Disconnected';
                setTimeout(connect, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        }
        
        function handleWebSocketMessage(data) {
            switch (data.type) {
                case 'init':
                case 'sessions':
                    updateSessions(data.sessions);
                    break;
                case 'started':
                    updateSessions(data.sessions);
                    break;
                case 'stopped':
                    updateSessions(data.sessions);
                    break;
                case 'error':
                    console.error('Dashboard error:', data.message);
                    break;
            }
        }
        
        function updateSessions(sessionData) {
            sessions.clear();
            sessionData.forEach(session => {
                sessions.set(session.id, session);
            });
            renderSessions();
        }
        
        function renderSessions() {
            const container = document.getElementById('sessions');
            container.innerHTML = '';
            
            sessions.forEach(session => {
                const sessionEl = document.createElement('div');
                sessionEl.className = \`session \${session.status}\`;
                
                const uptime = Math.round((Date.now() - session.startTime) / 1000);
                
                sessionEl.innerHTML = \`
                    <h3>\${session.pattern} → \${session.script}</h3>
                    <div class="status \${session.status}">\${session.status}</div>
                    <div class="metrics">
                        <div>📦 Packages: \${session.packages.length}</div>
                        <div>🔄 Restarts: \${session.metrics.totalRestarts}</div>
                        <div>⏱️ Avg Restart: \${session.metrics.avgRestartMs.toFixed(0)}ms</div>
                        <div>❌ Errors: \${session.metrics.errors}</div>
                        <div>⏰ Uptime: \${uptime}s</div>
                    </div>
                    <div class="packages">
                        \${session.packages.map(pkg => \`
                            <div class="package \${pkg.status}">
                                <span>\${pkg.name}</span>
                                <span>\${getStatusIcon(pkg.status)} \${pkg.status}</span>
                            </div>
                        \`).join('')}
                    </div>
                    <button onclick="stopSession('\${session.id}')" style="margin-top: 10px; background: #ff4444;">🛑 Stop</button>
                \`;
                
                container.appendChild(sessionEl);
            });
        }
        
        function getStatusIcon(status) {
            const icons = {
                idle: '⏸️',
                running: '🔄',
                error: '❌'
            };
            return icons[status] || '❓';
        }
        
        function stopSession(sessionId) {
            const session = sessions.get(sessionId);
            if (session) {
                ws.send(JSON.stringify({
                    action: 'stop',
                    pattern: session.pattern
                }));
            }
        }
        
        document.getElementById('watchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const options = {
                clearScreen: document.getElementById('clearScreen').checked,
                parallel: document.getElementById('parallel').checked,
                hotReload: document.getElementById('hotReload').checked,
                smolMode: document.getElementById('smolMode').checked
            };
            
            ws.send(JSON.stringify({
                action: 'start',
                pattern: document.getElementById('pattern').value,
                script: document.getElementById('script').value,
                options
            }));
        });
        
        // Start connection
        connect();
    </script>
</body>
</html>`;
}

// 🧹 Cleanup functions
export function stopWatchSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  console.log(c.yellow(`🛑 Stopping watch session: ${session.pattern}`));
  
  session.packages.forEach(pkg => {
    if (pkg.pid) {
      try { process.kill(pkg.pid, 'SIGTERM'); } catch {}
    }
    pkg.watcher?.stop();
  });
  
  sessions.delete(sessionId);
}

export function stopAllWatchSessions(): void {
  console.log(c.yellow('\n\n🛑 Stopping all watch sessions...'));
  sessions.forEach((session, id) => {
    stopWatchSession(id);
  });
}

// Global cleanup handlers
process.on('SIGINT', () => {
  stopAllWatchSessions();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAllWatchSessions();
  process.exit(0);
});

// CLI integration
export async function runWatchCLI(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = {
    watch: args.includes('--watch'),
    hot: args.includes('--hot'),
    smol: args.includes('--smol'),
    filter: args.find((a, i) => args[i - 1] === '--filter') || '*',
    script: args.find(a => !a.startsWith('-') && !['--filter', '--watch', '--hot', '--smol'].includes(a)) || 'dev',
    consoleDepth: (() => {
      const idx = args.findIndex(a => a === '--console-depth');
      return idx !== -1 ? parseInt(args[idx + 1]) || 2 : undefined;
    })()
  };

  if (flags.watch || flags.hot) {
    console.log(c.bold('🚀 Starting Enhanced Watch Engine v3.14'));
    
    // Start WebSocket dashboard
    startWebSocketDashboard(3001);
    
    // Create watch session
    const sessionId = await createWatchSession(flags.filter, flags.script, {
      clearScreen: true,
      parallel: true,
      maxRestarts: 10,
      healthCheckUrl: process.env.HEALTH_CHECK_URL,
      hotReload: flags.hot,
      smolMode: flags.smol,
      consoleDepth: flags.consoleDepth
    });
    
    if (sessionId) {
      console.log(c.green(`✅ Watch session started: ${sessionId}`));
    } else {
      console.log(c.red('❌ Failed to start watch session'));
      process.exit(1);
    }
  }
}

// Auto-run if this is the main module
if (process.argv[1] && process.argv[1].endsWith('watch-engine-v3.14.ts')) {
  runWatchCLI().catch(console.error);
}
