/**
 * Enhanced REAL Zen Dashboard with MIME Type Detection
 * Uses Bun's built-in .type property for intelligent file handling
 */

import { ZenStreamSearcher } from './stream-search';
import { FetchAndRipStreamer, DOCUMENTATION_URLS } from './fetch-and-rip';

interface RealMetrics {
  totalSearches: number;
  realSearchHistory: Array<{
    query: string;
    matches: number;
    time: number;
    memory: number;
    timestamp: string;
  }>;
  systemHealth: 'optimal' | 'good' | 'warning' | 'critical';
  lastUpdate: string;
  supportedMimeTypes: Array<{
    extension: string;
    mimeType: string;
    description: string;
  }>;
}

/**
 * Enhanced Real Dashboard with MIME Type Intelligence
 */
export class EnhancedRealZenDashboard {
  private metrics: RealMetrics;
  private searcher: ZenStreamSearcher;
  private networkStreamer: FetchAndRipStreamer;
  private updateInterval: any = null;
  private server: any = null;

  constructor() {
    this.metrics = {
      totalSearches: 0,
      realSearchHistory: [],
      systemHealth: 'optimal',
      lastUpdate: new Date().toISOString(),
      supportedMimeTypes: []
    };

    this.searcher = new ZenStreamSearcher();
    this.networkStreamer = new FetchAndRipStreamer();
    this.initializeMimeTypes();
  }

  /**
   * Initialize MIME type detection using Bun's built-in capabilities
   */
  private initializeMimeTypes(): void {
    const testFiles = [
      { ext: '.json', file: 'package.json', desc: 'JSON data files' },
      { ext: '.html', file: 'zen-dashboard-enhanced.html', desc: 'HTML web pages' },
      { ext: '.md', file: 'README.md', desc: 'Markdown documents' },
      { ext: '.ts', file: 'lib/docs/stream-search.ts', desc: 'TypeScript source' },
      { ext: '.js', file: 'package.json', desc: 'JavaScript files' },
      { ext: '.css', file: 'package.json', desc: 'CSS stylesheets' },
      { ext: '.txt', file: 'bun-protocol-info.json', desc: 'Plain text files' },
      { ext: '.csv', file: 'search-results.csv', desc: 'CSV data files' }
    ];

    this.metrics.supportedMimeTypes = testFiles.map(({ ext: extension, file, desc: description }) => {
      try {
        const bunFile = (Bun as any).file(file);
        const mimeType = bunFile.type || 'application/octet-stream';
        return { extension, mimeType, description };
      } catch {
        return { extension, mimeType: 'application/octet-stream', description };
      }
    });

    console.log('🎯 MIME Type Detection Initialized:');
    this.metrics.supportedMimeTypes.forEach(({ extension, mimeType, description }) => {
      console.log(`   ${extension} → ${mimeType} (${description})`);
    });
  }

