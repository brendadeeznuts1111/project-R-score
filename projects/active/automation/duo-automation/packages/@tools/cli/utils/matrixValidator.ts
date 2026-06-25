/**
 * packages/cli/utils/matrixValidator.ts
 * Runtime validation system for DuoPlus Multi-Tenant Scoping Matrix v3.7
 * 
 * Validates that current runtime configuration matches the scoping matrix,
 * ensuring compliance across scope, platform, storage paths, and secrets backends.
 */

import {
  SCOPING_MATRIX,
  findScopingRules,
  getBestScopingRule,
  getMatrixStats,
  type ScopingRule,
  type Scope,
} from '../data/scopingMatrix';

export interface RuntimeConfig {
  /** Serving domain (e.g., 'apple.factory-wager.com') */
  domain: string | undefined;
  
  /** Detected platform (e.g., Darwin, Linux, Windows_NT) */
  platform: string;
  
  /** Detected scope (ENTERPRISE, DEVELOPMENT, LOCAL-SANDBOX, global) */
  detectedScope: Scope;
  
  /** Storage path prefix being used */
  storagePrefix: string;
  
  /** Secrets backend being used */
  secretsBackend: string;
  
  /** Service name for secrets */
  serviceName: string;
}

export interface ValidationResult {
  valid: true;
  rule: ScopingRule;
  message: string;
}

export interface ValidationFailure {
  valid: false;
  reason: string;
  suggestions: string[];
}

export type ValidationReport = ValidationResult | ValidationFailure;

/**
 * Normalize platform string to standard format
 */
function normalizePlatform(platform: string): string {
  const lower = platform.toLowerCase();
  
  if (lower.includes('darwin') || lower.includes('macos')) {
    return 'macOS';
  }
  if (lower.includes('linux')) {
    return 'Linux';
  }
  if (lower.includes('win')) {
    return 'Windows';
  }
  
  return 'Other';
}

/**
 * Validate current runtime configuration against the scoping matrix
 */
export function validateRuntimeConfig(config: RuntimeConfig): ValidationReport {
  // Normalize platform
  const normalizedPlatform = normalizePlatform(config.platform);

  // Find best matching rule
  const rule = getBestScopingRule(config.domain, normalizedPlatform);

  if (!rule) {
    return {
      valid: false,
      reason: `No scoping matrix rule found for domain="${config.domain}", platform="${config.platform}"`,
      suggestions: [
        'Add new domain/platform combination to scoping matrix',
        'Check SERVING_DOMAIN environment variable',
        'Verify platform detection (use "uname -s")'
      ]
    };
  }

  // Validate scope matches
  if (rule.detectedScope !== config.detectedScope) {
    return {
      valid: false,
      reason: `Scope mismatch: expected "${rule.detectedScope}", got "${config.detectedScope}" for domain="${config.domain}"/platform="${normalizedPlatform}"`,
      suggestions: [
        `Use scope: ${rule.detectedScope}`,
        'Check CLI_SCOPE or DASHBOARD_SCOPE environment variables',
        'Verify domain detection (SERVING_DOMAIN or URL parsing)'
      ]
    };
  }

  // Validate storage prefix matches
  if (!config.storagePrefix.startsWith(rule.storagePathPrefix)) {
    return {
      valid: false,
      reason: `Storage prefix mismatch: expected to start with "${rule.storagePathPrefix}", got "${config.storagePrefix}"`,
      suggestions: [
        `Update storage prefix to: ${rule.storagePathPrefix}`,
        'Check path configuration in config-manager.ts',
        'Verify scope is correctly detected'
      ]
    };
  }

  // Validate secrets backend matches (soft check - warn if different)
  if (!config.secretsBackend.toLowerCase().includes(rule.secretsBackend.toLowerCase().split(' ')[0])) {
    // This is informational - different wording is acceptable
    console.warn(`⚠️  Secrets backend may differ: expected "${rule.secretsBackend}", got "${config.secretsBackend}"`);
  }

  return {
    valid: true,
    rule,
    message: `✅ Configuration is valid: domain="${config.domain}", platform="${normalizedPlatform}", scope="${rule.detectedScope}"`
  };
}

/**
 * Validate scope by path
 */
