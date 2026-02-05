#!/usr/bin/env bun
// tests/secrets-health-export.test.ts - Test the enhanced secrets health monitoring system

import { mkdirSync } from 'fs';
import { 
  checkSecretsHealth, 
  quickHealthCheck, 
  getPlatformRecommendations,
  HealthReport 
} from '../monitoring/secrets-health-export';

// Test results
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function log(message: string) {
  console.log(`[HEALTH-EXPORT-TEST] ${message}`);
}

function addResult(testName: string, passed: boolean, message: string, details?: any) {
  const result: TestResult = { testName, passed, message, details };
  testResults.push(result);
  
  const status = passed ? '✅' : '❌';
  log(`${status} ${testName}: ${message}`);
  
  if (details) {
    log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

// Test 1: Comprehensive health check
async function testComprehensiveHealthCheck() {
  try {
    const healthReport: HealthReport = await checkSecretsHealth();
    
    const hasValidStructure = 
      typeof healthReport.status === 'string' &&
      ['healthy', 'degraded', 'critical'].includes(healthReport.status) &&
      typeof healthReport.metrics === 'object' &&
      Array.isArray(healthReport.alerts) &&
      Array.isArray(healthReport.recommendations) &&
      typeof healthReport.summary === 'object';
    
    const hasValidMetrics = 
      typeof healthReport.metrics.latency === 'number' &&
      typeof healthReport.metrics.storageAvailable === 'boolean' &&
      typeof healthReport.metrics.scopingValid === 'boolean' &&
      typeof healthReport.metrics.encryptionStrength === 'string' &&
      typeof healthReport.metrics.timestamp === 'string';
    
    const hasValidSummary = 
      typeof healthReport.summary.overall === 'number' &&
      typeof healthReport.summary.performance === 'number' &&
      typeof healthReport.summary.security === 'number' &&
      typeof healthReport.summary.reliability === 'number';
    
    const passed = hasValidStructure && hasValidMetrics && hasValidSummary;
    
    addResult(
      'Comprehensive Health Check',
      passed,
      passed ? `Health check completed with status: ${healthReport.status}` : 'Invalid health report structure',
      {
        status: healthReport.status,
        latency: healthReport.metrics.latency,
        storageAvailable: healthReport.metrics.storageAvailable,
        scopingValid: healthReport.metrics.scopingValid,
        encryptionStrength: healthReport.metrics.encryptionStrength,
        overallScore: healthReport.summary.overall,
        alertsCount: healthReport.alerts.length,
        recommendationsCount: healthReport.recommendations.length
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Comprehensive Health Check',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 2: Quick health check
async function testQuickHealthCheck() {
  try {
    const quickHealth = await quickHealthCheck();
    
    const hasValidStructure = 
      typeof quickHealth.healthy === 'boolean' &&
      typeof quickHealth.latency === 'number' &&
      Array.isArray(quickHealth.errors);
    
    addResult(
      'Quick Health Check',
      hasValidStructure,
      hasValidStructure ? `Quick check completed: ${quickHealth.healthy ? 'Healthy' : 'Unhealthy'}` : 'Invalid quick health structure',
      {
        healthy: quickHealth.healthy,
        latency: quickHealth.latency,
        errorsCount: quickHealth.errors.length,
        errors: quickHealth.errors
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Quick Health Check',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 3: Platform recommendations
async function testPlatformRecommendations() {
  try {
    const recommendations = getPlatformRecommendations();
    
    const isValid = Array.isArray(recommendations) && 
                   recommendations.every(rec => typeof rec === 'string');
    
    addResult(
      'Platform Recommendations',
      isValid,
      isValid ? `Generated ${recommendations.length} platform recommendations` : 'Invalid recommendations format',
      {
        recommendationsCount: recommendations.length,
        recommendations: recommendations
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Platform Recommendations',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 4: Performance thresholds
async function testPerformanceThresholds() {
  try {
    const healthReport: HealthReport = await checkSecretsHealth();
    
    const latency = healthReport.metrics.latency;
    const storageAvailable = healthReport.metrics.storageAvailable;
    const scopingValid = healthReport.metrics.scopingValid;
    
    // Check if performance is within acceptable ranges
    const latencyAcceptable = latency === -1 || latency <= 100; // -1 indicates failure, but we check structure
    const storageWorking = storageAvailable;
    const scopingWorking = scopingValid;
    
    const performanceScore = healthReport.summary.performance;
    const securityScore = healthReport.summary.security;
    const reliabilityScore = healthReport.summary.reliability;
    
    const scoresValid = performanceScore >= 0 && performanceScore <= 100 &&
                       securityScore >= 0 && securityScore <= 100 &&
                       reliabilityScore >= 0 && reliabilityScore <= 100;
    
    const passed = latencyAcceptable && storageWorking && scopingWorking && scoresValid;
    
    addResult(
      'Performance Thresholds',
      passed,
      passed ? 'All performance metrics within acceptable ranges' : 'Performance issues detected',
      {
        latency: { actual: latency, threshold: 100, acceptable: latencyAcceptable },
        storage: { available: storageAvailable, working: storageWorking },
        scoping: { valid: scopingValid, working: scopingWorking },
        scores: { performance: performanceScore, security: securityScore, reliability: reliabilityScore, valid: scoresValid }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Performance Thresholds',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 5: Alert generation
async function testAlertGeneration() {
  try {
    const healthReport: HealthReport = await checkSecretsHealth();
    
    const hasAlertsArray = Array.isArray(healthReport.alerts);
    const hasRecommendationsArray = Array.isArray(healthReport.recommendations);
    
    // Check if alerts are properly formatted
    const alertsValid = healthReport.alerts.every(alert => typeof alert === 'string');
    const recommendationsValid = healthReport.recommendations.every(rec => typeof rec === 'string');
    
    const passed = hasAlertsArray && hasRecommendationsArray && alertsValid && recommendationsValid;
    
    addResult(
      'Alert Generation',
      passed,
      passed ? `Generated ${healthReport.alerts.length} alerts and ${healthReport.recommendations.length} recommendations` : 'Invalid alert format',
      {
        alertsCount: healthReport.alerts.length,
        recommendationsCount: healthReport.recommendations.length,
        alerts: healthReport.alerts,
        recommendations: healthReport.recommendations,
        status: healthReport.status
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Alert Generation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 6: Encryption strength detection
async function testEncryptionStrengthDetection() {
  try {
    const healthReport: HealthReport = await checkSecretsHealth();
    
    const encryptionStrength = healthReport.metrics.encryptionStrength;
    const validEncryption = ['AES-256', 'AES-512', 'DPAPI', 'None'].includes(encryptionStrength);
    
    addResult(
      'Encryption Strength Detection',
      validEncryption,
      validEncryption ? `Detected encryption: ${encryptionStrength}` : 'Invalid encryption strength',
      {
        encryptionStrength,
        validEncryption,
        platformCapabilities: healthReport.metrics.platformCapabilities.platform
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Encryption Strength Detection',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Main test runner
async function runTests() {
  log('🔍 Starting Secrets Health Export Tests');
  log(`Platform: ${process.platform}`);
  log(`Bun Version: ${typeof Bun !== 'undefined' ? Bun.version : 'Not available'}`);
  log('');
  
  // Run all tests
  await testComprehensiveHealthCheck();
  await testQuickHealthCheck();
  await testPlatformRecommendations();
  await testPerformanceThresholds();
  await testAlertGeneration();
  await testEncryptionStrengthDetection();
  
  // Summary
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = Math.round((passed / total) * 100);
  
  log('');
  log('📊 Secrets Health Export Test Results:');
  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`);
  log(`Failed: ${total - passed}`);
  log(`Success Rate: ${percentage}%`);
  
  if (passed === total) {
    log('🎉 All secrets health export tests passed!');
  } else {
    log('⚠️ Some tests failed. Check health monitoring implementation.');
    
    // Show failed tests
    const failed = testResults.filter(r => !r.passed);
    log('');
    log('❌ Failed Tests:');
    failed.forEach(test => {
      log(`   - ${test.testName}: ${test.message}`);
    });
  }
  
  // Save test results
  mkdirSync('reports', { recursive: true });
  const reportPath = 'reports/secrets-health-export-test-results.json';
  await Bun.write(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    platform: process.platform,
    bunVersion: typeof Bun !== 'undefined' ? Bun.version : 'N/A',
    summary: {
      total,
      passed,
      failed: total - passed,
      percentage
    },
    results: testResults
  }, null, 2));
  
  log(`📄 Detailed results saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  log(`💥 Test runner failed: ${errorMessage}`);
  console.error(error);
  process.exit(1);
});
