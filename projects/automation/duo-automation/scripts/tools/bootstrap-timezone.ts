// bootstrap-timezone.ts
import { TIMEZONE_MATRIX, ValidTimezone } from '../../config/constants-v37';

/**
 * Enhanced TimezoneConfig for DuoPlus v3.7
 */
export interface TimezoneConfig {
  scopeTimezone: ValidTimezone;
  actualTz: string;
  isUtc: boolean;
  standardOffset: string;
  observesDst: boolean;
  displayName: string;
  v37Baseline: boolean;
}

// Singleton to prevent re-initialization
let _activeTimezoneConfig: TimezoneConfig | null = null;

/**
 * Validates and sets the process-wide timezone using SCOPE_TIMEZONE.
 * Must be called once at application startup.
 */
export function validateAndSetTimezone(): TimezoneConfig {
  if (_activeTimezoneConfig) {
    return _activeTimezoneConfig; // idempotent
  }

  const rawTz = process.env.SCOPE_TIMEZONE;

  if (!rawTz) {
    throw new Error(
      `Missing SCOPE_TIMEZONE environment variable. ` +
      `Must be one of: ${Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS).join(', ')}` 
    );
  }

  if (!(rawTz in TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
    throw new Error(
      `Invalid SCOPE_TIMEZONE: "${rawTz}". ` +
      `Allowed values: ${Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS).join(', ')}` 
    );
  }

  const validTz = rawTz as ValidTimezone;
  const offset = TIMEZONE_MATRIX.BASELINE_OFFSETS[validTz];
  const observesDst = TIMEZONE_MATRIX.DST_AFFECTED[validTz] || false;

  // Safeguard: Check if TZ was already set before validation
  if (process.env.TZ && process.env.TZ !== rawTz) {
    console.warn(`⚠️ TZ was already set to ${process.env.TZ}. Overriding with SCOPE_TIMEZONE=${rawTz}. Ensure this is intentional.`);
  }

  // Set TZ for Bun/Date global behavior
  process.env.TZ = validTz;

  const config: TimezoneConfig = {
    scopeTimezone: validTz,
    actualTz: validTz,
    isUtc: validTz === 'UTC',
    standardOffset: offset,
    observesDst,
    displayName: `${validTz} (UTC${offset})`,
    v37Baseline: true
  };

  _activeTimezoneConfig = config;

  console.log(`🌍 Timezone initialized: ${config.displayName} | DST: ${observesDst ? 'yes' : 'no'}`);

  return config;
}

/**
 * Maps logical scopes to canonical IANA timezones.
 * Matches domain-based scoping policy.
 */
export function getTimezoneFromScope(scope: string): ValidTimezone {
  const tzMap = {
    'ENTERPRISE': 'America/New_York',
    'DEVELOPMENT': 'Europe/London',
    'LOCAL-SANDBOX': 'UTC'
  } as const satisfies Record<string, ValidTimezone>;

  // Handle undefined or empty scope by defaulting to UTC
  if (!scope || scope === 'undefined' || scope === '') {
    return 'UTC';
  }

  const tz = tzMap[scope as keyof typeof tzMap];
  if (!tz) {
    console.warn(`Unknown scope: "${scope}". Defaulting to UTC.`);
    return 'UTC';
  }
  return tz;
}

/**
 * Initializes timezone based on detected scope.
 * Sets SCOPE_TIMEZONE and bootstraps TZ.
 */
export function initializeScopeTimezone(scope?: string): TimezoneConfig {
  const timezone = getTimezoneFromScope(scope || process.env.DASHBOARD_SCOPE || 'UTC');
  process.env.SCOPE_TIMEZONE = timezone;
  return validateAndSetTimezone();
}

/**
 * Safe accessor for runtime use (e.g., in dashboards, services).
 * Throws if called before initialization.
 */
export function getActiveTimezoneConfig(): TimezoneConfig {
  if (!_activeTimezoneConfig) {
    throw new Error(
      'Timezone not initialized. Call initializeScopeTimezone() during app bootstrap.'
    );
  }
  return _activeTimezoneConfig;
}

/**
 * Utility function to check if timezone is properly initialized.
 */
export function isTimezoneInitialized(): boolean {
  return _activeTimezoneConfig !== null;
}

/**
 * Reset function for testing (not for production use).
 */
export function _resetTimezoneState(): void {
  _activeTimezoneConfig = null;
}