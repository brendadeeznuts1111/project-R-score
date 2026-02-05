#!/usr/bin/env bun

/**
 * Bundle Bucket Viewer
 * Interactive visualization component for bundle analysis and monitoring
 */

import { Bun } from "bun";
import { join } from "path";

interface BucketData {
  name: string;
  size: number;
  sizeFormatted: string;
  percentage: number;
  color: string;
  type: 'chunk' | 'dependency' | 'asset' | 'module';
  children?: BucketData[];
  metadata?: {
    path?: string;
    version?: string;
    compressed?: boolean;
    optimized?: boolean;
  };
}

interface BucketViewConfig {
  width: number;
  height: number;
  showLabels: boolean;
  showPercentages: boolean;
  colorScheme: 'default' | 'warm' | 'cool' | 'monochrome';
  animationDuration: number;
  interactive: boolean;
}

class BucketViewer {
  private config: BucketViewConfig;
  private data: BucketData[] = [];
  private container: HTMLElement | null = null;

  constructor(config: Partial<BucketViewConfig> = {}) {
    this.config = {
      width: 800,
      height: 600,
      showLabels: true,
      showPercentages: true,
      colorScheme: 'default',
      animationDuration: 300,
      interactive: true,
      ...config
    };
  }

  async loadBundleData(buildDir: string = "./dist"): Promise<void> {
    console.log("📦 Loading bundle data for bucket viewer...");
    
    try {
      const bundleData = await this.analyzeBundle(buildDir);
      this.data = this.transformToBuckets(bundleData);
      console.log(`✅ Loaded ${this.data.length} buckets for visualization`);
    } catch (error) {
      console.error("❌ Failed to load bundle data:", error);
      this.data = this.getFallbackData();
    }
  }

  private async analyzeBundle(buildDir: string) {
    // Simulate bundle analysis - in real implementation, this would analyze actual build files
    return {
      chunks: [
        { name: "main.js", size: 156800, type: "chunk" },
        { name: "vendor.js", size: 512000, type: "chunk" },
        { name: "styles.css", size: 25600, type: "chunk" }
      ],
      dependencies: [
        { name: "react", size: 127000, type: "dependency" },
        { name: "react-dom", size: 85000, type: "dependency" },
        { name: "zustand", size: 12000, type: "dependency" }
      ],
      assets: [
        { name: "logo.svg", size: 2048, type: "asset" },
        { name: "fonts.woff2", size: 45056, type: "asset" }
      ]
    };
  }

  private transformToBuckets(bundleData: any): BucketData[] {
    const buckets: BucketData[] = [];
    const totalSize = this.calculateTotalSize(bundleData);

    // Process chunks
    if (bundleData.chunks) {
      bundleData.chunks.forEach((chunk: any) => {
        buckets.push({
          name: chunk.name,
          size: chunk.size,
          sizeFormatted: this.formatBytes(chunk.size),
          percentage: (chunk.size / totalSize) * 100,
          color: this.getColorForType('chunk', chunk.size / totalSize),
          type: 'chunk',
          metadata: {
            path: `./dist/${chunk.name}`,
            optimized: chunk.size < 100000
          }
        });
      });
    }

    // Process dependencies
    if (bundleData.dependencies) {
      bundleData.dependencies.forEach((dep: any) => {
        buckets.push({
          name: dep.name,
          size: dep.size,
          sizeFormatted: this.formatBytes(dep.size),
          percentage: (dep.size / totalSize) * 100,
          color: this.getColorForType('dependency', dep.size / totalSize),
          type: 'dependency',
          metadata: {
            path: `node_modules/${dep.name}`,
            version: "latest"
          }
        });
      });
    }

    // Process assets
    if (bundleData.assets) {
      bundleData.assets.forEach((asset: any) => {
        buckets.push({
          name: asset.name,
          size: asset.size,
          sizeFormatted: this.formatBytes(asset.size),
          percentage: (asset.size / totalSize) * 100,
          color: this.getColorForType('asset', asset.size / totalSize),
          type: 'asset',
          metadata: {
            path: `./dist/${asset.name}`,
            compressed: asset.name.endsWith('.gz') || asset.name.endsWith('.br')
          }
        });
      });
    }

    return buckets.sort((a, b) => b.size - a.size);
  }

  private calculateTotalSize(bundleData: any): number {
    let total = 0;
    
    ['chunks', 'dependencies', 'assets'].forEach(category => {
      if (bundleData[category]) {
        bundleData[category].forEach((item: any) => {
          total += item.size || 0;
        });
      }
    });

    return total;
  }

