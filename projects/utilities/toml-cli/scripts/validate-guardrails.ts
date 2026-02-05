#!/usr/bin/env bun

/**
 * Guardrail System Validator
 * 
 * Comprehensive validation to tighten guardrails across:
 * - Code architecture
 * - Security boundaries
 * - Type safety
 * - Performance constraints
 * - Deployment readiness
 * 
 * Run: bun scripts/validate-guardrails.ts
 * CI Integration: Run before every merge
 */

import { DUOPLUS_SCOPING_MATRIX } from '../data/scopingMatrixEnhanced';
import { readFileSync } from 'fs';

interface GuardrailTest {
  name: string;
  category: string;
  check: () => Promise<{ passed: boolean; message: string }>;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * GUARDRAIL 1: Security Isolation
 */
async function checkScopeIsolation(): Promise<{ passed: boolean; message: string }> {
  try {
    // Verify each scope has isolated storage path
    const scopes = new Set<string>();
    const paths = new Map<string, string[]>();
    
    for (const row of DUOPLUS_SCOPING_MATRIX) {
      scopes.add(row.detectedScope);
      
      if (!paths.has(row.detectedScope)) {
        paths.set(row.detectedScope, []);
      }
      paths.get(row.detectedScope)!.push(row.storagePath);
    }
    
    // Check: storage paths don't overlap between scopes
    const allPaths = new Map<string, string>();
    for (const [scope, scopePaths] of paths) {
      for (const path of scopePaths) {
        if (allPaths.has(path) && allPaths.get(path) !== scope) {
          return {
            passed: false,
            message: `⚠️  Path '${path}' used by multiple scopes`,
          };
        }
        allPaths.set(path, scope);
      }
    }
    
    return {
      passed: true,
      message: `✅ Scope isolation: ${scopes.size} scopes with isolated paths`,
    };
  } catch (err) {
    return {
      passed: false,
      message: `❌ Scope isolation check failed: ${err}`,
    };
  }
}

/**
 * GUARDRAIL 2: Feature Flag Coverage
 */
async function checkFeatureFlagCoverage(): Promise<{ passed: boolean; message: string }> {
  try {
    const featureCounts = new Map<string, number>();
    
    for (const row of DUOPLUS_SCOPING_MATRIX) {
      for (const flag of row.featureFlags) {
        featureCounts.set(flag, (featureCounts.get(flag) || 0) + 1);
      }
    }
    
    // Check: No single feature used by all rows (shows poor differentiation)
    const totalRows = DUOPLUS_SCOPING_MATRIX.length;
    let hasOveruseFlag = false;
    
    for (const [flag, count] of featureCounts) {
      if (count >= totalRows - 1) {
        hasOveruseFlag = true;
      }
    }
    
    if (hasOveruseFlag) {
      return {
        passed: false,
        message: `⚠️  Some flags used in nearly all rows (poor differentiation)`,
      };
    }
    
    return {
      passed: true,
      message: `✅ Feature flag coverage: ${featureCounts.size} unique flags`,
    };
  } catch (err) {
    return {
      passed: false,
      message: `❌ Feature flag coverage check failed: ${err}`,
    };
  }
}

/**
 * GUARDRAIL 3: Secrets Backend Appropriateness
 */
async function checkSecretsBackends(): Promise<{ passed: boolean; message: string }> {
  try {
    const validBackends = [
      'Windows Credential Manager',
      'macOS Keychain',
      'Secret Service (libsecret)',
      'Secret Service',
      'Encrypted local storage',
    ];
    
    for (const row of DUOPLUS_SCOPING_MATRIX) {
      // Check if backend is in our list or contains substring
      const isValid = validBackends.some(backend => 
        row.secretsBackend === backend ||
        row.secretsBackend.includes(backend) ||
        backend.includes(row.secretsBackend.split('(')[0].trim())
      );
      
      if (!isValid) {
        return {
          passed: false,
          message: `❌ Invalid secrets backend: ${row.secretsBackend}`,
        };
      }
      
      // Check: Backend matches platform
      const platformBackends: Record<string, string[]> = {
        'Windows': ['Windows Credential Manager', 'Encrypted local storage'],
        'macOS': ['macOS Keychain', 'Encrypted local storage'],
        'Linux': ['Secret Service', 'libsecret', 'Encrypted local storage'],
        'Other': ['Encrypted local storage'],
      };
      
      const allowedForPlatform = platformBackends[row.platform] || [];
      const backendMatches = allowedForPlatform.some(backend =>
        row.secretsBackend.includes(backend) ||
        row.secretsBackend === backend
      );
      
      if (!backendMatches) {
        return {
          passed: false,
          message: `❌ ${row.secretsBackend} not appropriate for ${row.platform}`,
        };
      }
    }
    
    return {
      passed: true,
      message: `✅ Secrets backend: All backends platform-appropriate`,
    };
  } catch (err) {
    return {
      passed: false,
      message: `❌ Secrets backend check failed: ${err}`,
    };
  }
}

/**
 * GUARDRAIL 4: Type Safety Requirements
 */
async function checkTypeSafety(): Promise<{ passed: boolean; message: string }> {
  try {
    // Check: tsconfig.json exists and has strict mode
    const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8'));
    
    const strictChecks = [
      'strict',
      'noImplicitAny',
      'strictNullChecks',
      'strictFunctionTypes',
    ];
    
    for (const check of strictChecks) {
      if (tsconfig.compilerOptions[check] !== true) {
        return {
          passed: false,
          message: `❌ TypeScript: ${check} not enabled`,
        };
      }
    }
    
    return {
      passed: true,
      message: `✅ Type safety: All strict checks enabled`,
    };
  } catch (err) {
    return {
      passed: false,
      message: `❌ Type safety check failed: ${err}`,
    };
  }
}

/**
 * GUARDRAIL 5: Matrix Completeness
 */
async function checkMatrixCompleteness(): Promise<{ passed: boolean; message: string }> {
  try {
    const errors: string[] = [];
    
    for (let i = 0; i < DUOPLUS_SCOPING_MATRIX.length; i++) {
      const row = DUOPLUS_SCOPING_MATRIX[i];
      
      // Check: All required fields present
      const requiredFields = [
        'servingDomain',
        'detectedScope',
        'platform',
        'storagePath',
        'secretsBackend',
        'featureFlags',
        'apiStrategy',
      ];
      
      for (const field of requiredFields) {
        const value = (row as any)[field];
        if (value === undefined || value === null || value === '') {
          errors.push(`Row ${i}: Missing ${field}`);
        }
      }
      
      // Check: Feature flags is array
      if (!Array.isArray(row.featureFlags)) {
        errors.push(`Row ${i}: featureFlags not an array`);
      }
      
      // Check: Storage path has trailing slash
      if (row.storagePath && !row.storagePath.endsWith('/')) {
        errors.push(`Row ${i}: Storage path missing trailing slash`);
      }
    }
    
    if (errors.length > 0) {
      return {
        passed: false,
        message: `❌ Matrix completeness: ${errors.length} issues\n   ${errors.join('\n   ')}`,
      };
    }
    
    return {
      passed: true,
      message: `✅ Matrix completeness: ${DUOPLUS_SCOPING_MATRIX.length} rows complete`,
    };
  } catch (err) {
    return {
      passed: false,
      message: `❌ Matrix completeness check failed: ${err}`,
    };
  }
}

/**
 * GUARDRAIL 6: Scope Context Validation
 */
async function checkScopeContext(): Promise<{ passed: boolean; message: string }> {
  try {
    const validScopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX', 'global'];
    const foundScopes = new Set<string>();
    
    for (const row of DUOPLUS_SCOPING_MATRIX) {
      foundScopes.add(row.detectedScope);
      
      if (!validScopes.includes(row.detectedScope)) {
        return {
          passed: false,
          message: `❌ Invalid scope: ${row.detectedScope}`,
        };
      }
    }
    
    // Check: All required scopes present
    for (const scope of validScopes) {
      if (!foundScopes.has(scope)) {
        return {
          passed: false,
          message: `❌ Missing scope: ${scope}`,
        };
      }
    }
    
    return {
      passed: true,
      message: `✅ Scope context: All ${foundScopes.size} scopes present and valid`,
    };
  } catch (err) {
    return {
      passed: false,
      message: `❌ Scope context check failed: ${err}`,
    };
  }
}

/**
 * GUARDRAIL 7: Production Readiness
 */
async function checkProductionReadiness(): Promise<{ passed: boolean; message: string }> {
  try {
    const issues: string[] = [];
    
    // Check: No localhost in ENTERPRISE scope
    const enterpriseHasLocalhost = DUOPLUS_SCOPING_MATRIX.some(
      r => r.detectedScope === 'ENTERPRISE' && r.servingDomain === 'localhost'
    );
    if (enterpriseHasLocalhost) {
      issues.push('ENTERPRISE scope contains localhost');
    }
    
    // Check: DEVELOPMENT scope uses dev domain
    const devNoDevDomain = DUOPLUS_SCOPING_MATRIX.filter(
      r => r.detectedScope === 'DEVELOPMENT'
    ).every(r => !r.servingDomain?.startsWith('dev.'));
    if (devNoDevDomain) {
      issues.push('DEVELOPMENT scope missing dev prefix in domains');
    }
    
    // Check: LOCAL-SANDBOX only uses localhost
    const sandboxInvalidDomain = DUOPLUS_SCOPING_MATRIX.filter(
      r => r.detectedScope === 'LOCAL-SANDBOX'
    ).some(r => r.servingDomain !== 'localhost');
    if (sandboxInvalidDomain) {
      issues.push('LOCAL-SANDBOX scope contains non-localhost domains');
    }
    
    if (issues.length > 0) {
      return {
        passed: false,
        message: `⚠️  Production readiness: ${issues.length} issues\n   ${issues.join('\n   ')}`,
      };
    }
    
    return {
      passed: true,
      message: `✅ Production readiness: All scope/domain assignments correct`,
    };
  } catch (err) {
    return {
      passed: false,
      message: `❌ Production readiness check failed: ${err}`,
    };
  }
}

/**
 * Run all guardrail tests
 */
async function main() {
  console.log('🛡️  GUARDRAIL VALIDATION SYSTEM\n');
  console.log('=' .repeat(60));
  
  const tests: GuardrailTest[] = [
    {
      name: 'Scope Isolation',
      category: 'Security',
      check: checkScopeIsolation,
      severity: 'critical',
    },
    {
      name: 'Feature Flag Coverage',
      category: 'Architecture',
      check: checkFeatureFlagCoverage,
      severity: 'high',
    },
    {
      name: 'Secrets Backend',
      category: 'Security',
      check: checkSecretsBackends,
      severity: 'critical',
    },
    {
      name: 'Type Safety',
      category: 'Quality',
      check: checkTypeSafety,
      severity: 'high',
    },
    {
      name: 'Matrix Completeness',
      category: 'Data Quality',
      check: checkMatrixCompleteness,
      severity: 'critical',
    },
    {
      name: 'Scope Context',
      category: 'Configuration',
      check: checkScopeContext,
      severity: 'critical',
    },
    {
      name: 'Production Readiness',
      category: 'Deployment',
      check: checkProductionReadiness,
      severity: 'high',
    },
  ];
  
  const results: { name: string; result: Awaited<ReturnType<GuardrailTest['check']>>; severity: string }[] = [];
  
  for (const test of tests) {
    process.stdout.write(`  🧪 ${test.name}...`);
    const result = await test.check();
    console.log(` ${result.passed ? '✅' : '❌'}`);
    results.push({ name: test.name, result, severity: test.severity });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESULTS:\n');
  
  let criticalFailures = 0;
  let highFailures = 0;
  
  for (const { name, result, severity } of results) {
    console.log(`  ${result.passed ? '✅' : '❌'} ${name}`);
    console.log(`     ${result.message}`);
    
    if (!result.passed) {
      if (severity === 'critical') criticalFailures++;
      else if (severity === 'high') highFailures++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📈 Summary:`);
  console.log(`   Total: ${results.length}`);
  console.log(`   Passed: ${results.filter(r => r.result.passed).length}`);
  console.log(`   Failed: ${results.filter(r => !r.result.passed).length}`);
  console.log(`   Critical Issues: ${criticalFailures}`);
  console.log(`   High Issues: ${highFailures}\n`);
  
  if (criticalFailures > 0) {
    console.log('❌ CRITICAL ISSUES BLOCKING DEPLOYMENT\n');
    process.exit(1);
  } else if (highFailures > 0) {
    console.log('⚠️  HIGH PRIORITY ISSUES DETECTED\n');
    process.exit(0); // Warning but allow to continue
  } else {
    console.log('✅ ALL GUARDRAILS PASSING - PRODUCTION READY\n');
    process.exit(0);
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error('❌ Validation failed:', err);
    process.exit(1);
  });
}

export {
  checkScopeIsolation,
  checkFeatureFlagCoverage,
  checkSecretsBackends,
  checkTypeSafety,
  checkMatrixCompleteness,
  checkScopeContext,
  checkProductionReadiness,
};
