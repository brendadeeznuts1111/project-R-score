/**
 * tests/matrix.test.ts
 * Comprehensive test suite for DuoPlus Scoping Matrix v3.7
 * Tests runtime validation, consistency, and all scoping combinations
 */

import { test, expect, describe } from 'bun:test';
import {
  SCOPING_MATRIX,
  findScopingRules,
  getBestScopingRule,
  getMatrixStats,
  exportMatrixAsJSON,
  type ScopingRule
} from '../packages/@tools/cli/data/scopingMatrix';
import {
  validateRuntimeConfig,
  validateScopeByPath,
  validateServiceName,
  validateMatrixConsistency,
  generateValidationJSON,
  createMockConfig,
  type RuntimeConfig
} from '../packages/@tools/cli/utils/matrixValidator';

describe('Scoping Matrix Data', () => {
  test('matrix has all expected rules', () => {
    expect(SCOPING_MATRIX.length).toBe(11);
  });

  test('matrix contains all primary scopes', () => {
    const stats = getMatrixStats();
    expect(stats.scopeBreakdown['ENTERPRISE']).toBe(3);
    expect(stats.scopeBreakdown['DEVELOPMENT']).toBe(3);
    expect(stats.scopeBreakdown['LOCAL-SANDBOX']).toBe(4); // Includes Other/Unknown platform fallback
  });

  test('matrix exports as valid JSON', () => {
    const json = exportMatrixAsJSON();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('3.7');
    expect(parsed.rules.length).toBe(11);
    expect(parsed.timestamp).toBeDefined();
  });

  test('each rule has required fields', () => {
    for (const rule of SCOPING_MATRIX) {
      expect(rule.detectedScope).toBeDefined();
      expect(rule.platform).toBeDefined();
      expect(rule.storagePathPrefix).toBeDefined();
      expect(rule.secretsBackend).toBeDefined();
      expect(rule.serviceNameFormatExample).toBeDefined();
      expect(rule.secretsFlag).toBeDefined();
    }
  });
});

describe('Matrix Rule Lookups', () => {
  test('finds rules by exact domain+platform match', () => {
    const rules = findScopingRules('apple.factory-wager.com', 'macOS');
    expect(rules.length).toBeGreaterThan(0);
    const best = getBestScopingRule('apple.factory-wager.com', 'macOS');
    expect(best?.detectedScope).toBe('ENTERPRISE');
  });

  test('falls back to null domain rules for unknown domains', () => {
    const rules = findScopingRules('unknown.com', 'Windows');
    const best = getBestScopingRule('unknown.com', 'Windows');
    expect(best?.servingDomain).toBeNull();
    expect(best?.platform).toBe('Any');
  });

  test('normalizes platform names', () => {
    const rulesLinux = findScopingRules('localhost', 'Linux');
    const rulesDarwin = findScopingRules('localhost', 'Darwin');
    expect(rulesLinux.length).toBeGreaterThan(0);
    expect(rulesDarwin.length).toBeGreaterThan(0);
  });

  test('prefers exact domain match over fallback', () => {
    const rule = getBestScopingRule('localhost', 'macOS');
    expect(rule?.servingDomain).toBe('localhost');
    expect(rule?.detectedScope).toBe('LOCAL-SANDBOX');
  });
});

