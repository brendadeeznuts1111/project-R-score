#!/usr/bin/env bun

/**
 * Context Run Server - Enhanced CLI Execution with Context
 * 
 * Provides HTTP endpoints for executing CLI commands with context
 * using the official Bun CLI Native Integration v3.15
 */

import { executeBunCLI, parseOfficialFlags, getAllSessions } from '../lib/bun-cli-native-v3.15';
import { serve } from 'bun';

interface ContextRunOptions {
  cwd?: string;
  envFile?: string[];
  config?: string;
  useCache?: boolean;
  timeout?: number;
}

interface ContextSession {
  id: string;
  command: string;
  args: string[];
  options: ContextRunOptions;
  startTime: number;
  status: 'running' | 'completed' | 'error' | 'timeout';
  durationMs?: number;
  output?: string;
  error?: string;
  exitCode?: number;
}

const contextSessions = new Map<string, ContextSession>();
const commandCache = new Map<string, ContextSession>();

// Color utilities for logging
const c = {
  red: (s: string) => `\x1b[38;2;255;100;100m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;2;100;255;100m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[38;2;100;200;255m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[38;2;255;255;100m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[38;2;100;150;255m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[38;2;255;100;255m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[38;2;150;150;150m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Execute CLI command with enhanced context
 */
async function executeWithContext(
  commandParts: string[],
  options: ContextRunOptions = {}
): Promise<ContextSession> {
  const sessionId = crypto.randomUUID();
  const cacheKey = JSON.stringify({ commandParts, options });
  
  // Check cache first
  if (options.useCache && commandCache.has(cacheKey)) {
    const cached = commandCache.get(cacheKey)!;
    console.log(c.blue(`📦 Cache hit for: ${commandParts.join(' ')}`));
    return { ...cached, id: sessionId };
  }
  
  const session: ContextSession = {
    id: sessionId,
    command: commandParts[0] || '',
    args: commandParts.slice(1),
    options,
    startTime: Date.now(),
    status: 'running'
  };
  
  contextSessions.set(sessionId, session);
  
  try {
    console.log(c.cyan(`🚀 Context Run: ${commandParts.join(' ')}`));
    console.log(c.gray(`   Options: ${JSON.stringify(options, null, 2)}`));
    
    // Build CLI arguments with context flags
    const cliArgs = [...commandParts];
    
    // Add context flags
    if (options.cwd) {
      cliArgs.unshift('--cwd', options.cwd);
    }
    
    if (options.envFile?.length) {
      options.envFile.forEach(envFile => {
        cliArgs.unshift('--env-file', envFile);
      });
    }
    
    if (options.config) {
      cliArgs.unshift('--config', options.config);
    }
    
    // Execute with timeout
    const timeoutPromise = options.timeout ? new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Command timed out after ${options.timeout}ms`)), options.timeout);
    }) : null;
    
    const executionPromise = executeBunCLI(cliArgs, { captureOutput: true });
    
    const cliSession = timeoutPromise 
      ? await Promise.race([executionPromise, timeoutPromise])
      : await executionPromise;
    
    // Update session with results
    session.status = cliSession.status === 'error' ? 'error' : 'completed';
    session.durationMs = cliSession.durationMs;
    session.output = cliSession.output;
    session.error = cliSession.error;
    session.exitCode = cliSession.exitCode;
    
    // Cache successful results
    if (options.useCache && session.status === 'completed') {
      commandCache.set(cacheKey, { ...session });
      
      // Limit cache size
      if (commandCache.size > 100) {
        const firstKey = commandCache.keys().next().value;
        commandCache.delete(firstKey);
      }
    }
    
    console.log(c.green(`✅ Context Run completed: ${session.command}`));
    console.log(c.gray(`   Duration: ${session.durationMs}ms, Exit Code: ${session.exitCode}`));
    
  } catch (error) {
    session.status = error.message.includes('timed out') ? 'timeout' : 'error';
    session.error = String(error);
    session.durationMs = Date.now() - session.startTime;
    
    console.log(c.red(`❌ Context Run failed: ${session.command}`));
    console.log(c.red(`   Error: ${session.error}`));
  }
  
  return session;
}

/**
 * Start the context run server
 */
