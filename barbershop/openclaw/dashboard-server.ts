#!/usr/bin/env bun
/**
 * OpenClaw Context Dashboard Server
 * HTTP endpoints for context-aware execution and caching
 * 
 * Endpoints:
 * - POST /context-run    Execute command with context
 * - GET  /context-cache  List cached sessions
 * - POST /context-clear  Clear context cache
 * - GET  /health         Health check
 */

import {
  executeWithContext,
  contextCache,
  loadGlobalConfig,
  generateContextHash,
  c,
} from "../lib/bun-context.ts";

const PORT = parseInt(Bun.env.OPENCLAW_PORT || "8765");
const HOST = Bun.env.OPENCLAW_HOST || "0.0.0.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Start server
console.log(c.cyan(`🎯 OpenClaw Context Dashboard v3.16`));
console.log(c.gray(`   Starting server on ${HOST}:${PORT}...\n`));

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  
  async fetch(req) {
    const url = new URL(req.url);
    const startTime = Bun.nanoseconds();
    
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        version: "3.16.0",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    }
    
    // Context-aware execution
    if (url.pathname === "/context-run" && req.method === "POST") {
      try {
        const body = await req.json();
        const {
          cwd,
          envFile,
          config,
          filter,
          watch,
          hot,
          command = "dev",
          args = [],
        } = body;
        
        // Build argument array from flags
        const flags: string[] = [
          ...(cwd ? ["--cwd", cwd] : []),
          ...(envFile ? (Array.isArray(envFile) 
            ? envFile.flatMap((f: string) => ["--env-file", f])
            : ["--env-file", envFile]) : []),
          ...(config ? ["--config", config] : []),
          ...(filter ? ["--filter", filter] : []),
          ...(watch ? ["--watch"] : []),
          ...(hot ? ["--hot"] : []),
        ];
        
        const session = await executeWithContext([...flags, command, ...args], {
          useCache: true,
        });
        
        return Response.json({
          success: true,
          sessionId: session.id,
          contextHash: session.contextHash,
          cwd: session.globalConfig.cwd,
          configPath: session.globalConfig.configPath,
          command: session.command,
          durationMs: session.durationMs,
          status: session.status,
          exitCode: session.exitCode,
          cached: false, // Would need tracking
        }, { headers: corsHeaders });
        
      } catch (err) {
        return Response.json({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }, { status: 400, headers: corsHeaders });
      }
    }
    
    // GET version with query params
    if (url.pathname === "/context-run" && req.method === "GET") {
      try {
        const flags = {
          cwd: url.searchParams.get("cwd") || undefined,
          envFile: url.searchParams.getAll("env-file"),
          config: url.searchParams.get("config") || undefined,
          filter: url.searchParams.get("filter") || undefined,
          watch: url.searchParams.has("watch"),
          hot: url.searchParams.has("hot"),
        };
        
        const command = url.searchParams.get("cmd") || "dev";
        const rawArgs = url.searchParams.getAll("arg");
        
        const flagArgs: string[] = [
          ...(flags.cwd ? ["--cwd", flags.cwd] : []),
          ...flags.envFile.flatMap(f => ["--env-file", f]),
          ...(flags.config ? ["--config", flags.config] : []),
          ...(flags.filter ? ["--filter", flags.filter] : []),
          ...(flags.watch ? ["--watch"] : []),
          ...(flags.hot ? ["--hot"] : []),
        ];
        
        const session = await executeWithContext([...flagArgs, command, ...rawArgs], {
          useCache: true,
        });
        
        return Response.json({
          success: true,
          sessionId: session.id,
          contextHash: session.contextHash,
          cwd: session.globalConfig.cwd,
          configPath: session.globalConfig.configPath,
          command: session.command,
          durationMs: session.durationMs,
          status: session.status,
          exitCode: session.exitCode,
        }, { headers: corsHeaders });
        
      } catch (err) {
        return Response.json({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }, { status: 400, headers: corsHeaders });
      }
    }
    
    // List cached sessions
    if (url.pathname === "/context-cache") {
      const now = Date.now();
      const cached = Array.from(contextCache.entries()).map(([hash, s]) => ({
        hash,
        command: s.command,
        cwd: s.globalConfig.cwd,
        configPath: s.globalConfig.configPath,
        status: s.status,
        durationMs: s.durationMs,
        age: now - s.startTime,
      }));
      
      return Response.json({
        count: cached.length,
        cached,
      }, { headers: corsHeaders });
    }
    
    // Clear cache
    if (url.pathname === "/context-clear" && req.method === "POST") {
      const count = contextCache.size;
      contextCache.clear();
      return Response.json({
        success: true,
        cleared: count,
      }, { headers: corsHeaders });
    }
    
    // Dashboard UI
    if (url.pathname === "/" || url.pathname === "/dashboard") {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>OpenClaw Context Dashboard</title>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 2rem;
      line-height: 1.6;
    }
    h1 { color: #58a6ff; margin-bottom: 1rem; }
    h2 { color: #7ee787; margin: 2rem 0 1rem; font-size: 1.2rem; }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .metric {
      display: inline-block;
      margin-right: 2rem;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #58a6ff;
    }
    .metric-label {
      font-size: 0.875rem;
      color: #8b949e;
    }
    form { display: flex; flex-direction: column; gap: 1rem; }
    input, select {
      background: #0d1117;
      border: 1px solid #30363d;
      color: #c9d1d9;
      padding: 0.5rem;
      border-radius: 4px;
    }
    button {
      background: #238636;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    button:hover { background: #2ea043; }
    .result {
      background: #0d1117;
      border: 1px solid #30363d;
      padding: 1rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    .success { color: #7ee787; }
    .error { color: #f85149; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #30363d; }
    th { color: #8b949e; font-weight: normal; }
    .hash { font-family: monospace; font-size: 0.75rem; color: #58a6ff; }
    .endpoint {
      background: #21262d;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
      margin: 0.5rem 0;
    }
  </style>
</head>
<body>
  <h1>🎯 OpenClaw Context Dashboard v3.16</h1>
  
  <div class="card">
    <h2>Status</h2>
    <div class="metric">
      <div class="metric-value" id="cacheCount">-</div>
      <div class="metric-label">Cached Sessions</div>
    </div>
    <div class="metric">
      <div class="metric-value">${Bun.version}</div>
      <div class="metric-label">Bun Version</div>
    </div>
  </div>
  
  <div class="card">
    <h2>API Endpoints</h2>
    <div class="endpoint">GET /health</div>
    <div class="endpoint">POST /context-run { cwd?, envFile?, config?, command, args? }</div>
    <div class="endpoint">GET /context-run?cwd=&env-file=&cmd=</div>
    <div class="endpoint">GET /context-cache</div>
    <div class="endpoint">POST /context-clear</div>
  </div>
  
  <div class="card">
    <h2>Execute Command</h2>
    <form id="execForm">
      <input type="text" id="cwd" placeholder="Working directory (optional)">
      <input type="text" id="envFile" placeholder="Env files (comma-separated, optional)">
      <input type="text" id="config" placeholder="Config file (optional)">
      <input type="text" id="command" placeholder="Command" value="bun --version" required>
      <button type="submit">Execute</button>
    </form>
    <div id="result"></div>
  </div>
  
  <div class="card">
    <h2>Cached Sessions</h2>
    <button onclick="loadCache()">Refresh</button>
    <div id="cacheList"></div>
  </div>
  
  <script>
    async function loadStatus() {
      try {
        const res = await fetch('/context-cache');
        const data = await res.json();
        document.getElementById('cacheCount').textContent = data.count;
      } catch (e) {
        console.error('Failed to load status:', e);
      }
    }
    
    async function loadCache() {
      try {
        const res = await fetch('/context-cache');
        const data = await res.json();
        
        if (data.cached.length === 0) {
          document.getElementById('cacheList').innerHTML = '<p style="color: #8b949e; margin-top: 1rem;">No cached sessions</p>';
          return;
        }
        
        const rows = data.cached.map(s => \`
          <tr>
            <td class="hash">\${s.hash}</td>
            <td>\${s.command}</td>
            <td>\${s.cwd}</td>
            <td>\${s.durationMs?.toFixed(2) || '-'}ms</td>
            <td>\${s.status}</td>
          </tr>
        \`).join('');
        
        document.getElementById('cacheList').innerHTML = \`
          <table style="margin-top: 1rem;">
            <thead>
              <tr>
                <th>Hash</th>
                <th>Command</th>
                <th>CWD</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>\${rows}</tbody>
          </table>
        \`;
      } catch (e) {
        document.getElementById('cacheList').innerHTML = '<p class="error">Failed to load cache</p>';
      }
    }
    
    document.getElementById('execForm').onsubmit = async (e) => {
      e.preventDefault();
      const result = document.getElementById('result');
      result.innerHTML = '<p>Executing...</p>';
      
      const envFile = document.getElementById('envFile').value;
      
      try {
        const res = await fetch('/context-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cwd: document.getElementById('cwd').value || undefined,
            envFile: envFile ? envFile.split(',').map(s => s.trim()) : undefined,
            config: document.getElementById('config').value || undefined,
            command: document.getElementById('command').value.split(' ')[0],
            args: document.getElementById('command').value.split(' ').slice(1),
          }),
        });
        
        const data = await res.json();
        result.innerHTML = '<div class="result ' + (data.success ? 'success' : 'error') + '">' + 
          JSON.stringify(data, null, 2) + '</div>';
        
        if (data.success) {
          loadStatus();
          loadCache();
        }
      } catch (e) {
        result.innerHTML = '<p class="error">' + e.message + '</p>';
      }
    };
    
    loadStatus();
    loadCache();
  </script>
</body>
</html>`;
      
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }
    
    // 404
    return new Response("Not Found", { status: 404 });
  },
});

console.log(c.green(`✓ Server running at http://${HOST}:${PORT}`));
console.log(c.gray(`  Dashboard: http://${HOST}:${PORT}/dashboard`));
console.log(c.gray(`  Health:    http://${HOST}:${PORT}/health`));
console.log(c.gray(`  API:       http://${HOST}:${PORT}/context-run`));

// Keep alive
process.on("SIGINT", () => {
  console.log(c.yellow("\n\nShutting down..."));
  server.stop();
  process.exit(0);
});
