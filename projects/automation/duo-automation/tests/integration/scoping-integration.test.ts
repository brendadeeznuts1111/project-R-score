#!/usr/bin/env bun
// tests/scoping-integration.test.ts - Complete scoping system integration tests

import { mkdirSync } from 'fs';
import { ScopeDetector, PlatformScopeAdapter } from '../utils/scope-detector';
import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';
import { UnifiedDashboardLauncher } from '../utils/unified-dashboard-launcher';
import { ScopeVisualizer } from '../utils/scope-visualizer';

// Test results
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function log(message: string) {
  console.log(`[SCOPING-INTEGRATION] ${message}`);
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

// Test 1: UnifiedDashboardLauncher argument parsing
async function testDashboardLauncherArgs() {
  try {
    const args1 = UnifiedDashboardLauncher.parseArgs(['--scope', 'ENTERPRISE', '--team', 'production']);
    const args2 = UnifiedDashboardLauncher.parseArgs(['--port', '8080', '--no-propagate']);
    const args3 = UnifiedDashboardLauncher.parseArgs(['--service', 'api-service']);
    
    const args1Valid = args1.scope === 'ENTERPRISE' && args1.team === 'production';
    const args2Valid = args2.port === 8080 && args2.propagateToChildren === false;
    const args3Valid = args3.service === 'api-service';
    
    const passed = args1Valid && args2Valid && args3Valid;
    
    addResult(
      'Dashboard Launcher Args Parsing',
      passed,
      passed ? 'All argument parsing working correctly' : 'Argument parsing failed',
      {
        args1: { scope: args1.scope, team: args1.team },
        args2: { port: args2.port, propagateToChildren: args2.propagateToChildren },
        args3: { service: args3.service }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Dashboard Launcher Args Parsing',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 2: Dashboard configuration generation
async function testDashboardConfigGeneration() {
  try {
    const config1 = UnifiedDashboardLauncher.getDashboardConfig({ scope: 'ENTERPRISE', team: 'production' });
    const config2 = UnifiedDashboardLauncher.getDashboardConfig({ port: 8080 });
    const autoConfig = UnifiedDashboardLauncher.getDashboardConfig();
    
    const config1Valid = config1.scope === 'ENTERPRISE' && config1.team === 'production';
    const config2Valid = config2.port === 8080;
    const autoValid = autoConfig.scope && autoConfig.platformScope && autoConfig.domain;
    
    const passed = config1Valid && config2Valid && autoValid;
    
    addResult(
      'Dashboard Config Generation',
      passed,
      passed ? 'Configuration generation working correctly' : 'Configuration generation failed',
      {
        config1: { scope: config1.scope, team: config1.team },
        config2: { port: config2.port },
        autoConfig: { scope: autoConfig.scope, platformScope: autoConfig.platformScope }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Dashboard Config Generation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 3: Scope validation
async function testScopeValidation() {
  try {
    const validConfig = {
      scope: 'ENTERPRISE',
      platformScope: 'USER',
      domain: 'apple.factory-wager.com',
      port: 3000,
      env: {}
    };
    
    const invalidConfig1 = {
      scope: 'INVALID_SCOPE',
      platformScope: 'USER',
      domain: 'apple.factory-wager.com',
      port: 3000,
      env: {}
    };
    
    const invalidConfig2 = {
      scope: 'ENTERPRISE',
      platformScope: 'USER',
      domain: 'apple.factory-wager.com',
      port: 99999, // Invalid port
      env: {}
    };
    
    const validResult = UnifiedDashboardLauncher.validateScopeConfig(validConfig);
    const invalidResult1 = UnifiedDashboardLauncher.validateScopeConfig(invalidConfig1);
    const invalidResult2 = UnifiedDashboardLauncher.validateScopeConfig(invalidConfig2);
    
    const validPassed = validResult.valid && (validResult.errors.length === 0);
    const invalid1Passed = !invalidResult1.valid && (invalidResult1.errors.length > 0);
    const invalid2Passed = !invalidResult2.valid && (invalidResult2.errors.length > 0);
    
    const passed = validPassed && invalid1Passed && invalid2Passed;
    
    addResult(
      'Scope Validation',
      passed,
      passed ? 'Scope validation working correctly' : 'Scope validation failed',
      {
        valid: { valid: validResult.valid, errorsCount: validResult.errors.length },
        invalid1: { valid: invalidResult1.valid, errorsCount: invalidResult1.errors.length },
        invalid2: { valid: invalidResult2.valid, errorsCount: invalidResult2.errors.length }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Scope Validation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 4: Scope propagation
async function testScopePropagation() {
  try {
    const originalScope = process.env.DASHBOARD_SCOPE;
    const originalPlatformScope = process.env.DASHBOARD_PLATFORM_SCOPE;
    
    const config = {
      scope: 'DEVELOPMENT',
      platformScope: 'USER',
      domain: 'dev.apple.factory-wager.com',
      port: 3000,
      env: {},
      team: 'test-team'
    };
    
    UnifiedDashboardLauncher.propagateScope(config);
    
    const propagatedScope = process.env.DASHBOARD_SCOPE;
    const propagatedPlatformScope = process.env.DASHBOARD_PLATFORM_SCOPE;
    const propagatedTeam = process.env.DASHBOARD_TEAM;
    
    const scopeValid = propagatedScope === 'DEVELOPMENT';
    const platformValid = propagatedPlatformScope === 'USER';
    const teamValid = propagatedTeam === 'test-team';
    
    // Restore original values
    if (originalScope) {
      process.env.DASHBOARD_SCOPE = originalScope;
    } else {
      delete process.env.DASHBOARD_SCOPE;
    }
    if (originalPlatformScope) {
      process.env.DASHBOARD_PLATFORM_SCOPE = originalPlatformScope;
    } else {
      delete process.env.DASHBOARD_PLATFORM_SCOPE;
    }
    
    const passed = scopeValid && platformValid && teamValid;
    
    addResult(
      'Scope Propagation',
      passed,
      passed ? 'Scope propagation working correctly' : 'Scope propagation failed',
      {
        propagated: { scope: propagatedScope, platformScope: propagatedPlatformScope, team: propagatedTeam },
        expected: { scope: 'DEVELOPMENT', platformScope: 'USER', team: 'test-team' }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Scope Propagation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 5: Child process configuration
async function testChildProcessConfig() {
  try {
    const config = {
      scope: 'ENTERPRISE',
      platformScope: 'USER',
      domain: 'apple.factory-wager.com',
      port: 3000,
      env: {},
      team: 'production'
    };
    
    const childConfig = UnifiedDashboardLauncher.createChildProcessConfig(
      'bun',
      ['run', 'dashboard.ts'],
      config
    );
    
    const hasCorrectCommand = childConfig.command === 'bun';
    const hasCorrectArgs = childConfig.args.length === 2 && childConfig.args[0] === 'run';
    const hasScopeEnv = childConfig.env.DASHBOARD_SCOPE === 'ENTERPRISE';
    const hasPlatformEnv = childConfig.env.DASHBOARD_PLATFORM_SCOPE === 'USER';
    const hasTeamEnv = childConfig.env.DASHBOARD_TEAM === 'production';
    
    const passed = hasCorrectCommand && hasCorrectArgs && hasScopeEnv && hasPlatformEnv && hasTeamEnv;
    
    addResult(
      'Child Process Configuration',
      passed,
      passed ? 'Child process configuration working correctly' : 'Child process configuration failed',
      {
        command: childConfig.command,
        args: childConfig.args,
        env: {
          DASHBOARD_SCOPE: childConfig.env.DASHBOARD_SCOPE,
          DASHBOARD_PLATFORM_SCOPE: childConfig.env.DASHBOARD_PLATFORM_SCOPE,
          DASHBOARD_TEAM: childConfig.env.DASHBOARD_TEAM
        }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Child Process Configuration',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 6: Scope visualizer indicator generation
async function testScopeVisualizerIndicator() {
  try {
    const indicator1 = ScopeVisualizer.generateScopeIndicator();
    const indicator2 = ScopeVisualizer.generateScopeIndicator('production');
    
    const indicator1Valid = indicator1.scope && indicator1.platformScope && indicator1.domain;
    const indicator2Valid = indicator2.team === 'production' && indicator2.scope;
    
    const hasValidStructure = indicator1Valid && indicator2Valid;
    const hasStatus = ['healthy', 'warning', 'error'].includes(indicator1.status);
    const hasTimestamp = indicator1.lastUpdated && indicator2.lastUpdated;
    
    const passed = hasValidStructure && hasStatus && hasTimestamp;
    
    addResult(
      'Scope Visualizer Indicator',
      passed,
      passed ? 'Scope indicator generation working correctly' : 'Scope indicator generation failed',
      {
        indicator1: {
          scope: indicator1.scope,
          platformScope: indicator1.platformScope,
          status: indicator1.status,
          hasTimestamp: !!indicator1.lastUpdated
        },
        indicator2: {
          scope: indicator2.scope,
          team: indicator2.team,
          status: indicator2.status
        }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Scope Visualizer Indicator',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 7: Header display generation
async function testHeaderDisplayGeneration() {
  try {
    const header1 = ScopeVisualizer.generateHeaderDisplay();
    const header2 = ScopeVisualizer.generateHeaderDisplay('test-team');
    
    const header1Valid = header1.title && header1.scope && header1.platformScope;
    const header2Valid = header2.team === 'test-team' && header2.title.includes('test-team');
    
    const hasValidStructure = header1Valid && header2Valid;
    const hasStatus = !!(header1.status && header2.status);
    const hasStatusTypes = ['active', 'inactive', 'error'].includes(header1.status.scope);
    
    const passed = hasValidStructure && hasStatus && hasStatusTypes;
    
    addResult(
      'Header Display Generation',
      passed,
      passed ? 'Header display generation working correctly' : 'Header display generation failed',
      {
        header1: {
          title: header1.title,
          scope: header1.scope,
          platformScope: header1.platformScope,
          statusScope: header1.status.scope
        },
        header2: {
          title: header2.title,
          team: header2.team,
          statusScope: header2.status.scope
        }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Header Display Generation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 8: Performance columns generation
async function testPerformanceColumnsGeneration() {
  try {
    const metrics = [
      { name: 'Latency', value: 45, unit: 'ms' },
      { name: 'Throughput', value: 1024, unit: 'req/s' },
      { name: 'Memory', value: 512, unit: 'MB' }
    ];
    
    const columns = ScopeVisualizer.generatePerformanceColumns(metrics, 'production');
    
    const hasCorrectCount = columns.length === 3;
    const hasScopeData = columns.every(col => col.scope && col.platform);
    const hasTimestamps = columns.every(col => col.timestamp);
    const hasTeamData = columns.every(col => col.name); // Team would be in context
    
    const latencyColumn = columns.find(col => col.name === 'Latency');
    const latencyValid = latencyColumn && latencyColumn.value === 45 && latencyColumn.unit === 'ms';
    
    const passed = hasCorrectCount && hasScopeData && hasTimestamps && hasTeamData && latencyValid;
    
    addResult(
      'Performance Columns Generation',
      passed,
      passed ? 'Performance columns generation working correctly' : 'Performance columns generation failed',
      {
        count: columns.length,
        hasScopeData,
        hasTimestamps,
        latencyColumn: latencyColumn ? {
          name: latencyColumn.name,
          value: latencyColumn.value,
          unit: latencyColumn.unit,
          scope: latencyColumn.scope
        } : null
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Performance Columns Generation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 9: HTML generation
async function testHTMLGeneration() {
  try {
    const indicator = ScopeVisualizer.generateScopeIndicator('test-team');
    
    const badgeHTML = ScopeVisualizer.generateScopeBadge(indicator);
    const platformHTML = ScopeVisualizer.generatePlatformIndicator(indicator);
    const storageHTML = ScopeVisualizer.generateStorageStatus(indicator);
    const headerHTML = ScopeVisualizer.generateHeaderHTML('test-team');
    
    const hasBadgeHTML = badgeHTML.includes('test-team') && badgeHTML.includes(indicator.scope);
    const hasPlatformHTML = platformHTML.includes(indicator.platform) && platformHTML.includes(indicator.storageType);
    const hasStorageHTML = storageHTML.includes(indicator.storageType);
    const hasHeaderHTML = headerHTML.includes('test-team') && headerHTML.includes(indicator.scope);
    
    const passed = hasBadgeHTML && hasPlatformHTML && hasStorageHTML && hasHeaderHTML;
    
    addResult(
      'HTML Generation',
      passed,
      passed ? 'HTML generation working correctly' : 'HTML generation failed',
      {
        badgeHTML: { hasTeam: hasBadgeHTML, hasScope: badgeHTML.includes(indicator.scope) },
        platformHTML: { hasPlatform: hasPlatformHTML, hasStorage: platformHTML.includes(indicator.storageType) },
        storageHTML: { hasStorage: hasStorageHTML },
        headerHTML: { hasTeam: hasHeaderHTML, hasScope: headerHTML.includes(indicator.scope) }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'HTML Generation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 10: Dashboard launch simulation
async function testDashboardLaunchSimulation() {
  try {
    const launchResult1 = await UnifiedDashboardLauncher.launchDashboard({
      scope: 'ENTERPRISE',
      team: 'production',
      port: 8080
    });
    
    const launchResult2 = await UnifiedDashboardLauncher.launchDashboard({
      scope: 'INVALID_SCOPE',
      team: 'test'
    });
    
    const success1 = launchResult1.success && launchResult1.url === 'http://localhost:8080';
    const failure2 = !launchResult2.success && !!(launchResult2.errors && launchResult2.errors.length > 0);
    
    const config1Valid = launchResult1.config.scope === 'ENTERPRISE' && launchResult1.config.team === 'production';
    
    const passed = success1 && failure2 && config1Valid;
    
    addResult(
      'Dashboard Launch Simulation',
      passed,
      passed ? 'Dashboard launch simulation working correctly' : 'Dashboard launch simulation failed',
      {
        success: {
          success: launchResult1.success,
          url: launchResult1.url,
          config: { scope: launchResult1.config.scope, team: launchResult1.config.team }
        },
        failure: {
          success: launchResult2.success,
          errorsCount: launchResult2.errors?.length || 0
        }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Dashboard Launch Simulation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Main test runner
async function runTests() {
  log('🔍 Starting Scoping Integration Tests');
  log(`Platform: ${process.platform}`);
  log(`Bun Version: ${typeof Bun !== 'undefined' ? Bun.version : 'Not available'}`);
  log('');
  
  // Run all tests
  await testDashboardLauncherArgs();
  await testDashboardConfigGeneration();
  await testScopeValidation();
  await testScopePropagation();
  await testChildProcessConfig();
  await testScopeVisualizerIndicator();
  await testHeaderDisplayGeneration();
  await testPerformanceColumnsGeneration();
  await testHTMLGeneration();
  await testDashboardLaunchSimulation();
  
  // Summary
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = Math.round((passed / total) * 100);
  
  log('');
  log('📊 Scoping Integration Test Results:');
  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`);
  log(`Failed: ${total - passed}`);
  log(`Success Rate: ${percentage}%`);
  
  if (passed === total) {
    log('🎉 All scoping integration tests passed!');
  } else {
    log('⚠️ Some tests failed. Check scoping integration implementation.');
    
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
  const reportPath = 'reports/scoping-integration-test-results.json';
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
