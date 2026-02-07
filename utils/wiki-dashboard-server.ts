#!/usr/bin/env bun
// Wiki Dashboard Server - v3.5 JuniorRunner Fusion Dashboard
// Usage: bun run wiki-dashboard-server → Live wiki profiling dashboard!

import { wikiProfile } from './wiki-profiler';
import { juniorProfileWithWiki } from './junior-runner';
import { ProfileReader, resolveUploaderConfig } from '../lib/profile';

const profileReader = new ProfileReader(resolveUploaderConfig());

const PORT = 3001;

/**
 * Start the wiki profiling dashboard server
 */
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Enable CORS for all routes
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Main wiki profiler route
    if (url.pathname === '/wiki-profiler') {
      try {
        const wikiFile = url.searchParams.get('file') || 'wiki-output.md';
        const wikiResult = await wikiProfile(wikiFile);
        
        return new Response(JSON.stringify(wikiResult, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }
    
    // Enhanced junior runner with wiki mode
    if (url.pathname === '/junior-runner') {
      try {
        const mdFile = url.searchParams.get('file') || 'demo.md';
        const wikiMode = url.searchParams.get('wiki') === 'true';
        const lspSafe = url.searchParams.get('lsp-safe') === 'true';
        
        const result = await juniorProfileWithWiki(mdFile, { lspSafe, wikiMode });
        
        return new Response(JSON.stringify(result, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }
    
    // Dashboard HTML
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wiki Profiler Dashboard v3.5</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .title {
            font-size: 3em;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            margin: 10px 0 0 0;
        }
        .controls {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        input[type="text"] {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            min-width: 200px;
        }
        button {
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            background: #4CAF50;
            color: white;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background: #45a049;
        }
        button:disabled {
            background: #666;
            cursor: not-allowed;
        }
        .checkbox-group {
            display: flex;
            gap: 20px;
            align-items: center;
        }
        .checkbox-group label {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
        }
        .results {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
            min-height: 200px;
        }
        .result-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .metric-card {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #4CAF50;
        }
        .metric-label {
            opacity: 0.8;
            margin-top: 5px;
        }
        .status-pass { color: #4CAF50; }
        .status-warn { color: #ff9800; }
        .status-fail { color: #f44336; }
        pre {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-size: 14px;
        }
        .loading {
            text-align: center;
            opacity: 0.7;
        }
        .error {
            background: rgba(244, 67, 54, 0.2);
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #f44336;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">📚 Wiki Profiler Dashboard</h1>
            <p class="subtitle">v3.5 JuniorRunner Fusion - Live Wiki Analysis</p>
        </div>
        
        <div class="controls">
            <div class="input-group">
                <input type="text" id="wikiFile" placeholder="wiki-output.md" value="wiki-output.md">
                <button onclick="analyzeWiki()">📊 Analyze Wiki</button>
                <button onclick="analyzeJunior()">👤 JuniorRunner</button>
                <button onclick="loadProfiles()" style="background:#2563eb">📁 Profiles</button>
            </div>
            <div class="checkbox-group">
                <label>
                    <input type="checkbox" id="wikiMode">
                    Enable Wiki Mode
                </label>
                <label>
                    <input type="checkbox" id="lspSafe" checked>
                    LSP Safe Mode
                </label>
            </div>
        </div>
        
        <div class="results" id="results">
            <div class="loading">
                <p>🚀 Ready to analyze wiki files with JuniorRunner fusion!</p>
                <p>Enter a wiki file path and click Analyze to begin.</p>
            </div>
        </div>
    </div>
    
    <script>
        async function analyzeWiki() {
            const file = document.getElementById('wikiFile').value;
            const results = document.getElementById('results');
            
            results.innerHTML = '<div class="loading">🔄 Analyzing wiki file...</div>';
            
            try {
                const response = await fetch(\`/wiki-profiler?file=\${encodeURIComponent(file)}\`);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Analysis failed');
                }
                
                displayWikiResults(data);
            } catch (error) {
                results.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
            }
        }
        
        async function analyzeJunior() {
            const file = document.getElementById('wikiFile').value;
            const wikiMode = document.getElementById('wikiMode').checked;
            const lspSafe = document.getElementById('lspSafe').checked;
            const results = document.getElementById('results');
            
            results.innerHTML = '<div class="loading">🔄 Running JuniorRunner analysis...</div>';
            
            try {
                const params = new URLSearchParams({
                    file: file,
                    wiki: wikiMode.toString(),
                    'lsp-safe': lspSafe.toString()
                });
                
                const response = await fetch(\`/junior-runner?\${params}\`);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Analysis failed');
                }
                
                displayJuniorResults(data);
            } catch (error) {
                results.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
            }
        }
        
        function displayWikiResults(data) {
            const results = document.getElementById('results');
            const validationClass = data.wiki.validation === 'PASS' ? 'status-pass' : 
                                  data.wiki.validation === 'WARN' ? 'status-warn' : 'status-fail';
            
            results.innerHTML = \`
                <h3>📊 Wiki Analysis Results</h3>
                <div class="result-grid">
                    <div class="metric-card">
                        <div class="metric-value">\${data.wiki.urls}</div>
                        <div class="metric-label">docsURLBuilder URLs</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">\${data.wiki.cliPages}</div>
                        <div class="metric-label">CLI Pages</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value \${validationClass}">\${data.wiki.validation}</div>
                        <div class="metric-label">URL Validation</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">\${data.wiki.quickRef}</div>
                        <div class="metric-label">QuickRef TOC</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">\${data.metadata.gfmScore}%</div>
                        <div class="metric-label">GFM Score</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">\${Math.round(data.performance.throughput).toLocaleString()}</div>
                        <div class="metric-label">chars/s</div>
                    </div>
                </div>
                <h4>📋 Full Results:</h4>
                <pre>\${JSON.stringify(data, null, 2)}</pre>
            \`;
        }
        
        function displayJuniorResults(data) {
            const results = document.getElementById('results');
            
            let html = '<h3>👤 JuniorRunner Analysis Results</h3>';
            
            if (data.wiki) {
                const validationClass = data.wiki.validation === 'PASS' ? 'status-pass' : 
                                      data.wiki.validation === 'WARN' ? 'status-warn' : 'status-fail';
                
                html += \`
                    <h4>🔗 Wiki Integration Metrics:</h4>
                    <div class="result-grid">
                        <div class="metric-card">
                            <div class="metric-value">\${data.wiki.urls}</div>
                            <div class="metric-label">URLs</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">\${data.wiki.cliPages}</div>
                            <div class="metric-label">CLI Pages</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value \${validationClass}">\${data.wiki.validation}</div>
                            <div class="metric-label">Validation</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">\${data.combined.integrationScore}%</div>
                            <div class="metric-label">Integration</div>
                        </div>
                    </div>
                \`;
            }
            
            html += \`
                <h4>📊 Base Profile Metrics:</h4>
                <div class="result-grid">
                    <div class="metric-card">
                        <div class="metric-value">\${(data.core.documentSize / 1024).toFixed(2)}KB</div>
                        <div class="metric-label">Document Size</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">\${data.markdown.parseTimeMs.toFixed(2)}ms</div>
                        <div class="metric-label">Parse Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">\${Math.round(data.core.throughput).toLocaleString()}</div>
                        <div class="metric-label">chars/s</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">\${data.markdown.complexityTier.toUpperCase()}</div>
                        <div class="metric-label">Complexity</div>
                    </div>
                </div>
                <h4>📋 Full Results:</h4>
                <pre>\${JSON.stringify(data, null, 2)}</pre>
            \`;
            
            results.innerHTML = html;
        }
        
        async function loadProfiles() {
            const results = document.getElementById('results');
            results.innerHTML = '<div class="loading">🔄 Loading profiles from R2...</div>';
            try {
                const response = await fetch('/profiles?manifests=true');
                const sessions = await response.json();
                if (!response.ok) throw new Error(sessions.error || 'Failed to load profiles');
                if (!sessions.length) {
                    results.innerHTML = '<div class="loading">No profile sessions found in R2.</div>';
                    return;
                }
                let html = '<h3>📁 Profile Sessions</h3><div class="result-grid">';
                for (const s of sessions) {
                    const count = s.manifest ? s.manifest.profiles.length : '?';
                    const updated = s.manifest ? new Date(s.manifest.updatedAt).toLocaleString() : 'unknown';
                    html += \`
                        <div class="metric-card" style="cursor:pointer;text-align:left" onclick="loadSession('\${s.sessionId}')">
                            <div style="font-size:1.1em;font-weight:bold;margin-bottom:8px">\${s.sessionId}</div>
                            <div><strong>\${count}</strong> profile(s)</div>
                            <div style="opacity:0.7;font-size:0.85em">Updated: \${updated}</div>
                        </div>\`;
                }
                html += '</div>';
                results.innerHTML = html;
            } catch (error) {
                results.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
            }
        }

        async function loadSession(sessionId) {
            const results = document.getElementById('results');
            results.innerHTML = '<div class="loading">🔄 Loading session...</div>';
            try {
                const response = await fetch(\`/profiles/\${encodeURIComponent(sessionId)}\`);
                const manifest = await response.json();
                if (!response.ok) throw new Error(manifest.error || 'Session not found');
                let html = \`<h3>📁 Session: \${manifest.sessionId}</h3>\`;
                html += \`<p>Terminal: \${manifest.terminal.user}@\${manifest.terminal.hostname} (PID \${manifest.terminal.pid})</p>\`;
                html += '<div class="result-grid">';
                for (const p of manifest.profiles) {
                    const profileUrl = \`/profiles/\${sessionId}/\${p.type}/\${p.filename}\`;
                    html += \`
                        <div class="metric-card" style="text-align:left">
                            <div style="font-weight:bold">\${p.type.toUpperCase()}</div>
                            <a href="\${profileUrl}" target="_blank" style="color:#4CAF50">\${p.filename}</a>
                            <div style="opacity:0.7;font-size:0.85em">\${(p.sizeBytes / 1024).toFixed(1)} KB — \${new Date(p.uploadedAt).toLocaleString()}</div>
                        </div>\`;
                }
                html += '</div>';
                html += '<br><button onclick="loadProfiles()" style="background:#2563eb">← Back to sessions</button>';
                results.innerHTML = html;
            } catch (error) {
                results.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
            }
        }

        // Auto-analyze on page load if file is provided
        window.addEventListener('load', () => {
            const params = new URLSearchParams(window.location.search);
            const file = params.get('file');
            if (file) {
                document.getElementById('wikiFile').value = file;
                analyzeWiki();
            }
        });
    </script>
</body>
</html>`;
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders,
        },
      });
    }
    
    // Profile routes
    if (url.pathname === '/profiles') {
      try {
        const includeManifests = url.searchParams.get('manifests') === 'true';
        const sessions = await profileReader.listSessions();

        let result: any[];
        if (includeManifests) {
          result = await Promise.all(
            sessions.map(async (s) => {
              try {
                const manifest = await profileReader.getManifest(s.sessionId);
                return { ...s, manifest };
              } catch {
                return { ...s, manifest: null };
              }
            })
          );
        } else {
          result = sessions;
        }

        return new Response(JSON.stringify(result, null, 2), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Profile session manifest
    const sessionMatch = url.pathname.match(/^\/profiles\/([^/]+)$/);
    if (sessionMatch) {
      try {
        const manifest = await profileReader.getManifest(sessionMatch[1]);
        return new Response(JSON.stringify(manifest, null, 2), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Raw profile markdown
    const profileMatch = url.pathname.match(/^\/profiles\/([^/]+)\/(cpu|heap)\/(.+\.md)$/);
    if (profileMatch) {
      try {
        const content = await profileReader.getProfile(profileMatch[1], profileMatch[2], profileMatch[3]);
        return new Response(content, {
          headers: { 'Content-Type': 'text/markdown', ...corsHeaders },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // API docs
    if (url.pathname === '/api') {
      const apiDocs = {
        title: "Wiki Profiler API v3.5",
        endpoints: {
          "GET /wiki-profiler": {
            description: "Analyze wiki output file",
            parameters: {
              file: "string (default: wiki-output.md)"
            },
            example: "/wiki-profiler?file=wiki-output.md"
          },
          "GET /junior-runner": {
            description: "Run JuniorRunner with optional wiki mode",
            parameters: {
              file: "string (default: demo.md)",
              wiki: "boolean (default: false)",
              "lsp-safe": "boolean (default: false)"
            },
            example: "/junior-runner?file=wiki-output.md&wiki=true&lsp-safe=true"
          },
          "GET /profiles": {
            description: "List profile sessions from R2",
            parameters: {
              manifests: "boolean — include full manifests (default: false)"
            },
            example: "/profiles?manifests=true"
          },
          "GET /profiles/:sessionId": {
            description: "Get session manifest",
            example: "/profiles/abc-123"
          },
          "GET /profiles/:sessionId/:type/:filename": {
            description: "Get raw profile markdown (type: cpu or heap)",
            example: "/profiles/abc-123/cpu/CPU.1770440845303.98850.md"
          },
          "GET /dashboard": {
            description: "Interactive dashboard interface"
          }
        }
      };
      
      return new Response(JSON.stringify(apiDocs, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    
    // 404
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log(`\x1b[1;32m🚀 Wiki Profiler Dashboard v3.5\x1b[0m`);
console.log(`\x1b[1;36m   Server running on http://localhost:${PORT}\x1b[0m`);
console.log(`\x1b[1;36m   Dashboard: http://localhost:${PORT}/dashboard\x1b[0m`);
console.log(`\x1b[1;36m   API Docs: http://localhost:${PORT}/api\x1b[0m`);
console.log(`\x1b[1;36m   Profiles: http://localhost:${PORT}/profiles\x1b[0m`);
console.log(`\x1b[1;33m   Press Ctrl+C to stop\x1b[0m`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\x1b[1;33m🛑 Shutting down Wiki Profiler Dashboard...\x1b[0m');
  server.stop();
  process.exit(0);
});
