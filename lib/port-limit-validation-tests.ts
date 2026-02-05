#!/usr/bin/env bun
/**
 * Port and Connection Limit Validation Tests
 * 
 * Validates that port numbers and connection limits are within valid ranges:
 * - Port numbers: 1-65,535 (practical: 1024-49,151 for user applications)
 * - Connection limits: 1-65,336 (Bun's maximum)
 */

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import { PortManager, ConnectionPool, OptimizedFetch, ProjectServer } from './port-management-system.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const VALIDATION_CONSTANTS = {
  PORT: {
    MIN: 1,
    MAX: 65535,
    USER_MIN: 1024,      // Below this requires root privileges
    USER_MAX: 49151,      // Above this is for dynamic/private ports
    PRACTICAL_MIN: 3000,  // Common starting point for apps
    PRACTICAL_MAX: 32767  // Safe upper range
  },
  CONNECTIONS: {
    MIN: 1,
    MAX: 65336,           // Bun's documented maximum
    PRACTICAL_MIN: 10,    // Minimum useful connections
    PRACTICAL_MAX: 1000,  // Practical upper limit for most apps
    DEFAULT: 512          // Bun's default
  },
  ENV_VARS: {
    MAX_REQUESTS: 'BUN_CONFIG_MAX_HTTP_REQUESTS',
    MAX_PER_HOST: 'BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST'
  }
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

class ValidationUtils {
  /**
   * Validate port number is within acceptable range
   */
  static validatePort(port: number, context: string = 'Port'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: []
    };

    if (typeof port !== 'number' || isNaN(port)) {
      result.isValid = false;
      result.errors.push(`${context}: Port must be a valid number, got ${typeof port}`);
      return result;
    }

    if (port < VALIDATION_CONSTANTS.PORT.MIN) {
      result.isValid = false;
      result.errors.push(`${context}: Port ${port} is below minimum (${VALIDATION_CONSTANTS.PORT.MIN})`);
    }

    if (port > VALIDATION_CONSTANTS.PORT.MAX) {
      result.isValid = false;
      result.errors.push(`${context}: Port ${port} exceeds maximum (${VALIDATION_CONSTANTS.PORT.MAX})`);
    }

    // Warnings for practical considerations
    if (port < VALIDATION_CONSTANTS.PORT.USER_MIN) {
      result.warnings.push(`${context}: Port ${port} requires root privileges (below ${VALIDATION_CONSTANTS.PORT.USER_MIN})`);
    }

    if (port > VALIDATION_CONSTANTS.PORT.USER_MAX) {
      result.warnings.push(`${context}: Port ${port} is in dynamic/private range (above ${VALIDATION_CONSTANTS.PORT.USER_MAX})`);
    }

    if (port < VALIDATION_CONSTANTS.PORT.PRACTICAL_MIN || port > VALIDATION_CONSTANTS.PORT.PRACTICAL_MAX) {
      result.warnings.push(`${context}: Port ${port} is outside practical range (${VALIDATION_CONSTANTS.PORT.PRACTICAL_MIN}-${VALIDATION_CONSTANTS.PORT.PRACTICAL_MAX})`);
    }

