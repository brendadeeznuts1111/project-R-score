#!/usr/bin/env bun
/**
 * @fileoverview Dashboard Development Watcher
 * @description Hot-reloads trader-analyzer dashboard during development
 * @module trader-analyzer/scripts/watch-dashboard
 * @version 0.2.0
 */

import { watch } from 'chokidar';
import { build } from 'bun';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'bun';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_SRC = join(__dirname, '../dashboard');
const DASHBOARD_DIST = join(__dirname, '../dist/dashboard');
const PORT = 8080;

/**
 * Development watcher with hot reload
 */
class DashboardWatcher {
  constructor() {
    this.watcher = null;
    this.previewProcess = null;
    this.buildQueue = [];
    this.isBuilding = false;
    this.debounceTimer = null;
    
    this.init();
  }
  
  async init() {
    // Clean and initial build
    await this.cleanBuild();
    await this.build();
    
    // Start preview server
    this.startPreview();
    
    // Setup file watcher
    this.setupWatcher();
    
    console.log('🔥 Dashboard watcher active');
    console.log(`📁 Watching: ${DASHBOARD_SRC}`);
    console.log(`📦 Building: ${DASHBOARD_DIST}`);
    console.log(`🌐 Preview: http://localhost:${PORT}/multi-layer-graph.html`);
  }
  
  async cleanBuild() {
    try {
      await Bun.$`rm -rf ${DASHBOARD_DIST}`;
      await Bun.$`mkdir -p ${DASHBOARD_DIST}`;
      console.log('🧹 Clean build directory');
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }
  
  async build(debounce = true) {
    if (this.isBuilding && debounce) {
      // Debounce rapid changes
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.performBuild();
      }, 300);
      
      return;
    }
    
