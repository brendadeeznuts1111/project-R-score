#!/usr/bin/env bun

/**
 * Fire22 Response Time Distribution Monitor - Standalone Version
 * Complete monitoring system with embedded dashboard
 */

// Response Time Distribution Tracker
class ResponseTimeDistribution {
  private buckets: Map<number, number>;
  private measurements: number[];
  private maxMeasurements: number;
  private bucketRanges: number[];

  private stats: {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
    stdDev: number;
    lastUpdated: number;
  };

  constructor(maxMeasurements = 10000) {
    this.maxMeasurements = maxMeasurements;
    this.measurements = [];

    this.bucketRanges = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, Infinity];

    this.buckets = new Map();
    this.bucketRanges.forEach(range => this.buckets.set(range, 0));

    this.stats = this.getEmptyStats();
  }

  recordMs(durationMs: number): void {
    this.measurements.push(durationMs);
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    for (let i = 0; i < this.bucketRanges.length - 1; i++) {
      if (durationMs >= this.bucketRanges[i] && durationMs < this.bucketRanges[i + 1]) {
        this.buckets.set(this.bucketRanges[i], this.buckets.get(this.bucketRanges[i])! + 1);
        break;
      }
    }

    this.stats.lastUpdated = 0;
  }

  private calculatePercentile(percentile: number): number {
    if (this.measurements.length === 0) return 0;

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateStdDev(mean: number): number {
    if (this.measurements.length === 0) return 0;

    const squaredDiffs = this.measurements.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, value) => sum + value, 0) / this.measurements.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private getEmptyStats() {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      p999: 0,
      stdDev: 0,
      lastUpdated: Date.now(),
    };
  }

  getStats() {
    if (Date.now() - this.stats.lastUpdated < 100) {
      return this.stats;
    }

    if (this.measurements.length === 0) {
      return this.getEmptyStats();
    }

    const sum = this.measurements.reduce((a, b) => a + b, 0);
    const mean = sum / this.measurements.length;

    this.stats = {
      count: this.measurements.length,
      min: Math.min(...this.measurements),
      max: Math.max(...this.measurements),
      mean: mean,
      median: this.calculatePercentile(50),
      p50: this.calculatePercentile(50),
      p75: this.calculatePercentile(75),
      p90: this.calculatePercentile(90),
      p95: this.calculatePercentile(95),
      p99: this.calculatePercentile(99),
      p999: this.calculatePercentile(99.9),
      stdDev: this.calculateStdDev(mean),
      lastUpdated: Date.now(),
    };

    return this.stats;
  }

  getHistogram() {
    const histogram = [];

    for (let i = 0; i < this.bucketRanges.length - 1; i++) {
      const rangeStart = this.bucketRanges[i];
      const rangeEnd = this.bucketRanges[i + 1];
      const count = this.buckets.get(rangeStart) || 0;

      histogram.push({
        range: rangeEnd === Infinity ? `>${rangeStart}ms` : `${rangeStart}-${rangeEnd}ms`,
        rangeStart,
        rangeEnd,
        count,
        percentage: this.measurements.length > 0 ? (count / this.measurements.length) * 100 : 0,
      });
    }

    return histogram;
  }

  getDistribution() {
    const stats = this.getStats();
    const histogram = this.getHistogram();

    return {
      stats,
      histogram,
      summary: {
        fast: histogram.filter(h => h.rangeStart < 100).reduce((sum, h) => sum + h.count, 0),
        medium: histogram
          .filter(h => h.rangeStart >= 100 && h.rangeStart < 1000)
          .reduce((sum, h) => sum + h.count, 0),
        slow: histogram.filter(h => h.rangeStart >= 1000).reduce((sum, h) => sum + h.count, 0),
        totalRequests: stats.count,
      },
    };
  }

  clear() {
    this.measurements = [];
    this.buckets.forEach((_, key) => this.buckets.set(key, 0));
    this.stats = this.getEmptyStats();
  }
}

// Response Time Monitor
class ResponseTimeMonitor {
  private distributions: Map<string, ResponseTimeDistribution>;
  private globalDistribution: ResponseTimeDistribution;
  private alerts: Array<{
    endpoint: string;
    message: string;
    timestamp: number;
    severity: 'warning' | 'critical';
  }>;

  constructor() {
    this.distributions = new Map();
    this.globalDistribution = new ResponseTimeDistribution();
    this.alerts = [];
  }

  startTiming(): bigint {
    return Bun.nanoseconds();
  }