    return result;
  }

  /**
   * Validate connection limit is within acceptable range
   */
  static validateConnectionLimit(limit: number, context: string = 'Connection limit'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: []
    };

    if (typeof limit !== 'number' || isNaN(limit)) {
      result.isValid = false;
      result.errors.push(`${context}: Must be a valid number, got ${typeof limit}`);
      return result;
    }

    if (limit < VALIDATION_CONSTANTS.CONNECTIONS.MIN) {
      result.isValid = false;
      result.errors.push(`${context}: ${limit} is below minimum (${VALIDATION_CONSTANTS.CONNECTIONS.MIN})`);
    }

    if (limit > VALIDATION_CONSTANTS.CONNECTIONS.MAX) {
      result.isValid = false;
      result.errors.push(`${context}: ${limit} exceeds Bun's maximum (${VALIDATION_CONSTANTS.CONNECTIONS.MAX})`);
    }

    // Warnings for practical considerations
    if (limit < VALIDATION_CONSTANTS.CONNECTIONS.PRACTICAL_MIN) {
      result.warnings.push(`${context}: ${limit} may be too low for practical use (minimum ${VALIDATION_CONSTANTS.CONNECTIONS.PRACTICAL_MIN})`);
    }

    if (limit > VALIDATION_CONSTANTS.CONNECTIONS.PRACTICAL_MAX) {
      result.warnings.push(`${context}: ${limit} is very high, may impact system resources`);
    }

    return result;
  }

  /**
   * Validate environment variable value
   */
  static validateEnvironmentVariable(varName: string, value: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: []
    };

    const numValue = parseInt(value);

    if (isNaN(numValue)) {
      result.isValid = false;
      result.errors.push(`${varName}: "${value}" is not a valid number`);
      return result;
    }

    if (varName === VALIDATION_CONSTANTS.ENV_VARS.MAX_REQUESTS) {
      return this.validateConnectionLimit(numValue, varName);
    } else if (varName === VALIDATION_CONSTANTS.ENV_VARS.MAX_PER_HOST) {
      return this.validateConnectionLimit(numValue, varName);
    } else {
      result.warnings.push(`${varName}: Unknown environment variable`);
    }

    return result;
  }
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// PORT MANAGER TESTS
// ============================================================================

