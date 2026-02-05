#!/usr/bin/env bun
// scripts/validate-canonical-timezones.ts
// Empire Pro v3.7 - Canonical timezone validator for tzdb 2025c compliance

import { TIMEZONE_MATRIX } from '../config/constants-v37.ts';
import { getTimezoneFromScope } from '../bootstrap-timezone.ts';

console.log('🌍 Empire Pro v3.7 - Canonical Timezone Validator');
console.log('==================================================\n');

// Official Canonical zones from tz database 2025c
const CANONICAL_ZONES_2025C = new Set([
  // North America
  'America/New_York',
  'America/Chicago', 
  'America/Los_Angeles',
  'America/Denver',
  'America/Phoenix',
  'America/Anchorage',
  'America/Halifax',
  'America/St_Johns',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  
  // Europe
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/Moscow',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/Brussels',
  
  // Asia
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Seoul',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Tehran',
  'Asia/Karachi',
  
  // Africa
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Africa/Casablanca',
  
  // Oceania
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Pacific/Auckland',
  'Pacific/Fiji',
  
  // UTC and Etc zones
  'UTC',
  'Etc/UTC',
  'Etc/GMT',
  'Etc/GMT+0',
  'Etc/GMT-0'
]);

// Deprecated Link zones to avoid
const DEPRECATED_LINK_ZONES = new Set([
  'US/Eastern',      // Links to America/New_York
  'US/Central',      // Links to America/Chicago
  'US/Mountain',     // Links to America/Denver
  'US/Pacific',      // Links to America/Los_Angeles
  'US/Arizona',      // Links to America/Phoenix
  'GMT',             // Links to Etc/GMT
  'Europe/Berlin',   // Historically problematic
  'Asia/Calcutta',   // Links to Asia/Kolkata (deprecated)
  'Asia/Bombay',     // Links to Asia/Kolkata (deprecated)
  'Asia/Rangoon',    // Links to Asia/Yangon (deprecated)
  'Pacific/Truk',    // Links to Pacific/Chuuk (deprecated)
]);

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalChecked: number;
    canonicalCount: number;
    deprecatedCount: number;
    invalidCount: number;
  };
}

function validateTimezone(zone: string): { isCanonical: boolean; isDeprecated: boolean; isValid: boolean } {
  const isCanonical = CANONICAL_ZONES_2025C.has(zone);
  const isDeprecated = DEPRECATED_LINK_ZONES.has(zone);
  const isValid = isCanonical && !isDeprecated;
  
  return { isCanonical, isDeprecated, isValid };
}

function validateTimezoneMatrix(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      totalChecked: 0,
      canonicalCount: 0,
      deprecatedCount: 0,
      invalidCount: 0
    }
  };

  console.log('🔍 Validating TIMEZONE_MATRIX.BASELINE_OFFSETS...\n');

  // Check each timezone in our matrix
  for (const [zone, offset] of Object.entries(TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
    result.summary.totalChecked++;
    const validation = validateTimezone(zone);
    
    if (validation.isValid) {
      result.summary.canonicalCount++;
      console.log(`✅ ${zone.padEnd(25)} ${offset.padEnd(8)} Canonical`);
    } else if (validation.isDeprecated) {
      result.summary.deprecatedCount++;
      result.errors.push(`Deprecated Link zone: ${zone} (should use canonical alternative)`);
      console.log(`❌ ${zone.padEnd(25)} ${offset.padEnd(8)} DEPRECATED LINK`);
      result.isValid = false;
    } else {
      result.summary.invalidCount++;
      result.errors.push(`Invalid/Unknown zone: ${zone}`);
      console.log(`❌ ${zone.padEnd(25)} ${offset.padEnd(8)} INVALID`);
      result.isValid = false;
    }
  }

  return result;
}

