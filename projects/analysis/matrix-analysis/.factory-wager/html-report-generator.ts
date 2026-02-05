#!/usr/bin/env bun

/**
 * FactoryWager HTML Report Generator
 *
 * Features:
 * - Converts JSON audit data to beautiful HTML reports
 * - Interactive charts and visualizations
 * - Responsive design with modern CSS
 * - Export capabilities (PDF, print)
 * - Template-based rendering
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ReportData {
  title: string;
  timestamp: string;
  summary: {
    total_entries: number;
    success_rate: number;
    risk_score: number;
    duration: number;
  };
  workflows: Array<{
    name: string;
    exit_code: number;
    duration: number;
    risk_score?: number;
    error?: string;
    metadata?: Record<string, any>;
  }>;
  charts: {
    workflow_distribution: Record<string, number>;
    exit_code_distribution: Record<string, number>;
    risk_trend: Array<{ timestamp: string; score: number }>;
  };
}

class HTMLReportGenerator {
  private templatePath: string;
  private outputPath: string;

  constructor(outputDir: string = 'reports') {
    this.templatePath = join('.factory-wager', 'templates', 'report-template.html');
    this.outputPath = outputDir;
  }

  /**
   * Generate HTML report from audit data
   */
  generateReport(data: ReportData, filename?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = filename || `factory-wager-report-${timestamp}.html`;
    const fullPath = join(this.outputPath, reportFile);

    const html = this.renderHTML(data);
    writeFileSync(fullPath, html);

    return fullPath;
  }

  /**
   * Render HTML template with data
   */
  private renderHTML(data: ReportData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title} - FactoryWager Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .header .timestamp {
            color: #6b7280;
            font-size: 1rem;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .summary-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }

        .summary-card:hover {
            transform: translateY(-2px);
        }

        .summary-card h3 {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            margin-bottom: 8px;
        }

        .summary-card .value {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
        }

        .summary-card.success .value {
            color: #10b981;
        }

        .summary-card.warning .value {
            color: #f59e0b;
        }

        .summary-card.error .value {
            color: #ef4444;
        }

        .charts-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }

        .chart-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .chart-card h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1f2937;
        }

        .workflows-section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .workflows-section h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1f2937;
        }

        .workflow-item {
            border-left: 4px solid #e5e7eb;
            padding: 15px 20px;
            margin-bottom: 15px;
            background: #f9fafb;
            border-radius: 0 8px 8px 0;
            transition: border-color 0.2s;
        }

        .workflow-item.success {
            border-left-color: #10b981;
        }

        .workflow-item.error {
            border-left-color: #ef4444;
        }

        .workflow-item.warning {
            border-left-color: #f59e0b;
        }

        .workflow-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 8px;
        }

        .workflow-name {
            font-weight: 600;
            color: #1f2937;
        }

        .workflow-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .workflow-status.success {
            background: #10b981;
            color: white;
        }

        .workflow-status.error {
            background: #ef4444;
            color: white;
        }

        .workflow-details {
            display: flex;
            gap: 20px;
            font-size: 0.875rem;
            color: #6b7280;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.875rem;
        }

        @media print {
            body {
                background: white;
            }

            .container {
                max-width: none;
                padding: 0;
            }

            .header, .summary-card, .chart-card, .workflows-section {
                box-shadow: none;
                border: 1px solid #e5e7eb;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${data.title}</h1>
            <div class="timestamp">Generated on ${data.timestamp}</div>
        </header>

        <section class="summary-grid">
            <div class="summary-card">
                <h3>Total Entries</h3>
                <div class="value">${data.summary.total_entries}</div>
            </div>
            <div class="summary-card ${data.summary.success_rate >= 90 ? 'success' : data.summary.success_rate >= 70 ? 'warning' : 'error'}">
                <h3>Success Rate</h3>
                <div class="value">${data.summary.success_rate}%</div>
            </div>
            <div class="summary-card ${data.summary.risk_score <= 50 ? 'success' : data.summary.risk_score <= 75 ? 'warning' : 'error'}">
                <h3>Risk Score</h3>
                <div class="value">${data.summary.risk_score}</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value">${data.summary.duration}s</div>
            </div>
        </section>

        <section class="charts-section">
            <div class="chart-card">
                <h3>Workflow Distribution</h3>
                <canvas id="workflowChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-card">
                <h3>Exit Code Distribution</h3>
                <canvas id="exitCodeChart" width="400" height="300"></canvas>
            </div>
        </section>

        <section class="workflows-section">
            <h3>Workflow Execution Details</h3>
            ${data.workflows.map(workflow => `
                <div class="workflow-item ${workflow.exit_code === 0 ? 'success' : 'error'}">
                    <div class="workflow-header">
                        <div class="workflow-name">${workflow.name}</div>
                        <div class="workflow-status ${workflow.exit_code === 0 ? 'success' : 'error'}">
                            ${workflow.exit_code === 0 ? 'Success' : 'Failed'}
                        </div>
                    </div>
                    <div class="workflow-details">
                        <span>Duration: ${workflow.duration}s</span>
                        ${workflow.risk_score ? `<span>Risk: ${workflow.risk_score}</span>` : ''}
                        <span>Exit Code: ${workflow.exit_code}</span>
                    </div>
                    ${workflow.error ? `<div style="color: #ef4444; font-size: 0.875rem; margin-top: 8px;">Error: ${workflow.error}</div>` : ''}
                </div>
            `).join('')}
        </section>

        <footer class="footer">
            <p>Generated by FactoryWager v1.1.0 | Powered by Bun</p>
        </footer>
    </div>

    <script>
        // Workflow Distribution Chart
        const workflowCtx = document.getElementById('workflowChart').getContext('2d');
        new Chart(workflowCtx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(data.charts.workflow_distribution))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(data.charts.workflow_distribution))},
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#3b82f6',
                        '#8b5cf6',
                        '#ec4899'
                    ],
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

        // Exit Code Distribution Chart
        const exitCodeCtx = document.getElementById('exitCodeChart').getContext('2d');
        new Chart(exitCodeCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(data.charts.exit_code_distribution).map(code => code === '0' ? 'Success' : `Error ${code}`))},
                datasets: [{
                    label: 'Count',
                    data: ${JSON.stringify(Object.values(data.charts.exit_code_distribution))},
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
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
                            stepSize: 1
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

  /**
   * Load audit data and convert to report format
   */
  async loadAuditData(auditFile: string = 'audit.log'): Promise<ReportData> {
    if (!existsSync(auditFile)) {
      throw new Error(`Audit file not found: ${auditFile}`);
    }

    const content = readFileSync(auditFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);

    const entries = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const workflows = entries.map(entry => ({
      name: entry.workflow,
      exit_code: entry.exit_code,
      duration: entry.duration_seconds || 0,
      risk_score: entry.risk_score,
      error: entry.error?.message,
      metadata: entry.metadata
    }));

    const workflowDistribution = entries.reduce((acc, entry) => {
      acc[entry.workflow] = (acc[entry.workflow] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const exitCodeDistribution = entries.reduce((acc, entry) => {
      const code = entry.exit_code.toString();
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const successCount = entries.filter(e => e.exit_code === 0).length;
    const successRate = entries.length > 0 ? Math.round((successCount / entries.length) * 100) : 0;

    const avgRiskScore = entries
      .filter(e => e.risk_score !== undefined)
      .reduce((sum, e) => sum + e.risk_score, 0) /
      entries.filter(e => e.risk_score !== undefined).length || 0;

    const totalDuration = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

    return {
      title: 'FactoryWager Audit Report',
      timestamp: new Date().toLocaleString(),
      summary: {
        total_entries: entries.length,
        success_rate: successRate,
        risk_score: Math.round(avgRiskScore),
        duration: totalDuration
      },
      workflows,
      charts: {
        workflow_distribution: workflowDistribution,
        exit_code_distribution: exitCodeDistribution,
        risk_trend: [] // Would be populated with historical data
      }
    };
  }
}

// CLI interface
if (import.meta.main) {
  const generator = new HTMLReportGenerator();

  generator.loadAuditData()
    .then(data => {
      const reportPath = generator.generateReport(data);
      console.log(`HTML report generated: ${reportPath}`);
    })
    .catch((error: unknown) => {
      // Proper error handling with type checking
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR';

      console.error('❌ HTML report generation failed:', {
        message: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString()
      });

      // Exit with error code for proper CI/CD handling
      process.exit(1);
    });
}

export { HTMLReportGenerator, type ReportData };
