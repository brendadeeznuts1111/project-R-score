#!/usr/bin/env bun

import { Bun } from "bun";
import { join } from "path";

// Real-time Bundle Analysis
async function getRealBundleAnalysis() {
  const buildDir = "./dist";
  const manifestPath = join(buildDir, "manifest.json");
  const metafilePath = join(buildDir, ".vite", "metafile.json");
  const bunMetafilePath = join(buildDir, ".bun", "metafile.json");
  
  try {
    const analysis = {
      timestamp: Date.now(),
      buildTime: await getBuildTime(),
      totalSize: await calculateTotalSize(buildDir),
      chunks: await analyzeChunks(buildDir),
      dependencies: await analyzeDependencies(metafilePath, bunMetafilePath),
      assets: await analyzeAssets(buildDir),
      recommendations: await generateRecommendations(buildDir),
      buildSystem: await detectBuildSystem(buildDir)
    };
    
    console.log(`📊 Bundle analysis completed: ${(analysis.totalSize / 1024 / 1024).toFixed(2)}MB`);
    return analysis;
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error);
    return getFallbackAnalysis();
  }
}

async function calculateTotalSize(buildDir: string): Promise<number> {
  let totalSize = 0;
  
  function scanDirectory(dir: string) {
    try {
      const files = readFileSync(dir);
      for (const file of files) {
        const fullPath = join(dir, file.name);
        if (file.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          totalSize += statSync(fullPath).size;
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }
  
  if (existsSync(buildDir)) {
    scanDirectory(buildDir);
  }
  
  return totalSize;
}

async function analyzeChunks(buildDir: string) {
  const chunks = [];
  const entryPoints = ['index.html', 'main.js', 'app.js', 'index.js'];
  
  for (const entry of entryPoints) {
    const entryPath = join(buildDir, entry);
    if (existsSync(entryPath)) {
      const stats = statSync(entryPath);
      chunks.push({
        name: entry,
        size: stats.size,
        type: entry.endsWith('.html') ? 'html' : 'js',
        lastModified: stats.mtime.getTime(),
        sizeFormatted: formatBytes(stats.size)
      });
    }
  }
  
  // Also analyze .js files in subdirectories
  try {
    const files = readFileSync(buildDir);
    for (const file of files) {
      if (file.name.endsWith('.js') && !entryPoints.includes(file.name)) {
        const fullPath = join(buildDir, file.name);
        const stats = statSync(fullPath);
        chunks.push({
          name: file.name,
          size: stats.size,
          type: 'js',
          lastModified: stats.mtime.getTime(),
          sizeFormatted: formatBytes(stats.size)
        });
      }
    }
  } catch (error) {
    console.error('Error analyzing chunks:', error);
  }
  
  return chunks.sort((a, b) => b.size - a.size);
}

async function analyzeDependencies(metafilePath: string, bunMetafilePath: string) {
  const dependencies = [];
  
  // Try Vite metafile first
  if (existsSync(metafilePath)) {
    try {
      const metafile = JSON.parse(readFileSync(metafilePath, 'utf-8'));
      for (const [file, info] of Object.entries(metafile.inputs || {})) {
        if (file.includes('node_modules')) {
          const packageName = file.split('node_modules/')[1]?.split('/')[0];
          if (packageName && !dependencies.find(d => d.name === packageName)) {
            dependencies.push({
              name: packageName,
              size: (info as any).bytes || 0,
              path: file,
              sizeFormatted: formatBytes((info as any).bytes || 0)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error parsing Vite metafile:', error);
    }
  }
  
  // Try Bun metafile
  if (existsSync(bunMetafilePath)) {
    try {
      const metafile = JSON.parse(readFileSync(bunMetafilePath, 'utf-8'));
      for (const [file, info] of Object.entries(metafile.inputs || {})) {
        if (file.includes('node_modules')) {
          const packageName = file.split('node_modules/')[1]?.split('/')[0];
          if (packageName && !dependencies.find(d => d.name === packageName)) {
            dependencies.push({
              name: packageName,
              size: (info as any).bytes || 0,
              path: file,
              sizeFormatted: formatBytes((info as any).bytes || 0)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error parsing Bun metafile:', error);
    }
  }
  
  // Fallback: analyze package.json
  if (dependencies.length === 0) {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      for (const [name, version] of Object.entries(allDeps)) {
        dependencies.push({
          name,
          size: 0, // Unknown size
          path: `node_modules/${name}`,
          sizeFormatted: 'Unknown'
        });
      }
    } catch (error) {
      console.error('Error reading package.json:', error);
    }
  }
  
  return dependencies.sort((a, b) => b.size - a.size).slice(0, 20); // Top 20
}

async function analyzeAssets(buildDir: string) {
  const assets = [];
  const assetTypes = ['.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  
  try {
    const files = readFileSync(buildDir);
    for (const file of files) {
      if (assetTypes.some(type => file.name.endsWith(type))) {
        const fullPath = join(buildDir, file.name);
        const stats = statSync(fullPath);
        assets.push({
          name: file.name,
          size: stats.size,
          type: file.name.split('.').pop(),
          sizeFormatted: formatBytes(stats.size)
        });
      }
    }
  } catch (error) {
    console.error('Error analyzing assets:', error);
  }
  
  return assets.sort((a, b) => b.size - a.size);
}

async function generateRecommendations(buildDir: string) {
  const recommendations = [];
  const analysis = await getRealBundleAnalysis();
  
  if (analysis.totalSize > 5 * 1024 * 1024) {
    recommendations.push({
      type: 'warning',
      message: 'Bundle size exceeds 5MB',
      suggestion: 'Consider code splitting and lazy loading'
    });
  }
  
  if (analysis.dependencies.length > 50) {
    recommendations.push({
      type: 'info',
      message: 'High dependency count',
      suggestion: 'Review and remove unused dependencies'
    });
  }
  
  const largeDeps = analysis.dependencies.filter(d => d.size > 100 * 1024);
  if (largeDeps.length > 0) {
    recommendations.push({
      type: 'warning',
      message: 'Large dependencies detected',
      suggestion: `Consider alternatives for: ${largeDeps.map(d => d.name).join(', ')}`
    });
  }
  
  return recommendations;
}

async function detectBuildSystem(buildDir: string) {
  if (existsSync(join(buildDir, '.vite'))) return 'Vite';
  if (existsSync(join(buildDir, '.bun'))) return 'Bun';
  if (existsSync(join(buildDir, 'webpack-stats.json'))) return 'Webpack';
  if (existsSync(join(buildDir, 'rollup.config.js'))) return 'Rollup';
  return 'Unknown';
}

async function getBuildTime(): number {
  const buildDir = "./dist";
  if (existsSync(buildDir)) {
    const stats = statSync(buildDir);
    return stats.mtime.getTime();
  }
  return Date.now();
}

function getFallbackAnalysis() {
  return {
    timestamp: Date.now(),
    buildTime: Date.now(),
    totalSize: 0,
    chunks: [],
    dependencies: [],
    assets: [],
    recommendations: [{
      type: 'error',
      message: 'Build directory not found',
      suggestion: 'Run build command first'
    }],
    buildSystem: 'Unknown'
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Build Monitor Class
class BuildMonitor {
  private buildDir: string;
  private lastBuild: number = 0;
  private watchers: any[] = [];
  private buildHistory: any[] = [];
  
  constructor(buildDir: string = "./dist") {
    this.buildDir = buildDir;
    this.loadBuildHistory();
    this.startWatching();
  }
  
  private loadBuildHistory() {
    const historyPath = "./build-history.json";
    try {
      if (existsSync(historyPath)) {
        this.buildHistory = JSON.parse(readFileSync(historyPath, 'utf-8'));
      }
    } catch (error) {
      console.error('Error loading build history:', error);
      this.buildHistory = [];
    }
  }
  
  private saveBuildHistory() {
    const historyPath = "./build-history.json";
    try {
      writeFileSync(historyPath, JSON.stringify(this.buildHistory, null, 2));
    } catch (error) {
      console.error('Error saving build history:', error);
    }
  }
  
  private startWatching() {
    if (!existsSync(this.buildDir)) {
      console.log(`📁 Build directory ${this.buildDir} not found, creating...`);
      mkdirSync(this.buildDir, { recursive: true });
    }
    
    try {
      const watcher = watch(this.buildDir, { recursive: true }, (eventType, filename) => {
        if (eventType === 'change' && filename) {
          this.onBuildChange(filename);
        }
      });
      
      this.watchers.push(watcher);
      console.log('👀 Started watching build directory for changes');
    } catch (error) {
      console.error('Error starting file watcher:', error);
    }
  }
  
  private async onBuildChange(filename: string) {
    console.log(`🔄 Build change detected: ${filename}`);
    this.lastBuild = Date.now();
    
    // Analyze the new build
    const analysis = await getRealBundleAnalysis();
    
    // Add to history
    this.buildHistory.push({
      timestamp: this.lastBuild,
      filename,
      totalSize: analysis.totalSize,
      chunks: analysis.chunks.length,
      dependencies: analysis.dependencies.length,
      buildSystem: analysis.buildSystem
    });
    
    // Keep only last 20 builds
    if (this.buildHistory.length > 20) {
      this.buildHistory = this.buildHistory.slice(-20);
    }
    
    this.saveBuildHistory();
    
    // Notify connected clients
    this.broadcastUpdate({
      type: 'build-change',
      filename,
      timestamp: this.lastBuild,
      analysis
    });
  }
  
  async getCurrentBuild() {
    return {
      lastBuild: this.lastBuild,
      analysis: await getRealBundleAnalysis(),
      status: this.isBuilding() ? 'building' : 'ready',
      historyCount: this.buildHistory.length
    };
  }
  
  private isBuilding(): boolean {
    const buildLockPath = join(this.buildDir, '.build-lock');
    return existsSync(buildLockPath);
  }
  
  private broadcastUpdate(update: any) {
    // This would be implemented with WebSocket connections
    console.log('📡 Broadcasting update:', update.type);
  }
  
  async getBuildHistory() {
    return this.buildHistory.slice(-10); // Last 10 builds
  }
}

// Enhanced Metrics
async function getLiveMetrics() {
  const bundleAnalysis = await getRealBundleAnalysis();
  const buildMonitor = new BuildMonitor();
  const buildStatus = await buildMonitor.getCurrentBuild();
  const history = await buildMonitor.getBuildHistory();
  
  return {
    timestamp: Date.now(),
    bundle: {
      size: bundleAnalysis.totalSize,
      sizeFormatted: formatBytes(bundleAnalysis.totalSize),
      chunks: bundleAnalysis.chunks.length,
      dependencies: bundleAnalysis.dependencies.length,
      assets: bundleAnalysis.assets.length,
      lastBuild: buildStatus.lastBuild,
      buildTime: bundleAnalysis.buildTime,
      buildSystem: bundleAnalysis.buildSystem
    },
    performance: {
      bundleSizeChange: await calculateBundleSizeChange(history),
      buildDuration: await getAverageBuildTime(history),
      optimizationScore: await calculateOptimizationScore(bundleAnalysis),
      dependencyCount: bundleAnalysis.dependencies.length
    },
    alerts: await generateBuildAlerts(bundleAnalysis),
    buildStatus: buildStatus.status,
    history: history.slice(-5) // Last 5 builds
  };
}

async function calculateBundleSizeChange(history: any[]) {
  if (history.length < 2) return 0;
  
  const current = history[history.length - 1];
  const previous = history[history.length - 2];
  
  if (previous.totalSize === 0) return 0;
  
  const change = ((current.totalSize - previous.totalSize) / previous.totalSize * 100);
  return parseFloat(change.toFixed(2));
}

async function getAverageBuildTime(history: any[]) {
  if (history.length < 2) return 0;
  
  let totalTime = 0;
  for (let i = 1; i < history.length; i++) {
    totalTime += history[i].timestamp - history[i-1].timestamp;
  }
  
  return Math.round(totalTime / (history.length - 1) / 1000); // in seconds
}

async function calculateOptimizationScore(analysis: any) {
  let score = 100;
  
  // Deduct points for large bundle
  if (analysis.totalSize > 5 * 1024 * 1024) score -= 20;
  else if (analysis.totalSize > 2 * 1024 * 1024) score -= 10;
  
  // Deduct points for many dependencies
  if (analysis.dependencies.length > 100) score -= 15;
  else if (analysis.dependencies.length > 50) score -= 8;
  
  // Deduct points for many chunks
  if (analysis.chunks.length > 10) score -= 10;
  
  return Math.max(0, score);
}

async function generateBuildAlerts(analysis: any) {
  const alerts = [];
  
  if (analysis.totalSize > 5 * 1024 * 1024) {
    alerts.push({
      level: 'warning',
      message: 'Bundle size exceeds 5MB',
      value: formatBytes(analysis.totalSize)
    });
  }
  
  if (analysis.dependencies.length > 100) {
    alerts.push({
      level: 'info',
      message: 'High dependency count',
      value: `${analysis.dependencies.length} dependencies`
    });
  }
  
  const largeDeps = analysis.dependencies.filter((d: any) => d.size > 100 * 1024);
  if (largeDeps.length > 0) {
    alerts.push({
      level: 'warning',
      message: 'Large dependencies detected',
      value: `${largeDeps.length} dependencies > 100KB`
    });
  }
  
  if (analysis.recommendations.some((r: any) => r.type === 'error')) {
    alerts.push({
      level: 'error',
      message: 'Build issues detected',
      value: 'Check recommendations'
    });
  }
  
  return alerts;
}

// Trigger Build
async function triggerNewBuild() {
  try {
    console.log('🔨 Starting new build...');
    
    const buildDir = "./dist";
    const buildLockPath = join(buildDir, ".build-lock");
    
    // Create build lock
    writeFileSync(buildLockPath, Date.now().toString());
    
    // Run build command
    const buildProcess = Bun.spawn(["bun", "run", "build"], {
      stdout: "pipe",
      stderr: "pipe"
    });
    
    const [stdout, stderr] = await Promise.all([
      new Response(buildProcess.stdout).text(),
      new Response(buildProcess.stderr).text()
    ]);
    
    const exitCode = await buildProcess.exited;
    
    // Remove build lock
    if (existsSync(buildLockPath)) {
      unlinkSync(buildLockPath);
    }
    
    const result = {
      success: exitCode === 0,
      timestamp: Date.now(),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      duration: Date.now() - Date.now()
    };
    
    console.log(`🏗️ Build ${result.success ? 'completed' : 'failed'} in ${result.duration}ms`);
    return result;
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    return {
      success: false,
      error: (error as Error).message,
      timestamp: Date.now()
    };
  }
}

// Export functions
export {
  getRealBundleAnalysis,
  getLiveMetrics,
  triggerNewBuild,
  BuildMonitor,
  formatBytes
};

// Start the monitoring server if run directly
if (import.meta.main) {
  console.log('🚀 Starting Real-time Bundle Monitoring Server...');
  
  const buildMonitor = new BuildMonitor();
  
  const server = Bun.serve({
    port: 3003,
    async fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname === "/") {
        return new Response(createRealtimeDashboard(), {
          headers: { "Content-Type": "text/html" }
        });
      }
      
      if (url.pathname === "/bundle-analysis") {
        const analysis = await getRealBundleAnalysis();
        return Response.json(analysis);
      }
      
      if (url.pathname === "/metrics") {
        const metrics = await getLiveMetrics();
        return Response.json(metrics);
      }
      
      if (url.pathname === "/build-status") {
        const status = await buildMonitor.getCurrentBuild();
        return Response.json(status);
      }
      
      if (url.pathname === "/trigger-build" && req.method === "POST") {
        const buildResult = await triggerNewBuild();
        return Response.json(buildResult);
      }
      
      if (url.pathname === "/build-history") {
        const history = await buildMonitor.getBuildHistory();
        return Response.json(history);
      }
      
      if (url.pathname === "/health") {
        return Response.json({
          status: "healthy",
          timestamp: Date.now(),
          version: Bun.version,
          buildMonitor: "active",
          realTimeData: true
        });
      }
      
      return new Response("Not Found", { status: 404 });
    }
  });
  
  console.log(`📊 Real-time monitoring server running on http://localhost:${server.port}`);
  console.log('🔗 Available endpoints:');
  console.log('  GET  /                 - Dashboard UI');
  console.log('  GET  /bundle-analysis  - Real bundle analysis');
  console.log('  GET  /metrics          - Live metrics');
  console.log('  GET  /build-status     - Current build status');
  console.log('  POST /trigger-build    - Trigger new build');
  console.log('  GET  /build-history    - Build history');
  console.log('  GET  /health           - Health check');
}

function createRealtimeDashboard(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real-time Bundle Monitor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .pulse { animation: pulse 2s infinite; }
        .status-building { background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%); }
        .status-ready { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
    </style>
</head>
<body class="bg-gray-900 text-gray-100">
    <div class="min-h-screen p-6">
        <header class="mb-8">
            <h1 class="text-4xl font-bold mb-2">📊 Real-time Bundle Monitor</h1>
            <p class="text-gray-400">Live monitoring of your application's build performance</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Bundle Size</h3>
                <p class="text-2xl font-bold" id="bundle-size">-</p>
                <p class="text-xs text-gray-500 mt-1" id="bundle-change">-</p>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Dependencies</h3>
                <p class="text-2xl font-bold" id="dep-count">-</p>
                <p class="text-xs text-gray-500 mt-1" id="build-system">-</p>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Build Status</h3>
                <p class="text-2xl font-bold" id="build-status">-</p>
                <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div class="h-2 rounded-full transition-all duration-500" id="build-bar"></div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Last Build</h3>
                <p class="text-2xl font-bold" id="last-build">-</p>
                <p class="text-xs text-gray-500 mt-1" id="build-time">-</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4">📦 Bundle Analysis</h2>
                <div id="bundle-details" class="space-y-3">
                    <p class="text-gray-400">Loading bundle data...</p>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4">🚨 Alerts</h2>
                <div id="alerts" class="space-y-2">
                    <p class="text-gray-400">Loading alerts...</p>
                </div>
            </div>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">📈 Build History</h2>
                <button onclick="triggerBuild()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors">
                    🔨 Trigger Build
                </button>
            </div>
            <div id="build-history" class="space-y-2">
                <p class="text-gray-400">Loading build history...</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4">📋 Top Dependencies</h2>
                <div id="dependencies" class="space-y-2">
                    <p class="text-gray-400">Loading dependencies...</p>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4">📄 Chunks</h2>
                <div id="chunks" class="space-y-2">
                    <p class="text-gray-400">Loading chunks...</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        let updateInterval;
        
        async function updateDashboard() {
            try {
                const [metrics, analysis] = await Promise.all([
                    fetch('/metrics').then(r => r.json()),
                    fetch('/bundle-analysis').then(r => r.json())
                ]);
                
                updateMetrics(metrics);
                updateAnalysis(analysis);
                
            } catch (error) {
                console.error('Failed to update dashboard:', error);
            }
        }
        
        function updateMetrics(metrics) {
            // Bundle size
            document.getElementById('bundle-size').textContent = metrics.bundle.sizeFormatted;
            document.getElementById('bundle-change').textContent = 
                metrics.performance.bundleSizeChange > 0 
                    ? \`+📈 \${metrics.performance.bundleSizeChange}%\`
                    : metrics.performance.bundleSizeChange < 0
                    ? \`-📉 \${Math.abs(metrics.performance.bundleSizeChange)}%\`
                    : '📊 No change';
            
            // Dependencies
            document.getElementById('dep-count').textContent = metrics.bundle.dependencies;
            document.getElementById('build-system').textContent = metrics.bundle.buildSystem;
            
            // Build status
            const statusEl = document.getElementById('build-status');
            const barEl = document.getElementById('build-bar');
            
            if (metrics.buildStatus === 'building') {
                statusEl.textContent = 'Building...';
                statusEl.className = 'text-2xl font-bold text-yellow-400 pulse';
                barEl.className = 'h-2 rounded-full transition-all duration-500 bg-yellow-500';
                barEl.style.width = '50%';
            } else {
                statusEl.textContent = 'Ready';
                statusEl.className = 'text-2xl font-bold text-green-400';
                barEl.className = 'h-2 rounded-full transition-all duration-500 bg-green-500';
                barEl.style.width = '100%';
            }
            
            // Last build
            const lastBuild = new Date(metrics.bundle.lastBuild);
            document.getElementById('last-build').textContent = lastBuild.toLocaleTimeString();
            document.getElementById('build-time').textContent = lastBuild.toLocaleDateString();
            
            // Alerts
            const alertsEl = document.getElementById('alerts');
            if (metrics.alerts.length === 0) {
                alertsEl.innerHTML = '<p class="text-green-400">✅ No alerts</p>';
            } else {
                alertsEl.innerHTML = metrics.alerts.map(alert => 
                    \`<div class="p-3 rounded \${
                        alert.level === 'error' ? 'bg-red-900/50 text-red-300' :
                        alert.level === 'warning' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-blue-900/50 text-blue-300'
                    }">
                        <span class="font-medium">\${alert.message}</span>
                        <span class="text-sm block mt-1">\${alert.value}</span>
                    </div>\`
                ).join('');
            }
            
            // Build history
            const historyEl = document.getElementById('build-history');
            if (metrics.history.length === 0) {
                historyEl.innerHTML = '<p class="text-gray-400">No build history available</p>';
            } else {
                historyEl.innerHTML = metrics.history.map((build, index) => 
                    \`<div class="flex justify-between items-center p-3 bg-gray-700/50 rounded">
                        <span>Build #\${metrics.history.length - index}</span>
                        <span>\${formatBytes(build.totalSize)}</span>
                        <span>\${build.chunks} chunks</span>
                        <span>\${new Date(build.timestamp).toLocaleTimeString()}</span>
                    </div>\`
                ).join('');
            }
        }
        
        function updateAnalysis(analysis) {
            // Bundle details
            const detailsEl = document.getElementById('bundle-details');
            detailsEl.innerHTML = \`
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <span class="text-gray-400">Total Size:</span>
                        <span class="ml-2 font-medium">\${formatBytes(analysis.totalSize)}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Build System:</span>
                        <span class="ml-2 font-medium">\${analysis.buildSystem}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Chunks:</span>
                        <span class="ml-2 font-medium">\${analysis.chunks.length}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Assets:</span>
                        <span class="ml-2 font-medium">\${analysis.assets.length}</span>
                    </div>
                </div>
                \${analysis.recommendations.length > 0 ? \`
                    <div class="mt-4">
                        <h4 class="font-medium text-yellow-400 mb-2">Recommendations:</h4>
                        \${analysis.recommendations.map(rec => 
                            \`<div class="text-sm p-2 bg-gray-700/50 rounded mt-1">
                                <span class="font-medium">\${rec.message}</span>
                                <div class="text-gray-400 mt-1">\${rec.suggestion}</div>
                            </div>\`
                        ).join('')}
                    </div>
                \` : ''}
            \`;
            
            // Dependencies
            const depsEl = document.getElementById('dependencies');
            if (analysis.dependencies.length === 0) {
                depsEl.innerHTML = '<p class="text-gray-400">No dependencies found</p>';
            } else {
                depsEl.innerHTML = analysis.dependencies.slice(0, 10).map(dep => 
                    \`<div class="flex justify-between items-center p-2 bg-gray-700/30 rounded">
                        <span class="text-sm">\${dep.name}</span>
                        <span class="text-xs text-gray-400">\${dep.sizeFormatted}</span>
                    </div>\`
                ).join('');
            }
            
            // Chunks
            const chunksEl = document.getElementById('chunks');
            if (analysis.chunks.length === 0) {
                chunksEl.innerHTML = '<p class="text-gray-400">No chunks found</p>';
            } else {
                chunksEl.innerHTML = analysis.chunks.map(chunk => 
                    \`<div class="flex justify-between items-center p-2 bg-gray-700/30 rounded">
                        <span class="text-sm">\${chunk.name}</span>
                        <span class="text-xs text-gray-400">\${chunk.sizeFormatted}</span>
                    </div>\`
                ).join('');
            }
        }
        
        async function triggerBuild() {
            const button = event.target;
            button.disabled = true;
            button.textContent = '🔄 Building...';
            
            try {
                const result = await fetch('/trigger-build', { method: 'POST' }).then(r => r.json());
                
                if (result.success) {
                    button.textContent = '✅ Build Complete';
                    button.className = 'bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors';
                } else {
                    button.textContent = '❌ Build Failed';
                    button.className = 'bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors';
                }
                
                // Update dashboard after build
                setTimeout(updateDashboard, 1000);
                
            } catch (error) {
                button.textContent = '❌ Error';
                console.error('Build failed:', error);
            }
            
            setTimeout(() => {
                button.disabled = false;
                button.textContent = '🔨 Trigger Build';
                button.className = 'bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors';
            }, 3000);
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Start updating
        updateDashboard();
        updateInterval = setInterval(updateDashboard, 5000);
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (updateInterval) clearInterval(updateInterval);
        });
    </script>
</body>
</html>
  `;
}
