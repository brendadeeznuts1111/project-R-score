#!/usr/bin/env bun
// [DUOPLUS][TIMEZONE][TS][META:{validation,compliance}][#REF:TZ-VALIDATE-01][BUN-NATIVE]

/**
 * Timezone Validation Script v1.0
 *
 * Validates all timezones against IANA tzdb 2025c canonical list.
 * Ensures compliance with timezone standards before deployment.
 *
 * Validation Matrix:
 * | Zone Type        | Example          | Action             |
 * |------------------|------------------|-------------------|
 * | IANA Canonical   | America/New_York | ✅ Accept          |
 * | Deprecated Link  | US/Eastern       | ❌ Reject + suggest |
 * | Custom offset    | GMT+5            | ❌ Reject          |
 * | UTC              | UTC              | ✅ Accept (fallback)|
 */

import { TIMEZONE_MATRIX } from '../config/constants-v37';

// ═══════════════════════════════════════════════════════════
// CANONICAL TIMEZONE DATA (IANA tzdb 2025c)
// ═══════════════════════════════════════════════════════════

// Get canonical zones from Intl API (Bun/V8 includes full tzdata)
const CANONICAL_ZONES = new Set(Intl.supportedValuesOf('timeZone'));

// Deprecated zone mappings (link zones to canonical)
const DEPRECATED_ZONES: Record<string, string> = {
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
  'US/Alaska': 'America/Anchorage',
  'US/Hawaii': 'Pacific/Honolulu',
  'US/Arizona': 'America/Phoenix',
  'GMT': 'Etc/GMT',
  'UTC': 'UTC',
  'EST': 'America/New_York',
  'CST': 'America/Chicago',
  'MST': 'America/Denver',
  'PST': 'America/Los_Angeles',
  'EST5EDT': 'America/New_York',
  'CST6CDT': 'America/Chicago',
  'MST7MDT': 'America/Denver',
  'PST8PDT': 'America/Los_Angeles',
  'Europe/Kiev': 'Europe/Kyiv',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Africa/Asmera': 'Africa/Asmara',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Catamarca': 'America/Argentina/Catamarca',
  'America/Cordoba': 'America/Argentina/Cordoba',
  'America/Jujuy': 'America/Argentina/Jujuy',
  'America/Mendoza': 'America/Argentina/Mendoza',
};

// Invalid offset patterns
const INVALID_OFFSET_PATTERNS = [
  /^GMT[+-]\d+$/i,
  /^UTC[+-]\d+$/i,
  /^[+-]\d{2}:\d{2}$/,
  /^[+-]\d{4}$/,
];

// ═══════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════

interface ValidationResult {
  zone: string;
  valid: boolean;
  type: 'canonical' | 'deprecated' | 'invalid_offset' | 'unknown';
  suggestion?: string;
  message: string;
}

interface ValidationReport {
  timestamp: string;
  totalZones: number;
  validZones: number;
  invalidZones: number;
  deprecatedZones: number;
  results: ValidationResult[];
  passed: boolean;
}

// ═══════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════

function validateZone(zone: string): ValidationResult {
  // Check if it's a canonical zone
  if (CANONICAL_ZONES.has(zone)) {
    return {
      zone,
      valid: true,
      type: 'canonical',
      message: `✅ Canonical zone: ${zone}`,
    };
  }

  // Check if it's a deprecated zone
  if (DEPRECATED_ZONES[zone]) {
    return {
      zone,
      valid: false,
      type: 'deprecated',
      suggestion: DEPRECATED_ZONES[zone],
      message: `❌ Deprecated zone: "${zone}" → Use "${DEPRECATED_ZONES[zone]}"`,
    };
  }

  // Check if it's an invalid offset
  for (const pattern of INVALID_OFFSET_PATTERNS) {
    if (pattern.test(zone)) {
      return {
        zone,
        valid: false,
        type: 'invalid_offset',
        message: `❌ Invalid offset format: "${zone}" → Use IANA canonical zone`,
      };
    }
  }

  // Unknown zone
  return {
    zone,
    valid: false,
    type: 'unknown',
    message: `❌ Unknown zone: "${zone}" → Not in IANA tzdb 2025c`,
  };
}