function startContextRunServer(port: number = 3002): void {
  console.log(c.bold('🌐 Context Run Server - Starting'));
  console.log(c.gray(`Port: ${port} | Cache: Enabled | Timeout: 30s\n`));
  
  const server = serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      try {
        // Context run endpoint
        if (url.pathname === '/context-run' && req.method === 'GET') {
          const cmd = url.searchParams.get('cmd');
          if (!cmd) {
            return Response.json(
              { error: 'Missing cmd parameter' }, 
              { status: 400, headers: corsHeaders }
            );
          }
          
          const options: ContextRunOptions = {
            cwd: url.searchParams.get('cwd') || undefined,
            envFile: url.searchParams.getAll('env-file'),
            config: url.searchParams.get('config') || undefined,
            useCache: url.searchParams.get('cache') !== 'false',
            timeout: parseInt(url.searchParams.get('timeout') || '30000')
          };
          
          const session = await executeWithContext(cmd.split(' '), options);
          
          return Response.json(session, { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            } 
          });
        }
        
        // List sessions endpoint
        if (url.pathname === '/sessions' && req.method === 'GET') {
          const sessions = Array.from(contextSessions.values());
          return Response.json({ 
            sessions: sessions.map(s => ({
              id: s.id,
              command: s.command,
              args: s.args,
              status: s.status,
              durationMs: s.durationMs,
              exitCode: s.exitCode,
              startTime: s.startTime
            }))
          }, { headers: corsHeaders });
        }
        
        // Get session details endpoint
        if (url.pathname.startsWith('/session/') && req.method === 'GET') {
          const sessionId = url.pathname.split('/')[2];
          const session = contextSessions.get(sessionId);
          
          if (!session) {
            return Response.json(
              { error: 'Session not found' }, 
              { status: 404, headers: corsHeaders }
            );
          }
          
          return Response.json(session, { headers: corsHeaders });
        }
        
        // Clear cache endpoint
        if (url.pathname === '/cache/clear' && req.method === 'POST') {
          const cacheSize = commandCache.size;
          commandCache.clear();
          return Response.json({ 
            message: `Cleared ${cacheSize} cached commands` 
          }, { headers: corsHeaders });
        }
        
        // Health check endpoint
        if (url.pathname === '/health' && req.method === 'GET') {
          return Response.json({
            status: 'healthy',
            uptime: Date.now(),
            activeSessions: contextSessions.size,
            cacheSize: commandCache.size,
            version: 'v3.15'
          }, { headers: corsHeaders });
        }
        
        // Dashboard endpoint
        if (url.pathname === '/' && req.method === 'GET') {
          return new Response(getDashboardHTML(), {
            headers: { 
              ...corsHeaders,
              'Content-Type': 'text/html'
            }
          });
        }
        
        // 404 for unknown endpoints
        return Response.json(
          { error: 'Endpoint not found' }, 
          { status: 404, headers: corsHeaders }
        );
        
      } catch (error) {
        console.error(c.red(`Server error: ${error}`));
        return Response.json(
          { error: String(error) }, 
          { status: 500, headers: corsHeaders }
        );
      }
    }
  });
  
  console.log(c.green(`✅ Context Run Server running on http://localhost:${port}`));
  console.log(c.cyan(`📊 Dashboard: http://localhost:${port}`));
  console.log(c.yellow(`🔗 API: http://localhost:${port}/context-run?cmd=<command>&cwd=<dir>`));
}

/**
 * Generate dashboard HTML
 */
