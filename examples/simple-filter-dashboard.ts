#!/usr/bin/env bun

/**
 * Simple Filter Dashboard Demo
 * 
 * Demonstrates the filter dashboard API endpoints
 * with real-time WebSocket streaming of results.
 */

import { runFilteredScript, discoverWorkspacePackages } from '../lib/filter-runner';

// Simple HTTP server with filter support
const server = (globalThis as any).Bun?.serve({
  port: 3002,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      switch (url.pathname) {
        case '/':
          return new Response(getDashboardHTML(), {
            headers: { 'Content-Type': 'text/html', ...corsHeaders }
          });
          
        case '/filter-run':
          return await handleFilterRun(url, corsHeaders);
          
        case '/api/packages':
          return await handlePackageList(corsHeaders);
          
        case '/api/scripts':
          return await handleScriptList(corsHeaders);
          
        default:
          return new Response('Not Found', { 
            status: 404,
            headers: corsHeaders 
          });
      }
    } catch (error) {
      console.error('Request error:', error);
      return new Response(JSON.stringify({ 
        error: String(error),
        message: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },
  websocket: {
    message(ws, message) {
      console.log('WebSocket message:', message);
    },
    open(ws) {
      console.log('WebSocket opened');
    },
    close(ws) {
      console.log('WebSocket closed');
    },
    error(ws, error) {
      console.error('WebSocket error:', error);
    }
  }
});

console.log('🚀 Simple Filter Dashboard running on http://localhost:3002');

async function handleFilterRun(url: URL, corsHeaders: Record<string, string>): Promise<Response> {
  const pattern = url.searchParams.get('pattern') || '*';
  const script = url.searchParams.get('script') || 'test';
  
  console.log(`🔍 Running filter: pattern="${pattern}", script="${script}"`);
  
  // Parse filter options
  const options = {
    parallel: url.searchParams.has('parallel'),
    bail: url.searchParams.has('bail'),
    dryRun: url.searchParams.has('dry-run'),
    silent: url.searchParams.has('silent'),
    maxConcurrency: url.searchParams.has('max-concurrency') 
      ? parseInt(url.searchParams.get('max-concurrency')!)
      : undefined,
    timeout: url.searchParams.has('timeout')
      ? parseInt(url.searchParams.get('timeout')!)
      : undefined
  };
  
  const startTime = Date.now();
  
  try {
    // Execute filter with streaming results
    const results = await runFilteredScript(pattern, script, options);
    const executionTime = Date.now() - startTime;
    
    const response = {
      success: true,
      pattern,
      script,
      options,
      executionTime: `${executionTime}ms`,
      results: {
        totalPackages: results.totalPackages,
        matchedPackages: results.matchedPackages,
        executedPackages: results.executedPackages || 0,
        successfulPackages: results.successfulPackages,
        failedPackages: results.failedPackages,
        totalDurationMs: results.totalDurationMs || 0,
        averageDurationMs: results.averageDurationMs || 0,
        packages: (results.results || []).map(pkg => ({
          name: pkg.name,
          path: pkg.path,
          status: pkg.exitCode === 0 ? 'success' : pkg.executed ? 'failed' : 'skipped',
          executionTime: pkg.durationMs || 0,
          output: pkg.stdout?.substring(0, 200) + (pkg.stdout?.length > 200 ? '...' : ''),
          error: pkg.stderr || undefined
        }))
      }
    };
    
    console.log(`✅ Filter completed: ${results.successfulPackages}/${results.matchedPackages} successful`);
    
    return Response.json(response, {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('❌ Filter execution failed:', error);
    
    return Response.json({
      success: false,
      pattern,
      script,
      options,
      error: String(error),
      executionTime: `${Date.now() - startTime}ms`
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handlePackageList(corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const packages = await discoverWorkspacePackages();
    
    return Response.json({
      success: true,
      packages: packages.map(pkg => ({
        name: pkg.name,
        path: pkg.path,
        scripts: Object.keys(pkg.scripts || {})
      }))
    }, {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: String(error)
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleScriptList(corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const packages = await discoverWorkspacePackages();
    const allScripts = new Set<string>();
    
    packages.forEach(pkg => {
      Object.keys(pkg.scripts || {}).forEach(script => allScripts.add(script));
    });
    
    return Response.json({
      success: true,
      scripts: Array.from(allScripts).sort()
    }, {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: String(error)
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Filter Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; }
        input, select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        .checkbox-group { display: flex; gap: 15px; flex-wrap: wrap; }
        .checkbox-group label { display: flex; align-items: center; font-weight: normal; }
        .checkbox-group input { width: auto; margin-right: 5px; }
        button { background: #007acc; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
        button:hover { background: #005a9e; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .results { margin-top: 20px; }
        .package { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #007acc; }
        .package.success { border-left-color: #28a745; }
        .package.failed { border-left-color: #dc3545; }
        .package.skipped { border-left-color: #ffc107; }
        .loading { text-align: center; padding: 20px; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0; }
        .stat { background: #f8f9fa; padding: 15px; border-radius: 4px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007acc; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Bun Filter Dashboard</h1>
            <p>Execute and monitor filter operations across workspace packages</p>
        </div>
        
        <div class="card">
            <h2>Filter Configuration</h2>
            <form id="filterForm">
                <div class="form-group">
                    <label for="pattern">Pattern:</label>
                    <input type="text" id="pattern" value="*" placeholder="e.g., *, app-*, !test-*">
                    <small>Use glob patterns: *, ?, [], {}, ! for negation</small>
                </div>
                
                <div class="form-group">
                    <label for="script">Script:</label>
                    <select id="script">
                        <option value="test">test</option>
                        <option value="build">build</option>
                        <option value="lint">lint</option>
                        <option value="dev">dev</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Options:</label>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" id="parallel" checked>
                            Parallel
                        </label>
                        <label>
                            <input type="checkbox" id="bail">
                            Bail on failure
                        </label>
                        <label>
                            <input type="checkbox" id="dry-run" checked>
                            Dry run
                        </label>
                        <label>
                            <input type="checkbox" id="silent">
                            Silent
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="maxConcurrency">Max Concurrency:</label>
                    <input type="number" id="maxConcurrency" min="1" max="10" value="4" placeholder="4">
                </div>
                
                <button type="submit" id="runButton">Run Filter</button>
            </form>
        </div>
        
        <div id="results" class="results" style="display: none;">
            <div class="card">
                <h2>Results</h2>
                <div id="resultsContent"></div>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('filterForm');
        const runButton = document.getElementById('runButton');
        const results = document.getElementById('results');
        const resultsContent = document.getElementById('resultsContent');
        
        // Load available scripts
        async function loadScripts() {
            try {
                const response = await fetch('/api/scripts');
                const data = await response.json();
                const scriptSelect = document.getElementById('script');
                
                if (data.success) {
                    scriptSelect.innerHTML = data.scripts.map(script => 
                        \`<option value="\${script}">\${script}</option>\`
                    ).join('');
                }
            } catch (error) {
                console.error('Failed to load scripts:', error);
            }
        }
        
        // Load available packages
        async function loadPackages() {
            try {
                const response = await fetch('/api/packages');
                const data = await response.json();
                console.log('Available packages:', data);
            } catch (error) {
                console.error('Failed to load packages:', error);
            }
        }
        
        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const params = new URLSearchParams();
            
            params.set('pattern', document.getElementById('pattern').value);
            params.set('script', document.getElementById('script').value);
            
            if (document.getElementById('parallel').checked) params.append('parallel', '');
            if (document.getElementById('bail').checked) params.append('bail', '');
            if (document.getElementById('dry-run').checked) params.append('dry-run', '');
            if (document.getElementById('silent').checked) params.append('silent', '');
            
            const maxConcurrency = document.getElementById('maxConcurrency').value;
            if (maxConcurrency) params.set('max-concurrency', maxConcurrency);
            
            runButton.disabled = true;
            runButton.textContent = 'Running...';
            results.style.display = 'block';
            resultsContent.innerHTML = '<div class="loading">🔄 Executing filter...</div>';
            
            try {
                const response = await fetch('/filter-run?' + params.toString());
                const data = await response.json();
                
                displayResults(data);
                
            } catch (error) {
                resultsContent.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            } finally {
                runButton.disabled = false;
                runButton.textContent = 'Run Filter';
            }
        });
        
        function displayResults(data) {
            if (!data.success) {
                resultsContent.innerHTML = \`<div class="error">Filter failed: \${data.error}</div>\`;
                return;
            }
            
            const { results: filterResults } = data;
            
            let html = \`
                <div class="success">
                    ✅ Filter completed in \${data.executionTime}
                </div>
                
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value">\${filterResults.totalPackages}</div>
                        <div class="stat-label">Total Packages</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${filterResults.matchedPackages}</div>
                        <div class="stat-label">Matched</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${filterResults.successfulPackages}</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${filterResults.failedPackages}</div>
                        <div class="stat-label">Failed</div>
                    </div>
                </div>
                
                <h3>Package Results</h3>
            \`;
            
            filterResults.packages.forEach(pkg => {
                const statusClass = pkg.status === 'success' ? 'success' : 
                                  pkg.status === 'failed' ? 'failed' : 'skipped';
                
                html += \`
                    <div class="package \${statusClass}">
                        <strong>\${pkg.name}</strong> - \${pkg.status}
                        \${pkg.executionTime ? \`(\${pkg.executionTime}ms)\` : ''}
                        \${pkg.path ? \`<br><small>\${pkg.path}</small>\` : ''}
                        \${pkg.output ? \`<br><code>\${pkg.output}</code>\` : ''}
                        \${pkg.error ? \`<br><small style="color: red;">\${pkg.error}</small>\` : ''}
                    </div>
                \`;
            });
            
            resultsContent.innerHTML = html;
        }
        
        // Initialize
        loadScripts();
        loadPackages();
    </script>
</body>
</html>`;
}