function validateTimezoneMatrix(): ValidationReport {
  const results: ValidationResult[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let deprecatedCount = 0;

  // Validate BASELINE_OFFSETS zones
  if (TIMEZONE_MATRIX.BASELINE_OFFSETS) {
    for (const zone of Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
      const result = validateZone(zone);
      results.push(result);

      if (result.valid) {
        validCount++;
      } else if (result.type === 'deprecated') {
        deprecatedCount++;
        invalidCount++;
      } else {
        invalidCount++;
      }
    }
  }

  // Validate SCOPE_TIMEZONES
  if (TIMEZONE_MATRIX.SCOPE_TIMEZONES) {
    for (const [scope, zone] of Object.entries(TIMEZONE_MATRIX.SCOPE_TIMEZONES)) {
      const result = validateZone(zone as string);
      // Add scope context to message
      result.message = `[${scope}] ${result.message}`;
      results.push(result);

      if (result.valid) {
        validCount++;
      } else if (result.type === 'deprecated') {
        deprecatedCount++;
        invalidCount++;
      } else {
        invalidCount++;
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalZones: results.length,
    validZones: validCount,
    invalidZones: invalidCount,
    deprecatedZones: deprecatedCount,
    results,
    passed: invalidCount === 0,
  };
}

// ═══════════════════════════════════════════════════════════
// REPORTING
// ═══════════════════════════════════════════════════════════

function printReport(report: ValidationReport): void {
  console.info('\n' + '═'.repeat(70));
  console.info('🌍 Timezone Validation Report (IANA tzdb 2025c)');
  console.info('═'.repeat(70));
  console.info(`📅 Timestamp: ${report.timestamp}`);
  console.info(`📊 Total Zones: ${report.totalZones}`);
  console.info(`✅ Valid: ${report.validZones}`);
  console.info(`❌ Invalid: ${report.invalidZones}`);
  console.info(`⚠️  Deprecated: ${report.deprecatedZones}`);
  console.info('─'.repeat(70));

  // Print invalid results first
  const invalidResults = report.results.filter(r => !r.valid);
  if (invalidResults.length > 0) {
    console.info('\n🚨 COMPLIANCE FAILURES:\n');
    for (const result of invalidResults) {
      console.info(`  ${result.message}`);
      if (result.suggestion) {
        console.info(`     → Required fix: Use canonical zone "${result.suggestion}"`);
        console.info(`     → Reference: IANA tzdb 2025c zone1970.tab`);
      }
    }
  }

  // Print valid results summary
  const validResults = report.results.filter(r => r.valid);
  if (validResults.length > 0) {
    console.info('\n✅ VALID ZONES:\n');
    for (const result of validResults) {
      console.info(`  ${result.message}`);
    }
  }

  console.info('\n' + '═'.repeat(70));

  if (report.passed) {
    console.info('✅ All timezones canonical-compliant (tzdb 2025c)');
  } else {
    console.info('❌ COMPLIANCE FAILURE: Fix invalid timezones before deployment');
  }

  console.info('═'.repeat(70) + '\n');
}

function printMatrix(): void {
  console.info('\n' + '═'.repeat(80));
  console.info('📊 Timezone Validation Matrix');
  console.info('═'.repeat(80));
  console.info(
    '| ' +
    'Zone Type'.padEnd(18) + ' | ' +
    'Example'.padEnd(25) + ' | ' +
    'Action'.padEnd(28) + ' |'
  );
  console.info('|' + '-'.repeat(20) + '|' + '-'.repeat(27) + '|' + '-'.repeat(30) + '|');
  console.info(
    '| ' +
    'IANA Canonical'.padEnd(18) + ' | ' +
    'America/New_York'.padEnd(25) + ' | ' +
    '✅ Accept'.padEnd(28) + ' |'
  );
  console.info(
    '| ' +
    'Deprecated Link'.padEnd(18) + ' | ' +
    'US/Eastern'.padEnd(25) + ' | ' +
    '❌ Reject + suggest'.padEnd(28) + ' |'
  );
  console.info(
    '| ' +
    'Custom offset'.padEnd(18) + ' | ' +
    'GMT+5'.padEnd(25) + ' | ' +
    '❌ Reject'.padEnd(28) + ' |'
  );
  console.info(
    '| ' +
    'UTC'.padEnd(18) + ' | ' +
    'UTC'.padEnd(25) + ' | ' +
    '✅ Accept (fallback)'.padEnd(28) + ' |'
  );
  console.info('═'.repeat(80));

  console.info('\n📋 Scope-to-Timezone Matrix');
  console.info('─'.repeat(60));

  if (TIMEZONE_MATRIX.SCOPE_TIMEZONES) {
    console.info(
      '| ' +
      'Scope'.padEnd(20) + ' | ' +
      'Timezone'.padEnd(25) + ' | ' +
      'Status'.padEnd(8) + ' |'
    );
    console.info('|' + '-'.repeat(22) + '|' + '-'.repeat(27) + '|' + '-'.repeat(10) + '|');

    for (const [scope, zone] of Object.entries(TIMEZONE_MATRIX.SCOPE_TIMEZONES)) {
      const result = validateZone(zone as string);
      const status = result.valid ? '✅' : '❌';
      console.info(
        '| ' +
        scope.padEnd(20) + ' | ' +
        (zone as string).padEnd(25) + ' | ' +
        status.padEnd(8) + ' |'
      );
    }
  }

  console.info('═'.repeat(60) + '\n');
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--validate':
    case 'validate':
    case undefined:
      const report = validateTimezoneMatrix();
      printReport(report);
      process.exit(report.passed ? 0 : 1);
      break;

    case '--matrix':
    case 'matrix':
      printMatrix();
      break;

    case '--check':
    case 'check':
      const zone = args[1];
      if (!zone) {
        console.info('Usage: bun run validate:timezones --check <zone>');
        process.exit(1);
      }
      const result = validateZone(zone);
      console.info(result.message);
      if (result.suggestion) {
        console.info(`Suggestion: Use "${result.suggestion}"`);
      }
      process.exit(result.valid ? 0 : 1);
      break;

    case '--list':
    case 'list':
      console.info('\n📋 Canonical IANA Zones (tzdb 2025c)\n');
      const zones = Array.from(CANONICAL_ZONES).sort();
      let count = 0;
      for (const z of zones) {
        process.stdout.write(z.padEnd(35));
        count++;
        if (count % 3 === 0) console.info();
      }
      console.info(`\n\nTotal: ${zones.length} canonical zones\n`);
      break;

    case '--help':
    case 'help':
    default:
      console.info(`
🌍 Timezone Validation Script v1.0

Validates timezones against IANA tzdb 2025c canonical list.

Usage:
  bun run scripts/validate-timezones.ts [command] [args]

Commands:
  validate      Validate all timezones in TIMEZONE_MATRIX (default)
  matrix        Display validation matrix and scope mappings
  check <zone>  Check if a specific zone is valid
  list          List all canonical IANA zones
  help          Show this help

Examples:
  bun run validate:timezones                           # Validate all
  bun run validate:timezones --check America/New_York  # Check specific zone
  bun run validate:timezones --matrix                  # Show matrix

Exit Codes:
  0 - All validations passed
  1 - Validation failures detected
      `);
  }
}

// Export for programmatic use
export { validateZone, validateTimezoneMatrix, ValidationResult, ValidationReport };

if (import.meta.main) {
  main();
}