export function validateScopeByPath(storagePath: string): ValidationReport {
  // Extract scope from storage path (e.g., 'enterprise/...' -> 'enterprise')
  const pathScope = storagePath.split('/')[0];

  const matchingRules = SCOPING_MATRIX.filter(rule =>
    rule.storagePathPrefix.toLowerCase().includes(pathScope.toLowerCase())
  );

  if (matchingRules.length === 0) {
    return {
      valid: false,
      reason: `No matrix rules found for storage path: "${storagePath}"`,
      suggestions: [
        'Check storage path configuration',
        'Verify path begins with valid scope: enterprise/, development/, local-sandbox/, or global/',
        'Review config-manager.ts getScopedStoragePath()'
      ]
    };
  }

  const rule = matchingRules[0];
  return {
    valid: true,
    rule,
    message: `✅ Storage path is valid: "${storagePath}" matches scope "${rule.detectedScope}"`
  };
}

/**
 * Validate scope by secrets service name
 */
export function validateServiceName(serviceName: string): ValidationReport {
  // Extract scope from service name (e.g., 'duoplus-ENTERPRISE-apple' -> 'ENTERPRISE')
  const scopeMatch = serviceName.match(/-(ENTERPRISE|DEVELOPMENT|LOCAL-SANDBOX|GLOBAL)-/i);

  if (!scopeMatch) {
    return {
      valid: false,
      reason: `Invalid service name format: "${serviceName}"`,
      suggestions: [
        'Service name must include scope: duoplus-{SCOPE}-{team}',
        'Valid scopes: ENTERPRISE, DEVELOPMENT, LOCAL-SANDBOX, GLOBAL',
        'Example: duoplus-ENTERPRISE-apple'
      ]
    };
  }

  const configuredScope = scopeMatch[1].toUpperCase() as Scope;

  const matchingRules = SCOPING_MATRIX.filter(
    rule => rule.detectedScope === configuredScope || rule.detectedScope === configuredScope.toLowerCase()
  );

  if (matchingRules.length === 0) {
    return {
      valid: false,
      reason: `No matrix rules found for scope in service name: "${serviceName}"`,
      suggestions: [
        `Use valid scope: ENTERPRISE, DEVELOPMENT, LOCAL-SANDBOX, or GLOBAL`,
        `Example: duoplus-${configuredScope}-apple`
      ]
    };
  }

  return {
    valid: true,
    rule: matchingRules[0],
    message: `✅ Service name is valid: "${serviceName}" uses scope "${configuredScope}"`
  };
}

/**
 * Get all matrix statistics for debugging/reporting
 */
export function getMatrixReport(): {
  version: string;
  timestamp: string;
  stats: ReturnType<typeof getMatrixStats>;
  rulesCount: number;
} {
  return {
    version: '3.7',
    timestamp: new Date().toISOString(),
    stats: getMatrixStats(),
    rulesCount: SCOPING_MATRIX.length
  };
}

/**
 * Validate all matrix rules for internal consistency
 */
export function validateMatrixConsistency(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate combinations
  const combinations = new Set<string>();
  for (const rule of SCOPING_MATRIX) {
    const key = `${rule.servingDomain}|${rule.platform}`;
    if (combinations.has(key)) {
      errors.push(`Duplicate rule: domain="${rule.servingDomain}" + platform="${rule.platform}"`);
    }
    combinations.add(key);
  }

  // Check for null domain rules (should be fallback only)
  const nullDomainRules = SCOPING_MATRIX.filter(r => r.servingDomain === null);
  if (nullDomainRules.length === 0) {
    warnings.push('No fallback rules (null domain) defined - may cause issues with unknown domains');
  }

  // Check for platform coverage
  const platforms = new Set(SCOPING_MATRIX.map(r => r.platform));
  const expectedPlatforms = ['Windows', 'macOS', 'Linux'];
  for (const expected of expectedPlatforms) {
    if (!platforms.has(expected)) {
      warnings.push(`Missing platform coverage: ${expected}`);
    }
  }

  // Check secrets flag consistency
  const uniqueFlags = new Set(SCOPING_MATRIX.map(r => r.secretsFlag));
  if (uniqueFlags.size > 1) {
    warnings.push(`Multiple secrets flags detected: ${Array.from(uniqueFlags).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate validation report as JSON for tooling
 */
export function generateValidationJSON(config: RuntimeConfig): string {
  const validation = validateRuntimeConfig(config);
  
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    config,
    validation,
    matrix: getMatrixReport(),
    consistency: validateMatrixConsistency()
  }, null, 2);
}

/**
 * Create mock config for testing
 */
export function createMockConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  return {
    domain: 'localhost',
    platform: 'macOS',
    detectedScope: 'LOCAL-SANDBOX',
    storagePrefix: 'local-sandbox/',
    secretsBackend: 'macOS Keychain',
    serviceName: 'duoplus-LOCAL-SANDBOX-default',
    ...overrides
  };
}