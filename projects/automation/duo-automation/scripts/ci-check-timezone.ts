#!/usr/bin/env bun
// ci-check-timezone.ts
// CI validation script for timezone configuration

import { validateAndSetTimezone, getTimezoneFromScope, initializeScopeTimezone } from '../bootstrap-timezone';

const errors: string[] = [];

console.log('🔍 CI Timezone Validation\n');

// Test 1: Valid timezone validation
console.log('Test 1: Valid timezone validation...');
try {
  process.env.SCOPE_TIMEZONE = 'America/New_York';
  const config = validateAndSetTimezone();
  console.log(`✅ Valid timezone: ${config.scopeTimezone} (${config.actualTz})`);
} catch (error) {
  errors.push(`Valid timezone test failed: ${error instanceof Error ? error.message : String(error)}`);
}

// Test 2: Invalid timezone rejection
console.log('\nTest 2: Invalid timezone rejection...');
try {
  process.env.SCOPE_TIMEZONE = 'Invalid/Timezone';
  validateAndSetTimezone();
  errors.push('Should have rejected invalid timezone');
} catch (error) {
  console.log(`✅ Correctly rejected: ${error instanceof Error ? error.message : String(error)}`);
}

// Test 3: Missing timezone handling
console.log('\nTest 3: Missing timezone handling...');
try {
  delete process.env.SCOPE_TIMEZONE;
  validateAndSetTimezone();
  errors.push('Should have rejected missing timezone');
} catch (error) {
  console.log(`✅ Correctly handled missing: ${error instanceof Error ? error.message : String(error)}`);
}

// Test 4: Scope-based timezone mapping
console.log('\nTest 4: Scope-based timezone mapping...');
try {
  const enterpriseTz = getTimezoneFromScope('ENTERPRISE');
  const devTz = getTimezoneFromScope('DEVELOPMENT');
  const localTz = getTimezoneFromScope('LOCAL-SANDBOX');
  
  console.log(`✅ ENTERPRISE → ${enterpriseTz}`);
  console.log(`✅ DEVELOPMENT → ${devTz}`);
  console.log(`✅ LOCAL-SANDBOX → ${localTz}`);
  
  // Test invalid scope
  try {
    getTimezoneFromScope('INVALID_SCOPE');
    errors.push('Should have rejected invalid scope');
  } catch (error) {
    console.log(`✅ Correctly rejected invalid scope`);
  }
} catch (error) {
  errors.push(`Scope mapping test failed: ${error instanceof Error ? error.message : String(error)}`);
}

// Test 5: Full initialization
console.log('\nTest 5: Full scope initialization...');
try {
  const config = initializeScopeTimezone('ENTERPRISE');
  console.log(`✅ Full init: ${config.scopeTimezone} (UTC: ${config.isUtc})`);
} catch (error) {
  errors.push(`Full initialization test failed: ${error instanceof Error ? error.message : String(error)}`);
}

// Results
console.log('\n' + '='.repeat(50));
if (errors.length > 0) {
  console.error('❌ CI Validation Failed:');
  errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
} else {
  console.log('✅ All timezone validation tests passed');
  console.log('🎯 Ready for production deployment');
}
