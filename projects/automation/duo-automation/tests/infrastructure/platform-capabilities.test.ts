#!/usr/bin/env bun
// tests/platform-capabilities.test.ts - Test platform-specific secret management capabilities

import { mkdirSync } from 'fs';
import { 
  detectPlatformCapabilities, 
  isEnterprisePersistAvailable,
  getScopedServiceName,
  validatePlatformCompatibility,
  checkCredentialManagerAvailability,
  getSecretStorageInfo
} from '../utils/platform-detector';

// Test results
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function log(message: string) {
  console.log(`[PLATFORM-TEST] ${message}`);
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

// Test 1: Platform detection
async function testPlatformDetection() {
  try {
    const capabilities = detectPlatformCapabilities();
    
    const hasRequiredFields = 
      capabilities.platform !== undefined &&
      typeof capabilities.hasBun === 'boolean' &&
      typeof capabilities.hasCredentialManager === 'boolean' &&
      typeof capabilities.recommendedPersistFlag === 'string' &&
      Array.isArray(capabilities.supportedFeatures);
    
    addResult(
      'Platform Detection',
      hasRequiredFields,
      hasRequiredFields ? 'All platform capabilities detected' : 'Missing required fields',
      capabilities
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Platform Detection',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 2: Enterprise persist availability
async function testEnterprisePersistAvailability() {
  try {
    const isAvailable = isEnterprisePersistAvailable();
    const capabilities = detectPlatformCapabilities();
    
    const expectedAvailable = capabilities.hasBun && 
      (capabilities.platform !== 'win32' || capabilities.hasCredentialManager);
    
    const passed = isAvailable === expectedAvailable;
    
    addResult(
      'Enterprise Persist Availability',
      passed,
      `Enterprise persist ${isAvailable ? 'available' : 'not available'} (expected: ${expectedAvailable ? 'available' : 'not available'})`,
      {
        available: isAvailable,
        expected: expectedAvailable,
        platform: capabilities.platform,
        hasCredentialManager: capabilities.hasCredentialManager
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Enterprise Persist Availability',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 3: Scoped service naming
async function testScopedServiceNaming() {
  try {
    const baseService = 'test-service';
    const team = 'test-team';
    const scopedName = getScopedServiceName(baseService, team);
    
    // Verify naming convention
    const hasCorrectPattern = scopedName.includes(baseService) && 
                            scopedName.includes(team) &&
                            (scopedName.includes('USER') || scopedName.includes('ENTERPRISE'));
    
    addResult(
      'Scoped Service Naming',
      hasCorrectPattern,
      hasCorrectPattern ? 'Service naming follows convention' : 'Invalid naming pattern',
      {
        baseService,
        team,
        scopedName,
        pattern: 'service-SCOPE-team'
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

// Test 4: Platform compatibility validation
async function testPlatformCompatibilityValidation() {
  try {
    const validation = validatePlatformCompatibility();
    
    const hasValidStructure = 
      typeof validation.compatible === 'boolean' &&
      Array.isArray(validation.warnings) &&
      Array.isArray(validation.errors) &&
      Array.isArray(validation.recommendations);
    
    addResult(
      'Platform Compatibility Validation',
      hasValidStructure,
      validation.compatible ? 'Platform is compatible' : `Platform has ${validation.errors.length} errors`,
      validation
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Platform Compatibility Validation',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 5: Credential Manager availability (your method)
async function testCredentialManagerAvailability() {
  try {
    const isAvailable = checkCredentialManagerAvailability();
    const isWindows = process.platform === "win32";
    const hasBun = typeof Bun !== "undefined";
    
    const expectedAvailable = isWindows && hasBun && "CredentialManager" in Bun;
    const passed = isAvailable === expectedAvailable;
    
    addResult(
      'Credential Manager Availability',
      passed,
      `Credential Manager ${isAvailable ? 'available' : 'not available'} on ${process.platform}`,
      {
        available: isAvailable,
        expected: expectedAvailable,
        platform: process.platform,
        hasBun,
        hasCredentialManagerProperty: hasBun && "CredentialManager" in Bun
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Credential Manager Availability',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 6: Secret storage info
async function testSecretStorageInfo() {
  try {
    const storageInfo = getSecretStorageInfo();
    
    const hasValidStructure = 
      typeof storageInfo.type === 'string' &&
      typeof storageInfo.location === 'string' &&
      typeof storageInfo.encryption === 'string' &&
      typeof storageInfo.accessibility === 'string';
    
    addResult(
      'Secret Storage Info',
      hasValidStructure,
      `Storage type: ${storageInfo.type}`,
      storageInfo
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Secret Storage Info',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Test 7: Cross-platform consistency
async function testCrossPlatformConsistency() {
  try {
    const capabilities = detectPlatformCapabilities();
    
    // Verify platform-specific logic
    let expectedScope: string;
    let expectedFeatures: string[];
    
    switch (capabilities.platform) {
      case 'win32':
        expectedScope = capabilities.hasCredentialManager ? 'ENTERPRISE' : 'USER';
        expectedFeatures = capabilities.hasCredentialManager 
          ? ["enterprise_scoping", "credential_manager", "windows_integration"]
          : ["local_storage", "fallback_mode"];
        break;
      case 'darwin':
        expectedScope = 'USER';
        expectedFeatures = ["keychain_integration", "user_scoping", "macos_integration"];
        break;
      case 'linux':
        expectedScope = 'USER';
        expectedFeatures = ["secret_service", "user_scoping", "linux_integration"];
        break;
      default:
        expectedScope = 'USER';
        expectedFeatures = ["basic_storage", "fallback_mode"];
    }
    
    const service = getScopedServiceName('test', 'team');
    const hasCorrectScope = service.includes(expectedScope);
    const hasCorrectFeatures = JSON.stringify(capabilities.supportedFeatures) === JSON.stringify(expectedFeatures);
    
    const passed = hasCorrectScope && hasCorrectFeatures;
    
    addResult(
      'Cross-Platform Consistency',
      passed,
      passed ? 'Platform-specific logic consistent' : 'Platform logic inconsistency detected',
      {
        platform: capabilities.platform,
        expectedScope,
        actualService: service,
        hasCorrectScope,
        expectedFeatures,
        actualFeatures: capabilities.supportedFeatures,
        hasCorrectFeatures
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    addResult(
      'Cross-Platform Consistency',
      false,
      `Error: ${errorMessage}`,
      { error: errorDetails }
    );
  }
}

// Main test runner
async function runTests() {
  log('🔍 Starting Platform Capabilities Tests');
  log(`Platform: ${process.platform}`);
  log(`Bun Version: ${typeof Bun !== 'undefined' ? Bun.version : 'Not available'}`);
  log('');
  
  // Run all tests
  await testPlatformDetection();
  await testEnterprisePersistAvailability();
  await testScopedServiceNaming();
  await testPlatformCompatibilityValidation();
  await testCredentialManagerAvailability();
  await testSecretStorageInfo();
  await testCrossPlatformConsistency();
  
  // Summary
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = Math.round((passed / total) * 100);
  
  log('');
  log('📊 Platform Capabilities Test Results:');
  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`);
  log(`Failed: ${total - passed}`);
  log(`Success Rate: ${percentage}%`);
  
  if (passed === total) {
    log('🎉 All platform capability tests passed!');
  } else {
    log('⚠️ Some tests failed. Check platform compatibility.');
    
    // Show failed tests
    const failed = testResults.filter(r => !r.passed);
    log('');
    log('❌ Failed Tests:');
    failed.forEach(test => {
      log(`   - ${test.testName}: ${test.message}`);
    });
  }
  
  // Show platform capabilities summary
  const capabilities = detectPlatformCapabilities();
  log('');
  log('🔧 Platform Capabilities Summary:');
  log(`Platform: ${capabilities.platform}`);
  log(`Bun Available: ${capabilities.hasBun}`);
  log(`Credential Manager: ${capabilities.hasCredentialManager}`);
  log(`Recommended Persist Flag: ${capabilities.recommendedPersistFlag}`);
  log(`Supported Features: ${capabilities.supportedFeatures.join(', ')}`);
  
  // Save test results
  mkdirSync('reports', { recursive: true });
  const reportPath = 'reports/platform-capabilities-test-results.json';
  await Bun.write(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    platform: process.platform,
    bunVersion: typeof Bun !== 'undefined' ? Bun.version : 'N/A',
    capabilities,
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