  endTiming(endpoint: string, startNanos: bigint): number {
    const endNanos = Bun.nanoseconds();
    const durationMs = Number(endNanos - startNanos) / 1_000_000;

    if (!this.distributions.has(endpoint)) {
      this.distributions.set(endpoint, new ResponseTimeDistribution());
    }

    this.distributions.get(endpoint)!.recordMs(durationMs);
    this.globalDistribution.recordMs(durationMs);

    return durationMs;
  }

  getEndpointStats(endpoint: string) {
    const distribution = this.distributions.get(endpoint);
    if (!distribution) {
      return null;
    }
    return distribution.getDistribution();
  }

  getAllStats() {
    const endpoints: Record<string, any> = {};

    this.distributions.forEach((distribution, endpoint) => {
      endpoints[endpoint] = distribution.getDistribution();
    });

    return {
      global: this.globalDistribution.getDistribution(),
      endpoints,
      alerts: this.alerts.slice(-10),
      summary: {
        totalEndpoints: this.distributions.size,
        totalRequests: this.globalDistribution.getStats().count,
        averageResponseTime: this.globalDistribution.getStats().mean,
        activeAlerts: 0,
      },
    };
  }

  clear() {
    this.distributions.clear();
    this.globalDistribution.clear();
    this.alerts = [];
  }
}

// Initialize monitor
const monitor = new ResponseTimeMonitor();

