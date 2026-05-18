// monitoring/timezone-health-check.ts
// Health check for timezone subsystem - monitors v3.7 deterministic strategy

import { getActiveTimezoneConfig, isTimezoneInitialized, validateAndSetTimezone } from '../bootstrap-timezone';
import { TIMEZONE_MATRIX } from '../config/constants-v37';

interface TimezoneHealthStatus {
  healthy: boolean;
  timestamp: string;
  checks: {
    initialized: boolean;
    timezoneSet: boolean;
    validTimezone: boolean;
    processTzSync: boolean;
    matrixIntegrity: boolean;
  };
  config?: {
    scopeTimezone: string;
    actualTz: string;
    displayName: string;
    standardOffset: string;
    observesDst: boolean;
    isUtc: boolean;
  };
  errors: string[];
}

export function checkTimezoneHealth(): TimezoneHealthStatus {
  const errors: string[] = [];
  const checks = {
    initialized: false,
    timezoneSet: false,
    validTimezone: false,
    processTzSync: false,
    matrixIntegrity: false
  };

  let config: any = undefined;

  try {
    // Check 1: Timezone subsystem initialized
    checks.initialized = isTimezoneInitialized();
    if (!checks.initialized) {
      errors.push('Timezone subsystem not initialized');
    } else {
      config = getActiveTimezoneConfig();
    }

    // Check 2: Process TZ environment variable set
    checks.timezoneSet = !!process.env.TZ;
    if (!checks.timezoneSet) {
      errors.push('process.env.TZ not set');
    }

    // Check 3: Valid timezone from matrix
    if (config) {
      checks.validTimezone = config.scopeTimezone in TIMEZONE_MATRIX.BASELINE_OFFSETS;
      if (!checks.validTimezone) {
        errors.push(`Invalid timezone: ${config.scopeTimezone}`);
      }

      // Check 4: Process TZ sync with config
      checks.processTzSync = process.env.TZ === config.scopeTimezone;
      if (!checks.processTzSync) {
        errors.push(`process.env.TZ (${process.env.TZ}) != config.scopeTimezone (${config.scopeTimezone})`);
      }
    }

    // Check 5: Matrix integrity
    checks.matrixIntegrity = Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS).length > 0 &&
                             Object.keys(TIMEZONE_MATRIX.DST_AFFECTED).length > 0;
    if (!checks.matrixIntegrity) {
      errors.push('TIMEZONE_MATRIX integrity check failed');
    }

  } catch (error) {
    errors.push(`Health check error: ${error instanceof Error ? error.message : String(error)}`);
  }

  const healthy = errors.length === 0 && Object.values(checks).every(check => check);

  return {
    healthy,
    timestamp: new Date().toISOString(),
    checks,
    config: config ? {
      scopeTimezone: config.scopeTimezone,
      actualTz: config.actualTz,
      displayName: config.displayName,
      standardOffset: config.standardOffset,
      observesDst: config.observesDst,
      isUtc: config.isUtc
    } : undefined,
    errors
  };
}

export function logTimezoneHealth(): void {
  const status = checkTimezoneHealth();
  
  if (status.healthy) {
    console.info(`✅ Timezone Health Check Passed`);
    console.info(`   Timezone: ${status.config?.displayName}`);
    console.info(`   Offset: ${status.config?.standardOffset}`);
    console.info(`   DST: ${status.config?.observesDst ? 'Yes' : 'No'}`);
  } else {
    console.error(`❌ Timezone Health Check Failed`);
    console.error(`   Errors: ${status.errors.join(', ')}`);
    console.error(`   Failed checks: ${Object.entries(status.checks)
      .filter(([_, passed]) => !passed)
      .map(([check]) => check)
      .join(', ')}`);
  }
}

// CLI usage
if (import.meta.main) {
  console.info('🔍 DuoPlus v3.7 Timezone Health Check\n');
  
  // Auto-initialize if SCOPE_TIMEZONE is set but not initialized
  if (process.env.SCOPE_TIMEZONE && !isTimezoneInitialized()) {
    console.info('🔄 Auto-initializing timezone from SCOPE_TIMEZONE...\n');
    validateAndSetTimezone();
  }
  
  const status = checkTimezoneHealth();
  
  console.info(`Timestamp: ${status.timestamp}`);
  console.info(`Overall Health: ${status.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}\n`);
  
  console.info('Check Results:');
  Object.entries(status.checks).forEach(([check, passed]) => {
    console.info(`  ${passed ? '✅' : '❌'} ${check}`);
  });
  
  if (status.config) {
    console.info('\nActive Configuration:');
    console.info(`  Scope Timezone: ${status.config.scopeTimezone}`);
    console.info(`  Display Name: ${status.config.displayName}`);
    console.info(`  Standard Offset: ${status.config.standardOffset}`);
    console.info(`  Observes DST: ${status.config.observesDst}`);
    console.info(`  Is UTC: ${status.config.isUtc}`);
  }
  
  if (status.errors.length > 0) {
    console.info('\nErrors:');
    status.errors.forEach(error => console.info(`  - ${error}`));
  }
  
  process.exit(status.healthy ? 0 : 1);
}
