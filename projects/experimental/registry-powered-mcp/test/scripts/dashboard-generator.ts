#!/usr/bin/env bun
/**
 * Visual Test Dashboard Generator
 * Creates interactive HTML dashboard for test results and metrics
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

interface TestMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

interface DashboardData {
  timestamp: string;
  metrics: TestMetrics;
  recentRuns: Array<{
    timestamp: string;
    metrics: TestMetrics;
  }>;
}

class TestDashboard {
  private data: DashboardData;

  constructor() {
    this.data = {
      timestamp: new Date().toISOString(),
      metrics: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        todo: 0,
        duration: 0
      },
      recentRuns: []
    };
  }

  async generateDashboard(): Promise<void> {
    console.log("📊 Generating visual test dashboard...");

    // Mock data for demonstration (in real usage, this would come from test analysis)
    this.data.metrics = {
      total: 224,
      passed: 220,
      failed: 0,
      skipped: 3,
      todo: 1,
      duration: 3670,
      coverage: {
        lines: 64.5,
        functions: 63.2,
        branches: 58.1,
        statements: 64.5
      }
    };

    // Add some historical data
    this.data.recentRuns = [
      {
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        metrics: {
          total: 220,
          passed: 215,
          failed: 2,
          skipped: 3,
          todo: 0,
          duration: 3890
        }
      },
      {
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        metrics: {
          total: 215,
          passed: 210,
          failed: 1,
          skipped: 4,
          todo: 0,
          duration: 4120
        }
      }
    ];

    const html = this.generateHTML();
    const outputPath = join(process.cwd(), "test", "status-dashboard.html");

    writeFileSync(outputPath, html);
    console.log(`✅ Dashboard generated: ${outputPath}`);
    console.log(`🌐 Open in browser: file://${outputPath}`);
  }

  private generateHTML(): string {
    const { metrics, recentRuns } = this.data;
    const passRate = metrics.total > 0 ? ((metrics.passed / metrics.total) * 100).toFixed(1) : "0";
    const healthScore = this.calculateHealthScore();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Suite Dashboard - Registry-Powered-MCP</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            color: white;
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            color: rgba(255,255,255,0.9);
            font-size: 1.1rem;
        }

        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }

        .card h3 {
            color: #2c3e50;
            margin-bottom: 16px;
            font-size: 1.3rem;
            border-bottom: 2px solid #3498db;
            padding-bottom: 8px;
        }

        .metric-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #ecf0f1;
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-label {
            font-weight: 500;
            color: #555;
        }

        .metric-value {
            font-weight: bold;
            font-size: 1.1rem;
        }

        .metric-pass { color: #27ae60; }
        .metric-fail { color: #e74c3c; }
        .metric-skip { color: #f39c12; }
        .metric-todo { color: #9b59b6; }

        .chart-container {
            height: 300px;
            margin: 20px 0;
        }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .status-healthy { background: #27ae60; }
        .status-warning { background: #f39c12; }
        .status-error { background: #e74c3c; }

        .health-score {
            font-size: 2rem;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }

        .health-score.healthy { color: #27ae60; }
        .health-score.warning { color: #f39c12; }
        .health-score.error { color: #e74c3c; }

        .recent-runs {
            margin-top: 20px;
        }

        .run-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border: 1px solid #ecf0f1;
            border-radius: 6px;
            margin-bottom: 8px;
            background: #f8f9fa;
        }

        .run-metrics {
            display: flex;
            gap: 16px;
        }

        .run-metric {
            font-size: 0.9rem;
            color: #666;
        }

        .footer {
            text-align: center;
            color: rgba(255,255,255,0.8);
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
            margin: 2px;
        }

        .badge-success { background: #27ae60; color: white; }
        .badge-danger { background: #e74c3c; color: white; }
        .badge-warning { background: #f39c12; color: white; }
        .badge-info { background: #3498db; color: white; }

        @media (max-width: 768px) {
            .dashboard {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 2rem;
            }

            .metric-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Suite Dashboard</h1>
            <p>Registry-Powered-MCP | Last Updated: ${new Date(this.data.timestamp).toLocaleString()}</p>
        </div>

        <div class="dashboard">
            <!-- Test Overview -->
            <div class="card">
                <h3>📊 Test Overview</h3>
                <div class="metric-grid">
                    <div class="metric">
                        <span class="metric-label">Total Tests</span>
                        <span class="metric-value">${metrics.total}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">✅ Passed</span>
                        <span class="metric-value metric-pass">${metrics.passed}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">❌ Failed</span>
                        <span class="metric-value metric-fail">${metrics.failed}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">⏭️ Skipped</span>
                        <span class="metric-value metric-skip">${metrics.skipped}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">📝 Todo</span>
                        <span class="metric-value metric-todo">${metrics.todo}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">⏱️ Duration</span>
                        <span class="metric-value">${(metrics.duration / 1000).toFixed(1)}s</span>
                    </div>
                </div>

                <div class="health-score ${this.getHealthClass(healthScore)}">
                    Health Score: ${healthScore}/100
                </div>

                <div style="text-align: center; margin: 16px 0;">
                    <span class="badge badge-success">Pass Rate: ${passRate}%</span>
                    ${metrics.failed > 0 ? '<span class="badge badge-danger">Has Failures</span>' : ''}
                    ${metrics.skipped > 0 ? '<span class="badge badge-warning">Has Skips</span>' : ''}
                    ${metrics.todo > 0 ? '<span class="badge badge-info">Has Todos</span>' : ''}
                </div>
            </div>

            <!-- Coverage Metrics -->
            <div class="card">
                <h3>📈 Coverage Metrics</h3>
                ${metrics.coverage ? `
                <div class="metric-grid">
                    <div class="metric">
                        <span class="metric-label">Lines</span>
                        <span class="metric-value">${metrics.coverage.lines.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Functions</span>
                        <span class="metric-value">${metrics.coverage.functions.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Branches</span>
                        <span class="metric-value">${metrics.coverage.branches.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Statements</span>
                        <span class="metric-value">${metrics.coverage.statements.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="coverageChart"></canvas>
                </div>
                ` : '<p style="color: #666; font-style: italic;">Coverage data not available. Run tests with --coverage.</p>'}
            </div>

            <!-- Recent Runs -->
            <div class="card">
                <h3>📅 Recent Test Runs</h3>
                <div class="recent-runs">
                    ${recentRuns.map(run => {
                        const runDate = new Date(run.timestamp).toLocaleDateString();
                        const runPassRate = run.metrics.total > 0 ?
                            ((run.metrics.passed / run.metrics.total) * 100).toFixed(1) : "0";

                        return `
                        <div class="run-item">
                            <span>${runDate}</span>
                            <div class="run-metrics">
                                <span class="run-metric">Total: ${run.metrics.total}</span>
                                <span class="run-metric">✅ ${run.metrics.passed}</span>
                                <span class="run-metric">❌ ${run.metrics.failed}</span>
                                <span class="run-metric">${(run.metrics.duration / 1000).toFixed(1)}s</span>
                                <span class="run-metric">${runPassRate}%</span>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Implementation Status -->
            <div class="card">
                <h3>🔧 Bun Testing Implementation</h3>
                <div style="margin: 16px 0;">
                    <div style="display: flex; align-items: center; margin: 8px 0;">
                        <span class="status-indicator status-healthy"></span>
                        <span>30+ Features Implemented</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 8px 0;">
                        <span class="status-indicator status-warning"></span>
                        <span>10+ Features Available</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 8px 0;">
                        <span class="status-indicator status-healthy"></span>
                        <span>Zero-Cost Feature Flags</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 8px 0;">
                        <span class="status-indicator status-healthy"></span>
                        <span>Type-Safe Testing</span>
                    </div>
                </div>

                <div class="chart-container">
                    <canvas id="implementationChart"></canvas>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated by test/scripts/dashboard-generator.ts | Bun ${process.versions.bun} | ${new Date().toISOString()}</p>
        </div>
    </div>

    <script>
        // Coverage Chart
        ${metrics.coverage ? `
        const coverageCtx = document.getElementById('coverageChart').getContext('2d');
        new Chart(coverageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Lines', 'Functions', 'Branches', 'Statements'],
                datasets: [{
                    data: [${metrics.coverage.lines}, ${metrics.coverage.functions}, ${metrics.coverage.branches}, ${metrics.coverage.statements}],
                    backgroundColor: ['#3498db', '#e74c3c', '#f39c12', '#27ae60'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        ` : ''}

        // Implementation Status Chart
        const implCtx = document.getElementById('implementationChart').getContext('2d');
        new Chart(implCtx, {
            type: 'bar',
            data: {
                labels: ['Implemented', 'Available', 'Planned'],
                datasets: [{
                    label: 'Features',
                    data: [30, 10, 5],
                    backgroundColor: ['#27ae60', '#f39c12', '#95a5a6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 5
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  private calculateHealthScore(): number {
    const { total, passed, failed, skipped } = this.data.metrics;
    if (total === 0) return 0;

    const passRate = passed / total;
    const skipPenalty = Math.min(skipped / total, 0.1); // Max 10% penalty
    const failPenalty = failed / total * 2; // Double penalty for failures

    return Math.max(0, Math.min(100, (passRate - skipPenalty - failPenalty) * 100));
  }

  private getHealthClass(score: number): string {
    if (score >= 90) return "healthy";
    if (score >= 75) return "warning";
    return "error";
  }
}

// CLI runner
async function main() {
  const dashboard = new TestDashboard();

  try {
    await dashboard.generateDashboard();
    console.log("🎉 Dashboard generation complete!");
  } catch (error) {
    console.error("❌ Dashboard generation failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { TestDashboard };