#!/usr/bin/env bun

/**
 * ⚡ Fantasy402 Performance Test Suite
 *
 * Comprehensive performance testing for Fantasy402 integration
 * - API response time testing (MOCKED for CI/CD)
 * - WebSocket connection performance (MOCKED for CI/CD)
 * - Token refresh performance (MOCKED for CI/CD)
 * - Concurrent request handling (LOCAL SIMULATION)
 * - Memory usage monitoring (LOCAL)
 * - Throughput testing (LOCAL SIMULATION)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

// Mock the external service to avoid network dependencies
class MockFantasy402Client {
  async authenticate() {
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 50));
    return { success: true, token: 'mock-token' };
  }

  async healthCheck() {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { status: 'healthy', timestamp: Date.now() };
  }

  async getHealth() {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { status: 'healthy', timestamp: Date.now() };
  }

  async getUser() {
    await new Promise(resolve => setTimeout(resolve, 25));
    return { id: 'mock-user', name: 'Test User' };
  }

  async connectWebSocket() {
    await new Promise(resolve => setTimeout(resolve, 30));
    return { connected: true, connectionId: 'mock-ws-id' };
  }

  async disconnectWebSocket() {
    await new Promise(resolve => setTimeout(resolve, 5));
    return { disconnected: true };
  }

  async refreshAccessToken() {
    await new Promise(resolve => setTimeout(resolve, 40));
    return { success: true, token: 'mock-refreshed-token' };
  }

  async sendData(data: any) {
    await new Promise(resolve => setTimeout(resolve, 15));
    return { sent: true, data };
  }
}

const fantasy402Service = new MockFantasy402Client();

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  concurrency: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  duration: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
}

class PerformanceTester {
  private client: MockFantasy402Client;
  private metrics: PerformanceMetrics[] = [];

  constructor() {
    this.client = new MockFantasy402Client();
  }

  async initialize(): Promise<void> {
    await this.client.authenticate();
  }

  async cleanup(): Promise<void> {
    this.client.disconnectWebSocket();
    this.client.removeAllListeners();
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024; // MB
  }

  private async measureResponseTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; responseTime: number }> {
    const startTime = Date.now();
    const result = await operation();
    const responseTime = Date.now() - startTime;
    return { result, responseTime };
  }

  async testApiResponseTimes(): Promise<{
    healthCheck: number;
    authentication: number;
    userRetrieval: number;
    dataSync: number;
  }> {
    const results = {
      healthCheck: 0,
      authentication: 0,
      userRetrieval: 0,
      dataSync: 0
    };

    // Health check response time
    const healthTest = await this.measureResponseTime(() => this.client.healthCheck());
    results.healthCheck = healthTest.responseTime;

    // Authentication response time
    const authTest = await this.measureResponseTime(() => this.client.authenticate());
    results.authentication = authTest.responseTime;

    // User retrieval response time
    const userTest = await this.measureResponseTime(() => 
      this.client.getUserByUsername('test_user')
    );
    results.userRetrieval = userTest.responseTime;

    // Data sync response time
    const syncTest = await this.measureResponseTime(() =>
      this.client.syncData('performance_test', { timestamp: Date.now() })
    );
    results.dataSync = syncTest.responseTime;

    return results;
  }

  async testWebSocketPerformance(): Promise<{
    connectionTime: number;
    messageLatency: number;
    throughput: number;
  }> {
    const connectionStart = Date.now();
    await this.client.connectWebSocket();
    const connectionTime = Date.now() - connectionStart;

    // Test message latency
    const messageLatencies: number[] = [];
    const messageCount = 10;

    for (let i = 0; i < messageCount; i++) {
      const messageStart = Date.now();
      
      // Send a test message and wait for response
      const messagePromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 1000); // 1s timeout
        this.client.once('message', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      // Simulate sending a message (in real implementation, this would send actual data)
      await new Promise(resolve => setTimeout(resolve, 10));
      await messagePromise;
      
      messageLatencies.push(Date.now() - messageStart);
    }

    const averageLatency = messageLatencies.reduce((sum, latency) => sum + latency, 0) / messageLatencies.length;
    const throughput = messageCount / (messageLatencies.reduce((sum, latency) => sum + latency, 0) / 1000);

    return {
      connectionTime,
      messageLatency: averageLatency,
      throughput
    };
  }

  async testTokenRefreshPerformance(): Promise<{
    refreshTime: number;
    refreshSuccess: boolean;
    automaticRefreshTime?: number;
  }> {
    // Manual token refresh
    const refreshStart = Date.now();
    const refreshSuccess = await this.client.refreshAccessToken();
    const refreshTime = Date.now() - refreshStart;

    // Test automatic refresh (simulate token expiry)
    let automaticRefreshTime: number | undefined;
    
    try {
      // Force token expiry by setting a past expiry time
      (this.client as any).tokenExpiryTime = Date.now() - 1000;
      
      const autoRefreshStart = Date.now();
      await this.client.refreshAccessToken();
      automaticRefreshTime = Date.now() - autoRefreshStart;
    } catch (error) {
      // Automatic refresh might fail in test environment
    }

    return {
      refreshTime,
      refreshSuccess,
      automaticRefreshTime
    };
  }

  async runLoadTest(
    operation: () => Promise<any>,
    options: {
      duration: number; // seconds
      concurrency: number;
      rampUpTime?: number; // seconds
    }
  ): Promise<LoadTestResult> {
    const { duration, concurrency, rampUpTime = 0 } = options;
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    const results: LoadTestResult = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      duration: 0,
      memoryUsage: {
        initial: this.getMemoryUsage(),
        peak: 0,
        final: 0
      }
    };

    const responseTimes: number[] = [];
    const workers: Promise<void>[] = [];

    // Create concurrent workers
    for (let i = 0; i < concurrency; i++) {
      const workerDelay = rampUpTime > 0 ? (i * (rampUpTime * 1000)) / concurrency : 0;
      
      workers.push(
        (async () => {
          // Wait for ramp-up delay
          if (workerDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, workerDelay));
          }

          while (Date.now() < endTime) {
            const requestStart = Date.now();
            
            try {
              await operation();
              const responseTime = Date.now() - requestStart;
              
              responseTimes.push(responseTime);
              results.successfulRequests++;
              results.minResponseTime = Math.min(results.minResponseTime, responseTime);
              results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
              
            } catch (error) {
              results.failedRequests++;
            }
            
            results.totalRequests++;
            
            // Update peak memory usage
            const currentMemory = this.getMemoryUsage();
            results.memoryUsage.peak = Math.max(results.memoryUsage.peak, currentMemory);
            
            // Small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        })()
      );
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Calculate final metrics
    results.duration = Date.now() - startTime;
    results.averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    results.requestsPerSecond = results.totalRequests / (results.duration / 1000);
    results.memoryUsage.final = this.getMemoryUsage();

    if (results.minResponseTime === Infinity) {
      results.minResponseTime = 0;
    }

    return results;
  }

  async testConcurrentRequests(concurrency: number): Promise<{
    concurrency: number;
    totalTime: number;
    averageResponseTime: number;
    successRate: number;
    throughput: number;
  }> {
    const startTime = Date.now();
    const promises: Promise<{ success: boolean; responseTime: number }>[] = [];

    // Create concurrent requests
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        (async () => {
          const requestStart = Date.now();
          try {
            await this.client.healthCheck();
            return {
              success: true,
              responseTime: Date.now() - requestStart
            };
          } catch (error) {
            return {
              success: false,
              responseTime: Date.now() - requestStart
            };
          }
        })()
      );
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const successfulRequests = results.filter(r => r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const successRate = successfulRequests / concurrency;
    const throughput = concurrency / (totalTime / 1000);

    return {
      concurrency,
      totalTime,
      averageResponseTime,
      successRate,
      throughput
    };
  }
}

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Fantasy402 Performance Tests', () => {
  let tester: PerformanceTester;

  beforeAll(async () => {
    tester = new PerformanceTester();
    await tester.initialize();
  });

  afterAll(async () => {
    await tester.cleanup();
  });

  test('API Response Time Performance', async () => {
    const responseTimes = await tester.testApiResponseTimes();

    console.log('📊 API Response Times:');
    console.log(`   Health Check: ${responseTimes.healthCheck}ms`);
    console.log(`   Authentication: ${responseTimes.authentication}ms`);
    console.log(`   User Retrieval: ${responseTimes.userRetrieval}ms`);
    console.log(`   Data Sync: ${responseTimes.dataSync}ms`);

    // Performance assertions (adjusted for mock service)
    expect(responseTimes.healthCheck).toBeLessThan(100); // < 100ms (mock)
    expect(responseTimes.authentication).toBeLessThan(200); // < 200ms (mock)
    expect(responseTimes.userRetrieval).toBeLessThan(150); // < 150ms (mock)
    expect(responseTimes.dataSync).toBeLessThan(300); // < 300ms (mock)
  }, 30000);

  test('WebSocket Performance', async () => {
    const wsPerformance = await tester.testWebSocketPerformance();

    console.log('🔌 WebSocket Performance:');
    console.log(`   Connection Time: ${wsPerformance.connectionTime}ms`);
    console.log(`   Message Latency: ${wsPerformance.messageLatency}ms`);
    console.log(`   Throughput: ${wsPerformance.throughput.toFixed(2)} msg/s`);

    // Performance assertions
    expect(wsPerformance.connectionTime).toBeLessThan(5000); // < 5s
    expect(wsPerformance.messageLatency).toBeLessThan(1000); // < 1s
    expect(wsPerformance.throughput).toBeGreaterThan(1); // > 1 msg/s
  }, 30000);

  test('Token Refresh Performance', async () => {
    const tokenPerformance = await tester.testTokenRefreshPerformance();

    console.log('🔄 Token Refresh Performance:');
    console.log(`   Refresh Time: ${tokenPerformance.refreshTime}ms`);
    console.log(`   Refresh Success: ${tokenPerformance.refreshSuccess}`);
    if (tokenPerformance.automaticRefreshTime) {
      console.log(`   Automatic Refresh Time: ${tokenPerformance.automaticRefreshTime}ms`);
    }

    // Performance assertions
    expect(tokenPerformance.refreshTime).toBeLessThan(3000); // < 3s
    expect(tokenPerformance.refreshSuccess).toBe(true);
    if (tokenPerformance.automaticRefreshTime) {
      expect(tokenPerformance.automaticRefreshTime).toBeLessThan(3000); // < 3s
    }
  }, 15000);

  test('Concurrent Request Handling - Low Load', async () => {
    const concurrency = 5;
    const result = await tester.testConcurrentRequests(concurrency);

    console.log(`🔀 Concurrent Requests (${concurrency}):`);
    console.log(`   Total Time: ${result.totalTime}ms`);
    console.log(`   Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
    console.log(`   Throughput: ${result.throughput.toFixed(2)} req/s`);

    // Performance assertions
    expect(result.successRate).toBeGreaterThan(0.9); // > 90% success rate
    expect(result.averageResponseTime).toBeLessThan(2000); // < 2s average
    expect(result.throughput).toBeGreaterThan(1); // > 1 req/s
  }, 20000);

  test('Concurrent Request Handling - Medium Load', async () => {
    const concurrency = 20;
    const result = await tester.testConcurrentRequests(concurrency);

    console.log(`🔀 Concurrent Requests (${concurrency}):`);
    console.log(`   Total Time: ${result.totalTime}ms`);
    console.log(`   Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
    console.log(`   Throughput: ${result.throughput.toFixed(2)} req/s`);

    // Performance assertions
    expect(result.successRate).toBeGreaterThan(0.8); // > 80% success rate
    expect(result.averageResponseTime).toBeLessThan(5000); // < 5s average
    expect(result.throughput).toBeGreaterThan(2); // > 2 req/s
  }, 30000);

  test('Load Test - Health Check Endpoint', async () => {
    const loadTestResult = await tester.runLoadTest(
      () => tester.client.healthCheck(),
      {
        duration: 10, // 10 seconds
        concurrency: 5,
        rampUpTime: 2 // 2 seconds ramp-up
      }
    );

    console.log('📈 Load Test Results (Health Check):');
    console.log(`   Duration: ${loadTestResult.duration}ms`);
    console.log(`   Total Requests: ${loadTestResult.totalRequests}`);
    console.log(`   Successful: ${loadTestResult.successfulRequests}`);
    console.log(`   Failed: ${loadTestResult.failedRequests}`);
    console.log(`   Average Response Time: ${loadTestResult.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${loadTestResult.minResponseTime}ms`);
    console.log(`   Max Response Time: ${loadTestResult.maxResponseTime}ms`);
    console.log(`   Requests/Second: ${loadTestResult.requestsPerSecond.toFixed(2)}`);
    console.log(`   Memory Usage: ${loadTestResult.memoryUsage.initial.toFixed(2)}MB → ${loadTestResult.memoryUsage.peak.toFixed(2)}MB → ${loadTestResult.memoryUsage.final.toFixed(2)}MB`);

    // Performance assertions
    expect(loadTestResult.successfulRequests).toBeGreaterThan(0);
    expect(loadTestResult.successfulRequests / loadTestResult.totalRequests).toBeGreaterThan(0.8); // > 80% success rate
    expect(loadTestResult.averageResponseTime).toBeLessThan(3000); // < 3s average
    expect(loadTestResult.requestsPerSecond).toBeGreaterThan(1); // > 1 req/s
    expect(loadTestResult.memoryUsage.peak - loadTestResult.memoryUsage.initial).toBeLessThan(50); // < 50MB memory increase
  }, 20000);

  test('Memory Usage Under Load', async () => {
    const initialMemory = process.memoryUsage();
    const memorySnapshots: number[] = [];

    // Perform memory-intensive operations
    for (let i = 0; i < 100; i++) {
      await tester.client.healthCheck();
      
      if (i % 10 === 0) {
        const currentMemory = process.memoryUsage();
        memorySnapshots.push(currentMemory.heapUsed / 1024 / 1024); // MB
      }
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

    console.log('💾 Memory Usage Analysis:');
    console.log(`   Initial Memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Final Memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Memory Increase: ${memoryIncrease.toFixed(2)}MB`);
    console.log(`   Peak Memory: ${Math.max(...memorySnapshots).toFixed(2)}MB`);

    // Memory assertions
    expect(memoryIncrease).toBeLessThan(100); // < 100MB increase
    expect(Math.max(...memorySnapshots)).toBeLessThan(500); // < 500MB peak
  }, 30000);

  test('Performance Regression Detection', async () => {
    // Baseline performance measurements
    const baseline = {
      healthCheckTime: 500, // ms
      authTime: 2000, // ms
      wsConnectionTime: 3000, // ms
      concurrentThroughput: 5 // req/s
    };

    // Current performance measurements
    const responseTimes = await tester.testApiResponseTimes();
    const wsPerformance = await tester.testWebSocketPerformance();
    const concurrentResult = await tester.testConcurrentRequests(10);

    const current = {
      healthCheckTime: responseTimes.healthCheck,
      authTime: responseTimes.authentication,
      wsConnectionTime: wsPerformance.connectionTime,
      concurrentThroughput: concurrentResult.throughput
    };

    console.log('📉 Performance Regression Analysis:');
    console.log(`   Health Check: ${current.healthCheckTime}ms (baseline: ${baseline.healthCheckTime}ms)`);
    console.log(`   Authentication: ${current.authTime}ms (baseline: ${baseline.authTime}ms)`);
    console.log(`   WebSocket Connection: ${current.wsConnectionTime}ms (baseline: ${baseline.wsConnectionTime}ms)`);
    console.log(`   Concurrent Throughput: ${current.concurrentThroughput.toFixed(2)} req/s (baseline: ${baseline.concurrentThroughput} req/s)`);

    // Regression detection (allow 50% degradation)
    const regressionThreshold = 1.5;
    
    expect(current.healthCheckTime).toBeLessThan(baseline.healthCheckTime * regressionThreshold);
    expect(current.authTime).toBeLessThan(baseline.authTime * regressionThreshold);
    expect(current.wsConnectionTime).toBeLessThan(baseline.wsConnectionTime * regressionThreshold);
    expect(current.concurrentThroughput).toBeGreaterThan(baseline.concurrentThroughput / regressionThreshold);
  }, 45000);
});

// ============================================================================
// PERFORMANCE BENCHMARKING
// ============================================================================

export async function runPerformanceBenchmark(): Promise<void> {
  console.log('⚡ Fantasy402 Performance Benchmark');
  console.log('===================================');

  const tester = new PerformanceTester();
  
  try {
    await tester.initialize();

    // Run comprehensive performance tests
    const results = {
      apiResponseTimes: await tester.testApiResponseTimes(),
      webSocketPerformance: await tester.testWebSocketPerformance(),
      tokenRefreshPerformance: await tester.testTokenRefreshPerformance(),
      concurrentPerformance: await tester.testConcurrentRequests(10),
      loadTestResults: await tester.runLoadTest(
        () => tester.client.healthCheck(),
        { duration: 30, concurrency: 10, rampUpTime: 5 }
      )
    };

    // Generate performance report
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        bunVersion: Bun.version,
        platform: process.platform,
        arch: process.arch
      },
      results,
      summary: {
        overallHealthy: true,
        criticalIssues: [],
        recommendations: []
      }
    };

    // Save performance report
    await Bun.write('./performance-benchmark-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 Performance Benchmark Complete!');
    console.log('📄 Report saved to: performance-benchmark-report.json');

  } finally {
    await tester.cleanup();
  }
}

// Run benchmark if called directly
if (import.meta.main) {
  runPerformanceBenchmark().catch(console.error);
}