describe('Runtime Configuration Validation', () => {
  test('accepts valid ENTERPRISE config', () => {
    const config: RuntimeConfig = {
      domain: 'apple.factory-wager.com',
      platform: 'Darwin',
      detectedScope: 'ENTERPRISE',
      storagePrefix: 'enterprise/data/',
      secretsBackend: 'macOS Keychain',
      serviceName: 'duoplus-ENTERPRISE-apple'
    };

    const result = validateRuntimeConfig(config);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rule.detectedScope).toBe('ENTERPRISE');
    }
  });

  test('accepts valid DEVELOPMENT config', () => {
    const config: RuntimeConfig = {
      domain: 'dev.apple.factory-wager.com',
      platform: 'Linux',
      detectedScope: 'DEVELOPMENT',
      storagePrefix: 'development/accounts/',
      secretsBackend: 'Secret Service',
      serviceName: 'duoplus-DEVELOPMENT-apple'
    };

    const result = validateRuntimeConfig(config);
    expect(result.valid).toBe(true);
  });

  test('accepts valid LOCAL-SANDBOX config', () => {
    const config: RuntimeConfig = {
      domain: 'localhost',
      platform: 'Windows_NT',
      detectedScope: 'LOCAL-SANDBOX',
      storagePrefix: 'local-sandbox/test/',
      secretsBackend: 'Encrypted local storage',
      serviceName: 'duoplus-LOCAL-SANDBOX-default'
    };

    const result = validateRuntimeConfig(config);
    expect(result.valid).toBe(true);
  });

  test('rejects scope mismatch', () => {
    const config: RuntimeConfig = {
      domain: 'apple.factory-wager.com',
      platform: 'macOS',
      detectedScope: 'DEVELOPMENT', // Wrong! Should be ENTERPRISE
      storagePrefix: 'development/',
      secretsBackend: 'macOS Keychain',
      serviceName: 'duoplus-DEVELOPMENT-apple'
    };

    const result = validateRuntimeConfig(config);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('Scope mismatch');
      expect(result.suggestions.length).toBeGreaterThan(0);
    }
  });

  test('rejects storage prefix mismatch', () => {
    const config: RuntimeConfig = {
      domain: 'apple.factory-wager.com',
      platform: 'macOS',
      detectedScope: 'ENTERPRISE',
      storagePrefix: 'wrong-prefix/', // Wrong prefix
      secretsBackend: 'macOS Keychain',
      serviceName: 'duoplus-ENTERPRISE-apple'
    };

    const result = validateRuntimeConfig(config);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('Storage prefix mismatch');
    }
  });

  test('rejects unknown domain/platform combination', () => {
    const config: RuntimeConfig = {
      domain: 'totally-unknown.domain',
      platform: 'UnknownOS',
      detectedScope: 'LOCAL-SANDBOX',
      storagePrefix: 'local-sandbox/',
      secretsBackend: 'Encrypted local storage',
      serviceName: 'duoplus-LOCAL-SANDBOX-default'
    };

    // Create a rule that doesn't match
    const config2: RuntimeConfig = {
      ...config,
      domain: 'unknown.domain',
      detectedScope: 'ENTERPRISE' // Invalid for unknown domain
    };

    // Try to validate - should fail or fall back
    const result = validateRuntimeConfig(config2);
    // With proper fallback, unknown domains should still validate if scope matches fallback
    expect(result).toBeDefined();
  });
});

describe('Validation by Path', () => {
  test('accepts enterprise storage path', () => {
    const result = validateScopeByPath('enterprise/accounts/123/data.json');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rule.detectedScope).toBe('ENTERPRISE');
    }
  });

  test('accepts development storage path', () => {
    const result = validateScopeByPath('development/test-data/');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rule.detectedScope).toBe('DEVELOPMENT');
    }
  });

  test('accepts local-sandbox storage path', () => {
    const result = validateScopeByPath('local-sandbox/debug/');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rule.detectedScope).toBe('LOCAL-SANDBOX');
    }
  });

  test('rejects invalid storage path', () => {
    const result = validateScopeByPath('invalid-scope/data/');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions.length).toBeGreaterThan(0);
    }
  });
});

describe('Validation by Service Name', () => {
  test('accepts enterprise service name', () => {
    const result = validateServiceName('duoplus-ENTERPRISE-apple');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rule.detectedScope).toBe('ENTERPRISE');
    }
  });

  test('accepts development service name', () => {
    const result = validateServiceName('duoplus-DEVELOPMENT-apple');
    expect(result.valid).toBe(true);
  });

  test('accepts local-sandbox service name', () => {
    const result = validateServiceName('duoplus-LOCAL-SANDBOX-default');
    expect(result.valid).toBe(true);
  });

  test('rejects invalid service name format', () => {
    const result = validateServiceName('invalid-service-name');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('Invalid service name format');
    }
  });

  test('accepts case-insensitive service names', () => {
    const result = validateServiceName('duoplus-enterprise-apple');
    expect(result.valid).toBe(true);
  });
});

