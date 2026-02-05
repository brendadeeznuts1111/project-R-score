#!/usr/bin/env bun

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  name: string;
  category: string;
  timestamp: string;
  duration: number;
  opsPerSecond?: number;
  latency?: number;
  memoryUsage?: number;
  errorRate?: number;
  status: 'success' | 'failed' | 'warning';
  metadata?: Record<string, any>;
}

interface BenchmarkSuite {
  name: string;
  timestamp: string;
  version: string;
  platform: string;
  results: BenchmarkResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageLatency: number;
    peakMemoryUsage: number;
    totalDuration: number;
  };
}

interface RegressionAnalysis {
  testName: string;
  category: string;
  baseline: {
    opsPerSecond: number;
    timestamp: string;
  };
  current: {
    opsPerSecond: number;
    timestamp: string;
  };
  change: {
    absolute: number;
    percentage: number;
    isRegression: boolean;
    severity: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  };
}

class PerformanceRegressionDetector {
  private results: BenchmarkSuite[] = [];
  private readonly REGRESSION_THRESHOLDS = {
    minor: -5,      // -5% or worse
    moderate: -10,  // -10% or worse
    severe: -20,    // -20% or worse
    critical: -35   // -35% or worse
  };

  async analyzeRegressions() {
    console.log('🔍 Analyzing Performance Regressions\n');

    // Load all benchmark results
    await this.loadBenchmarkResults();

    if (this.results.length < 2) {
      console.log('⚠️  Need at least 2 benchmark runs to detect regressions. Found:', this.results.length);
      return;
    }

    console.log(`📊 Loaded ${this.results.length} benchmark suites`);

    // Filter out invalid results
    this.results = this.results.filter(suite => suite && suite.results && suite.results.length > 0);
    console.log(`📊 After filtering: ${this.results.length} valid benchmark suites`);

    if (this.results.length < 2) {
      console.log('⚠️  Need at least 2 valid benchmark runs to detect regressions. Found:', this.results.length);
      return;
    }

    // Sort by timestamp (oldest first)
    this.results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log('📊 Sorted results:');
    this.results.forEach((suite, i) => {
      console.log(`   ${i}: ${suite.name} (${suite.timestamp}) - ${suite.results.length} tests`);
    });

    // Use oldest as baseline, newest as current
    const baseline = this.results[0];
    const current = this.results[this.results.length - 1];

    if (!baseline) {
      console.log('❌ No baseline results found');
      return;
    }

    console.log(`\n📊 Comparing:`);
    console.log(`   Baseline: ${baseline.name} (${baseline.timestamp})`);
    console.log(`   Current:  ${current.name} (${current.timestamp})\n`);

    // Analyze regressions
    const regressions = this.detectRegressions(baseline, current);

    // Generate report
    this.generateRegressionReport(regressions, baseline, current);

    // Exit with error code if critical regressions found
    const criticalRegressions = regressions.filter(r => r.change.severity === 'critical');
    if (criticalRegressions.length > 0) {
      console.log(`\n❌ CRITICAL REGRESSIONS DETECTED: ${criticalRegressions.length}`);
      console.log('   Failing CI/CD pipeline due to performance degradation');
      process.exit(1);
    }
  }

  private async loadBenchmarkResults() {
    const resultsDir = 'results';

    try {
      const files = readdirSync(resultsDir)
        .filter(f => f.endsWith('.json') || f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 20); // Load last 20 results for analysis

      for (const file of files) {
        const filePath = join(resultsDir, file);
        const content = readFileSync(filePath, 'utf-8');

        if (file.endsWith('.json')) {
          this.parseJSONResult(content, file);
        } else if (file.endsWith('.md')) {
          this.parseMarkdownResult(content, file);
        }
      }
    } catch (error) {
      console.warn('Warning: Could not load benchmark results:', error);
    }
  }

  private parseJSONResult(content: string, filename: string) {
    try {
      const data = JSON.parse(content);
      this.results.push(data);
    } catch (error) {
      console.warn(`Warning: Could not parse ${filename}:`, error);
    }
  }