  private getColorForType(type: string, percentage: number): string {
    const schemes = {
      default: {
        chunk: '#3b82f6',
        dependency: '#22c55e',
        asset: '#f59e0b',
        module: '#8b5cf6'
      },
      warm: {
        chunk: '#ef4444',
        dependency: '#f97316',
        asset: '#eab308',
        module: '#dc2626'
      },
      cool: {
        chunk: '#06b6d4',
        dependency: '#10b981',
        asset: '#6366f1',
        module: '#0ea5e9'
      },
      monochrome: {
        chunk: '#374151',
        dependency: '#4b5563',
        asset: '#6b7280',
        module: '#9ca3af'
      }
    };

    return schemes[this.config.colorScheme][type] || '#6b7280';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  private getFallbackData(): BucketData[] {
    return [
      {
        name: "Sample Bundle",
        size: 1024000,
        sizeFormatted: "1.0 MB",
        percentage: 100,
        color: "#3b82f6",
        type: "chunk",
        metadata: {
          path: "./dist/sample.js",
          optimized: false
        }
      }
    ];
  }

  generateHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Bucket Viewer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .bucket {
            transition: all ${this.config.animationDuration}ms ease;
            cursor: ${this.config.interactive ? 'pointer' : 'default'};
        }
        .bucket:hover {
            transform: scale(1.05);
            filter: brightness(1.1);
        }
        .bucket-rect {
            transition: all ${this.config.animationDuration}ms ease;
        }
        .fade-in {
            animation: fadeIn ${this.config.animationDuration}ms ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">📦 Bundle Bucket Viewer</h1>
            <p class="text-gray-600">Interactive visualization of bundle composition and size distribution</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Visualization -->
            <div class="lg:col-span-2">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold text-gray-800">Bundle Composition</h2>
                        <div class="flex gap-2">
                            <button onclick="changeView('treemap')" class="view-btn px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Treemap</button>
                            <button onclick="changeView('pie')" class="view-btn px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Pie Chart</button>
                            <button onclick="changeView('bars')" class="view-btn px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Bars</button>
                        </div>
                    </div>
                    <div class="relative" style="height: 400px;">
                        <canvas id="bundleChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Details Panel -->
            <div class="lg:col-span-1">
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Bundle Statistics</h3>
                    <div id="statistics" class="space-y-3">
                        <!-- Stats will be populated by JavaScript -->
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Legend</h3>
                    <div id="legend" class="space-y-2">
                        <!-- Legend will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Bucket Details -->
        <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Bucket Details</h3>
            <div id="bucketDetails" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Bucket cards will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        // Bundle data will be injected here
        const bundleData = ${JSON.stringify(this.data, null, 2)};
        
        let currentChart = null;
        let currentView = 'treemap';

        function initializeViewer() {
            updateStatistics();
            updateLegend();
            updateBucketDetails();
            renderChart('treemap');
        }

        function updateStatistics() {
            const stats = document.getElementById('statistics');
            const totalSize = bundleData.reduce((sum, item) => sum + item.size, 0);
            const largestBucket = bundleData[0];
            const chunkCount = bundleData.filter(item => item.type === 'chunk').length;
            const depCount = bundleData.filter(item => item.type === 'dependency').length;

            stats.innerHTML = \`
                <div class="flex justify-between">
                    <span class="text-gray-600">Total Size:</span>
                    <span class="font-semibold">\${formatBytes(totalSize)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Buckets:</span>
                    <span class="font-semibold">\${bundleData.length}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Largest:</span>
                    <span class="font-semibold">\${largestBucket.name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Chunks:</span>
                    <span class="font-semibold">\${chunkCount}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Dependencies:</span>
                    <span class="font-semibold">\${depCount}</span>
                </div>
            \`;
        }

        function updateLegend() {
            const legend = document.getElementById('legend');
            const types = [...new Set(bundleData.map(item => item.type))];
            
            legend.innerHTML = types.map(type => {
                const items = bundleData.filter(item => item.type === type);
                const color = items[0]?.color || '#6b7280';
                const totalSize = items.reduce((sum, item) => sum + item.size, 0);
                
                return \`
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded" style="background-color: \${color}"></div>
                        <span class="text-sm text-gray-700">\${type.charAt(0).toUpperCase() + type.slice(1)} (\${items.length})</span>
                    </div>
                \`;
            }).join('');
        }

        function updateBucketDetails() {
            const details = document.getElementById('bucketDetails');
            
            details.innerHTML = bundleData.map(bucket => \`
                <div class="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onclick="selectBucket('\${bucket.name}')">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-gray-800">\${bucket.name}</h4>
                        <div class="w-3 h-3 rounded-full" style="background-color: \${bucket.color}"></div>
                    </div>
                    <div class="text-sm text-gray-600">
                        <div>Size: \${bucket.sizeFormatted}</div>
                        <div>Percentage: \${bucket.percentage.toFixed(1)}%</div>
                        <div>Type: \${bucket.type}</div>
                        \${bucket.metadata?.optimized ? '<div class="text-green-600">✓ Optimized</div>' : ''}
                    </div>
                </div>
            \`).join('');
        }

        function renderChart(viewType) {
            const ctx = document.getElementById('bundleChart').getContext('2d');
            
            if (currentChart) {
                currentChart.destroy();
            }

            const chartData = {
                labels: bundleData.map(item => item.name),
                datasets: [{
                    data: bundleData.map(item => item.size),
                    backgroundColor: bundleData.map(item => item.color),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            };

            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const item = bundleData[context.dataIndex];
                                return [
                                    \`\${item.name}: \${item.sizeFormatted}\`,
                                    \`\${item.percentage.toFixed(1)}%\`,
                                    \`Type: \${item.type}\`
                                ];
                            }
                        }
                    }
                }
            };

            switch (viewType) {
                case 'pie':
                    currentChart = new Chart(ctx, {
                        type: 'pie',
                        data: chartData,
                        options: options
                    });
                    break;
                case 'bars':
                    currentChart = new Chart(ctx, {
                        type: 'bar',
                        data: chartData,
                        options: {
                            ...options,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return formatBytes(value);
                                        }
                                    }
                                }
                            }
                        }
                    });
                    break;
                case 'treemap':
                default:
                    // Custom treemap visualization
                    renderTreemap();
                    return;
            }
        }

        function renderTreemap() {
            const container = document.getElementById('bundleChart').parentElement;
            const width = container.offsetWidth;
            const height = 400;
            
            let html = '<div class="treemap-container" style="position: relative; height: ' + height + 'px;">';
            
            // Simple treemap layout (simplified algorithm)
            let x = 0, y = 0;
            const totalSize = bundleData.reduce((sum, item) => sum + item.size, 0);
            
            bundleData.forEach((bucket, index) => {
                const bucketWidth = (bucket.size / totalSize) * width;
                const bucketHeight = height;
                
                html += \`
                    <div class="bucket fade-in absolute border border-gray-200 rounded flex flex-col justify-center items-center text-white font-semibold"
                         style="left: \${x}px; top: \${y}px; width: \${bucketWidth}px; height: \${bucketHeight}px; background-color: \${bucket.color};"
                         onclick="selectBucket('\${bucket.name}')"
                         title="\${bucket.name}: \${bucket.sizeFormatted} (\${bucket.percentage.toFixed(1)}%)">
                        <div class="text-center px-2">
                            <div class="text-sm">\${bucket.name}</div>
                            <div class="text-xs opacity-90">\${bucket.sizeFormatted}</div>
                            \${this.config.showPercentages ? '<div class="text-xs opacity-80">' + bucket.percentage.toFixed(1) + '%</div>' : ''}
                        </div>
                    </div>
                \`;
                
                x += bucketWidth;
            });
            
            html += '</div>';
            container.innerHTML = html;
        }

        function changeView(view) {
            currentView = view;
            
            // Update button styles
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.className = 'view-btn px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300';
            });
            event.target.className = 'view-btn px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600';
            
            renderChart(view);
        }

        function selectBucket(name) {
            const bucket = bundleData.find(item => item.name === name);
            if (bucket) {
                alert(\`Bucket Details:\\n\\nName: \${bucket.name}\\nSize: \${bucket.sizeFormatted}\\nPercentage: \${bucket.percentage.toFixed(1)}%\\nType: \${bucket.type}\\n\${bucket.metadata?.path ? 'Path: ' + bucket.metadata.path + '\\\\n' : ''}\${bucket.metadata?.optimized ? 'Status: Optimized\\\\n' : ''}\${bucket.metadata?.version ? 'Version: ' + bucket.metadata.version : ''}\`);
            }
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
        }

        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initializeViewer);
    </script>
</body>
</html>`;
  }

  async serve(port: number = 3004): Promise<void> {
    await this.loadBundleData();
    
    const server = Bun.serve({
      port,
      fetch: (req) => {
        const url = new URL(req.url);
        
        if (url.pathname === "/") {
          return new Response(this.generateHTML(), {
            headers: { "Content-Type": "text/html" }
          });
        }
        
        if (url.pathname === "/data") {
          return Response.json({
            buckets: this.data,
            totalSize: this.data.reduce((sum, bucket) => sum + bucket.size, 0),
            timestamp: Date.now(),
            config: this.config
          });
        }
        
        return new Response("Not Found", { status: 404 });
      }
    });

    console.log("🪣 Bundle Bucket Viewer started!");
    console.log(`📊 Dashboard: http://localhost:${port}`);
    console.log(`📊 API: http://localhost:${port}/data`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3004');
  const buildDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1] || './dist';

  const viewer = new BucketViewer();
  
  if (args.includes('--help')) {
    console.log(`
🪣 Bundle Bucket Viewer

Usage:
  bucket-viewer.ts [options]

Options:
  --port=PORT        Port to serve on (default: 3004)
  --dir=DIR          Build directory to analyze (default: ./dist)
  --help             Show this help

Examples:
  bun run bucket-viewer.ts
  bun run bucket-viewer.ts --port=3005 --dir=./build
    `);
    return;
  }

  await viewer.serve(port);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { BucketViewer, type BucketData, type BucketViewConfig };
