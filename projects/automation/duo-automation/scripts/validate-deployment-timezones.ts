#!/usr/bin/env bun
// scripts/validate-deployment-timezones.ts
// CI script to validate all deployed scopes have valid timezones in .env files

import { TIMEZONE_MATRIX } from '../config/constants-v37';

interface ValidationResult {
  file: string;
  scope: string;
  timezone: string;
  valid: boolean;
  error?: string;
}

const validScopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
const validTimezones = Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS);

async function validateEnvFile(filePath: string): Promise<ValidationResult> {
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return {
        file: filePath,
        scope: 'MISSING',
        timezone: 'MISSING',
        valid: false,
        error: 'File does not exist'
      };
    }

    const content = await file.text();
    const lines = content.split('\n');
    
    let scope = '';
    let timezone = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DASHBOARD_SCOPE=')) {
        scope = trimmed.split('=')[1] || '';
      }
      if (trimmed.startsWith('SCOPE_TIMEZONE=')) {
        timezone = trimmed.split('=')[1] || '';
      }
    }

    if (!scope) {
      return {
        file: filePath,
        scope: 'NOT_SET',
        timezone: timezone || 'NOT_SET',
        valid: false,
        error: 'DASHBOARD_SCOPE not found'
      };
    }

    if (!validScopes.includes(scope)) {
      return {
        file: filePath,
        scope,
        timezone: timezone || 'NOT_SET',
        valid: false,
        error: `Invalid scope: ${scope}. Must be one of: ${validScopes.join(', ')}`
      };
    }

    if (!timezone) {
      return {
        file: filePath,
        scope,
        timezone: 'NOT_SET',
        valid: false,
        error: 'SCOPE_TIMEZONE not found'
      };
    }

    if (!validTimezones.includes(timezone)) {
      return {
        file: filePath,
        scope,
        timezone,
        valid: false,
        error: `Invalid timezone: ${timezone}. Must be one of: ${validTimezones.join(', ')}`
      };
    }

    return {
      file: filePath,
      scope,
      timezone,
      valid: true
    };

  } catch (error) {
    return {
      file: filePath,
      scope: 'ERROR',
      timezone: 'ERROR',
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🔍 Validating deployment timezone configurations...\n');

  const envFiles = [
    '.env.enterprise',
    '.env.development', 
    '.env.local',
    '.env.production',
    '.env'
  ];

  const results: ValidationResult[] = [];

  for (const file of envFiles) {
    const result = await validateEnvFile(file);
    results.push(result);
    
    if (result.valid) {
      console.log(`✅ ${file}: ${result.scope} → ${result.timezone}`);
    } else {
      console.log(`❌ ${file}: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.length - validCount;

  if (invalidCount > 0) {
    console.error(`❌ Validation failed: ${invalidCount}/${results.length} files have issues`);
    console.error('\nInvalid configurations:');
    results.filter(r => !r.valid).forEach(r => {
      console.error(`  - ${r.file}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log(`✅ All ${validCount} environment files validated successfully`);
    console.log('🎯 All deployments have valid timezone configurations');
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal execution error:', error);
    process.exit(1);
  });
}