#!/usr/bin/env bun

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface BenchmarkData {
  date: string;
  version: string;
  platform: string;
  results: {
    method: string;
    testCase: string;
    opsPerSecond: number;
    relative: number;
    memory: number;
    fastest: boolean;
  }[];
}

class BenchmarkVisualizer {
  async generateVisualization() {
    console.log('📊 Generating Performance Visualization\n');

    // Find latest benchmark file
    const resultsDir = 'benchmarks/results';
    const files = readdirSync(resultsDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('No benchmark results found');
      return;
    }

    const latestFile = files[0];
    console.log(`Using results from: ${latestFile}\n`);

    const content = readFileSync(join(resultsDir, latestFile), 'utf-8');
    const data = this.parseMarkdown(content);

    this.generateConsoleChart(data);
    this.generateHTMLReport(data, latestFile);
  }

  private parseMarkdown(content: string): BenchmarkData {
    const lines = content.split('\n');
    const data: BenchmarkData = {
      date: '',
      version: '',
      platform: '',
      results: []
    };

    for (const line of lines) {
      if (line.startsWith('**Date:**')) {
        data.date = line.replace('**Date:**', '').trim();
      } else if (line.startsWith('**Bun Version:**')) {
        data.version = line.replace('**Bun Version:**', '').trim();
      } else if (line.startsWith('**Platform:**')) {
        data.platform = line.replace('**Platform:**', '').trim();
      } else if (line.includes('| URLPattern') || line.includes('| RegExp')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 6) {
          const [method, testCase, ops, relative, memory, fastest] = parts;
          if (method && testCase && ops && !isNaN(parseInt(ops.replace(/,/g, '')))) {
            data.results.push({
              method,
              testCase,
              opsPerSecond: parseInt(ops.replace(/,/g, '')),
              relative: parseFloat(relative),
              memory: parseFloat(memory),
              fastest: fastest.includes('🏆')
            });
          }
        }
      }
    }