function validateScopeMappings(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      totalChecked: 0,
      canonicalCount: 0,
      deprecatedCount: 0,
      invalidCount: 0
    }
  };

  console.log('\n🎯 Validating Scope Timezone Mappings...\n');

  const scopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
  
  for (const scope of scopes) {
    try {
      const timezone = getTimezoneFromScope(scope);
      result.summary.totalChecked++;
      const validation = validateTimezone(timezone);
      
      if (validation.isValid) {
        result.summary.canonicalCount++;
        console.log(`✅ ${scope.padEnd(15)} → ${timezone.padEnd(25)} Canonical`);
      } else if (validation.isDeprecated) {
        result.summary.deprecatedCount++;
        result.errors.push(`Scope ${scope} uses deprecated Link zone: ${timezone}`);
        console.log(`❌ ${scope.padEnd(15)} → ${timezone.padEnd(25)} DEPRECATED LINK`);
        result.isValid = false;
      } else {
        result.summary.invalidCount++;
        result.errors.push(`Scope ${scope} uses invalid zone: ${timezone}`);
        console.log(`❌ ${scope.padEnd(15)} → ${timezone.padEnd(25)} INVALID`);
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(`Failed to get timezone for scope ${scope}: ${error}`);
      result.isValid = false;
    }
  }

  return result;
}

function generateComplianceReport(matrixResult: ValidationResult, scopeResult: ValidationResult): void {
  console.log('\n📊 COMPLIANCE REPORT');
  console.log('====================\n');
  
  const totalErrors = matrixResult.errors.length + scopeResult.errors.length;
  const totalWarnings = matrixResult.warnings.length + scopeResult.warnings.length;
  
  console.log(`🔍 Total Zones Checked: ${matrixResult.summary.totalChecked + scopeResult.summary.totalChecked}`);
  console.log(`✅ Canonical Zones: ${matrixResult.summary.canonicalCount + scopeResult.summary.canonicalCount}`);
  console.log(`❌ Deprecated Links: ${matrixResult.summary.deprecatedCount + scopeResult.summary.deprecatedCount}`);
  console.log(`🚫 Invalid Zones: ${matrixResult.summary.invalidCount + scopeResult.summary.invalidCount}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  console.log(`❌ Errors: ${totalErrors}`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n🎉 PERFECT COMPLIANCE!');
    console.log('✅ All zones are Canonical tzdb 2025c entries');
    console.log('✅ No deprecated Link zones detected');
    console.log('✅ Enterprise-ready timezone configuration');
  } else {
    console.log('\n⚠️  COMPLIANCE ISSUES FOUND:');
    
    if (matrixResult.errors.length > 0) {
      console.log('\n📋 TIMEZONE_MATRIX Errors:');
      matrixResult.errors.forEach(error => console.log(`   ❌ ${error}`));
    }
    
    if (scopeResult.errors.length > 0) {
      console.log('\n🎯 Scope Mapping Errors:');
      scopeResult.errors.forEach(error => console.log(`   ❌ ${error}`));
    }
    
    if (totalWarnings > 0) {
      console.log('\n⚠️  Warnings:');
      [...matrixResult.warnings, ...scopeResult.warnings].forEach(warning => console.log(`   ⚠️  ${warning}`));
    }
  }
}

function generateRecommendations(): void {
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================\n');
  
  console.log('🔒 Enterprise Best Practices:');
  console.log('   • Always use Canonical zones from tzdb 2025c');
  console.log('   • Avoid Link zones (US/Eastern, GMT, etc.)');
  console.log('   • Document timezone choices in compliance reports');
  console.log('   • Use this validator in CI/CD pipeline');
  
  console.log('\n📝 Documentation Updates:');
  console.log('   • Add Canonical zone requirement to TIMEZONE_MATRIX comments');
  console.log('   • Include tzdb version in deployment documentation');
  console.log('   • Document timezone mapping rationale for audit trails');
  
  console.log('\n🚀 CI/CD Integration:');
  console.log('   • Add this validator to GitHub Actions workflow');
  console.log('   • Fail builds if deprecated zones are detected');
  console.log('   • Generate compliance report for audit trails');
}

// Main validation execution
function main(): void {
  console.log('📅 tz Database Version: 2025c\n');
  
  const matrixResult = validateTimezoneMatrix();
  const scopeResult = validateScopeMappings();
  
  generateComplianceReport(matrixResult, scopeResult);
  generateRecommendations();
  
  // Exit with error code if validation failed
  const totalErrors = matrixResult.errors.length + scopeResult.errors.length;
  if (totalErrors > 0) {
    console.log(`\n❌ Validation failed with ${totalErrors} error(s)`);
    process.exit(1);
  } else {
    console.log('\n✅ All timezone validations passed!');
    process.exit(0);
  }
}

// Run validation
main();