  private parseMarkdownResult(content: string, filename: string) {
    const lines = content.split('\n');
    const suite: BenchmarkSuite = {
      name: 'URLPattern vs RegExp',
      timestamp: new Date().toISOString(),
      version: 'Unknown',
      platform: 'Unknown',
      results: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageLatency: 0,
        peakMemoryUsage: 0,
        totalDuration: 0
      }
    };

    for (const line of lines) {
      if (line.startsWith('**Date:**')) {
        suite.timestamp = line.replace('**Date:**', '').trim();
      } else if (line.startsWith('**Bun Version:**')) {
        suite.version = line.replace('**Bun Version:**', '').trim();
      } else if (line.startsWith('**Platform:**')) {
        suite.platform = line.replace('**Platform:**', '').trim();
      } else if (line.includes('| URLPattern') || line.includes('| RegExp')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 5) {
          const [, method, testCase, ops] = parts;
          if (method && testCase && ops && !isNaN(parseInt(ops.replace(/,/g, '')))) {
            suite.results.push({
              name: testCase,
              category: 'routing',
              timestamp: suite.timestamp,
              duration: 0,
              opsPerSecond: parseInt(ops.replace(/,/g, '')),
              status: 'success'
            });
          }
        }
      }
    }

    if (suite.results.length > 0) {
      this.results.push(suite);
    }
  }

  private detectRegressions(baseline: BenchmarkSuite, current: BenchmarkSuite): RegressionAnalysis[] {
    const regressions: RegressionAnalysis[] = [];

    // Create maps for easy lookup
    const baselineMap = new Map<string, BenchmarkResult>();
    const currentMap = new Map<string, BenchmarkResult>();

    baseline.results.forEach(result => {
      baselineMap.set(result.name, result);
    });

    current.results.forEach(result => {
      currentMap.set(result.name, result);
    });

    // Compare each test
    const allTestNames = new Set([...baselineMap.keys(), ...currentMap.keys()]);

    for (const testName of allTestNames) {
      const baselineResult = baselineMap.get(testName);
      const currentResult = currentMap.get(testName);

      if (!baselineResult?.opsPerSecond || !currentResult?.opsPerSecond) {
        continue; // Skip if missing data
      }

      const changeAbsolute = currentResult.opsPerSecond - baselineResult.opsPerSecond;
      const changePercentage = (changeAbsolute / baselineResult.opsPerSecond) * 100;

      const severity = this.determineSeverity(changePercentage);

      regressions.push({
        testName,
        category: baselineResult.category,
        baseline: {
          opsPerSecond: baselineResult.opsPerSecond,
          timestamp: baseline.timestamp
        },
        current: {
          opsPerSecond: currentResult.opsPerSecond,
          timestamp: current.timestamp
        },
        change: {
          absolute: changeAbsolute,
          percentage: changePercentage,
          isRegression: changePercentage < 0,
          severity
        }
      });
    }

    return regressions;
  }

  private determineSeverity(percentageChange: number): 'none' | 'minor' | 'moderate' | 'severe' | 'critical' {
    if (percentageChange >= 0) return 'none';

    const absChange = Math.abs(percentageChange);

    if (absChange >= this.REGRESSION_THRESHOLDS.critical) return 'critical';
    if (absChange >= this.REGRESSION_THRESHOLDS.severe) return 'severe';
    if (absChange >= this.REGRESSION_THRESHOLDS.moderate) return 'moderate';
    if (absChange >= this.REGRESSION_THRESHOLDS.minor) return 'minor';

    return 'none';
  }

  private generateRegressionReport(regressions: RegressionAnalysis[], baseline: BenchmarkSuite, current: BenchmarkSuite) {
    console.log('📈 PERFORMANCE REGRESSION ANALYSIS');
    console.log('=' .repeat(50));

    // Summary statistics
    const totalTests = regressions.length;
    const regressionsOnly = regressions.filter(r => r.change.isRegression);
    const improvements = regressions.filter(r => !r.change.isRegression);

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests Compared: ${totalTests}`);
    console.log(`   Regressions: ${regressionsOnly.length}`);
    console.log(`   Improvements: ${improvements.length}`);

    // Group by severity
    const bySeverity = {
      critical: regressionsOnly.filter(r => r.change.severity === 'critical'),
      severe: regressionsOnly.filter(r => r.change.severity === 'severe'),
      moderate: regressionsOnly.filter(r => r.change.severity === 'moderate'),
      minor: regressionsOnly.filter(r => r.change.severity === 'minor')
    };

    console.log(`\n🚨 Regressions by Severity:`);
    console.log(`   Critical (>35%): ${bySeverity.critical.length}`);
    console.log(`   Severe (20-35%): ${bySeverity.severe.length}`);
    console.log(`   Moderate (10-20%): ${bySeverity.moderate.length}`);
    console.log(`   Minor (5-10%): ${bySeverity.minor.length}`);

    // Detailed regression report
    if (regressionsOnly.length > 0) {
      console.log(`\n📉 Detailed Regressions:`);

      // Sort by severity (most severe first)
      const sortedRegressions = regressionsOnly.sort((a, b) => {
        const severityOrder = { critical: 4, severe: 3, moderate: 2, minor: 1 };
        return severityOrder[b.change.severity] - severityOrder[a.change.severity];
      });

      for (const regression of sortedRegressions.slice(0, 10)) { // Show top 10
        const icon = this.getSeverityIcon(regression.change.severity);
        console.log(`   ${icon} ${regression.testName}`);
        console.log(`      ${regression.baseline.opsPerSecond.toLocaleString()} → ${regression.current.opsPerSecond.toLocaleString()} ops/sec`);
        console.log(`      ${regression.change.percentage.toFixed(1)}% change (${regression.change.severity})`);
      }

      if (sortedRegressions.length > 10) {
        console.log(`   ... and ${sortedRegressions.length - 10} more`);
      }
    }

    // Improvements
    if (improvements.length > 0) {
      console.log(`\n📈 Notable Improvements:`);
      const topImprovements = improvements
        .sort((a, b) => b.change.percentage - a.change.percentage)
        .slice(0, 5);

      for (const improvement of topImprovements) {
        console.log(`   ✅ ${improvement.testName}: +${improvement.change.percentage.toFixed(1)}%`);
      }
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (bySeverity.critical.length > 0) {
      console.log(`   🚨 CRITICAL: Immediate investigation required for ${bySeverity.critical.length} test(s)`);
    }
    if (bySeverity.severe.length > 0) {
      console.log(`   ⚠️  SEVERE: Review architecture changes for ${bySeverity.severe.length} test(s)`);
    }
    if (regressionsOnly.length === 0) {
      console.log(`   ✅ EXCELLENT: No performance regressions detected!`);
    }

    // Save detailed report
    this.saveRegressionReport(regressions, baseline, current);
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'severe': return '🟠';
      case 'moderate': return '🟡';
      case 'minor': return '🔵';
      default: return '⚪';
    }
  }

  private saveRegressionReport(regressions: RegressionAnalysis[], baseline: BenchmarkSuite, current: BenchmarkSuite) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `results/regression-analysis-${timestamp}.json`;

    const report = {
      generatedAt: new Date().toISOString(),
      baseline: {
        name: baseline.name,
        timestamp: baseline.timestamp,
        version: baseline.version
      },
      current: {
        name: current.name,
        timestamp: current.timestamp,
        version: current.version
      },
      analysis: {
        totalTests: regressions.length,
        regressions: regressions.filter(r => r.change.isRegression).length,
        improvements: regressions.filter(r => !r.change.isRegression).length,
        bySeverity: {
          critical: regressions.filter(r => r.change.severity === 'critical').length,
          severe: regressions.filter(r => r.change.severity === 'severe').length,
          moderate: regressions.filter(r => r.change.severity === 'moderate').length,
          minor: regressions.filter(r => r.change.severity === 'minor').length
        }
      },
      regressions: regressions.filter(r => r.change.isRegression)
    };

    Bun.write(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed regression report saved: ${filename}`);
  }
}

// Run if main
if (import.meta.main) {
  const detector = new PerformanceRegressionDetector();
  await detector.analyzeRegressions();
}