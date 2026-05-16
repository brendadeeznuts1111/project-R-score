#!/usr/bin/env bun

/**
 * Metafile Server - Context Engine v3.17 Integration
 * 
 * Live build + context metafile endpoints with real-time analysis
 */

import { contextBuildWithMetafile } from '../lib/context-engine-v3.17';

// Local CLI flags interface
interface ServerCLIFlags {
  cwd?: string;
  config?: string;
  smol?: boolean;
  silent?: boolean;
  'lsp-safe'?: boolean;
  metafile?: string;
}

// Parse URL search params into CLI flags
function parseFlags(search: string): ServerCLIFlags {
  const params = new URLSearchParams(search);
  const flags: ServerCLIFlags = {};
  
  if (params.has('cwd')) flags.cwd = params.get('cwd')!;
  if (params.has('config')) flags.config = params.get('config')!;
  if (params.has('smol')) flags.smol = params.get('smol') === 'true';
  if (params.has('silent')) flags.silent = params.get('silent') === 'true';
  if (params.has('lsp-safe')) flags['lsp-safe'] = true;
  if (params.has('metafile')) flags.metafile = params.get('metafile')!;
  
  return flags;
}

// Metafile Server
const server = (globalThis as any).Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // /metafile → Live build + context
    if (url.pathname === '/metafile') {
      try {
        console.log(`🔍 Metafile request: ${url.search}`);
        const startTime = performance.now();
        
        const metafile = await contextBuildWithMetafile(['junior-runner.ts'], parseFlags(url.search));
        
        const buildTime = performance.now() - startTime;
        
        return Response.json({
          ...metafile,
          serverBuildTime: Math.round(buildTime * 100) / 100,
          timestamp: new Date().toISOString(),
          endpoint: '/metafile'
        }, { 
          headers: { 
            'Cache-Control': 'public, max-age=300',
            ...corsHeaders
          } 
        });
      } catch (error) {
        console.error('Metafile error:', error);
        return Response.json({
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          endpoint: '/metafile'
        }, { 
          status: 500,
          headers: corsHeaders 
        });
      }
    }
    
    // /metafile/analyze → Advanced analysis
    if (url.pathname === '/metafile/analyze') {
      try {
        console.log(`📊 Analysis request: ${url.search}`);
        const startTime = performance.now();
        
        const metafile = await contextBuildWithMetafile(['junior-runner.ts'], parseFlags(url.search));
        const buildTime = performance.now() - startTime;
        
        // Advanced analysis
        const inputs = metafile.inputs || {};
        const outputs = metafile.outputs || {};
        const bundleSize = metafile.bundleSize || 0;
        
        // Dependency analysis
        const dependencyMap = new Map<string, number>();
        Object.values(inputs).forEach((input: any) => {
          if (input.imports) {
            input.imports.forEach((imp: any) => {
              const path = imp.path;
              dependencyMap.set(path, (dependencyMap.get(path) || 0) + 1);
            });
          }
        });
        
        const topDependencies = Array.from(dependencyMap.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);
        
        // Performance metrics
        const throughput = (bundleSize / 1024) / (buildTime / 1000); // KB/s
        const efficiency = Math.min(100, (1000 / buildTime) * 100);
        
        return Response.json({
          metafile,
          analysis: {
            bundleSizeKB: Math.round(bundleSize / 1024 * 100) / 100,
            buildTimeMs: Math.round(buildTime * 100) / 100,
            throughputKBs: Math.round(throughput * 100) / 100,
            efficiency: Math.round(efficiency * 10) / 10,
            inputCount: Object.keys(inputs).length,
            outputCount: Object.keys(outputs).length,
            topDependencies: topDependencies.map(([path, count]) => ({ path, count }))
          },
          serverBuildTime: Math.round(buildTime * 100) / 100,
          timestamp: new Date().toISOString(),
          endpoint: '/metafile/analyze'
        }, { 
          headers: { 
            'Cache-Control': 'public, max-age=300',
            ...corsHeaders
          } 
        });
      } catch (error) {
        console.error('Analysis error:', error);
        return Response.json({
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          endpoint: '/metafile/analyze'
        }, { 
          status: 500,
          headers: corsHeaders 
        });
      }
    }
    
    // /health → Server status
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        version: 'v3.17',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        endpoints: ['/metafile', '/metafile/analyze', '/health', '/']
      }, { headers: corsHeaders });
    }
    
    // Root → Documentation
    if (url.pathname === '/') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Context Engine v3.17 - Metafile Server</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .method { color: #007acc; font-weight: bold; }
    .path { color: #e83e8c; font-family: monospace; }
    .desc { color: #666; margin-top: 5px; }
    .example { background: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px; }
    code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>🚀 Context Engine v3.17 - Metafile Server</h1>
  <p>Live build + context metafile endpoints with real-time analysis</p>
  
  <div class="endpoint">
    <div><span class="method">GET</span> <span class="path">/metafile</span></div>
    <div class="desc">Generate metafile for junior-runner.ts</div>
    <div class="example">
      <strong>Example:</strong> <code>/metafile?cwd=utils&lsp-safe=true</code>
    </div>
  </div>
  
  <div class="endpoint">
    <div><span class="method">GET</span> <span class="path">/metafile/analyze</span></div>
    <div class="desc">Advanced metafile analysis with performance metrics</div>
    <div class="example">
      <strong>Example:</strong> <code>/metafile/analyze?cwd=utils&silent=true</code>
    </div>
  </div>
  
  <div class="endpoint">
    <div><span class="method">GET</span> <span class="path">/health</span></div>
    <div class="desc">Server health and status information</div>
  </div>
  
  <h2>📊 Available Parameters</h2>
  <ul>
    <li><code>cwd</code> - Working directory (default: current)</li>
    <li><code>config</code> - Config file path</li>
    <li><code>smol</code> - Minify build (true/false)</li>
    <li><code>silent</code> - Silent mode (true/false)</li>
    <li><code>lsp-safe</code> - LSP safe mode (true/false)</li>
    <li><code>metafile</code> - Metafile output path</li>
  </ul>
  
  <h2>⚡ Try it now!</h2>
  <p><a href="/metafile?cwd=utils">Basic metafile</a> | 
     <a href="/metafile/analyze?cwd=utils">Advanced analysis</a> | 
     <a href="/health">Server status</a></p>
</body>
</html>`;
      return new Response(html, { 
        headers: { 'Content-Type': 'text/html', ...corsHeaders } 
      });
    }
    
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
});

console.log(`🚀 Context Engine v3.17 Metafile Server running on http://localhost:${server.port}`);
console.log(`📊 Available endpoints:`);
console.log(`   GET /metafile - Generate metafile`);
console.log(`   GET /metafile/analyze - Advanced analysis`);
console.log(`   GET /health - Server status`);
console.log(`   GET / - Documentation`);