function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Context Run Server v3.15</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 3rem; }
        .title { font-size: 2.5rem; font-weight: bold; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem; }
        .subtitle { color: #94a3b8; font-size: 1.1rem; }
        .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
        .card-title { font-size: 1.3rem; font-weight: 600; margin-bottom: 1rem; color: #f1f5f9; }
        .form-group { margin-bottom: 1rem; }
        .label { display: block; margin-bottom: 0.5rem; color: #cbd5e1; font-weight: 500; }
        .input { width: 100%; padding: 0.75rem; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #e2e8f0; font-family: 'Monaco', 'Menlo', monospace; }
        .input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .button { background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .button:hover { background: #2563eb; transform: translateY(-1px); }
        .button:disabled { background: #475569; cursor: not-allowed; transform: none; }
        .result { margin-top: 1rem; padding: 1rem; background: #0f172a; border-radius: 6px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat { background: #1e293b; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #334155; }
        .stat-value { font-size: 2rem; font-weight: bold; color: #3b82f6; }
        .stat-label { color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem; }
        .status-running { color: #f59e0b; }
        .status-completed { color: #10b981; }
        .status-error { color: #ef4444; }
        .status-timeout { color: #8b5cf6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">Context Run Server v3.15</div>
            <div class="subtitle">Official Bun CLI Integration with Enhanced Context</div>
        </div>
        
        <div class="stats" id="stats">
            <div class="stat">
                <div class="stat-value" id="activeSessions">0</div>
                <div class="stat-label">Active Sessions</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="cacheSize">0</div>
                <div class="stat-label">Cached Commands</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="totalCommands">0</div>
                <div class="stat-label">Total Commands</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="successRate">0%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">🚀 Execute Command</div>
            <form id="commandForm">
                <div class="form-group">
                    <label class="label" for="command">Command:</label>
                    <input type="text" id="command" class="input" placeholder="junior-runner --lsp-safe --r2 nolarose test.md" value="junior-runner --lsp-safe --r2 nolarose test.md">
                </div>
                <div class="form-group">
                    <label class="label" for="cwd">Working Directory:</label>
                    <input type="text" id="cwd" class="input" placeholder="utils" value="utils">
                </div>
                <div class="form-group">
                    <label class="label" for="envFile">Environment Files (comma-separated):</label>
                    <input type="text" id="envFile" class="input" placeholder=".env.dev,.env.local">
                </div>
                <div class="form-group">
                    <label class="label" for="config">Config File:</label>
                    <input type="text" id="config" class="input" placeholder="bunfig.toml">
                </div>
                <div class="form-group">
                    <label class="label">
                        <input type="checkbox" id="useCache" checked> Use Cache
                    </label>
                </div>
                <button type="submit" class="button" id="executeBtn">Execute Command</button>
            </form>
            <div id="result" class="result" style="display: none;"></div>
        </div>
        
        <div class="card">
            <div class="card-title">📊 Recent Sessions</div>
            <div id="sessions"></div>
        </div>
    </div>
    
    <script>
        let updateInterval;
        
        async function executeCommand() {
            const form = document.getElementById('commandForm');
            const resultDiv = document.getElementById('result');
            const executeBtn = document.getElementById('executeBtn');
            
            const command = document.getElementById('command').value;
            const cwd = document.getElementById('cwd').value;
            const envFile = document.getElementById('envFile').value;
            const config = document.getElementById('config').value;
            const useCache = document.getElementById('useCache').checked;
            
            if (!command.trim()) {
                alert('Please enter a command');
                return;
            }
            
            executeBtn.disabled = true;
            executeBtn.textContent = 'Executing...';
            resultDiv.style.display = 'block';
            resultDiv.textContent = 'Executing command...';
            
            try {
                const params = new URLSearchParams({
                    cmd: command,
                    cache: useCache.toString()
                });
                
                if (cwd) params.append('cwd', cwd);
                if (envFile) envFile.split(',').forEach(f => params.append('env-file', f.trim()));
                if (config) params.append('config', config);
                
                const response = await fetch(\`/context-run?\${params}\`);
                const session = await response.json();
                
                resultDiv.textContent = JSON.stringify(session, null, 2);
                
                if (session.status === 'error' || session.status === 'timeout') {
                    resultDiv.style.color = '#ef4444';
                } else {
                    resultDiv.style.color = '#10b981';
                }
                
                updateStats();
                updateSessions();
                
            } catch (error) {
                resultDiv.textContent = 'Error: ' + error.message;
                resultDiv.style.color = '#ef4444';
            } finally {
                executeBtn.disabled = false;
                executeBtn.textContent = 'Execute Command';
            }
        }
        
        async function updateStats() {
            try {
                const response = await fetch('/health');
                const health = await response.json();
                
                document.getElementById('activeSessions').textContent = health.activeSessions;
                document.getElementById('cacheSize').textContent = health.cacheSize;
                
                const sessionsResponse = await fetch('/sessions');
                const sessions = await sessionsResponse.json();
                
                const totalCommands = sessions.sessions.length;
                const successfulCommands = sessions.sessions.filter(s => s.status === 'completed').length;
                const successRate = totalCommands > 0 ? Math.round((successfulCommands / totalCommands) * 100) : 0;
                
                document.getElementById('totalCommands').textContent = totalCommands;
                document.getElementById('successRate').textContent = successRate + '%';
                
            } catch (error) {
                console.error('Failed to update stats:', error);
            }
        }
        
        async function updateSessions() {
            try {
                const response = await fetch('/sessions');
                const data = await response.json();
                
                const sessionsDiv = document.getElementById('sessions');
                sessionsDiv.innerHTML = '';
                
                const recentSessions = data.sessions.slice(-10).reverse();
                
                recentSessions.forEach(session => {
                    const sessionDiv = document.createElement('div');
                    sessionDiv.style.cssText = 'padding: 1rem; margin-bottom: 0.5rem; background: #0f172a; border-radius: 6px; border-left: 4px solid #3b82f6;';
                    
                    const statusClass = \`status-\${session.status}\`;
                    const duration = session.durationMs ? \`\${session.durationMs}ms\` : 'N/A';
                    const exitCode = session.exitCode !== undefined ? session.exitCode : 'N/A';
                    
                    sessionDiv.innerHTML = \`
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>\${session.command} \${session.args.join(' ')}</strong>
                                <span class="\${statusClass}" style="margin-left: 1rem;">● \${session.status}</span>
                            </div>
                            <div style="color: #94a3b8; font-size: 0.9rem;">
                                \${duration} | Exit: \${exitCode}
                            </div>
                        </div>
                    \`;
                    
                    sessionsDiv.appendChild(sessionDiv);
                });
                
            } catch (error) {
                console.error('Failed to update sessions:', error);
            }
        }
        
        // Event listeners
        document.getElementById('commandForm').addEventListener('submit', (e) => {
            e.preventDefault();
            executeCommand();
        });
        
        // Auto-update stats and sessions
        function startAutoUpdate() {
            updateStats();
            updateSessions();
            updateInterval = setInterval(() => {
                updateStats();
                updateSessions();
            }, 5000);
        }
        
        // Start auto-update when page loads
        startAutoUpdate();
    </script>
</body>
</html>`;
}

// Start server if this is the main module
if (import.meta.main) {
  const port = parseInt(process.argv[2]) || 3002;
  startContextRunServer(port);
}

export { executeWithContext, startContextRunServer };