// Dashboard HTML
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Response Time Distribution</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'SF Mono', monospace;
            background: linear-gradient(135deg, #0a0e27 0%, #151932 100%);
            color: #e0e6ed;
            padding: 20px;
        }
        .header {
            background: rgba(10, 14, 39, 0.95);
            border: 2px solid rgba(64, 224, 208, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .header h1 { color: #40e0d0; font-size: 24px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-card {
            background: rgba(20, 25, 50, 0.5);
            border: 1px solid rgba(64, 224, 208, 0.2);
            border-radius: 8px;
            padding: 12px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #40e0d0;
        }
        .stat-label {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 4px;
        }
        .card {
            background: rgba(20, 25, 50, 0.5);
            border: 2px solid rgba(64, 224, 208, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .card h2 {
            color: #40e0d0;
            font-size: 18px;
            margin-bottom: 15px;
        }
        button {
            background: linear-gradient(135deg, #40e0d0, #3b82f6);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            margin: 5px;
        }
        button:hover { opacity: 0.9; }
        .histogram-bar {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .histogram-label {
            width: 100px;
            color: #9ca3af;
        }
        .histogram-bar-container {
            flex: 1;
            height: 20px;
            background: rgba(64, 224, 208, 0.1);
            border-radius: 4px;
            margin: 0 10px;
            position: relative;
        }
        .histogram-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #40e0d0, #3b82f6);
            border-radius: 4px;
            transition: width 0.3s;
        }
        .histogram-count {
            width: 100px;
            text-align: right;
        }
        .endpoint-item {
            background: rgba(10, 14, 39, 0.6);
            border: 1px solid rgba(64, 224, 208, 0.2);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }
        .endpoint-name { font-weight: bold; }
        .endpoint-stats { color: #9ca3af; font-size: 11px; }
        .good { color: #4ade80; }
        .warning { color: #fbbf24; }
        .critical { color: #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Response Time Distribution</h1>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="totalRequests">0</div>
                <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="avgResponse">0ms</div>
                <div class="stat-label">Average Response</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="p95Response">0ms</div>
                <div class="stat-label">P95 Response</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="p99Response">0ms</div>
                <div class="stat-label">P99 Response</div>
            </div>
        </div>
    </div>

    <div style="margin-bottom: 20px;">
        <button onclick="refresh()">🔄 Refresh</button>
        <button onclick="simulateTraffic()">🚀 Simulate Traffic</button>
        <button onclick="clearData()">🗑️ Clear Data</button>
    </div>

    <div class="card">
        <h2>📊 Response Time Histogram</h2>
        <div id="histogram"></div>
    </div>

    <div class="card">
        <h2>📈 Percentiles</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value good" id="p50">0ms</div>
                <div class="stat-label">P50 (Median)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value good" id="p75">0ms</div>
                <div class="stat-label">P75</div>
            </div>
            <div class="stat-card">
                <div class="stat-value warning" id="p90">0ms</div>
                <div class="stat-label">P90</div>
            </div>
            <div class="stat-card">
                <div class="stat-value warning" id="p95">0ms</div>
                <div class="stat-label">P95</div>
            </div>
            <div class="stat-card">
                <div class="stat-value critical" id="p99">0ms</div>
                <div class="stat-label">P99</div>
            </div>
            <div class="stat-card">
                <div class="stat-value critical" id="p999">0ms</div>
                <div class="stat-label">P99.9</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>🔗 Endpoints</h2>
        <div id="endpoints"></div>
    </div>

    <script>
        async function refresh() {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            // Update header stats
            document.getElementById('totalRequests').textContent = data.summary.totalRequests;
            document.getElementById('avgResponse').textContent = data.global.stats.mean.toFixed(1) + 'ms';
            document.getElementById('p95Response').textContent = data.global.stats.p95.toFixed(1) + 'ms';
            document.getElementById('p99Response').textContent = data.global.stats.p99.toFixed(1) + 'ms';
            
            // Update percentiles
            document.getElementById('p50').textContent = data.global.stats.p50.toFixed(1) + 'ms';
            document.getElementById('p75').textContent = data.global.stats.p75.toFixed(1) + 'ms';
            document.getElementById('p90').textContent = data.global.stats.p90.toFixed(1) + 'ms';
            document.getElementById('p95').textContent = data.global.stats.p95.toFixed(1) + 'ms';
            document.getElementById('p99').textContent = data.global.stats.p99.toFixed(1) + 'ms';
            document.getElementById('p999').textContent = data.global.stats.p999.toFixed(1) + 'ms';
            
            // Update histogram
            const histogram = document.getElementById('histogram');
            const maxCount = Math.max(...data.global.histogram.map(h => h.count));
            histogram.innerHTML = data.global.histogram.map(bucket => {
                const width = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                return \`
                    <div class="histogram-bar">
                        <div class="histogram-label">\${bucket.range}</div>
                        <div class="histogram-bar-container">
                            <div class="histogram-bar-fill" style="width: \${width}%"></div>
                        </div>
                        <div class="histogram-count">\${bucket.count} (\${bucket.percentage.toFixed(1)}%)</div>
                    </div>
                \`;
            }).join('');
            
            // Update endpoints
            const endpoints = document.getElementById('endpoints');
            endpoints.innerHTML = Object.entries(data.endpoints).map(([name, ep]) => \`
                <div class="endpoint-item">
                    <div class="endpoint-name">\${name}</div>
                    <div class="endpoint-stats">
                        Avg: \${ep.stats.mean.toFixed(1)}ms | 
                        P95: \${ep.stats.p95.toFixed(1)}ms | 
                        Count: \${ep.stats.count}
                    </div>
                </div>
            \`).join('');
        }
        
        async function simulateTraffic() {
            for (let i = 0; i < 20; i++) {
                fetch('/api/test/' + Math.random());
                await new Promise(r => setTimeout(r, 100));
            }
            setTimeout(refresh, 1000);
        }
        
        async function clearData() {
            await fetch('/api/clear', { method: 'POST' });
            refresh();
        }
        
        setInterval(refresh, 2000);
        refresh();
    </script>
</body>
</html>`;

// Create server
const server = Bun.serve({
  port: 3005,

  async fetch(req) {
    const url = new URL(req.url);
    const startTime = monitor.startTiming();

    try {
      // Dashboard
      if (url.pathname === '/' || url.pathname === '/dashboard') {
        return new Response(DASHBOARD_HTML, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      // API endpoints
      if (url.pathname === '/api/stats') {
        return Response.json(monitor.getAllStats());
      }

      if (url.pathname === '/api/clear' && req.method === 'POST') {
        monitor.clear();
        return Response.json({ message: 'Cleared' });
      }

      // Test endpoints with simulated delays
      if (url.pathname.startsWith('/api/test/')) {
        const delay = Math.random() * 200;
        await Bun.sleep(delay);
        monitor.endTiming('GET /api/test', startTime);
        return Response.json({ delay });
      }

      // Track 404s
      monitor.endTiming('404', startTime);
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      monitor.endTiming('ERROR', startTime);
      throw error;
    }
  },
});

console.log(`
🎯 Response Time Distribution Monitor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Dashboard: ${server.url}
📈 API Stats: ${server.url}api/stats

✅ Ready! Open the dashboard to see real-time metrics.
`);

// Generate initial traffic
setTimeout(async () => {
  for (let i = 0; i < 10; i++) {
    fetch(`${server.url}api/test/${i}`).catch(() => {});
    await Bun.sleep(50);
  }
}, 500);

export { server };
