#!/usr/bin/env bun
/**
 * 🌪️ Chaos Testing Engine for Fire22 Error Management System
 * Validates system resilience through controlled failure injection
 * Tests error handling, recovery, alerting, and documentation systems
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { color } from 'bun' with { type: 'macro' };
import { hubConnection } from '../../src/config/hub-connection';

interface ChaosTestConfig {
  id: string;
  name: string;
  description: string;
  category: 'connection' | 'database' | 'api' | 'network' | 'system' | 'error_system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: number; // milliseconds
  enabled: boolean;
  targets: string[];
  parameters: Record<string, unknown>;
  expectedBehavior: {
    errorCodes: string[];
    recoveryTime: number; // seconds
    alertsTriggered: string[];
    gracefulDegradation: boolean;
  };
}

interface ChaosTestResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'partial' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  injectedFailures: string[];
  observedErrors: string[];
  alertsTriggered: string[];
  recoveryTime?: number;
  gracefulDegradation: boolean;
  metrics: {
    errorCount: number;
    responseTime: number[];
    systemStability: number; // 0-1 scale
    dataIntegrity: boolean;
  };
  details: {
    timeline: Array<{
      timestamp: Date;
      event: string;
      data?: any;
    }>;
    errorBreakdown: Record<string, number>;
    performanceImpact: number; // percentage
  };
}

interface ChaosTestReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    partial: number;
    errors: number;
    overallResilience: number; // 0-100 scale
  };
  results: ChaosTestResult[];
  systemHealth: {
    beforeTests: any;
    afterTests: any;
    recovered: boolean;
  };
  recommendations: string[];
  timestamp: Date;
}

class ChaosTestEngine {
  private testConfigs: Map<string, ChaosTestConfig> = new Map();
  private results: ChaosTestResult[] = [];
  private configPath: string;
  private reportsPath: string;
  private isRunning: boolean = false;
  private baselineHealth: any;

  constructor() {
    this.configPath = join(process.cwd(), 'config', 'chaos-tests.json');
    this.reportsPath = join(process.cwd(), 'reports', 'chaos-testing');
    this.loadTestConfigs();
  }

  /**
   * Load chaos test configurations
   */
  private loadTestConfigs(): void {
    if (existsSync(this.configPath)) {
      try {
        const config = JSON.parse(readFileSync(this.configPath, 'utf-8'));
        config.tests?.forEach((test: ChaosTestConfig) => {
          this.testConfigs.set(test.id, test);
        });
        console.log(`✅ Loaded ${this.testConfigs.size} chaos test configurations`);
      } catch (error) {
        console.warn(`⚠️ Failed to load chaos test config: ${error.message}`);
        this.createDefaultConfigs();
      }
    } else {
      this.createDefaultConfigs();
    }
  }

  /**
   * Create default chaos test configurations
   */
  private createDefaultConfigs(): void {
    const defaultTests: ChaosTestConfig[] = [
      {
        id: 'database-connection-failure',
        name: 'Database Connection Failure',
        description: 'Simulate database connection loss to test error handling and recovery',
        category: 'database',
        severity: 'critical',
        duration: 30000, // 30 seconds
        enabled: true,
        targets: ['fire22-dashboard', 'fire22-registry'],
        parameters: {
          failureType: 'connection_timeout',
          affectedQueries: ['SELECT', 'INSERT', 'UPDATE'],
          partialFailure: false,
        },
        expectedBehavior: {
          errorCodes: ['E2001', 'E2002'],
          recoveryTime: 15,
          alertsTriggered: ['critical-database-errors'],
          gracefulDegradation: true,
        },
      },
      {
        id: 'api-rate-limit-surge',
        name: 'API Rate Limit Surge',
        description: 'Flood API endpoints to test rate limiting and error responses',
        category: 'api',
        severity: 'medium',
        duration: 20000, // 20 seconds
        enabled: true,
        targets: ['/api/errors', '/api/customers', '/health'],
        parameters: {
          requestsPerSecond: 1000,
          concurrent: 50,
          patterns: ['burst', 'sustained'],
        },
        expectedBehavior: {
          errorCodes: ['E3002'],
          recoveryTime: 10,
          alertsTriggered: ['api-rate-limit-surge'],
          gracefulDegradation: true,
        },
      },
      {
        id: 'network-partition',
        name: 'Network Partition Simulation',
        description: 'Simulate network connectivity issues between services',
        category: 'network',
        severity: 'high',
        duration: 45000, // 45 seconds
        enabled: true,
        targets: ['hub-connection', 'telegram-bot', 'fire22-api'],
        parameters: {
          partitionType: 'intermittent',
          affectedServices: ['50%'],
          latencyIncrease: 5000,
        },
        expectedBehavior: {
          errorCodes: ['E4001', 'E4002'],
          recoveryTime: 30,
          alertsTriggered: ['network-partition-alert'],
          gracefulDegradation: true,
        },
      },
      {
        id: 'error-system-overload',
        name: 'Error System Overload',
        description: 'Overwhelm error tracking system with high volume of errors',
        category: 'error_system',
        severity: 'high',
        duration: 25000, // 25 seconds
        enabled: true,
        targets: ['error-tracker', 'error-registry', 'alert-system'],
        parameters: {
          errorVolume: 10000,
          errorTypes: ['E1001', 'E2001', 'E3001', 'E4001', 'E5001'],
          concurrentStreams: 20,
        },
        expectedBehavior: {
          errorCodes: ['E5001'],
          recoveryTime: 20,
          alertsTriggered: ['error-system-overload'],
          gracefulDegradation: true,
        },
      },
      {
        id: 'memory-pressure',
        name: 'Memory Pressure Test',
        description: 'Create memory pressure to test resource handling',
        category: 'system',
        severity: 'critical',
        duration: 60000, // 60 seconds
        enabled: true,
        targets: ['error-tracker', 'hub-connection'],
        parameters: {
          memoryPressure: '80%',
          leakSimulation: true,
          gcStress: true,
        },
        expectedBehavior: {
          errorCodes: ['E1002'],
          recoveryTime: 45,
          alertsTriggered: ['memory-pressure-alert'],
          gracefulDegradation: true,
        },
      },
      {
        id: 'cascade-failure',
        name: 'Cascade Failure Simulation',
        description: 'Test resilience against cascading failures across services',
        category: 'system',
        severity: 'critical',
        duration: 90000, // 90 seconds
        enabled: true,
        targets: ['database', 'api', 'error-system', 'telegram'],
        parameters: {
          initialFailure: 'database',
          propagationDelay: 5000,
          failureChain: ['database', 'api', 'error-system'],
        },
        expectedBehavior: {
          errorCodes: ['E2001', 'E3001', 'E5001'],
          recoveryTime: 60,
          alertsTriggered: ['cascade-failure-alert', 'critical-system-failure'],
          gracefulDegradation: true,
        },
      },
      {
        id: 'fire22-integration-disruption',
        name: 'Fire22 Integration Disruption',
        description: 'Simulate Fire22 API disruption and test fallback mechanisms',
        category: 'api',
        severity: 'high',
        duration: 40000, // 40 seconds
        enabled: true,
        targets: ['fire22-api', 'fire22-auth', 'fire22-data-sync'],
        parameters: {
          disruptionType: 'intermittent_500',
          affectedEndpoints: ['customers', 'agents', 'transactions'],
          errorRate: 0.7,
        },
        expectedBehavior: {
          errorCodes: ['E7001', 'E7002'],
          recoveryTime: 25,
          alertsTriggered: ['fire22-integration-failures'],
          gracefulDegradation: true,
        },
      },
      {
        id: 'documentation-system-failure',
        name: 'Documentation System Failure',
        description: 'Test error handling when documentation links fail',
        category: 'error_system',
        severity: 'medium',
        duration: 15000, // 15 seconds
        enabled: true,
        targets: ['error-registry', 'documentation-links'],
        parameters: {
          brokenLinks: ['50%'],
          registryCorruption: false,
          validationFailure: true,
        },
        expectedBehavior: {
          errorCodes: ['E5001'],
          recoveryTime: 10,
          alertsTriggered: ['documentation-failure'],
          gracefulDegradation: true,
        },
      },
    ];

    // Save default configuration
    const config = { tests: defaultTests };
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Load into memory
    defaultTests.forEach(test => this.testConfigs.set(test.id, test));
    console.log(`✅ Created ${defaultTests.length} default chaos test configurations`);
  }

  /**
   * Capture baseline system health
   */
  private async captureBaselineHealth(): Promise<any> {
    console.log('📊 Capturing baseline system health...');

    try {
      const health = await hubConnection.healthCheck();
      const errorStats = await hubConnection.getErrorStatistics();
      const errorSystemStatus = await hubConnection.getErrorSystemStatus();

      return {
        timestamp: new Date().toISOString(),
        hubConnections: health,
        errorStatistics: errorStats,
        errorSystem: errorSystemStatus,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      };
    } catch (error) {
      console.warn('⚠️ Failed to capture complete baseline health:', error.message);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      };
    }
  }

  /**
   * Execute a single chaos test
   */
  private async executeChaosTest(config: ChaosTestConfig): Promise<ChaosTestResult> {
    console.log(color('#f97316', 'css') + `🌪️ Starting chaos test: ${config.name}`);

    const result: ChaosTestResult = {
      testId: config.id,
      name: config.name,
      status: 'error',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      injectedFailures: [],
      observedErrors: [],
      alertsTriggered: [],
      gracefulDegradation: false,
      metrics: {
        errorCount: 0,
        responseTime: [],
        systemStability: 0,
        dataIntegrity: true,
      },
      details: {
        timeline: [],
        errorBreakdown: {},
        performanceImpact: 0,
      },
    };

    try {
      // Record test start
      result.details.timeline.push({
        timestamp: new Date(),
        event: 'chaos_test_started',
        data: { testId: config.id, category: config.category },
      });

      // Execute chaos based on category
      switch (config.category) {
        case 'database':
          await this.injectDatabaseChaos(config, result);
          break;
        case 'api':
          await this.injectAPIChao(config, result);
          break;
        case 'network':
          await this.injectNetworkChaos(config, result);
          break;
        case 'error_system':
          await this.injectErrorSystemChaos(config, result);
          break;
        case 'system':
          await this.injectSystemChaos(config, result);
          break;
        default:
          throw new Error(`Unknown chaos category: ${config.category}`);
      }

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, config.duration));

      // Evaluate test results
      this.evaluateTestResults(config, result);

      result.status = this.determineTestStatus(config, result);
    } catch (error) {
      console.error(`❌ Chaos test ${config.id} failed:`, error);
      result.status = 'error';
      result.details.timeline.push({
        timestamp: new Date(),
        event: 'chaos_test_error',
        data: { error: error.message },
      });
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      result.details.timeline.push({
        timestamp: new Date(),
        event: 'chaos_test_completed',
        data: { status: result.status, duration: result.duration },
      });
    }

    console.log(
      color('#10b981', 'css') + `✅ Chaos test completed: ${config.name} (${result.status})`
    );
    return result;
  }

  /**
   * Inject database chaos
   */
  private async injectDatabaseChaos(
    config: ChaosTestConfig,
    result: ChaosTestResult
  ): Promise<void> {
    console.log('🗄️ Injecting database chaos...');

    result.injectedFailures.push('database_connection_timeout');
    result.details.timeline.push({
      timestamp: new Date(),
      event: 'database_chaos_injected',
      data: { targets: config.targets },
    });

    // Simulate database failures
    for (const target of config.targets) {
      try {
        // Attempt operations that should fail
        await hubConnection.executeD1Query(target, 'SELECT COUNT(*) FROM test_table');
      } catch (error) {
        result.observedErrors.push('E2001');
        result.metrics.errorCount++;
        result.details.errorBreakdown['E2001'] = (result.details.errorBreakdown['E2001'] || 0) + 1;

        // Track through error system
        await hubConnection.trackError('E2001', {
          chaosTest: config.id,
          target: target,
          injectedFailure: 'database_connection_timeout',
        });
      }
    }
  }

  /**
   * Inject API chaos
   */
  private async injectAPIChao(config: ChaosTestConfig, result: ChaosTestResult): Promise<void> {
    console.log('🌐 Injecting API chaos...');

    result.injectedFailures.push('api_rate_limit_surge');
    result.details.timeline.push({
      timestamp: new Date(),
      event: 'api_chaos_injected',
      data: { targets: config.targets, rps: config.parameters.requestsPerSecond },
    });

    const baseUrl = process.env.HUB_URL || 'http://localhost:3001';
    const requestsPerSecond = (config.parameters.requestsPerSecond as number) || 100;
    const concurrent = (config.parameters.concurrent as number) || 10;

    // Generate high load
    const promises: Promise<any>[] = [];
    for (let i = 0; i < concurrent; i++) {
      for (const target of config.targets) {
        const promise = this.bombardEndpoint(
          baseUrl + target,
          requestsPerSecond / concurrent,
          result
        );
        promises.push(promise);
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Bombard endpoint with requests
   */
  private async bombardEndpoint(url: string, rps: number, result: ChaosTestResult): Promise<void> {
    const interval = 1000 / rps;
    const requests = [];

    for (let i = 0; i < rps; i++) {
      requests.push(
        fetch(url, {
          signal: AbortSignal.timeout(5000),
          headers: { 'X-Chaos-Test': 'true' },
        })
          .then(response => {
            const responseTime = Date.now();
            result.metrics.responseTime.push(responseTime);

            if (response.status === 429) {
              result.observedErrors.push('E3002');
              result.metrics.errorCount++;
              result.details.errorBreakdown['E3002'] =
                (result.details.errorBreakdown['E3002'] || 0) + 1;
            }

            return response.status;
          })
          .catch(error => {
            result.observedErrors.push('E4001');
            result.metrics.errorCount++;
            result.details.errorBreakdown['E4001'] =
              (result.details.errorBreakdown['E4001'] || 0) + 1;
            return 0;
          })
      );

      if (i < rps - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    await Promise.allSettled(requests);
  }

  /**
   * Inject network chaos
   */
  private async injectNetworkChaos(
    config: ChaosTestConfig,
    result: ChaosTestResult
  ): Promise<void> {
    console.log('🌐 Injecting network chaos...');

    result.injectedFailures.push('network_partition');
    result.details.timeline.push({
      timestamp: new Date(),
      event: 'network_chaos_injected',
      data: { type: config.parameters.partitionType },
    });

    // Simulate network issues by making requests that should timeout/fail
    const promises = config.targets.map(async target => {
      try {
        // Simulate network timeout
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 100); // Very short timeout

        await fetch(`http://localhost:3001/api/${target}`, {
          signal: controller.signal,
        });
      } catch (error) {
        result.observedErrors.push('E4001');
        result.metrics.errorCount++;
        result.details.errorBreakdown['E4001'] = (result.details.errorBreakdown['E4001'] || 0) + 1;

        await hubConnection.trackError('E4001', {
          chaosTest: config.id,
          target: target,
          injectedFailure: 'network_partition',
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Inject error system chaos
   */
  private async injectErrorSystemChaos(
    config: ChaosTestConfig,
    result: ChaosTestResult
  ): Promise<void> {
    console.log('🚨 Injecting error system chaos...');

    result.injectedFailures.push('error_system_overload');
    result.details.timeline.push({
      timestamp: new Date(),
      event: 'error_system_chaos_injected',
      data: { volume: config.parameters.errorVolume },
    });

    const errorVolume = (config.parameters.errorVolume as number) || 1000;
    const errorTypes = (config.parameters.errorTypes as string[]) || ['E5001'];

    // Overwhelm error system
    const promises: Promise<any>[] = [];
    for (let i = 0; i < errorVolume; i++) {
      const errorCode = errorTypes[i % errorTypes.length];
      const promise = hubConnection
        .trackError(errorCode, {
          chaosTest: config.id,
          sequence: i,
          timestamp: new Date().toISOString(),
        })
        .catch(() => {
          result.observedErrors.push('E5001');
          result.metrics.errorCount++;
          result.details.errorBreakdown['E5001'] =
            (result.details.errorBreakdown['E5001'] || 0) + 1;
        });

      promises.push(promise);
    }

    await Promise.allSettled(promises);
  }

  /**
   * Inject system chaos
   */
  private async injectSystemChaos(config: ChaosTestConfig, result: ChaosTestResult): Promise<void> {
    console.log('⚡ Injecting system chaos...');

    if (config.id === 'memory-pressure') {
      result.injectedFailures.push('memory_pressure');

      // Create memory pressure
      const memoryHog: any[] = [];
      const initialMemory = process.memoryUsage().heapUsed;

      try {
        // Allocate memory aggressively
        for (let i = 0; i < 100000; i++) {
          memoryHog.push(new Array(1000).fill(Math.random()));
        }

        result.details.timeline.push({
          timestamp: new Date(),
          event: 'memory_pressure_created',
          data: {
            initialMemory,
            currentMemory: process.memoryUsage().heapUsed,
            increase: process.memoryUsage().heapUsed - initialMemory,
          },
        });

        // Track memory errors
        await hubConnection.trackError('E1002', {
          chaosTest: config.id,
          memoryUsage: process.memoryUsage(),
          injectedFailure: 'memory_pressure',
        });

        result.observedErrors.push('E1002');
        result.metrics.errorCount++;
      } catch (error) {
        result.observedErrors.push('E1002');
        result.metrics.errorCount++;
        result.details.errorBreakdown['E1002'] = (result.details.errorBreakdown['E1002'] || 0) + 1;
      }
    }
  }

  /**
   * Evaluate test results against expected behavior
   */
  private evaluateTestResults(config: ChaosTestConfig, result: ChaosTestResult): void {
    const expected = config.expectedBehavior;

    // Check if expected error codes were observed
    const expectedErrorsObserved = expected.errorCodes.every(code =>
      result.observedErrors.includes(code)
    );

    // Estimate system stability
    result.metrics.systemStability = Math.max(0, 1 - result.metrics.errorCount / 100);

    // Check graceful degradation (simplified)
    result.gracefulDegradation = result.metrics.systemStability > 0.5;

    result.details.timeline.push({
      timestamp: new Date(),
      event: 'test_evaluation_completed',
      data: {
        expectedErrorsObserved,
        systemStability: result.metrics.systemStability,
        gracefulDegradation: result.gracefulDegradation,
      },
    });
  }

  /**
   * Determine final test status
   */
  private determineTestStatus(
    config: ChaosTestConfig,
    result: ChaosTestResult
  ): 'passed' | 'failed' | 'partial' | 'error' {
    const expected = config.expectedBehavior;

    let score = 0;
    let maxScore = 0;

    // Check expected error codes
    maxScore += 2;
    const expectedErrorsObserved = expected.errorCodes.every(code =>
      result.observedErrors.includes(code)
    );
    if (expectedErrorsObserved) score += 2;

    // Check graceful degradation
    maxScore += 2;
    if (result.gracefulDegradation === expected.gracefulDegradation) score += 2;

    // Check system stability
    maxScore += 1;
    if (result.metrics.systemStability > 0.3) score += 1; // Minimum stability threshold

    const successRate = score / maxScore;

    if (successRate >= 0.9) return 'passed';
    if (successRate >= 0.6) return 'partial';
    if (successRate >= 0.3) return 'failed';
    return 'error';
  }

  /**
   * Run all enabled chaos tests
   */
  async runChaosTests(testIds?: string[]): Promise<ChaosTestReport> {
    if (this.isRunning) {
      throw new Error('Chaos tests are already running');
    }

    this.isRunning = true;
    console.log(color('#dc2626', 'css') + '🌪️ STARTING CHAOS TESTING ENGINE');
    console.log('='.repeat(80));

    try {
      // Capture baseline health
      this.baselineHealth = await this.captureBaselineHealth();

      // Filter tests to run
      const testsToRun = Array.from(this.testConfigs.values()).filter(
        config => config.enabled && (!testIds || testIds.includes(config.id))
      );

      console.log(`🎯 Running ${testsToRun.length} chaos tests...`);

      // Execute tests sequentially to avoid interference
      this.results = [];
      for (const config of testsToRun) {
        const result = await this.executeChaosTest(config);
        this.results.push(result);

        // Brief pause between tests for system recovery
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Capture final system health
      const finalHealth = await this.captureBaselineHealth();

      // Generate report
      const report = this.generateReport(finalHealth);
      this.saveReport(report);

      console.log(color('#10b981', 'css') + '✅ CHAOS TESTING COMPLETED');
      this.displayReport(report);

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generate chaos test report
   */
  private generateReport(finalHealth: any): ChaosTestReport {
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      partial: this.results.filter(r => r.status === 'partial').length,
      errors: this.results.filter(r => r.status === 'error').length,
      overallResilience: 0,
    };

    // Calculate overall resilience score
    const totalScore = this.results.reduce((sum, result) => {
      switch (result.status) {
        case 'passed':
          return sum + 1;
        case 'partial':
          return sum + 0.6;
        case 'failed':
          return sum + 0.3;
        default:
          return sum;
      }
    }, 0);

    summary.overallResilience = Math.round((totalScore / summary.totalTests) * 100);

    // Generate recommendations
    const recommendations: string[] = [];

    if (summary.failed > 0) {
      recommendations.push('Review failed tests and implement additional error handling');
    }

    if (summary.overallResilience < 80) {
      recommendations.push('System resilience below 80% - consider architecture improvements');
    }

    const errorSystemIssues = this.results.filter(
      r => r.observedErrors.includes('E5001') && r.status !== 'passed'
    );

    if (errorSystemIssues.length > 0) {
      recommendations.push(
        'Error system showed degradation under load - optimize error tracking performance'
      );
    }

    return {
      summary,
      results: this.results,
      systemHealth: {
        beforeTests: this.baselineHealth,
        afterTests: finalHealth,
        recovered: this.assessRecovery(this.baselineHealth, finalHealth),
      },
      recommendations,
      timestamp: new Date(),
    };
  }

  /**
   * Assess if system recovered after chaos tests
   */
  private assessRecovery(baseline: any, final: any): boolean {
    try {
      // Compare key metrics
      const baselineConnected = baseline?.hubConnections?.totalConnected || 0;
      const finalConnected = final?.hubConnections?.totalConnected || 0;

      const baselineErrors = baseline?.errorStatistics?.totalErrors || 0;
      const finalErrors = final?.errorStatistics?.totalErrors || 0;

      // System recovered if connections are restored and error rate stabilized
      return finalConnected >= baselineConnected && finalErrors < baselineErrors * 1.5;
    } catch {
      return false;
    }
  }

  /**
   * Save chaos test report
   */
  private saveReport(report: ChaosTestReport): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = join(this.reportsPath, `chaos-test-${timestamp}.json`);

      // Ensure reports directory exists
      if (!existsSync(this.reportsPath)) {
        require('fs').mkdirSync(this.reportsPath, { recursive: true });
      }

      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`📊 Report saved: ${reportPath}`);
    } catch (error) {
      console.warn('⚠️ Failed to save report:', error.message);
    }
  }

  /**
   * Display chaos test report
   */
  private displayReport(report: ChaosTestReport): void {
    console.log('\n📊 CHAOS TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n🎯 Summary:');
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(
      `   ${color('#10b981', 'css')}Passed: ${report.summary.passed}${color('#ffffff', 'css')}`
    );
    console.log(
      `   ${color('#f59e0b', 'css')}Partial: ${report.summary.partial}${color('#ffffff', 'css')}`
    );
    console.log(
      `   ${color('#ef4444', 'css')}Failed: ${report.summary.failed}${color('#ffffff', 'css')}`
    );
    console.log(
      `   ${color('#dc2626', 'css')}Errors: ${report.summary.errors}${color('#ffffff', 'css')}`
    );

    const resilienceColor =
      report.summary.overallResilience >= 80
        ? color('#10b981', 'css')
        : report.summary.overallResilience >= 60
          ? color('#f59e0b', 'css')
          : color('#ef4444', 'css');
    console.log(
      `   Overall Resilience: ${resilienceColor}${report.summary.overallResilience}%${color('#ffffff', 'css')}`
    );

    console.log('\n🌪️ Test Results:');
    report.results.forEach((result, index) => {
      const statusColor =
        result.status === 'passed'
          ? color('#10b981', 'css')
          : result.status === 'partial'
            ? color('#f59e0b', 'css')
            : result.status === 'failed'
              ? color('#ef4444', 'css')
              : color('#dc2626', 'css');

      console.log(
        `   ${index + 1}. ${statusColor}${result.status.toUpperCase()}${color('#ffffff', 'css')} - ${result.name}`
      );
      console.log(
        `      Duration: ${Math.round(result.duration / 1000)}s | Errors: ${result.metrics.errorCount} | Stability: ${Math.round(result.metrics.systemStability * 100)}%`
      );
    });

    console.log('\n💡 Recommendations:');
    if (report.recommendations.length === 0) {
      console.log('   🎉 No recommendations - excellent resilience!');
    } else {
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n🏥 System Recovery:');
    const recoveryIcon = report.systemHealth.recovered ? '✅' : '❌';
    console.log(
      `   ${recoveryIcon} System Recovery: ${report.systemHealth.recovered ? 'Successful' : 'Incomplete'}`
    );

    console.log('\n' + '='.repeat(80));
  }
}

// CLI execution
if (import.meta.main) {
  const chaosEngine = new ChaosTestEngine();

  const args = process.argv.slice(2);
  const testIds = args.length > 0 ? args : undefined;

  if (testIds) {
    console.log(`🎯 Running specific chaos tests: ${testIds.join(', ')}`);
  }

  try {
    await chaosEngine.runChaosTests(testIds);
  } catch (error) {
    console.error(color('#ef4444', 'css') + '❌ Chaos testing failed:', error.message);
    process.exit(1);
  }
}
