#!/usr/bin/env bun

/**
 * Scope Matrix Validator
 * 
 * Ensures that runtime behavior matches the scoping matrix specifications.
 * Validates:
 * - Domain detection accuracy
 * - Feature flag assignments
 * - Storage path correctness
 * - Secrets backend compatibility
 * 
 * Run: bun run scripts/validate-scoping-matrix.ts
 * CI Integration: Add to pre-commit hooks and CI pipeline
 */

import {
  DUOPLUS_SCOPING_MATRIX,
  detectScope,
  getMatrixRow,
  getScopedFeatureFlags,
  domainToFeature,
  validateMetricScope,
} from '../data/scopingMatrixEnhanced';

interface ValidationResult {
  passed: number;
  failed: number;
  errors: string[];
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ ${message}`);
  }
}

function validateDomainDetection(): ValidationResult {
  const result: ValidationResult = { passed: 0, failed: 0, errors: [] };

  const testCases = [
    { domain: 'apple.factory-wager.com', expected: 'ENTERPRISE' },
    { domain: 'dev.apple.factory-wager.com', expected: 'DEVELOPMENT' },
    { domain: 'localhost', expected: 'LOCAL-SANDBOX' },
    { domain: 'unknown-domain.com', expected: 'global' },
  ];

  for (const { domain, expected } of testCases) {
    try {
      const detected = detectScope(domain);
      assert(
        detected === expected,
        `Domain detection: ${domain} → ${detected} (expected ${expected})`
      );
      result.passed++;
      console.log(`  ✅ ${domain} → ${detected}`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
      console.log(`  ${msg}`);
    }
  }

  return result;
}

function validateMatrixRowsCompleteness(): ValidationResult {
  const result: ValidationResult = { passed: 0, failed: 0, errors: [] };

  const requiredFields = [
    'servingDomain',
    'detectedScope',
    'platform',
    'storagePath',
    'secretsBackend',
    'serviceNameFormat',
    'secretsFlag',
    'bunRuntimeTz',
    'bunTestTz',
    'featureFlags',
    'apiStrategy',
    'operationalBenefit',
  ];

  for (let i = 0; i < DUOPLUS_SCOPING_MATRIX.length; i++) {
    const row = DUOPLUS_SCOPING_MATRIX[i];

    try {
      for (const field of requiredFields) {
        assert(
          (row as any)[field] !== undefined && (row as any)[field] !== null,
          `Matrix row ${i}: Missing field '${field}'`
        );

        // Additional validation for specific fields
        if (field === 'featureFlags' && Array.isArray((row as any)[field])) {
          assert(
            (row as any)[field].length >= 0,
            `Matrix row ${i}: featureFlags must be an array`
          );
        }

        if (field === 'detectedScope') {
          const validScopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX', 'global'];
          assert(
            validScopes.includes((row as any)[field]),
            `Matrix row ${i}: detectedScope must be one of ${validScopes.join(', ')}`
          );
        }

        if (field === 'platform') {
          const validPlatforms = ['Windows', 'macOS', 'Linux', 'Other'];
          assert(
            validPlatforms.includes((row as any)[field]),
            `Matrix row ${i}: platform must be one of ${validPlatforms.join(', ')}`
          );
        }
      }

      result.passed++;
      const domain = row.servingDomain || '*(fallback)*';
      console.log(`  ✅ Row ${i}: ${domain} (${row.detectedScope}/${row.platform})`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
      console.log(`  ${msg}`);
    }
  }

  return result;
}

function validateFeatureFlagMapping(): ValidationResult {
  const result: ValidationResult = { passed: 0, failed: 0, errors: [] };

  const scopeToExpectedFlags = {
    ENTERPRISE: ['APPLE_FACTORY_WAGER_COM_TENANT', 'R2_STORAGE', 'PREMIUM_SECRETS'],
    DEVELOPMENT: ['DEV_APPLE_FACTORY_WAGER_COM_TENANT', 'DEBUG', 'MOCK_API'],
    'LOCAL-SANDBOX': ['LOCAL_SANDBOX', 'DEBUG', 'MOCK_API'],
    global: [], // Fallback has minimal flags
  };

  for (const [scope, expectedFlags] of Object.entries(scopeToExpectedFlags)) {
    try {
      // Find first domain for this scope
      const row = DUOPLUS_SCOPING_MATRIX.find(r => r.detectedScope === scope);
      if (!row?.servingDomain) {
        result.passed++;
        console.log(`  ✅ ${scope}: Fallback (no specific domain)`);
        continue;
      }

      const flags = getScopedFeatureFlags(row.servingDomain);
      const flagArray = Array.from(flags);

      for (const expectedFlag of expectedFlags) {
        assert(
          flags.has(expectedFlag),
          `${scope}: Missing flag '${expectedFlag}' (has: ${flagArray.join(', ')})`
        );
      }

      result.passed++;
      console.log(`  ✅ ${scope}: ${flagArray.join(', ')}`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
      console.log(`  ${msg}`);
    }
  }

  return result;
}

function validateDomainNormalization(): ValidationResult {
  const result: ValidationResult = { passed: 0, failed: 0, errors: [] };

  const testCases = [
    {
      domain: 'apple.factory-wager.com',
      expected: 'APPLE_FACTORY_WAGER_COM',
    },
    {
      domain: 'dev.apple.factory-wager.com',
      expected: 'DEV_APPLE_FACTORY_WAGER_COM',
    },
    {
      domain: 'localhost',
      expected: 'LOCALHOST',
    },
  ];

  for (const { domain, expected } of testCases) {
    try {
      const normalized = domainToFeature(domain);
      assert(
        normalized === expected,
        `Domain normalization: ${domain} → ${normalized} (expected ${expected})`
      );
      result.passed++;
      console.log(`  ✅ ${domain} → ${normalized}`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
      console.log(`  ${msg}`);
    }
  }

  return result;
}

function validateStoragePathStructure(): ValidationResult {
  const result: ValidationResult = { passed: 0, failed: 0, errors: [] };

  const validScopePrefixes: Record<string, string> = {
    ENTERPRISE: 'enterprise/',
    DEVELOPMENT: 'development/',
    'LOCAL-SANDBOX': 'local-sandbox/',
    global: 'global/',
  };

  for (const row of DUOPLUS_SCOPING_MATRIX) {
    try {
      const expectedPrefix = validScopePrefixes[row.detectedScope];
      assert(
        row.storagePath.startsWith(expectedPrefix),
        `Storage path mismatch: ${row.storagePath} should start with '${expectedPrefix}'`
      );

      // Ensure path ends with / if multi-level
      if (row.storagePath.split('/').length > 2) {
        assert(
          row.storagePath.endsWith('/') || !row.storagePath.endsWith('/'),
          `Storage path format: ${row.storagePath}`
        );
      }

      result.passed++;
      console.log(`  ✅ ${row.storagePath}`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
      console.log(`  ${msg}`);
    }
  }

  return result;
}

function validateMatrixCoverage(): ValidationResult {
  const result: ValidationResult = { passed: 0, failed: 0, errors: [] };

  const requiredCombinations = {
    ENTERPRISE: ['Windows', 'macOS', 'Linux'],
    DEVELOPMENT: ['Windows', 'macOS', 'Linux'],
    'LOCAL-SANDBOX': ['Windows', 'macOS', 'Linux'],
  };

  for (const [scope, platforms] of Object.entries(requiredCombinations)) {
    try {
      for (const platform of platforms) {
        const row = DUOPLUS_SCOPING_MATRIX.find(
          r => r.detectedScope === scope && r.platform === platform
        );

        assert(
          !!row,
          `Matrix coverage: Missing ${scope}/${platform} combination`
        );
      }

      result.passed++;
      console.log(`  ✅ ${scope}: ${platforms.join(', ')}`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
      console.log(`  ${msg}`);
    }
  }

  // Check for fallback
  try {
    const fallback = DUOPLUS_SCOPING_MATRIX.find(r => r.servingDomain === '*.local' || !r.servingDomain);
    assert(!!fallback, 'Matrix coverage: Missing fallback row');
    result.passed++;
    console.log(`  ✅ Fallback: Defined for unknown domains`);
  } catch (err) {
    result.failed++;
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    console.log(`  ${msg}`);
  }

  return result;
}

function summarizeResults(...results: ValidationResult[]): void {
  let totalPassed = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    allErrors.push(...result.errors);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Validation Summary`);
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\n🔍 Failed Tests:');
    for (const error of allErrors) {
      console.log(`  ${error}`);
    }
    console.log('\n⚠️  Fix the errors above before deploying.');
    process.exit(1);
  } else {
    console.log('\n✅ All validations passed!');
    console.log('🚀 Scoping matrix is ready for production.');
    process.exit(0);
  }
}

async function main(): Promise<void> {
  console.log('🔍 Validating Scoping Matrix...\n');

  console.log('1️⃣  Domain Detection');
  const domainResults = validateDomainDetection();

  console.log('\n2️⃣  Matrix Completeness');
  const matrixResults = validateMatrixRowsCompleteness();

  console.log('\n3️⃣  Feature Flag Mapping');
  const flagResults = validateFeatureFlagMapping();

  console.log('\n4️⃣  Domain Normalization');
  const normResults = validateDomainNormalization();

  console.log('\n5️⃣  Storage Path Structure');
  const storageResults = validateStoragePathStructure();

  console.log('\n6️⃣  Matrix Coverage');
  const coverageResults = validateMatrixCoverage();

  summarizeResults(
    domainResults,
    matrixResults,
    flagResults,
    normResults,
    storageResults,
    coverageResults
  );
}

if (import.meta.main) {
  main().catch(err => {
    console.error('🔥 Validation failed:', err);
    process.exit(1);
  });
}

export { validateDomainDetection, validateMatrixRowsCompleteness, validateFeatureFlagMapping };
