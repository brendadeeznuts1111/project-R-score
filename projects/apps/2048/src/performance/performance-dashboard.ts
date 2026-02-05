#!/usr/bin/env bun
/**
 * Performance Monitoring Dashboard
 * Real-time web-based performance monitoring and visualization
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { OptimizationRecommender } from "./optimization-recommender";
import { PerformanceTester } from "./performance-tester";
import { ProfileAnalyzer } from "./profile-analyzer";

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  uptime: number;
}

interface ProfileData {
  totalTime: number;
  sampleCount: number;
  bottlenecks: Array<{
    function: string;
    issue: string;
    impact: string;
  }>;
  optimizationOpportunities: Array<{
    type: string;
    description: string;
    potentialGain: number;
  }>;
}

interface TrendData {
  timestamp: number;
  duration: number;
  passed: number;
  failed: number;
  regressions: number;
}

interface TestResult {
  name: string;
  duration: number;
  operationsPerSecond?: number;
  memoryUsage?: number;
  error?: string;
}

interface Recommendation {
  severity: string;
  issue: string;
  file: string;
  line: number;
  recommendation: string;
  potentialImpact: string;
}

interface DashboardData {
  timestamp: number;
  profiles: Array<[string, ProfileData]>;
  recommendations: Recommendation[];
  testResults: TestResult[];
  systemInfo: SystemInfo;
  trends: TrendData[];
}

class PerformanceDashboard {
  private port: number = 3001;
  private data: DashboardData | null = null;
  private analyzer = new ProfileAnalyzer();
  private recommender = new OptimizationRecommender();
  private tester = new PerformanceTester();

  async start(port: number = 3001) {
    this.port = port;

    console.log(`📊 Starting Performance Dashboard on port ${port}...`);

    // Initial data load
    await this.refreshData();

    // Start HTTP server
    const server = Bun.serve({
      port: this.port,
      fetch: async (req) => {
        const url = new URL(req.url);

        if (url.pathname === "/") {
          return new Response(this.getDashboardHTML(), {
            headers: { "Content-Type": "text/html" },
          });
        }

        if (url.pathname === "/api/data") {
          return new Response(JSON.stringify(this.data), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/api/refresh") {
          await this.refreshData();
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/api/profiles") {
          const profiles = await this.analyzer.analyzeAllProfiles();
          return new Response(JSON.stringify(Array.from(profiles.entries())), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/api/recommendations") {
          const report = await this.recommender.analyzeCodebase();
          return new Response(JSON.stringify(report), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/api/tests") {
          const results = await this.tester.runTests();
          return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response("Not Found", { status: 404 });
      },
    });

    console.log(`✅ Dashboard available at http://localhost:${port}`);
    console.log("🔄 Auto-refreshing every 30 seconds...");

    // Auto-refresh data every 30 seconds
    setInterval(() => this.refreshData(), 30000);
  }

  private async refreshData() {
    try {
      console.log("🔄 Refreshing dashboard data...");

      const [profileResults, perfReport, testResults] = await Promise.all([
        this.analyzer.analyzeAllProfiles(),
        this.recommender.analyzeCodebase(),
        this.tester.runTests(),
      ]);

      this.data = {
        timestamp: Date.now(),
        profiles: Array.from(profileResults.entries()),
        recommendations: perfReport.recommendations,
        testResults: testResults.tests,
        systemInfo: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
        },
        trends: this.calculateTrends(),
      };

      console.log("✅ Data refreshed");
    } catch (error) {
      console.error("❌ Failed to refresh data:", error);
    }
  }

  private calculateTrends(): TrendData[] {
    const resultsDir = "./performance-results";
    if (!existsSync(resultsDir)) return [];

    try {
      const files = readdirSync(resultsDir)
        .filter((f) => f.startsWith("results-") && f.endsWith(".json"))
        .sort()
        .slice(-10);

      const trends = [];
      for (const file of files) {
        const data = JSON.parse(readFileSync(join(resultsDir, file), "utf-8"));
        trends.push({
          timestamp: data.timestamp,
          duration: data.duration,
          passed: data.summary.passed,
          failed: data.summary.failed,
          regressions: data.summary.regressions.length,
        });
      }

      return trends;
    } catch (error) {
      console.warn("⚠️ Could not load trend data:", error);
      return [];
    }
  }

  private getDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f23; color: #ffffff; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #00ff88; font-size: 2.5em; margin-bottom: 10px; }
        .header p { color: #cccccc; font-size: 1.1em; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #1a1a2e; border: 1px solid #16213e; border-radius: 10px; padding: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .card h3 { color: #00ff88; margin-bottom: 15px; font-size: 1.2em; }
        .metric { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #2a2a4e; }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #cccccc; }
        .metric-value { font-weight: bold; color: #ffffff; }
        .metric-value.success { color: #00ff88; }
        .metric-value.warning { color: #ffa500; }
        .metric-value.error { color: #ff4444; }
        .chart-container { position: relative; height: 300px; margin: 20px 0; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-success { background: #00ff88; }
        .status-warning { background: #ffa500; }
        .status-error { background: #ff4444; }
        .refresh-btn { background: #00ff88; color: #0f0f23; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 20px; }
        .refresh-btn:hover { background: #00cc66; }
        .recommendations-list { max-height: 400px; overflow-y: auto; }
        .recommendation-item { background: #2a2a4e; border-left: 4px solid #00ff88; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
        .recommendation-item.high { border-left-color: #ff4444; }
        .recommendation-item.medium { border-left-color: #ffa500; }
        .recommendation-item.low { border-left-color: #00ff88; }
        .recommendation-item h4 { color: #ffffff; margin-bottom: 5px; }
        .recommendation-item p { color: #cccccc; font-size: 0.9em; }
        .tabs { display: flex; margin-bottom: 20px; border-bottom: 1px solid #2a2a4e; }
        .tab { padding: 10px 20px; cursor: pointer; background: transparent; border: none; color: #cccccc; border-bottom: 2px solid transparent; }
        .tab.active { color: #00ff88; border-bottom-color: #00ff88; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .test-item { background: #2a2a4e; padding: 10px; margin-bottom: 8px; border-radius: 4px; }
        .test-item.pass { border-left: 4px solid #00ff88; }
        .test-item.fail { border-left: 4px solid #ff4444; }
        .test-item.regression { border-left: 4px solid #ffa500; }
        .profile-item { background: #2a2a4e; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
        .profile-item h4 { color: #00ff88; margin-bottom: 10px; }
        .profile-item .bottleneck { color: #ff4444; margin: 5px 0; }
        .profile-item .opportunity { color: #00ff88; margin: 5px 0; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } .header h1 { font-size: 2em; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Performance Dashboard</h1>
            <p>Real-time monitoring and optimization insights</p>
        </div>

        <button class="refresh-btn" onclick="refreshData()">🔄 Refresh Data</button>

        <div class="tabs">
            <button class="tab active" onclick="showTab('overview')">Overview</button>
            <button class="tab" onclick="showTab('profiles')">CPU Profiles</button>
            <button class="tab" onclick="showTab('recommendations')">Recommendations</button>
            <button class="tab" onclick="showTab('tests')">Test Results</button>
            <button class="tab" onclick="showTab('trends')">Trends</button>
        </div>

        <div id="overview" class="tab-content active">
            <div class="grid">
                <div class="card">
                    <h3>📊 System Status</h3>
                    <div id="system-metrics"></div>
                </div>
                <div class="card">
                    <h3>🧪 Test Summary</h3>
                    <div id="test-summary"></div>
                </div>
                <div class="card">
                    <h3>🔬 Profile Overview</h3>
                    <div id="profile-overview"></div>
                </div>
                <div class="card">
                    <h3>⚡ Performance Trends</h3>
                    <div class="chart-container">
                        <canvas id="trends-chart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div id="profiles" class="tab-content">
            <div class="card">
                <h3>🔬 CPU Profile Analysis</h3>
                <div id="profile-details"></div>
            </div>
        </div>

        <div id="recommendations" class="tab-content">
            <div class="card">
                <h3>💡 Optimization Recommendations</h3>
                <div class="recommendations-list" id="recommendations-list"></div>
            </div>
        </div>

        <div id="tests" class="tab-content">
            <div class="card">
                <h3>🧪 Performance Test Results</h3>
                <div id="test-details"></div>
            </div>
        </div>

        <div id="trends" class="tab-content">
            <div class="card">
                <h3>📈 Historical Trends</h3>
                <div class="chart-container">
                    <canvas id="historical-chart"></canvas>
                </div>
                <div id="trend-details"></div>
            </div>
        </div>
    </div>

    <script>
        let currentData = null;

        async function refreshData() {
            try {
                const response = await fetch('/api/refresh');
                const result = await response.json();
                if (result.success) {
                    await loadData();
                }
            } catch (error) {
                console.error('Failed to refresh:', error);
            }
        }

        async function loadData() {
            try {
                const response = await fetch('/api/data');
                currentData = await response.json();
                updateDashboard();
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        }

        function showTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        }

        function updateDashboard() {
            if (!currentData) return;

            updateSystemMetrics();
            updateTestSummary();
            updateProfileOverview();
            updateTrendsChart();
            updateProfileDetails();
            updateRecommendations();
            updateTestDetails();
            updateHistoricalChart();
        }

        function updateSystemMetrics() {
            const container = document.getElementById('system-metrics');
            const info = currentData.systemInfo;

            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">Platform</span>
                    <span class="metric-value">\${info.platform}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Architecture</span>
                    <span class="metric-value">\${info.arch}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Memory Usage</span>
                    <span class="metric-value">\${(info.memory.heapUsed / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">\${info.uptime.toFixed(0)}s</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Updated</span>
                    <span class="metric-value">\${new Date(currentData.timestamp).toLocaleTimeString()}</span>
                </div>
            \`;
        }

        function updateTestSummary() {
            const container = document.getElementById('test-summary');
            const tests = currentData.testResults || [];

            const passed = tests.filter(t => !t.error).length;
            const failed = tests.filter(t => t.error).length;
            const regressions = tests.filter(t => currentData.regressions?.includes(t.name)).length;

            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">Total Tests</span>
                    <span class="metric-value">\${tests.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Passed</span>
                    <span class="metric-value success">\${passed}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Failed</span>
                    <span class="metric-value \${failed > 0 ? 'error' : ''}">\${failed}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Regressions</span>
                    <span class="metric-value \${regressions > 0 ? 'warning' : 'success'}">\${regressions}</span>
                </div>
            \`;
        }

        function updateProfileOverview() {
            const container = document.getElementById('profile-overview');
            const profiles = currentData.profiles || [];

            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">Profiles Analyzed</span>
                    <span class="metric-value">\${profiles.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Bottlenecks</span>
                    <span class="metric-value">\${profiles.reduce((sum, p) => sum + (p[1]?.bottlenecks?.length || 0), 0)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Optimization Opportunities</span>
                    <span class="metric-value">\${profiles.reduce((sum, p) => sum + (p[1]?.optimizationOpportunities?.length || 0), 0)}</span>
                </div>
            \`;
        }

        function updateTrendsChart() {
            const canvas = document.getElementById('trends-chart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const trends = currentData.trends || [];

            if (window.trendsChart) {
                window.trendsChart.destroy();
            }

            window.trendsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trends.map(t => new Date(t.timestamp).toLocaleTimeString()),
                    datasets: [
                        {
                            label: 'Duration (ms)',
                            data: trends.map(t => t.duration),
                            borderColor: '#00ff88',
                            backgroundColor: 'rgba(0, 255, 136, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Passed',
                            data: trends.map(t => t.passed),
                            borderColor: '#00cc66',
                            backgroundColor: 'rgba(0, 204, 102, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Regressions',
                            data: trends.map(t => t.regressions),
                            borderColor: '#ff4444',
                            backgroundColor: 'rgba(255, 68, 68, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#ffffff' }
                        }
                    },
                    scales: {
                        x: { ticks: { color: '#cccccc' }, grid: { color: '#2a2a4e' } },
                        y: { ticks: { color: '#cccccc' }, grid: { color: '#2a2a4e' } }
                    }
                }
            });
        }

        function updateProfileDetails() {
            const container = document.getElementById('profile-details');
            const profiles = currentData.profiles || [];

            if (profiles.length === 0) {
                container.innerHTML = '<p style="color: #cccccc;">No profile data available</p>';
                return;
            }

            container.innerHTML = profiles.map(([name, data]) => {
                const bottlenecks = data.bottlenecks || [];
                const opportunities = data.optimizationOpportunities || [];

                return \`
                    <div class="profile-item">
                        <h4>\${name}</h4>
                        <div class="metric">
                            <span class="metric-label">Total Time</span>
                            <span class="metric-value">\${(data.totalTime / 1000).toFixed(2)}ms</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Samples</span>
                            <span class="metric-value">\${data.sampleCount.toLocaleString()}</span>
                        </div>
                        \${bottlenecks.length > 0 ? \`
                            <div style="margin-top: 10px;">
                                <strong style="color: #ff4444;">🚨 Bottlenecks:</strong>
                                \${bottlenecks.slice(0, 3).map(b => \`
                                    <div class="bottleneck">• \${b.function}: \${b.issue}</div>
                                \`).join('')}
                            </div>
                        \` : ''}
                        \${opportunities.length > 0 ? \`
                            <div style="margin-top: 10px;">
                                <strong style="color: #00ff88;">⚡ Opportunities:</strong>
                                \${opportunities.slice(0, 3).map(o => \`
                                    <div class="opportunity">• \${o.type}: \${o.description}</div>
                                \`).join('')}
                            </div>
                        \` : ''}
                    </div>
                \`;
            }).join('');
        }

        function updateRecommendations() {
            const container = document.getElementById('recommendations-list');
            const recommendations = currentData.recommendations || [];

            if (recommendations.length === 0) {
                container.innerHTML = '<p style="color: #cccccc;">No recommendations available</p>';
                return;
            }

            container.innerHTML = recommendations.slice(0, 20).map(rec => \`
                <div class="recommendation-item \${rec.severity}">
                    <h4>\${rec.issue}</h4>
                    <p><strong>File:</strong> \${rec.file}:\${rec.line}</p>
                    <p><strong>Recommendation:</strong> \${rec.recommendation}</p>
                    <p><strong>Impact:</strong> \${rec.potentialImpact}</p>
                </div>
            \`).join('');
        }

        function updateTestDetails() {
            const container = document.getElementById('test-details');
            const tests = currentData.testResults || [];

            if (tests.length === 0) {
                container.innerHTML = '<p style="color: #cccccc;">No test data available</p>';
                return;
            }

            container.innerHTML = tests.map(test => {
                const isRegression = currentData.regressions?.includes(test.name);
                const statusClass = test.error ? 'fail' : (isRegression ? 'regression' : 'pass');
                const statusIcon = test.error ? '❌' : (isRegression ? '📉' : '✅');

                return \`
                    <div class="test-item \${statusClass}">
                        <strong>\${statusIcon} \${test.name}</strong>
                        <div style="margin-top: 5px; color: #cccccc;">
                            Duration: \${test.duration.toFixed(2)}ms
                            \${test.operationsPerSecond ? \` | Ops/sec: \${test.operationsPerSecond.toFixed(0)}\` : ''}
                            \${test.memoryUsage ? \` | Memory: \${(test.memoryUsage / 1024 / 1024).toFixed(2)}MB\` : ''}
                        </div>
                        \${test.error ? \`<div style="color: #ff4444; margin-top: 5px;">Error: \${test.error}</div>\` : ''}
                    </div>
                \`;
            }).join('');
        }

        function updateHistoricalChart() {
            const canvas = document.getElementById('historical-chart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const trends = currentData.trends || [];

            if (window.historicalChart) {
                window.historicalChart.destroy();
            }

            window.historicalChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: trends.map(t => new Date(t.timestamp).toLocaleTimeString()),
                    datasets: [
                        {
                            label: 'Duration (ms)',
                            data: trends.map(t => t.duration),
                            backgroundColor: 'rgba(0, 255, 136, 0.6)',
                            borderColor: '#00ff88',
                            borderWidth: 1
                        },
                        {
                            label: 'Regressions',
                            data: trends.map(t => t.regressions),
                            backgroundColor: 'rgba(255, 68, 68, 0.6)',
                            borderColor: '#ff4444',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#ffffff' }
                        }
                    },
                    scales: {
                        x: { ticks: { color: '#cccccc' }, grid: { color: '#2a2a4e' } },
                        y: { ticks: { color: '#cccccc' }, grid: { color: '#2a2a4e' } }
                    }
                }
            });

            // Update trend details
            const trendDetails = document.getElementById('trend-details');
            if (trends.length > 0) {
                const latest = trends[trends.length - 1];
                const avgDuration = trends.reduce((sum, t) => sum + t.duration, 0) / trends.length;
                const totalRegressions = trends.reduce((sum, t) => sum + t.regressions, 0);

                trendDetails.innerHTML = \`
                    <div style="margin-top: 20px; padding: 15px; background: #2a2a4e; border-radius: 4px;">
                        <h4 style="color: #00ff88; margin-bottom: 10px;">📊 Trend Summary</h4>
                        <div class="metric">
                            <span class="metric-label">Latest Duration</span>
                            <span class="metric-value">\${latest.duration.toFixed(2)}ms</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Average Duration</span>
                            <span class="metric-value">\${avgDuration.toFixed(2)}ms</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Total Regressions</span>
                            <span class="metric-value">\${totalRegressions}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Trend</span>
                            <span class="metric-value \${latest.duration > avgDuration ? 'warning' : 'success'}">
                                \${latest.duration > avgDuration ? '📈 Increasing' : '📉 Decreasing'}
                            </span>
                        </div>
                    </div>
                \`;
            }
        }

        // Load data on page load
        document.addEventListener('DOMContentLoaded', loadData);
    </script>
</body>
</html>`;
  }
}

interface CliFlags {
  port: number;
  help: boolean;
  version: boolean;
  headless: boolean;
  interval: number;
}

function parseCliFlags(): CliFlags {
  const flags: CliFlags = {
    port: 3001,
    help: false,
    version: false,
    headless: false,
    interval: 30,
  };

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "-p":
      case "--port":
        if (next) {
          flags.port = parseInt(next, 10);
          i++;
        }
        break;
      case "-h":
      case "--help":
        flags.help = true;
        break;
      case "-V":
      case "--version":
        flags.version = true;
        break;
      case "--headless":
        flags.headless = true;
        break;
      case "-i":
      case "--interval":
        if (next) {
          flags.interval = parseInt(next, 10);
          i++;
        }
        break;
    }
  }

  return flags;
}

function printHelp() {
  console.log(`
Performance Dashboard CLI

Usage: bun run performance-dashboard.ts [options]

Options:
  -p, --port <number>    Port to run dashboard on (default: 3001)
  -i, --interval <sec>  Auto-refresh interval in seconds (default: 30)
  -h, --help            Show this help message
  -V, --version         Show version information
  --headless            Run in headless mode (no browser auto-open)

Examples:
  bun run performance-dashboard.ts --port 8080
  bun run performance-dashboard.ts -p 3001 -i 60
`);
}

function printVersion() {
  console.log("Performance Dashboard v2.0.0");
}

// CLI interface
async function main() {
  const flags = parseCliFlags();

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  if (flags.version) {
    printVersion();
    process.exit(0);
  }

  const dashboard = new PerformanceDashboard();

  console.log(`🚀 Starting Performance Dashboard v2.0.0`);
  console.log(`📊 Port: ${flags.port}`);
  console.log(`🔄 Refresh interval: ${flags.interval}s`);
  console.log(`🖥️  Headless mode: ${flags.headless ? "enabled" : "disabled"}`);

  try {
    await dashboard.start(flags.port);
  } catch (error) {
    console.error("❌ Dashboard failed to start:", error);
    process.exit(1);
  }
}

// Export for use as module
export { PerformanceDashboard };

// Run if called directly
if (import.meta.main) {
  main();
}