  /**
   * Start Enhanced REAL dashboard with MIME type support
   */
  async startEnhancedRealDashboard(): Promise<void> {
    console.log('🎯 Starting Enhanced REAL Zen Dashboard with MIME Type Detection!');
    
    // Start Bun server with enhanced MIME support
    this.server = (Bun as any).serve({
      port: 3004,
      fetch: async (req: Request) => {
        const url = new URL(req.url);
        
        // Serve enhanced dashboard HTML
        if (url.pathname === '/' || url.pathname === '/dashboard') {
          const html = await this.generateEnhancedHTMLDashboard();
          return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
        
        // API for REAL metrics
        if (url.pathname === '/api/real-metrics') {
          return Response.json(this.metrics);
        }
        
        // MIME type detection API
        if (url.pathname === '/api/mime-types') {
          return Response.json({
            supportedMimeTypes: this.metrics.supportedMimeTypes,
            totalTypes: this.metrics.supportedMimeTypes.length,
            bunCapability: 'Built-in MIME type detection using Bun.file().type'
          });
        }
        
        // File analysis with MIME detection
        if (url.pathname === '/api/analyze-file') {
          const filename = url.searchParams.get('file');
          if (filename) {
            const analysis = await this.analyzeFileWithMime(filename);
            return Response.json(analysis);
          }
        }
        
        // Perform REAL search
        if (url.pathname === '/api/search') {
          const query = url.searchParams.get('query') || 'bun';
          const result = await this.performRealSearch(query);
          return Response.json(result);
        }
        
        // Serve files with proper MIME types
        if (url.pathname.startsWith('/static/')) {
          const filename = url.pathname.substring(8); // Remove /static/
          return await this.serveFileWithMime(filename);
        }
        
        return new Response('Not Found', { status: 404 });
      },
    });

    console.log('🌐 Enhanced REAL Zen Dashboard Server Started!');
    console.log('=' .repeat(70));
    console.log(`📱 Dashboard: http://localhost:${this.server.port}/dashboard`);
    console.log(`🔗 Bun Protocol: bun://localhost:${this.server.port}/dashboard`);
    console.log(`📊 Real Metrics: http://localhost:${this.server.port}/api/real-metrics`);
    console.log(`🎭 MIME Types: http://localhost:${this.server.port}/api/mime-types`);
    console.log(`📁 File Analysis: http://localhost:${this.server.port}/api/analyze-file?file=package.json`);
    console.log(`🔍 Live Search: http://localhost:${this.server.port}/api/search?query=zen`);
    console.log('');
    console.log('🎯 Enhanced Features:');
    console.log('   ✅ Built-in MIME type detection');
    console.log('   ✅ Intelligent file serving');
    console.log('   ✅ Real-time performance metrics');
    console.log('   ✅ Interactive file analysis');
    
    // Start performing real searches
    this.startRealSearches();
    
    // Generate enhanced static dashboard
    await this.generateEnhancedStaticDashboard();
  }

  /**
   * Analyze file with MIME type detection
   */
  private async analyzeFileWithMime(filename: string): Promise<any> {
    try {
      const bunFile = (Bun as any).file(filename);
      const exists = await bunFile.exists();
      
      if (!exists) {
        return {
          error: 'File not found',
          filename,
          exists: false
        };
      }

      const stats = await bunFile.stat();
      const mimeType = bunFile.type;
      const size = stats.size;
      const lastModified = new Date(stats.mtimeMs).toISOString();

      return {
        filename,
        exists: true,
        mimeType,
        size,
        lastModified,
        sizeHuman: this.formatBytes(size),
        bunDetection: 'Using Bun.file().type property',
        capabilities: this.getMimeCapabilities(mimeType)
      };
      
    } catch (error) {
      return {
        error: error.message,
        filename,
        exists: false
      };
    }
  }

  /**
   * Get capabilities based on MIME type
   */
  private getMimeCapabilities(mimeType: string): string[] {
    const capabilities: { [key: string]: string[] } = {
      'application/json': ['Parse as JSON', 'Search in structure', 'Validate schema'],
      'text/html': ['Render in browser', 'Extract links', 'Parse DOM'],
      'text/markdown': ['Render to HTML', 'Extract headers', 'Parse code blocks'],
      'text/plain': ['Search content', 'Read as text', 'Line counting'],
      'text/typescript': ['Syntax highlighting', 'Type checking', 'Import analysis'],
      'text/javascript': ['Execute safely', 'Parse AST', 'Dependency analysis'],
      'text/csv': ['Parse as table', 'Data analysis', 'Chart generation'],
      'application/octet-stream': ['Binary analysis', 'Hex view', 'Signature detection']
    };
    
    return capabilities[mimeType] || ['Generic file handling'];
  }

  /**
   * Serve file with proper MIME type
   */
  private async serveFileWithMime(filename: string): Promise<Response> {
    try {
      const bunFile = (Bun as any).file(filename);
      const exists = await bunFile.exists();
      
      if (!exists) {
        return new Response('File not found', { status: 404 });
      }

      const mimeType = bunFile.type || 'application/octet-stream';
      const fileContent = await bunFile.arrayBuffer();
      
      return new Response(fileContent, {
        headers: { 
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600'
        }
      });
      
    } catch (error) {
      return new Response(`Error serving file: ${error.message}`, { status: 500 });
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Perform real search (same as before)
   */
  private async performRealSearch(query: string): Promise<any> {
    console.log(`🔍 Performing REAL search: "${query}"`);
    
    try {
      const startTime = performance.now();
      const results = await this.searcher.streamSearch({
        query,
        cachePath: '/Users/nolarose/Projects/.cache'
      });
      const searchTime = performance.now() - startTime;

      const realSearch = {
        query,
        matches: results.matchesFound,
        time: searchTime,
        memory: results.memoryUsage / 1024 / 1024,
        timestamp: new Date().toISOString()
      };

      this.metrics.realSearchHistory.unshift(realSearch);
      if (this.metrics.realSearchHistory.length > 20) {
        this.metrics.realSearchHistory = this.metrics.realSearchHistory.slice(0, 20);
      }

      this.metrics.totalSearches++;
      this.updateSystemHealth();
      this.metrics.lastUpdate = new Date().toISOString();

      console.log(`✅ REAL Search Results: ${results.matchesFound} matches in ${searchTime.toFixed(2)}ms`);
      
      return {
        success: true,
        query,
        matches: results.matchesFound,
        time: searchTime,
        memory: realSearch.memory,
        totalSearches: this.metrics.totalSearches
      };
      
    } catch (error) {
      console.error(`❌ Real search failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        query
      };
    }
  }

  /**
   * Update system health
   */
  private updateSystemHealth(): void {
    if (this.metrics.realSearchHistory.length === 0) {
      this.metrics.systemHealth = 'optimal';
      return;
    }

    const avgTime = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.time, 0) / this.metrics.realSearchHistory.length;
    const avgMemory = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.memory, 0) / this.metrics.realSearchHistory.length;

    if (avgTime > 100 || avgMemory > 50) {
      this.metrics.systemHealth = 'critical';
    } else if (avgTime > 50 || avgMemory > 20) {
      this.metrics.systemHealth = 'warning';
    } else if (avgTime > 20 || avgMemory > 10) {
      this.metrics.systemHealth = 'good';
    } else {
      this.metrics.systemHealth = 'optimal';
    }
  }

  /**
   * Start real searches
   */
  private startRealSearches(): void {
    this.updateInterval = setInterval(async () => {
      await this.performRandomRealSearch();
    }, 15000);

    this.performRandomRealSearch();
  }

  /**
   * Perform random real search
   */
  private async performRandomRealSearch(): Promise<void> {
    const queries = ['bun', 'performance', 'streaming', 'zen', 'fetch', 'spawn', 'ripgrep', 'mime'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    
    await this.performRealSearch(randomQuery);
  }

  /**
   * Generate enhanced HTML dashboard
   */
  private async generateEnhancedHTMLDashboard(): Promise<string> {
    const avgTime = this.metrics.realSearchHistory.length > 0 
      ? this.metrics.realSearchHistory.reduce((sum, s) => sum + s.time, 0) / this.metrics.realSearchHistory.length 
      : 0;
    const avgMemory = this.metrics.realSearchHistory.length > 0
      ? this.metrics.realSearchHistory.reduce((sum, s) => sum + s.memory, 0) / this.metrics.realSearchHistory.length
      : 0;
    const totalMatches = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.matches, 0);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced REAL Zen Dashboard - MIME Type Intelligence</title>
    <style>
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
            color: #e2e8f0; 
            min-height: 100vh;
        }
        .enhanced-badge { 
            background: linear-gradient(45deg, #3b82f6, #22c55e); 
            color: white; 
            padding: 6px 12px; 
            border-radius: 6px; 
            font-size: 0.9em; 
            font-weight: bold;
            animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        .mime-section { 
            background: #1e293b; 
            padding: 20px; 
            border-radius: 12px; 
            border: 1px solid #334155; 
            margin-bottom: 20px;
        }
        .mime-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 10px; 
            margin-top: 15px;
        }
        .mime-item { 
            background: #0f172a; 
            padding: 10px; 
            border-radius: 8px; 
            font-size: 0.9em;
            border-left: 3px solid #3b82f6;
        }
        .mime-ext { font-weight: bold; color: #22c55e; }
        .mime-type { color: #94a3b8; font-family: monospace; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .metric-card { 
            background: rgba(30, 41, 59, 0.8); 
            padding: 25px; 
            border-radius: 16px; 
            border: 1px solid #334155; 
            backdrop-filter: blur(10px);
            transition: transform 0.3s ease;
        }
        .metric-card:hover { transform: translateY(-5px); }
        .metric-value { 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #22c55e; 
            margin-bottom: 5px;
        }
        .metric-label { color: #94a3b8; font-size: 0.9em; }
        .search-history { 
            background: rgba(30, 41, 59, 0.8); 
            padding: 25px; 
            border-radius: 16px; 
            border: 1px solid #334155; 
            backdrop-filter: blur(10px);
        }
        .search-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 15px 0; 
            border-bottom: 1px solid #334155; 
        }
        .search-item:last-child { border-bottom: none; }
        .search-query { font-weight: 600; color: #22c55e; }
        .search-stats { color: #94a3b8; }
        .btn { 
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 8px; 
            cursor: pointer;
            margin: 5px;
            transition: background 0.3s ease;
        }
        .btn:hover { background: #2563eb; }
        .btn.mime { background: #22c55e; }
        .btn.mime:hover { background: #16a34a; }
        .file-analysis { 
            background: rgba(30, 41, 59, 0.8); 
            padding: 20px; 
            border-radius: 16px; 
            border: 1px solid #334155; 
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div style="max-width: 1200px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 2.5em; margin-bottom: 10px;">
                🎯 Enhanced REAL Zen Dashboard 
                <span class="enhanced-badge">MIME INTELLIGENCE</span>
            </h1>
            <p>Real search data with Bun's built-in MIME type detection</p>
        </div>
        
        <div class="mime-section">
            <h3>🎭 MIME Type Detection - Bun Intelligence</h3>
            <p>Using Bun.file().type for automatic MIME type recognition</p>
            <div class="mime-grid">
                ${this.metrics.supportedMimeTypes.map(({ extension, mimeType, description }) => `
                    <div class="mime-item">
                        <span class="mime-ext">${extension}</span>
                        <span class="mime-type">${mimeType}</span>
                        <div style="font-size: 0.8em; margin-top: 5px;">${description}</div>
                    </div>
                `).join('')}
            </div>
            <button class="btn mime" onclick="refreshMimeTypes()">🔄 Refresh MIME Types</button>
            <button class="btn mime" onclick="analyzeFile()">📁 Analyze File</button>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value" id="totalSearches">${this.metrics.totalSearches}</div>
                <div class="metric-label">🔍 Total REAL Searches</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="avgTime">${avgTime.toFixed(2)}ms</div>
                <div class="metric-label">⚡ Average REAL Search Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="totalMatches">${totalMatches}</div>
                <div class="metric-label">🎯 Total REAL Matches</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="avgMemory">${avgMemory.toFixed(2)}MB</div>
                <div class="metric-label">💾 Average REAL Memory Usage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="mimeTypes">${this.metrics.supportedMimeTypes.length}</div>
                <div class="metric-label">🎭 Supported MIME Types</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="lastUpdate">${new Date(this.metrics.lastUpdate).toLocaleTimeString()}</div>
                <div class="metric-label">🕒 Last REAL Update</div>
            </div>
        </div>
        
        <div class="search-history">
            <h2>📜 REAL Search History - Live Data</h2>
            <div id="searchHistory">
                ${this.metrics.realSearchHistory.length === 0 ? 
                    '<p style="text-align: center; color: #64748b;">No real searches performed yet...</p>' :
                    this.metrics.realSearchHistory.map(search => `
                        <div class="search-item">
                            <span class="search-query">🔍 "${search.query}"</span>
                            <span class="search-stats">${search.matches} matches • ${search.time.toFixed(2)}ms • ${search.memory.toFixed(2)}MB</span>
                        </div>
                    `).join('')
                }
            </div>
        </div>
        
        <div class="file-analysis" id="fileAnalysis" style="display: none;">
            <h3>📁 File Analysis with MIME Detection</h3>
            <div id="fileAnalysisContent"></div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; color: #64748b;">
            <p>🎯 Enhanced with Bun's built-in MIME type detection</p>
            <p>🚀 Real search data • 🎭 Intelligent file handling • 🔗 Bun file protocol</p>
            <p><strong>100% REAL performance with MIME intelligence!</strong></p>
        </div>
    </div>

    <script>
        async function refreshMimeTypes() {
            try {
                const response = await fetch('/api/mime-types');
                const data = await response.json();
                console.log('🎭 MIME Types:', data);
                alert(\`Detected \${data.totalTypes} MIME types using Bun's built-in detection!\`);
            } catch (error) {
                console.error('❌ Failed to refresh MIME types:', error);
            }
        }
        
        async function analyzeFile() {
            const filename = prompt('Enter filename to analyze (e.g., package.json, README.md):');
            if (!filename) return;
            
            try {
                const response = await fetch(\`/api/analyze-file?file=\${filename}\`);
                const analysis = await response.json();
                
                const analysisDiv = document.getElementById('fileAnalysis');
                const contentDiv = document.getElementById('fileAnalysisContent');
                
                if (analysis.error) {
                    contentDiv.innerHTML = \`<p style="color: #ef4444;">❌ \${analysis.error}</p>\`;
                } else {
                    contentDiv.innerHTML = \`
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div><strong>Filename:</strong> \${analysis.filename}</div>
                            <div><strong>MIME Type:</strong> <code>\${analysis.mimeType}</code></div>
                            <div><strong>Size:</strong> \${analysis.sizeHuman}</div>
                            <div><strong>Modified:</strong> \${new Date(analysis.lastModified).toLocaleString()}</div>
                        </div>
                        <div style="margin-top: 15px;">
                            <strong>Capabilities:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                \${analysis.capabilities.map(cap => \`<li>\${cap}</li>\`).join('')}
                            </ul>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.9em; color: #64748b;">
                            🎭 Detected using: \${analysis.bunDetection}
                        </div>
                    \`;
                }
                
                analysisDiv.style.display = 'block';
                
            } catch (error) {
                console.error('❌ Failed to analyze file:', error);
                alert('Failed to analyze file: ' + error.message);
            }
        }
        
        async function refreshRealData() {
            try {
                const response = await fetch('/api/real-metrics');
                const metrics = await response.json();
                
                document.getElementById('totalSearches').textContent = metrics.totalSearches;
                document.getElementById('mimeTypes').textContent = metrics.supportedMimeTypes.length;
                document.getElementById('lastUpdate').textContent = new Date(metrics.lastUpdate).toLocaleTimeString();
                
                if (metrics.realSearchHistory.length > 0) {
                    const avgTime = metrics.realSearchHistory.reduce((sum, s) => sum + s.time, 0) / metrics.realSearchHistory.length;
                    const avgMemory = metrics.realSearchHistory.reduce((sum, s) => sum + s.memory, 0) / metrics.realSearchHistory.length;
                    const totalMatches = metrics.realSearchHistory.reduce((sum, s) => sum + s.matches, 0);
                    
                    document.getElementById('avgTime').textContent = avgTime.toFixed(2) + 'ms';
                    document.getElementById('avgMemory').textContent = avgMemory.toFixed(2) + 'MB';
                    document.getElementById('totalMatches').textContent = totalMatches;
                    
                    const historyHtml = metrics.realSearchHistory.map(search => 
                        \`<div class="search-item">
                            <span class="search-query">🔍 "\${search.query}"</span>
                            <span class="search-stats">\${search.matches} matches • \${search.time.toFixed(2)}ms • \${search.memory.toFixed(2)}MB</span>
                        </div>\`
                    ).join('');
                    
                    document.getElementById('searchHistory').innerHTML = historyHtml;
                }
                
                console.log('✅ Enhanced real data refreshed!');
                
            } catch (error) {
                console.error('❌ Failed to refresh real data:', error);
            }
        }
        
        // Auto-refresh every 10 seconds
        setInterval(refreshRealData, 10000);
        
        console.log('🎯 Enhanced REAL Zen Dashboard loaded!');
        console.log('🎭 MIME Type Intelligence: Active');
        console.log('📊 Showing 100% REAL search data with enhanced file handling!');
    </script>
</body>
</html>`;
    
    return html;
  }

  /**
   * Generate enhanced static dashboard
   */
  private async generateEnhancedStaticDashboard(): Promise<void> {
    const html = await this.generateEnhancedHTMLDashboard();
    const staticFile = (Bun as any).file('enhanced-real-zen-dashboard-mime.html', { type: 'text/html' });
    await Bun.write(staticFile, new TextEncoder().encode(html));
    
    console.log('📄 Enhanced static dashboard saved: enhanced-real-zen-dashboard-mime.html');
    console.log('🎯 Open with: open enhanced-real-zen-dashboard-mime.html');
  }

  /**
   * Stop dashboard
   */
  stopDashboard(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    console.log('👋 Enhanced REAL Zen Dashboard stopped.');
  }
}

// Run enhanced dashboard
if (import.meta.url === `file://${process.argv[1]}`) {
  const enhancedDashboard = new EnhancedRealZenDashboard();
  
  enhancedDashboard.startEnhancedRealDashboard().catch(console.error);
  
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Enhanced REAL Zen Dashboard...');
    enhancedDashboard.stopDashboard();
    process.exit(0);
  });
}