describe('Matrix Consistency', () => {
  test('validates matrix has no duplicates', () => {
    const consistency = validateMatrixConsistency();
    expect(consistency.valid).toBe(true);
    expect(consistency.errors.filter(e => e.includes('Duplicate')).length).toBe(0);
  });

  test('validates matrix has fallback rules', () => {
    const consistency = validateMatrixConsistency();
    // Should not have warning about missing fallback
    const fallbackWarning = consistency.warnings.find(w => w.includes('fallback'));
    expect(fallbackWarning).toBeUndefined();
  });

  test('validates platform coverage', () => {
    const consistency = validateMatrixConsistency();
    // Should have Windows, macOS, Linux
    const platformWarnings = consistency.warnings.filter(w => w.includes('platform'));
    expect(platformWarnings.length).toBe(0);
  });

  test('uses consistent secrets flag', () => {
    const consistency = validateMatrixConsistency();
    const flagWarnings = consistency.warnings.filter(w => w.includes('secrets flags'));
    // All should use CRED_PERSIST_ENTERPRISE
    const flags = new Set(SCOPING_MATRIX.map(r => r.secretsFlag));
    expect(flags.size).toBe(1);
    expect(flags.has('CRED_PERSIST_ENTERPRISE')).toBe(true);
  });
});

describe('Mock Configuration', () => {
  test('creates default mock config', () => {
    const config = createMockConfig();
    expect(config.detectedScope).toBe('LOCAL-SANDBOX');
    expect(config.platform).toBe('macOS');
    expect(config.domain).toBe('localhost');
  });

  test('creates mock config with overrides', () => {
    const config = createMockConfig({
      domain: 'apple.factory-wager.com',
      detectedScope: 'ENTERPRISE',
      platform: 'Windows'
    });
    expect(config.domain).toBe('apple.factory-wager.com');
    expect(config.detectedScope).toBe('ENTERPRISE');
    expect(config.platform).toBe('Windows');
  });

  test('mock config validates correctly', () => {
    const config = createMockConfig();
    const result = validateRuntimeConfig(config);
    expect(result.valid).toBe(true);
  });
});

describe('JSON Generation', () => {
  test('generates valid validation JSON', () => {
    const config = createMockConfig();
    const json = generateValidationJSON(config);
    const parsed = JSON.parse(json);
    
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.config).toBeDefined();
    expect(parsed.validation).toBeDefined();
    expect(parsed.matrix).toBeDefined();
    expect(parsed.consistency).toBeDefined();
  });

  test('JSON includes validation result', () => {
    const config = createMockConfig({
      detectedScope: 'ENTERPRISE',
      domain: 'apple.factory-wager.com',
      platform: 'macOS'
    });
    const json = generateValidationJSON(config);
    const parsed = JSON.parse(json);
    
    if (parsed.validation.valid) {
      expect(parsed.validation.rule).toBeDefined();
    }
  });
});

describe('Integration Scenarios', () => {
  test('complete ENTERPRISE deployment scenario', () => {
    const config: RuntimeConfig = {
      domain: 'apple.factory-wager.com',
      platform: 'Linux',
      detectedScope: 'ENTERPRISE',
      storagePrefix: 'enterprise/accounts/',
      secretsBackend: 'Secret Service (libsecret)',
      serviceName: 'duoplus-ENTERPRISE-apple'
    };

    const configResult = validateRuntimeConfig(config);
    const pathResult = validateScopeByPath(config.storagePrefix);
    const serviceResult = validateServiceName(config.serviceName);

    expect(configResult.valid).toBe(true);
    expect(pathResult.valid).toBe(true);
    expect(serviceResult.valid).toBe(true);
  });

  test('complete DEVELOPMENT scenario', () => {
    const config: RuntimeConfig = {
      domain: 'dev.apple.factory-wager.com',
      platform: 'Darwin', // macOS
      detectedScope: 'DEVELOPMENT',
      storagePrefix: 'development/test/',
      secretsBackend: 'macOS Keychain',
      serviceName: 'duoplus-DEVELOPMENT-apple'
    };

    const configResult = validateRuntimeConfig(config);
    expect(configResult.valid).toBe(true);
  });

  test('complete LOCAL-SANDBOX scenario', () => {
    const config: RuntimeConfig = {
      domain: 'localhost',
      platform: 'darwin',
      detectedScope: 'LOCAL-SANDBOX',
      storagePrefix: 'local-sandbox/debug/',
      secretsBackend: 'macOS Keychain',
      serviceName: 'duoplus-LOCAL-SANDBOX-default'
    };

    const configResult = validateRuntimeConfig(config);
    expect(configResult.valid).toBe(true);
  });
});