    await this.performBuild();
  }
  
  async performBuild() {
    if (this.isBuilding) return;
    
    this.isBuilding = true;
    console.log('🔨 Building dashboard...');
    
    try {
      // Copy static assets
      await this.copyAssets();
      
      // Bundle JavaScript
      await this.bundleJS();
      
      // Optimize CSS
      await this.optimizeCSS();
      
      // Generate manifest
      await this.generateManifest();
      
      // Restart preview server
      await this.restartPreview();
      
      console.log('✅ Build completed');
    } catch (error) {
      console.error('❌ Build failed:', error);
    } finally {
      this.isBuilding = false;
    }
  }
  
  async copyAssets() {
    const assets = [
      'multi-layer-graph.html',
      'multi-layer-graph.manifest.json',
      'multi-layer-graph.properties.json',
      'multi-layer-graph.types.ts',
      'js/timezone-utils.js',
    ];
    
    for (const asset of assets) {
      const src = join(DASHBOARD_SRC, asset);
      const dest = join(DASHBOARD_DIST, asset);
      
      try {
        await Bun.$`cp ${src} ${dest}`;
      } catch (error) {
        console.warn(`⚠️  Failed to copy ${asset}: ${error.message}`);
      }
    }
    
    console.log('📁 Assets copied');
  }
  
  async bundleJS() {
    const result = await build({
      entrypoints: [join(DASHBOARD_SRC, 'multi-layer-graph.js')],
      outdir: DASHBOARD_DIST,
      target: 'browser',
      format: 'esm',
      minify: false, // Don't minify in dev mode
      sourcemap: 'inline',
      external: ['vis-network'],
    });
    
    if (result.successes.length > 0) {
      console.log('📦 JavaScript bundled');
    } else {
      console.error('❌ JS bundling failed:', result.errors);
      throw new Error('JS bundling failed');
    }
  }
  
  async optimizeCSS() {
    // In dev mode, just copy CSS without minification
    const cssSrc = join(DASHBOARD_SRC, 'styles', 'dashboard.css');
    const cssDest = join(DASHBOARD_DIST, 'dashboard.css');
    
    try {
      await Bun.$`cp ${cssSrc} ${cssDest}`;
      console.log('🎨 CSS copied (dev mode)');
    } catch (error) {
      console.warn('⚠️  CSS copy failed:', error.message);
    }
  }
  
  async generateManifest() {
    const manifest = {
      name: 'Multi-Layer Graph Dashboard (Dev)',
      short_name: 'MLG Dev',
      description: 'Development version of trader-analyzer correlation dashboard',
      version: '0.2.0-dev',
      author: 'NEXUS Team',
      build: {
        timestamp: new Date().toISOString(),
        bunVersion: Bun.version,
        mode: 'development',
        hotReload: true,
      },
      devTools: {
        sourcemaps: true,
        consoleLogs: true,
        liveReload: true,
        debugEndpoints: true,
      },
    };
    
    const manifestPath = join(DASHBOARD_DIST, 'dev-manifest.json');
    await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Update HTML for dev manifest
    const htmlPath = join(DASHBOARD_DIST, 'multi-layer-graph.html');
    let html = await Bun.file(htmlPath).text();
    
    html = html.replace(
      /<link rel="manifest" href="\/production-manifest\.json">/,
      `<link rel="manifest" href="/dev-manifest.json">`
    );
    
    // Enable dev-only features
    html = html.replace(
      /<!-- DEV_ONLY -->[\s\S]*?<!-- END_DEV_ONLY -->/,
      `
        <script>
          // Dev-only: Enable console logging
          window.DEV_MODE = true;
          
          // Dev-only: Mock data generator
          window.generateMockGraph = async (eventId) => {
            console.log('🔧 Dev: Generating mock graph for', eventId);
            return {
              nodes: Array.from({length: 50}, (_, i) => ({
                id: \`n\${i}\`,
                label: \`\${eventId.toUpperCase()}_NODE_\${i}\`,
                layer: Math.floor(Math.random() * 4) + 1,
                type: ['market', 'event', 'bookmaker'][Math.floor(Math.random() * 3)],
                size: 16,
              })),
              edges: Array.from({length: 200}, (_, i) => ({
                id: \`e\${i}\`,
                source: \`n\${Math.floor(Math.random() * 50)}\`,
                target: \`n\${Math.floor(Math.random() * 50)}\`,
                layer: Math.floor(Math.random() * 4) + 1,
                confidence: (0.3 + Math.random() * 0.7).toFixed(3),
                type: ['direct', 'cross-market'][Math.floor(Math.random() * 2)],
              })),
              statistics: {
                totalNodes: 50,
                totalEdges: 200,
                totalAnomalies: Math.floor(Math.random() * 5),
                avgConfidence: (0.3 + Math.random() * 0.7).toFixed(3),
              },
            };
          };
          
          // Dev-only: API error simulation
          window.simulateAPIError = (endpoint, errorType = 'network') => {
            console.warn('🔧 Dev: Simulating', errorType, 'error for', endpoint);
            return new Promise((_, reject) => {
              setTimeout(() => {
                if (errorType === 'network') {
                  reject(new TypeError('Network request failed'));
                } else if (errorType === 'timeout') {
                  reject(new Error('Request timeout'));
                } else if (errorType === 'server') {
                  reject(new Response('Server Error', { status: 500 }));
                }
              }, 1000);
            });
          };
        </script>
        <!-- END_DEV_ONLY -->`
    );
    
    await Bun.write(htmlPath, html);
    console.log('🔧 Dev manifest generated with hot reload');
  }
  
  setupWatcher() {
    this.watcher = watch(DASHBOARD_SRC, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });
    
    this.watcher
      .on('add', (path) => {
        console.log('➕ File added:', path);
        this.build(false); // Don't debounce new files
      })
      .on('change', (path) => {
        console.log('🔄 File changed:', path);
        this.build(true); // Debounce changes
      })
      .on('unlink', (path) => {
        console.log('🗑️  File deleted:', path);
        this.build(false);
      })
      .on('error', (error) => {
        console.error('❌ Watcher error:', error);
      });
    
    console.log('👀 File watcher active');
  }
  
  async startPreview() {
    if (this.previewProcess) {
      this.previewProcess.kill();
    }
    
    this.previewProcess = spawn([
      'bun', 'run', 'scripts/dashboard-server.ts'
    ], {
      cwd: __dirname,
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: 'development',
        WATCH_MODE: 'true',
      },
      stdout: 'inherit',
      stderr: 'inherit',
    });
    
    console.log(`🌐 Dev server started: http://localhost:${PORT}`);
  }
  
  async restartPreview() {
    if (this.previewProcess) {
      console.log('🔄 Restarting dev server...');
      this.previewProcess.kill();
      
      // Wait for process to exit
      await new Promise(resolve => {
        this.previewProcess?.once('exit', resolve);
        setTimeout(resolve, 2000); // Force timeout
      });
    }
    
    await this.startPreview();
  }
}

// Start watcher
const watcher = new DashboardWatcher();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down dashboard watcher...');
  
  if (watcher.watcher) {
    watcher.watcher.close();
  }
  
  if (watcher.previewProcess) {
    watcher.previewProcess.kill();
  }
  
  console.log('👋 Goodbye!');
  process.exit(0);
});