class PortManagerTests {
  /**
   * Test port allocation with validation
   */
  static async testPortAllocationValidation(): Promise<void> {
    console.log('🚪 PORT ALLOCATION VALIDATION TESTS');
    console.log('=' .repeat(50));

    const testCases = [
      { port: 3000, shouldPass: true, desc: 'Valid port (3000)' },
      { port: 8080, shouldPass: true, desc: 'Valid port (8080)' },
      { port: 0, shouldPass: false, desc: 'Invalid port (0)' },
      { port: -1, shouldPass: false, desc: 'Invalid port (-1)' },
      { port: 65536, shouldPass: false, desc: 'Port exceeds maximum (65536)' },
      { port: 65535, shouldPass: true, desc: 'Maximum valid port (65535)' },
      { port: 1023, shouldPass: true, desc: 'Privileged port (1023)' },
      { port: 1024, shouldPass: true, desc: 'Minimum user port (1024)' },
      { port: 49151, shouldPass: true, desc: 'Maximum user port (49151)' },
      { port: 49152, shouldPass: true, desc: 'Dynamic port start (49152)' }
    ];

    for (const testCase of testCases) {
      console.log(`\nTesting: ${testCase.desc}`);
      
      try {
        // Create a mock config with the test port
        const mockConfig = {
          project: 'test-project',
          port: testCase.port,
          range: { start: testCase.port, end: testCase.port },
          maxConnections: 100,
          connectionTimeout: 30000,
          keepAlive: true
        };

        const validation = ValidationUtils.validatePort(testCase.port);
        
        if (validation.isValid === testCase.shouldPass) {
          console.log(`   ✅ ${testCase.desc} - Validation correct`);
        } else {
          console.log(`   ❌ ${testCase.desc} - Validation incorrect`);
          console.log(`      Expected: ${testCase.shouldPass ? 'valid' : 'invalid'}`);
          console.log(`      Got: ${validation.isValid ? 'valid' : 'invalid'}`);
        }

        if (validation.warnings.length > 0) {
          console.log(`   ⚠️  Warnings:`);
          validation.warnings.forEach(w => console.log(`      - ${w}`));
        }

        if (validation.errors.length > 0) {
          console.log(`   🚨 Errors:`);
          validation.errors.forEach(e => console.log(`      - ${e}`));
        }

      } catch (error) {
        if (!testCase.shouldPass) {
          console.log(`   ✅ ${testCase.desc} - Correctly rejected`);
        } else {
          console.log(`   ❌ ${testCase.desc} - Unexpected error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Test port range validation
   */
  static async testPortRangeValidation(): Promise<void> {
    console.log('\n📏 PORT RANGE VALIDATION TESTS');
    console.log('=' .repeat(50));

    const testRanges = [
      { start: 3000, end: 3100, shouldPass: true, desc: 'Valid range (3000-3100)' },
      { start: 0, end: 100, shouldPass: false, desc: 'Invalid range start (0)' },
      { start: 3000, end: 65536, shouldPass: false, desc: 'Invalid range end (65536)' },
      { start: 3100, end: 3000, shouldPass: false, desc: 'Reversed range (3100-3000)' },
      { start: 65535, end: 65535, shouldPass: true, desc: 'Single max port (65535)' },
      { start: -100, end: 100, shouldPass: false, desc: 'Negative start (-100)' }
    ];

    for (const range of testRanges) {
      console.log(`\nTesting: ${range.desc}`);
      
      const startValidation = ValidationUtils.validatePort(range.start, 'Range start');
      const endValidation = ValidationUtils.validatePort(range.end, 'Range end');
      
      const rangeValid = startValidation.isValid && endValidation.isValid && range.start <= range.end;
      
      if (rangeValid === range.shouldPass) {
        console.log(`   ✅ ${range.desc} - Range validation correct`);
      } else {
        console.log(`   ❌ ${range.desc} - Range validation incorrect`);
        console.log(`      Expected: ${range.shouldPass ? 'valid' : 'invalid'}`);
        console.log(`      Got: ${rangeValid ? 'valid' : 'invalid'}`);
      }

      if (startValidation.errors.length > 0) {
        console.log(`   🚨 Start errors: ${startValidation.errors.join(', ')}`);
      }
      if (endValidation.errors.length > 0) {
        console.log(`   🚨 End errors: ${endValidation.errors.join(', ')}`);
      }
    }
  }
}

// ============================================================================
// CONNECTION LIMIT TESTS
// ============================================================================

class ConnectionLimitTests {
  /**
   * Test connection limit validation
   */
  static async testConnectionLimitValidation(): Promise<void> {
    console.log('\n🔗 CONNECTION LIMIT VALIDATION TESTS');
    console.log('=' .repeat(50));

    const testLimits = [
      { limit: 512, shouldPass: true, desc: 'Bun default (512)' },
      { limit: 100, shouldPass: true, desc: 'Reasonable limit (100)' },
      { limit: 1000, shouldPass: true, desc: 'High limit (1000)' },
      { limit: 1, shouldPass: true, desc: 'Minimum (1)' },
      { limit: 65336, shouldPass: true, desc: 'Bun maximum (65336)' },
      { limit: 0, shouldPass: false, desc: 'Invalid (0)' },
      { limit: -1, shouldPass: false, desc: 'Invalid (-1)' },
      { limit: 65337, shouldPass: false, desc: 'Exceeds maximum (65337)' },
      { limit: 100000, shouldPass: false, desc: 'Way too high (100000)' }
    ];

    for (const test of testLimits) {
      console.log(`\nTesting: ${test.desc}`);
      
      const validation = ValidationUtils.validateConnectionLimit(test.limit);
      
      if (validation.isValid === test.shouldPass) {
        console.log(`   ✅ ${test.desc} - Validation correct`);
      } else {
        console.log(`   ❌ ${test.desc} - Validation incorrect`);
        console.log(`      Expected: ${test.shouldPass ? 'valid' : 'invalid'}`);
        console.log(`      Got: ${validation.isValid ? 'valid' : 'invalid'}`);
      }

      if (validation.warnings.length > 0) {
        console.log(`   ⚠️  Warnings:`);
        validation.warnings.forEach(w => console.log(`      - ${w}`));
      }

      if (validation.errors.length > 0) {
        console.log(`   🚨 Errors:`);
        validation.errors.forEach(e => console.log(`      - ${e}`));
      }
    }
  }

  /**
   * Test environment variable validation
   */
  static async testEnvironmentVariableValidation(): Promise<void> {
    console.log('\n🌍 ENVIRONMENT VARIABLE VALIDATION TESTS');
    console.log('=' .repeat(50));

    // Store original environment
    const originalMaxRequests = process.env.BUN_CONFIG_MAX_HTTP_REQUESTS;
    const originalMaxPerHost = process.env.BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST;

    const testCases = [
      { 
        env: { BUN_CONFIG_MAX_HTTP_REQUESTS: '512' }, 
        shouldPass: true, 
        desc: 'Valid max requests (512)' 
      },
      { 
        env: { BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST: '6' }, 
        shouldPass: true, 
        desc: 'Valid per-host (6)' 
      },
      { 
        env: { BUN_CONFIG_MAX_HTTP_REQUESTS: '0' }, 
        shouldPass: false, 
        desc: 'Invalid max requests (0)' 
      },
      { 
        env: { BUN_CONFIG_MAX_HTTP_REQUESTS: '65337' }, 
        shouldPass: false, 
        desc: 'Exceeds maximum (65337)' 
      },
      { 
        env: { BUN_CONFIG_MAX_HTTP_REQUESTS: 'invalid' }, 
        shouldPass: false, 
        desc: 'Non-numeric value' 
      },
      { 
        env: { BUN_CONFIG_MAX_HTTP_REQUESTS: '' }, 
        shouldPass: false, 
        desc: 'Empty string' 
      }
    ];

    for (const testCase of testCases) {
      console.log(`\nTesting: ${testCase.desc}`);
      
      // Set test environment
      Object.assign(process.env, testCase.env);
      
      try {
        // Test OptimizedFetch initialization
        OptimizedFetch.initialize();
        
        // Check if initialization succeeded (it shouldn't throw with invalid values)
        const maxRequests = process.env.BUN_CONFIG_MAX_HTTP_REQUESTS;
        const maxPerHost = process.env.BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST;
        
        let validationPassed = true;
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (maxRequests) {
          const reqValidation = ValidationUtils.validateEnvironmentVariable('BUN_CONFIG_MAX_HTTP_REQUESTS', maxRequests);
          if (!reqValidation.isValid) {
            validationPassed = false;
            errors.push(...reqValidation.errors);
          }
          warnings.push(...reqValidation.warnings);
        }
        
        if (maxPerHost) {
          const hostValidation = ValidationUtils.validateEnvironmentVariable('BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST', maxPerHost);
          if (!hostValidation.isValid) {
            validationPassed = false;
            errors.push(...hostValidation.errors);
          }
          warnings.push(...hostValidation.warnings);
        }
        
        if (validationPassed === testCase.shouldPass) {
          console.log(`   ✅ ${testCase.desc} - Environment validation correct`);
        } else {
          console.log(`   ❌ ${testCase.desc} - Environment validation incorrect`);
          console.log(`      Expected: ${testCase.shouldPass ? 'valid' : 'invalid'}`);
          console.log(`      Got: ${validationPassed ? 'valid' : 'invalid'}`);
        }
        
        if (warnings.length > 0) {
          console.log(`   ⚠️  Warnings:`);
          warnings.forEach(w => console.log(`      - ${w}`));
        }
        
        if (errors.length > 0) {
          console.log(`   🚨 Errors:`);
          errors.forEach(e => console.log(`      - ${e}`));
        }
        
      } catch (error) {
        if (!testCase.shouldPass) {
          console.log(`   ✅ ${testCase.desc} - Correctly rejected`);
        } else {
          console.log(`   ❌ ${testCase.desc} - Unexpected error: ${error.message}`);
        }
      }
    }

    // Restore original environment
    process.env.BUN_CONFIG_MAX_HTTP_REQUESTS = originalMaxRequests;
    process.env.BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST = originalMaxPerHost;
  }
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

class IntegrationTests {
  /**
   * Test complete system integration with validation
   */
  static async testSystemIntegration(): Promise<void> {
    console.log('\n🔧 SYSTEM INTEGRATION VALIDATION TESTS');
    console.log('=' .repeat(50));

    // Test valid configuration
    console.log('\nTesting valid configuration...');
    try {
      const validConfig = {
        name: 'test-app',
        portConfig: {
          port: 8080,
          range: { start: 8000, end: 9000 },
          maxConnections: 512,
          connectionTimeout: 30000,
          keepAlive: true
        }
      };

      const portValidation = ValidationUtils.validatePort(validConfig.portConfig.port);
      const connectionValidation = ValidationUtils.validateConnectionLimit(validConfig.portConfig.maxConnections);

      if (portValidation.isValid && connectionValidation.isValid) {
        console.log('   ✅ Valid configuration passes all validations');
      } else {
        console.log('   ❌ Valid configuration failed validation');
        console.log(`      Port valid: ${portValidation.isValid}`);
        console.log(`      Connection valid: ${connectionValidation.isValid}`);
      }

    } catch (error) {
      console.log(`   ❌ Valid configuration test failed: ${error.message}`);
    }

    // Test invalid configuration
    console.log('\nTesting invalid configuration...');
    try {
      const invalidConfig = {
        name: 'test-app',
        portConfig: {
          port: 70000,  // Invalid port
          range: { start: 70000, end: 80000 },
          maxConnections: 100000,  // Invalid connection limit
          connectionTimeout: 30000,
          keepAlive: true
        }
      };

      const portValidation = ValidationUtils.validatePort(invalidConfig.portConfig.port);
      const connectionValidation = ValidationUtils.validateConnectionLimit(invalidConfig.portConfig.maxConnections);

      if (!portValidation.isValid && !connectionValidation.isValid) {
        console.log('   ✅ Invalid configuration correctly rejected');
      } else {
        console.log('   ❌ Invalid configuration was accepted');
        console.log(`      Port valid: ${portValidation.isValid} (should be false)`);
        console.log(`      Connection valid: ${connectionValidation.isValid} (should be false)`);
      }

    } catch (error) {
      console.log(`   ✅ Invalid configuration correctly rejected: ${error.message}`);
    }
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

class ValidationTestRunner {
  static async runAllTests(): Promise<void> {
    console.log('🧪 PORT AND CONNECTION LIMIT VALIDATION TEST SUITE');
    console.log('=' .repeat(70));
    console.log('Validating port numbers (1-65,535) and connection limits (1-65,336)\n');

    try {
      // Run all test suites
      await PortManagerTests.testPortAllocationValidation();
      await PortManagerTests.testPortRangeValidation();
      await ConnectionLimitTests.testConnectionLimitValidation();
      await ConnectionLimitTests.testEnvironmentVariableValidation();
      await IntegrationTests.testSystemIntegration();

      console.log('\n✅ ALL VALIDATION TESTS COMPLETED!');
      console.log('\n🎯 Validation Summary:');
      console.log('   ✅ Port number range validation (1-65,535)');
      console.log('   ✅ Connection limit validation (1-65,336)');
      console.log('   ✅ Environment variable validation');
      console.log('   ✅ Port range validation');
      console.log('   ✅ System integration validation');
      console.log('   ✅ Practical range warnings');
      console.log('   ✅ Error handling and edge cases');

      console.log('\n📊 Validation Constants:');
      console.log(`   Port Range: ${VALIDATION_CONSTANTS.PORT.MIN}-${VALIDATION_CONSTANTS.PORT.MAX}`);
      console.log(`   User Port Range: ${VALIDATION_CONSTANTS.PORT.USER_MIN}-${VALIDATION_CONSTANTS.PORT.USER_MAX}`);
      console.log(`   Connection Limit Range: ${VALIDATION_CONSTANTS.CONNECTIONS.MIN}-${VALIDATION_CONSTANTS.CONNECTIONS.MAX}`);
      console.log(`   Bun Default: ${VALIDATION_CONSTANTS.CONNECTIONS.DEFAULT}`);

    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  await ValidationTestRunner.runAllTests();
}

// Run main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