    return data;
  }

  private generateConsoleChart(data: BenchmarkData) {
    console.log('📈 PERFORMANCE CHART\n');

    // Group by test case
    const grouped = new Map<string, any[]>();

    for (const result of data.results) {
      if (!grouped.has(result.testCase)) {
        grouped.set(result.testCase, []);
      }
      grouped.get(result.testCase)!.push(result);
    }

    // Sort by average performance
    const sortedCases = Array.from(grouped.entries()).sort((a, b) => {
      const avgA = a[1].reduce((sum, r) => sum + r.opsPerSecond, 0) / a[1].length;
      const avgB = b[1].reduce((sum, r) => sum + r.opsPerSecond, 0) / b[1].length;
      return avgB - avgA;
    });

    // Generate chart for each test case
    for (const [testCase, results] of sortedCases) {
      const urlPattern = results.find(r => r.method === 'URLPattern');
      const regex = results.find(r => r.method === 'RegExp');

      if (!urlPattern || !regex) continue;

      const maxOps = Math.max(urlPattern.opsPerSecond, regex.opsPerSecond);
      const urlPatternBars = Math.round((urlPattern.opsPerSecond / maxOps) * 30);
      const regexBars = Math.round((regex.opsPerSecond / maxOps) * 30);

      console.log(`${testCase}:`);
      console.log(`  URLPattern ${'█'.repeat(urlPatternBars)} ${urlPattern.opsPerSecond.toLocaleString().padStart(10)} ops/sec`);
      console.log(`  RegExp     ${'█'.repeat(regexBars)} ${regex.opsPerSecond.toLocaleString().padStart(10)} ops/sec`);

      if (urlPattern.opsPerSecond > regex.opsPerSecond) {
        console.log(`  URLPattern is ${((urlPattern.opsPerSecond - regex.opsPerSecond) / regex.opsPerSecond * 100).toFixed(1)}% faster\n`);
      } else {
        console.log(`  RegExp is ${((regex.opsPerSecond - urlPattern.opsPerSecond) / urlPattern.opsPerSecond * 100).toFixed(1)}% faster\n`);
      }
    }
  }

  private generateHTMLReport(data: BenchmarkData, sourceFile: string) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URLPattern vs RegExp Benchmark</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }

        .header h1 {
            color: #2d3748;
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .metadata {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            color: #718096;
        }

        .chart-container {
            height: 400px;
            margin: 30px 0;
        }

        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }

        .result-card {
            background: #f7fafc;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #4299e1;
        }

        .result-card.urlpattern {
            border-left-color: #48bb78;
        }

        .result-card.regexp {
            border-left-color: #ed8936;
        }

        .result-card h3 {
            color: #2d3748;
            margin-bottom: 10px;
        }

        .stats {
            margin-top: 15px;
        }

        .stat {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
        }

        .winner {
            background: #c6f6d5;
            color: #22543d;
            padding: 10px;
            border-radius: 6px;
            margin-top: 15px;
            text-align: center;
            font-weight: bold;
        }

        .summary {
            background: #ebf8ff;
            border-radius: 8px;
            padding: 25px;
            margin-top: 40px;
        }

        .summary h2 {
            color: #2d3748;
            margin-bottom: 20px;
        }

        .recommendation {
            background: #feebc8;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            border-left: 4px solid #dd6b20;
        }

        @media (max-width: 768px) {
            body {
                padding: 10px;
            }

            .container {
                padding: 20px;
            }

            .header h1 {
                font-size: 1.8em;
            }

            .metadata {
                flex-direction: column;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 URLPattern vs RegExp Benchmark</h1>
            <p>Comprehensive performance comparison in Bun ${data.version}</p>
            <div class="metadata">
                <div>📅 ${data.date}</div>
                <div>🖥️ ${data.platform}</div>
                <div>⚡ ${data.results.length} test cases</div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="performanceChart"></canvas>
        </div>

        <div class="results-grid">
            ${this.generateResultCards(data)}
        </div>

        <div class="summary">
            <h2>📈 Summary Statistics</h2>
            <div id="summaryStats"></div>
        </div>

        <div class="recommendation">
            <h3>💡 Recommendation</h3>
            <p id="recommendationText"></p>
        </div>
    </div>

    <script>
        const data = ${JSON.stringify(data)};

        // Prepare chart data
        const testCases = [...new Set(data.results.map(r => r.testCase))];
        const urlPatternData = testCases.map(testCase => {
            const result = data.results.find(r => r.testCase === testCase && r.method === 'URLPattern');
            return result ? result.opsPerSecond : 0;
        });

        const regexData = testCases.map(testCase => {
            const result = data.results.find(r => r.testCase === testCase && r.method === 'RegExp');
            return result ? result.opsPerSecond : 0;
        });

        // Calculate summary
        const urlPatternResults = data.results.filter(r => r.method === 'URLPattern');
        const regexResults = data.results.filter(r => r.method === 'RegExp');

        const avgURLPattern = urlPatternResults.reduce((sum, r) => sum + r.opsPerSecond, 0) / urlPatternResults.length;
        const avgRegExp = regexResults.reduce((sum, r) => sum + r.opsPerSecond, 0) / regexResults.length;
        const difference = ((avgURLPattern - avgRegExp) / avgRegExp * 100).toFixed(1);

        // Update summary
        document.getElementById('summaryStats').innerHTML = \`
            <div class="stat"><span>Average URLPattern:</span><span>\${Math.round(avgURLPattern).toLocaleString()} ops/sec</span></div>
            <div class="stat"><span>Average RegExp:</span><span>\${Math.round(avgRegExp).toLocaleString()} ops/sec</span></div>
            <div class="stat"><span>Performance Difference:</span><span>\${Math.abs(difference)}%</span></div>
        \`;

        // Update recommendation
        const recommendation = document.getElementById('recommendationText');
        if (parseFloat(difference) > 0) {
            recommendation.innerHTML = \`
                <p>✅ <strong>URLPattern performs better overall (\${difference}% faster)</strong></p>
                <p>Use URLPattern for production routing, TypeScript projects, and maintainable code.</p>
            \`;
        } else {
            recommendation.innerHTML = \`
                <p>✅ <strong>RegExp performs better overall (\${Math.abs(difference)}% faster)</strong></p>
                <p>Use RegExp for performance-critical paths and simple pattern matching.</p>
            \`;
        }

        // Create chart
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: testCases,
                datasets: [
                    {
                        label: 'URLPattern',
                        data: urlPatternData,
                        backgroundColor: 'rgba(72, 187, 120, 0.8)',
                        borderColor: 'rgba(72, 187, 120, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'RegExp',
                        data: regexData,
                        backgroundColor: 'rgba(237, 137, 54, 0.8)',
                        borderColor: 'rgba(237, 137, 54, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Operations per Second'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ops/s';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' ops/sec';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;

    const outputFile = `benchmarks/results/visualization-${Date.now()}.html`;
    Bun.write(outputFile, html);
    console.log(`\n🌐 HTML report generated: ${outputFile}`);
    console.log(`   Open in browser to view interactive charts`);
  }

  private generateResultCards(data: BenchmarkData): string {
    // Group by test case
    const grouped = new Map<string, any[]>();

    for (const result of data.results) {
      if (!grouped.has(result.testCase)) {
        grouped.set(result.testCase, []);
      }
      grouped.get(result.testCase)!.push(result);
    }

    let cards = '';

    for (const [testCase, results] of grouped.entries()) {
      const urlPattern = results.find(r => r.method === 'URLPattern');
      const regex = results.find(r => r.method === 'RegExp');

      if (!urlPattern || !regex) continue;

      const faster = urlPattern.opsPerSecond > regex.opsPerSecond ? 'URLPattern' : 'RegExp';
      const difference = Math.abs(urlPattern.opsPerSecond - regex.opsPerSecond);
      const percent = (difference / Math.min(urlPattern.opsPerSecond, regex.opsPerSecond) * 100).toFixed(1);

      cards += `
        <div class="result-card ${urlPattern.opsPerSecond > regex.opsPerSecond ? 'urlpattern' : 'regexp'}">
            <h3>${testCase}</h3>
            <div class="stats">
                <div class="stat">
                    <span>URLPattern:</span>
                    <span>${urlPattern.opsPerSecond.toLocaleString()} ops/sec</span>
                </div>
                <div class="stat">
                    <span>RegExp:</span>
                    <span>${regex.opsPerSecond.toLocaleString()} ops/sec</span>
                </div>
                <div class="stat">
                    <span>Memory:</span>
                    <span>${urlPattern.memory.toFixed(2)} MB vs ${regex.memory.toFixed(2)} MB</span>
                </div>
            </div>
            <div class="winner">
                ${faster} is ${percent}% faster
            </div>
        </div>
      `;
    }

    return cards;
  }
}

// Run if main
if (import.meta.main) {
  const visualizer = new BenchmarkVisualizer();
  await visualizer.generateVisualization();
}