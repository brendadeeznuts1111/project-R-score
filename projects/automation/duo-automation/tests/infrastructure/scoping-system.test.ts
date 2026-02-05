#!/usr/bin/env bun
// tests/scoping-system.test.ts - Comprehensive scoping system validation

import { mkdirSync } from 'fs';
import { ScopeDetector, PlatformScopeAdapter, Scope, ScopeConfig } from '../utils/scope-detector';
import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';

// Test results
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function log(message: string) {
  console.log(`[SCOPING-TEST] ${message}`);
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

// Test 1: Scope detection from domain
async function testScopeDetection() {
  try {
    const enterpriseScope = ScopeDetector.detectFromDomain('apple.factory-wager.com');
    const developmentScope = ScopeDetector.detectFromDomain('dev.apple.factory-wager.com');
    const localScope = ScopeDetector.detectFromDomain('localhost');
    const fallbackScope = ScopeDetector.detectFromDomain('unknown.domain.com');
    
    const correctScopes = 
      enterpriseScope === 'ENTERPRISE' &&
      developmentScope === 'DEVELOPMENT' &&
      localScope === 'LOCAL-SANDBOX' &&
      fallbackScope === 'LOCAL-SANDBOX';
    
    addResult(
      'Scope Detection',
      correctScopes,
      correctScopes ? 'All domain mappings detected correctly' : 'Incorrect scope detection',
      {
        enterprise: { domain: 'apple.factory-wager.com', scope: enterpriseScope },
        development: { domain: 'dev.apple.factory-wager.com', scope: developmentScope },
        local: { domain: 'localhost', scope: localScope },
        fallback: { domain: 'unknown.domain.com', scope: fallbackScope }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Scope Detection',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 2: Scope configuration generation
async function testScopeConfiguration() {
  try {
    const config = ScopeDetector.getScopeConfig('apple.factory-wager.com');
    
    const hasValidStructure = 
      typeof config.scope === 'string' &&
      typeof config.platformScope === 'string' &&
      typeof config.domain === 'string' &&
      typeof config.pathPrefix === 'string' &&
      typeof config.storageType === 'string' &&
      typeof config.encryptionType === 'string';
    
    const enterpriseConfig = 
      config.scope === 'ENTERPRISE' &&
      config.pathPrefix === 'enterprise/' &&
      config.domain === 'apple.factory-wager.com';
    
    const passed = hasValidStructure && enterpriseConfig;
    
    addResult(
      'Scope Configuration',
      passed,
      passed ? 'Scope configuration generated correctly' : 'Invalid scope configuration',
      {
        config,
        hasValidStructure,
        enterpriseConfig
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Scope Configuration',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 3: Platform scope adaptation
async function testPlatformScopeAdaptation() {
  try {
    const windowsConfig = PlatformScopeAdapter.getScopedStorage('win32', 'ENTERPRISE');
    const macConfig = PlatformScopeAdapter.getScopedStorage('darwin', 'USER');
    const linuxConfig = PlatformScopeAdapter.getScopedStorage('linux', 'USER');
    const fallbackConfig = PlatformScopeAdapter.getScopedStorage('unknown', 'LOCAL');
    
    const windowsValid = 
      windowsConfig.persist === 'CRED_PERSIST_ENTERPRISE' &&
      windowsConfig.type === 'CREDENTIAL_MANAGER' &&
      windowsConfig.encryption === 'DPAPI';
    
    const macValid = 
      macConfig.persist === 'CRED_PERSIST_ENTERPRISE' &&
      macConfig.type === 'KEYCHAIN' &&
      macConfig.encryption === 'AES-256';
    
    const linuxValid = 
      linuxConfig.persist === 'CRED_PERSIST_ENTERPRISE' &&
      linuxConfig.type === 'SECRET_SERVICE' &&
      linuxConfig.encryption === 'AES-256';
    
    const fallbackValid = 
      fallbackConfig.persist === 'CRED_PERSIST_LOCAL_MACHINE' &&
      fallbackConfig.type === 'ENCRYPTED_LOCAL';
    
    const passed = windowsValid && macValid && linuxValid && fallbackValid;
    
    addResult(
      'Platform Scope Adaptation',
      passed,
      passed ? 'All platform configurations generated correctly' : 'Invalid platform configurations',
      {
        windows: windowsValid,
        mac: macValid,
        linux: linuxValid,
        fallback: fallbackValid
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Platform Scope Adaptation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 4: Scoped service naming
async function testScopedServiceNaming() {
  try {
    const defaultService = ScopeDetector.getScopedServiceName('test-service');
    const teamService = ScopeDetector.getScopedServiceName('test-service', 'test-team');
    const enterpriseService = ScopeDetector.getScopedServiceName('empire-api', 'production');
    
    // Test external tool naming with UTI-style
    const externalTool = ScopedSecretsManager.getRecommendedServiceName('docker');
    const internalService = ScopedSecretsManager.getRecommendedServiceName('dashboard', 'empire');
    
    const defaultValid = typeof defaultService === 'string' && defaultService.includes('test-service');
    const teamValid = typeof teamService === 'string' && teamService.includes('test-team');
    const enterpriseValid = typeof enterpriseService === 'string' && enterpriseService.includes('production');
    
    const followsPattern = !!defaultService.match(/^[a-zA-Z0-9-]+-[A-Z]+-[a-zA-Z0-9-]*$/);
    const externalValid = externalTool.includes('com.') && externalTool.includes('docker');
    const internalValid = internalService.includes('com.') && internalService.includes('dashboard');
    
    const passed = defaultValid && teamValid && enterpriseValid && followsPattern && externalValid && internalValid;
    
    addResult(
      'Scoped Service Naming',
      passed,
      passed ? 'Service naming follows convention and best practices correctly' : 'Invalid service naming',
      {
        defaultService,
        teamService,
        enterpriseService,
        externalTool,
        internalService,
        followsPattern: !!followsPattern
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Scoped Service Naming',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 5: Path generation
async function testPathGeneration() {
  try {
    // Test with specific domain for enterprise
    const enterprisePath = ScopeDetector.getScopedR2Path('accounts/data.json', 'apple.factory-wager.com');
    const developmentPath = ScopeDetector.getScopedR2Path('test/data.json', 'dev.apple.factory-wager.com');
    const localPath = ScopeDetector.getScopedR2Path('dev/data.json', 'localhost');
    
    const enterpriseValid = enterprisePath.startsWith('enterprise/');
    const developmentValid = developmentPath.startsWith('development/');
    const localValid = localPath.startsWith('local/');
    
    const localMirrorPath = ScopeDetector.getLocalMirrorPath('cache/data.json', 'apple.factory-wager.com');
    const mirrorValid = localMirrorPath.includes('data/') && localMirrorPath.includes('cache');
    
    const passed = enterpriseValid && developmentValid && localValid && mirrorValid;
    
    addResult(
      'Path Generation',
      passed,
      passed ? 'All path generation working correctly' : 'Invalid path generation',
      {
        enterprisePath,
        developmentPath,
        localPath,
        localMirrorPath,
        enterpriseValid,
        developmentValid,
        localValid,
        mirrorValid
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Path Generation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 6: Scoped secrets manager
async function testScopedSecretsManager() {
  try {
    const manager = new ScopedSecretsManager();
    const config = manager.getScopeConfig();
    const storage = manager.getStorageConfig();
    
    const hasValidConfig = 
      typeof config.scope === 'string' &&
      typeof config.platformScope === 'string' &&
      typeof config.storageType === 'string';
    
    const hasValidStorage = 
      typeof storage.persist === 'string' &&
      typeof storage.type === 'string';
    
    const validation = manager.validateScoping();
    const hasValidation = typeof validation.valid === 'boolean' && Array.isArray(validation.errors);
    
    const passed = hasValidConfig && hasValidStorage && hasValidation;
    
    addResult(
      'Scoped Secrets Manager',
      passed,
      passed ? 'Scoped secrets manager initialized correctly' : 'Invalid secrets manager',
      {
        config: {
          scope: config.scope,
          platformScope: config.platformScope,
          storageType: config.storageType
        },
        storage: {
          persist: storage.persist,
          type: storage.type
        },
        validation: {
          valid: validation.valid,
          errorsCount: validation.errors.length,
          warningsCount: validation.warnings.length
        }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Scoped Secrets Manager',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 7: Secrets operations
async function testSecretsOperations() {
  try {
    const manager = new ScopedSecretsManager();
    const testSecretName = `test-secret-${Date.now()}`;
    const testValue = 'test-secret-value';
    
    // Test set operation
    const setResult = await manager.setSecret(testSecretName, testValue);
    const setSuccess = setResult === true;
    
    // Test get operation
    const getValue = await manager.getSecret(testSecretName);
    const getSuccess = getValue === testValue;
    
    // Test exists operation
    const existsResult = await manager.secretExists(testSecretName);
    const existsSuccess = existsResult === true;
    
    // Test delete operation
    const deleteResult = await manager.deleteSecret(testSecretName);
    const deleteSuccess = deleteResult === true;
    
    // Verify deletion
    const finalExists = await manager.secretExists(testSecretName);
    const deleteVerified = finalExists === false;
    
    const passed = setSuccess && getSuccess && existsSuccess && deleteSuccess && deleteVerified;
    
    addResult(
      'Secrets Operations',
      passed,
      passed ? 'All secrets operations working correctly' : 'Secrets operations failed',
      {
        setSuccess,
        getSuccess,
        existsSuccess,
        deleteSuccess,
        deleteVerified
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Secrets Operations',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 8: Platform capability validation
async function testPlatformCapabilityValidation() {
  try {
    const currentPlatform = process.platform;
    const windowsValidation = PlatformScopeAdapter.validatePlatformCapability('win32', 'ENTERPRISE');
    const macValidation = PlatformScopeAdapter.validatePlatformCapability('darwin', 'USER');
    const linuxValidation = PlatformScopeAdapter.validatePlatformCapability('linux', 'USER');
    const unknownValidation = PlatformScopeAdapter.validatePlatformCapability('unknown', 'ENTERPRISE');
    
    const windowsValid = windowsValidation.supported && windowsValidation.recommendations.length === 0;
    const macValid = macValidation.supported;
    const linuxValid = linuxValidation.supported;
    const unknownValid = !unknownValidation.supported && unknownValidation.fallbackAvailable;
    
    const currentValidation = PlatformScopeAdapter.validatePlatformCapability(currentPlatform, 'ENTERPRISE');
    const currentValid = currentValidation.supported || currentValidation.fallbackAvailable;
    
    const passed = windowsValid && macValid && linuxValid && unknownValid && currentValid;
    
    addResult(
      'Platform Capability Validation',
      passed,
      passed ? 'Platform capability validation working correctly' : 'Platform validation failed',
      {
        currentPlatform,
        windows: { supported: windowsValidation.supported, recommendations: windowsValidation.recommendations.length },
        mac: { supported: macValidation.supported, recommendations: macValidation.recommendations.length },
        linux: { supported: linuxValidation.supported, recommendations: linuxValidation.recommendations.length },
        unknown: { supported: unknownValidation.supported, fallback: unknownValidation.fallbackAvailable },
        current: { supported: currentValidation.supported, fallback: currentValidation.fallbackAvailable }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Platform Capability Validation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 9: Health monitoring
async function testHealthMonitoring() {
  try {
    const manager = new ScopedSecretsManager();
    const healthReport = await manager.getHealthReport();
    
    const hasValidStructure = 
      typeof healthReport.accessible === 'boolean' &&
      typeof healthReport.scopedCorrectly === 'boolean' &&
      typeof healthReport.platformSupported === 'boolean' &&
      typeof healthReport.encryptionStrength === 'string' &&
      typeof healthReport.storageType === 'string' &&
      Array.isArray(healthReport.recommendations);
    
    const isHealthy = healthReport.accessible && healthReport.scopedCorrectly;
    
    const passed = hasValidStructure;
    
    addResult(
      'Health Monitoring',
      passed,
      passed ? `Health monitoring working (${isHealthy ? 'Healthy' : 'Issues detected'})` : 'Invalid health report',
      {
        accessible: healthReport.accessible,
        scopedCorrectly: healthReport.scopedCorrectly,
        platformSupported: healthReport.platformSupported,
        encryptionStrength: healthReport.encryptionStrength,
        storageType: healthReport.storageType,
        recommendationsCount: healthReport.recommendations.length,
        isHealthy
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Health Monitoring',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 10: Best practices factory methods
async function testBestPracticesFactoryMethods() {
  try {
    const externalManager = ScopedSecretsManager.forExternalTool('docker');
    const internalManager = ScopedSecretsManager.forInternalService('api', 'production');
    const teamManager = ScopedSecretsManager.forTeam('backend');
    
    const externalValid = externalManager instanceof ScopedSecretsManager;
    const internalValid = internalManager instanceof ScopedSecretsManager;
    const teamValid = teamManager instanceof ScopedSecretsManager;
    
    const externalConfig = externalManager.getScopeConfig();
    const internalConfig = internalManager.getScopeConfig();
    const teamConfig = teamManager.getScopeConfig();
    
    const hasConfigs = !!(externalConfig && internalConfig && teamConfig);
    
    // Test service naming conventions
    const dockerName = ScopedSecretsManager.getRecommendedServiceName('docker');
    const vercelName = ScopedSecretsManager.getRecommendedServiceName('vercel.cli');
    
    const dockerValid = dockerName.includes('com.') && dockerName.includes('docker');
    const vercelValid = vercelName.includes('vercel.cli'); // Already UTI-style
    
    const passed = externalValid && internalValid && teamValid && hasConfigs && dockerValid && vercelValid;
    
    addResult(
      'Best Practices Factory Methods',
      passed,
      passed ? 'All factory methods working with best practices' : 'Factory methods failed',
      {
        externalValid,
        internalValid,
        teamValid,
        hasConfigs,
        dockerNaming: { name: dockerName, valid: dockerValid },
        vercelNaming: { name: vercelName, valid: vercelValid }
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Best Practices Factory Methods',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Main test runner
async function runTests() {
  log('🔍 Starting Scoping System Tests');
  log(`Platform: ${process.platform}`);
  log(`Bun Version: ${typeof Bun !== 'undefined' ? Bun.version : 'Not available'}`);
  log('');
  
  // Run all tests
  await testScopeDetection();
  await testScopeConfiguration();
  await testPlatformScopeAdaptation();
  await testScopedServiceNaming();
  await testPathGeneration();
  await testScopedSecretsManager();
  await testSecretsOperations();
  await testPlatformCapabilityValidation();
  await testHealthMonitoring();
  await testBestPracticesFactoryMethods();
  
  // Summary
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = Math.round((passed / total) * 100);
  
  log('');
  log('📊 Scoping System Test Results:');
  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`);
  log(`Failed: ${total - passed}`);
  log(`Success Rate: ${percentage}%`);
  
  if (passed === total) {
    log('🎉 All scoping system tests passed!');
  } else {
    log('⚠️ Some tests failed. Check scoping system implementation.');
    
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
  const reportPath = 'reports/scoping-system-test-results.json';
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
