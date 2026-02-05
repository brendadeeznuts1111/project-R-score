// types/timezone.d.ts
// TypeScript declaration file for DuoPlus v3.7 timezone subsystem

declare module '@duoplus/timezone' {
  /**
   * Valid IANA timezone identifiers for DuoPlus v3.7
   * Only canonical zones are allowed - no links or aliases
   */
  export type ValidTimezone = 
    | 'America/New_York'
    | 'America/Los_Angeles' 
    | 'Europe/London'
    | 'Europe/Paris'
    | 'Asia/Tokyo'
    | 'Asia/Shanghai'
    | 'Australia/Sydney'
    | 'UTC';

  /**
   * Enhanced timezone configuration with static metadata
   */
  export interface TimezoneConfig {
    /** Canonical IANA timezone identifier */
    scopeTimezone: ValidTimezone;
    /** Actual process.env.TZ value */
    actualTz: string;
    /** True if timezone is UTC (+00:00, no DST) */
    isUtc: boolean;
    /** Static UTC offset in ±HH:MM format */
    standardOffset: string;
    /** Boolean DST flag (no calculation in v3.7) */
    observesDst: boolean;
    /** Human-readable display string */
    displayName: string;
  }

  /**
   * Static timezone matrix with canonical zones only
   */
  export const TIMEZONE_MATRIX: {
    readonly BASELINE_OFFSETS: {
      readonly [K in ValidTimezone]: string;
    };
    readonly DST_AFFECTED: {
      readonly [K in ValidTimezone]?: boolean;
    };
  };

  /**
   * Validate and set timezone from SCOPE_TIMEZONE environment variable
   * @returns TimezoneConfig object with full metadata
   */
  export function validateAndSetTimezone(): TimezoneConfig;

  /**
   * Map logical scope to canonical timezone
   * @param scope - Scope identifier ('ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX')
   * @returns ValidTimezone identifier
   */
  export function getTimezoneFromScope(scope: string): ValidTimezone;

  /**
   * Initialize timezone based on scope
   * @param scope - Scope identifier
   * @returns TimezoneConfig object
   */
  export function initializeScopeTimezone(scope: string): TimezoneConfig;

  /**
   * Get active timezone configuration
   * @throws Error if timezone not initialized
   * @returns Current TimezoneConfig
   */
  export function getActiveTimezoneConfig(): TimezoneConfig;

  /**
   * Check if timezone subsystem is initialized
   * @returns true if initialized, false otherwise
   */
  export function isTimezoneInitialized(): boolean;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Timezone for current scope (validated) */
      SCOPE_TIMEZONE?: string;
      /** Dashboard scope identifier */
      DASHBOARD_SCOPE?: string;
      /** Process timezone (set by bootstrap) */
      TZ?: string;
    }
  }

  interface Window {
    /** Dashboard configuration injected by server */
    DASHBOARD_CONFIG?: {
      DASHBOARD_SCOPE: string;
      TIMEZONE: string;
      TIMEZONE_DISPLAY: string;
      PLATFORM: string;
      VERSION: string;
      BUILD_NUMBER: string;
    };
    
    /** Timezone configuration for client-side use */
    __TIMEZONE_CONFIG__?: {
      scopeTimezone: string;
      displayName: string;
      standardOffset: string;
      observesDst: boolean;
      isUtc: boolean;
    };
  }
}

export {};
