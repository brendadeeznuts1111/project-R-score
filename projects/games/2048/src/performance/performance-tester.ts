#!/usr/bin/env bun
/**
 * Automated Performance Testing Suite
 * Runs comprehensive performance tests and detects regressions
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ProfileAnalyzer } from './profile-analyzer';
import { OptimizationRecommender } from './optimization-recommender';

interface PerformanceTest {
  name: string;
  description: string;
  run: () => Promise<PerformanceResult>;
  threshold?: {
    maxTime?: number;
    maxMemory?: number;
    minOps?: number;
  };
}

interface PerformanceResult {
  name: string;
  duration: number;
  memoryUsage?: number;
  operationsPerSecond?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface TestSuiteResult {
  timestamp: number;
  duration: number;
  tests: PerformanceResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
    regressions: string[];
  };
  environment: {
    platform: string;
    arch: string;
    nodeVersion: string;
    bunVersion: string;
  };
}

interface RegressionBaseline {
  testName: string;
  baseline: {
    avgTime: number;
    maxTime: number;
    avgMemory: number;
    minOps: number;
  };
  tolerance: number; // percentage
}

class PerformanceTester {
  private tests: PerformanceTest[] = [];
  private baselines: Map<string, RegressionBaseline> = new Map();
  private resultsDir = './performance-results';

  constructor() {
    this.ensureResultsDir();
    this.loadBaselines();
    this.registerDefaultTests();
  }

  private ensureResultsDir() {
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  private loadBaselines() {
    const baselineFile = join(this.resultsDir, 'baselines.json');
    if (existsSync(baselineFile)) {
      try {
        const data = JSON.parse(readFileSync(baselineFile, 'utf-8'));
        this.baselines = new Map(Object.entries(data));
      } catch (error) {
        console.warn('⚠️ Could not load baselines:', error);
      }
    }
  }

  private saveBaselines() {
    const baselineFile = join(this.resultsDir, 'baselines.json');
    const data = Object.fromEntries(this.baselines);
    writeFileSync(baselineFile, JSON.stringify(data, null, 2));
  }

  private registerDefaultTests() {
    // Fibonacci performance test
    this.addTest({
      name: 'fibonacci-recursive',
      description: 'Recursive Fibonacci calculation performance',
      run: async () => {
        const startTime = performance.now();
        const startMem = process.memoryUsage().heapUsed;

        function fib(n: number): number {
          return n < 2 ? n : fib(n - 1) + fib(n - 2);
        }

        const result = fib(35);
        const endTime = performance.now();
        const endMem = process.memoryUsage().heapUsed;

        return {
          name: 'fibonacci-recursive',
          duration: endTime - startTime,
          memoryUsage: endMem - startMem,
          operationsPerSecond: 1 / ((endTime - startTime) / 1000),
          metadata: { result, iterations: 1 }
        };
      },
      threshold: { maxTime: 100, maxMemory: 50 * 1024 * 1024 } // 100ms, 50MB
    });

    // Array operations test
    this.addTest({
      name: 'array-operations',
      description: 'Array manipulation performance',
      run: async () => {
        const startTime = performance.now();
        const startMem = process.memoryUsage().heapUsed;

        const array = Array.from({ length: 10000 }, (_, i) => i);

        // Map operation
        const mapped = array.map(x => x * 2);

        // Filter operation
        const filtered = mapped.filter(x => x > 10000);

        // Reduce operation
        const reduced = filtered.reduce((sum, x) => sum + x, 0);

        const endTime = performance.now();
        const endMem = process.memoryUsage().heapUsed;

        return {
          name: 'array-operations',
          duration: endTime - startTime,
          memoryUsage: endMem - startMem,
          operationsPerSecond: 10000 / ((endTime - startTime) / 1000),
          metadata: { result: reduced, arraySize: 10000 }
        };
      },
      threshold: { maxTime: 50, minOps: 100000 }
    });

    // String processing test
    this.addTest({
      name: 'string-processing',
      description: 'String manipulation performance',
      run: async () => {
        const startTime = performance.now();
        const startMem = process.memoryUsage().heapUsed;

        let result = '';
        const iterations = 5000;

        for (let i = 0; i < iterations; i++) {
          result += `test string ${i} with some content\n`;
        }

        const lines = result.split('\n');
        const processed = lines.map(line => line.toUpperCase()).join('\n');

        const endTime = performance.now();
        const endMem = process.memoryUsage().heapUsed;

        return {
          name: 'string-processing',
          duration: endTime - startTime,
          memoryUsage: endMem - startMem,
          operationsPerSecond: iterations / ((endTime - startTime) / 1000),
          metadata: { resultLength: processed.length, iterations }
        };
      },
      threshold: { maxTime: 100, maxMemory: 10 * 1024 * 1024 } // 10MB
    });

    // Object creation test
    this.addTest({
      name: 'object-creation',
      description: 'Object instantiation performance',
      run: async () => {
        const startTime = performance.now();
        const startMem = process.memoryUsage().heapUsed;

        const objects = [];
        const count = 5000;

        for (let i = 0; i < count; i++) {
          objects.push({
            id: i,
            name: `object${i}`,
            data: Array.from({ length: 10 }, () => Math.random()),
            metadata: {
              created: Date.now(),
              type: 'test',
              score: Math.random() * 100
            }
          });
        }

        const endTime = performance.now();
        const endMem = process.memoryUsage().heapUsed;

        return {
          name: 'object-creation',
          duration: endTime - startTime,
          memoryUsage: endMem - startMem,
          operationsPerSecond: count / ((endTime - startTime) / 1000),
          metadata: { objectCount: count, totalObjects: objects.length }
        };
      },
      threshold: { maxTime: 200, minOps: 20000 }
    });

    // Math operations test
    this.addTest({
      name: 'math-operations',
      description: 'Mathematical computation performance',
      run: async () => {
        const startTime = performance.now();

        let result = 0;
        const iterations = 100000;

        for (let i = 0; i < iterations; i++) {
          result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }

        const endTime = performance.now();

        return {
          name: 'math-operations',
          duration: endTime - startTime,
          operationsPerSecond: iterations / ((endTime - startTime) / 1000),
          metadata: { result, iterations }
        };
      },
      threshold: { maxTime: 20, minOps: 1000000 }
    });

    // JSON processing test
    this.addTest({
      name: 'json-processing',
      description: 'JSON serialization/deserialization performance',
      run: async () => {
        const startTime = performance.now();
        const startMem = process.memoryUsage().heapUsed;

        const data = {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `item${i}`,
            value: Math.random(),
            nested: {
              data: Array.from({ length: 5 }, () => Math.random()),
              metadata: { timestamp: Date.now() }
            }
          })),
          summary: {
            total: 1000,
            average: 0.5,
            timestamp: Date.now()
          }
        };

        const jsonString = JSON.stringify(data);
        const parsed = JSON.parse(jsonString);

        const endTime = performance.now();
        const endMem = process.memoryUsage().heapUsed;

        return {
          name: 'json-processing',
          duration: endTime - startTime,
          memoryUsage: endMem - startMem,
          operationsPerSecond: 1000 / ((endTime - startTime) / 1000),
          metadata: {
            jsonSize: jsonString.length,
            itemCount: parsed.items.length
          }
        };
      },
      threshold: { maxTime: 50, maxMemory: 5 * 1024 * 1024 } // 5MB
    });
  }

  addTest(test: PerformanceTest) {
    this.tests.push(test);
  }

  async runTests(): Promise<TestSuiteResult> {
    console.log('🧪 Running Performance Test Suite...');
    console.log('='.repeat(50));

    const startTime = Date.now();
    const results: PerformanceResult[] = [];
    const regressions: string[] = [];

    for (const test of this.tests) {
      console.log(`\n🔬 Running ${test.name}...`);
      console.log(`   ${test.description}`);

      try {
        const result = await test.run();
        results.push(result);

        // Check thresholds
        const passed = this.checkThresholds(test, result);
        const regression = this.checkRegression(test.name, result);

        if (passed) {
          console.log(`   ✅ PASSED (${result.duration.toFixed(2)}ms)`);
        } else {
          console.log(`   ❌ FAILED (${result.duration.toFixed(2)}ms)`);
        }

        if (regression) {
          console.log(`   📉 REGRESSION detected!`);
          regressions.push(test.name);
        }

        if (result.operationsPerSecond) {
          console.log(`   📊 ${result.operationsPerSecond.toFixed(0)} ops/sec`);
        }

        if (result.memoryUsage) {
          console.log(`   💾 ${(result.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
        }

      } catch (error) {
        console.error(`   💥 ERROR: ${error}`);
        results.push({
          name: test.name,
          duration: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const summary = {
      passed: results.filter(r => !r.error && this.checkThresholds(
        this.tests.find(t => t.name === r.name)!, r
      )).length,
      failed: results.filter(r => r.error || !this.checkThresholds(
        this.tests.find(t => t.name === r.name)!, r
      )).length,
      total: results.length,
      regressions
    };

    const suiteResult: TestSuiteResult = {
      timestamp: endTime,
      duration,
      tests: results,
      summary,
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: '1.1.3' // Would get from Bun.version if available
      }
    };

    // Save results
    this.saveResults(suiteResult);

    // Update baselines if no regressions
    if (regressions.length === 0) {
      this.updateBaselines(results);
    }

    return suiteResult;
  }

  private checkThresholds(test: PerformanceTest, result: PerformanceResult): boolean {
    if (!test.threshold) return true;

    if (test.threshold.maxTime && result.duration > test.threshold.maxTime) {
      return false;
    }

    if (test.threshold.maxMemory && result.memoryUsage && result.memoryUsage > test.threshold.maxMemory) {
      return false;
    }

    if (test.threshold.minOps && result.operationsPerSecond && result.operationsPerSecond < test.threshold.minOps) {
      return false;
    }

    return true;
  }

  private checkRegression(testName: string, result: PerformanceResult): boolean {
    const baseline = this.baselines.get(testName);
    if (!baseline) return false;

    const tolerance = baseline.tolerance / 100;

    if (result.duration > baseline.baseline.maxTime * (1 + tolerance)) {
      return true;
    }

    if (result.memoryUsage && result.memoryUsage > baseline.baseline.avgMemory * (1 + tolerance)) {
      return true;
    }

    if (result.operationsPerSecond && result.operationsPerSecond < baseline.baseline.minOps * (1 - tolerance)) {
      return true;
    }

    return false;
  }

  private updateBaselines(results: PerformanceResult[]) {
    results.forEach(result => {
      if (result.error) return;

      const existing = this.baselines.get(result.name);
      const newBaseline: RegressionBaseline = {
        testName: result.name,
        baseline: {
          avgTime: result.duration,
          maxTime: result.duration * 1.1, // Allow 10% variance
          avgMemory: result.memoryUsage || 0,
          minOps: result.operationsPerSecond || 0
        },
        tolerance: 10 // 10% tolerance
      };

      if (existing) {
        // Update with running average
        const weight = 0.3; // 30% weight for new results
        newBaseline.baseline.avgTime = existing.baseline.avgTime * (1 - weight) + result.duration * weight;
        newBaseline.baseline.maxTime = Math.max(existing.baseline.maxTime, result.duration * 1.1);
        if (result.memoryUsage) {
          newBaseline.baseline.avgMemory = existing.baseline.avgMemory * (1 - weight) + result.memoryUsage * weight;
        }
        if (result.operationsPerSecond) {
          newBaseline.baseline.minOps = Math.min(existing.baseline.minOps, result.operationsPerSecond * 0.9);
        }
      }

      this.baselines.set(result.name, newBaseline);
    });

    this.saveBaselines();
  }

  private saveResults(result: TestSuiteResult) {
    const filename = `results-${result.timestamp}.json`;
    const filepath = join(this.resultsDir, filename);
    writeFileSync(filepath, JSON.stringify(result, null, 2));
  }

  printResults(result: TestSuiteResult) {
    console.log('\n📊 Performance Test Results');
    console.log('='.repeat(50));

    console.log(`\n⏱️  Total Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`📅 Timestamp: ${new Date(result.timestamp).toISOString()}`);

    console.log('\n🏆 Summary:');
    console.log(`   ✅ Passed: ${result.summary.passed}`);
    console.log(`   ❌ Failed: ${result.summary.failed}`);
    console.log(`   📊 Total: ${result.summary.total}`);

    if (result.summary.regressions.length > 0) {
      console.log(`\n📉 Regressions Detected: ${result.summary.regressions.length}`);
      result.summary.regressions.forEach(reg => {
        console.log(`   🔴 ${reg}`);
      });
    }

    console.log('\n🔬 Detailed Results:');
    result.tests.forEach(test => {
      const status = test.error ? '💥 ERROR' :
                    result.summary.regressions.includes(test.name) ? '📉 REGRESSION' :
                    '✅ PASS';

      console.log(`\n${status} ${test.name}`);
      console.log(`   Duration: ${test.duration.toFixed(2)}ms`);

      if (test.memoryUsage) {
        console.log(`   Memory: ${(test.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      }

      if (test.operationsPerSecond) {
        console.log(`   Ops/sec: ${test.operationsPerSecond.toFixed(0)}`);
      }

      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }

      if (test.metadata) {
        console.log(`   Metadata: ${JSON.stringify(test.metadata)}`);
      }
    });

    console.log('\n💻 Environment:');
    console.log(`   Platform: ${result.environment.platform}`);
    console.log(`   Architecture: ${result.environment.arch}`);
    console.log(`   Node Version: ${result.environment.nodeVersion}`);
    console.log(`   Bun Version: ${result.environment.bunVersion}`);

    console.log('\n✅ Test suite complete!');
  }

  async runContinuousMonitoring(intervalMinutes: number = 60) {
    console.log(`🔄 Starting continuous performance monitoring (${intervalMinutes}min intervals)`);

    const runMonitoring = async () => {
      try {
        const results = await this.runTests();
        this.printResults(results);

        if (results.summary.regressions.length > 0) {
          console.log('\n🚨 PERFORMANCE REGRESSION ALERT!');
          console.log('Regressions detected - immediate investigation required');
        }
      } catch (error) {
        console.error('❌ Monitoring error:', error);
      }
    };

    // Run initial test
    await runMonitoring();

    // Schedule continuous monitoring
    setInterval(runMonitoring, intervalMinutes * 60 * 1000);
  }
}

// CLI interface
async function main() {
  const tester = new PerformanceTester();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'run':
        const results = await tester.runTests();
        tester.printResults(results);
        break;

      case 'monitor':
        const interval = parseInt(process.argv[3] || '60');
        await tester.runContinuousMonitoring(interval);
        break;

      case 'analyze':
        // Run analysis with other tools
        const analyzer = new ProfileAnalyzer();
        const recommender = new OptimizationRecommender();

        console.log('🔬 Running comprehensive performance analysis...');

        const profileResults = await analyzer.analyzeAllProfiles();
        analyzer.printAnalysis(profileResults);

        const perfReport = await recommender.analyzeCodebase();
        recommender.printReport(perfReport);

        const testResults = await tester.runTests();
        tester.printResults(testResults);
        break;

      default:
        console.log('🚀 Performance Testing Suite');
        console.log('Usage:');
        console.log('  bun run performance-tester.ts run          # Run test suite');
        console.log('  bun run performance-tester.ts monitor [min] # Continuous monitoring');
        console.log('  bun run performance-tester.ts analyze       # Full analysis');
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { PerformanceTester, type PerformanceTest, type PerformanceResult, type TestSuiteResult };

// Run if called directly
if (import.meta.main) {
  main();
}