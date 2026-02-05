// lib/timezone-resolver.ts
/**
 * 🔒 Secure Timezone Resolver - Enhanced with Security Controls
 * 
 * Integrates with TIMEZONE_MATRIX v3.7 for canonical zone validation
 * Prevents timezone injection attacks and ensures only IANA canonical zones
 */

import { TIMEZONE_MATRIX } from '../config/constants-v37.ts';

// Pre-computed set of canonical zones for O(1) validation
const CANONICAL_ZONES = new Set(Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS));

/**
 * Security error for timezone validation failures
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Normalizes timezone input to canonical form
 * Handles common aliases and validates against canonical zones
 */
function lookupCanonical(input: string): string {
  // Trim whitespace
  const normalized = input.trim();
  
  // Direct match - fastest path
  if (CANONICAL_ZONES.has(normalized)) {
    return normalized;
  }
  
  // Handle common problematic aliases that should be blocked
  const BLOCKED_ALIASES = new Set([
    'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
    'GMT', 'GMT+0', 'GMT-0',
    'Asia/Bombay',  // Bombay is the old name, Calcutta is canonical in Bun
    'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT'
  ]);
  
  // Check blocked aliases before case normalization
  if (BLOCKED_ALIASES.has(normalized)) {
    throw new SecurityError(`Blocked timezone alias: ${input} (use canonical IANA zone)`);
  }
  
  // Handle case-insensitive canonical zones
  const caseInsensitive = normalized.split('/').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join('/');
  
  // Check blocked aliases after case normalization too
  if (BLOCKED_ALIASES.has(caseInsensitive)) {
    throw new SecurityError(`Blocked timezone alias: ${input} (use canonical IANA zone)`);
  }
  
  if (CANONICAL_ZONES.has(caseInsensitive)) {
    return caseInsensitive;
  }
  
  // Try to find case-insensitive match in canonical zones
  for (const canonicalZone of CANONICAL_ZONES) {
    if (canonicalZone.toLowerCase() === caseInsensitive.toLowerCase()) {
      return canonicalZone;
    }
  }
  
  // No match found - return original for error reporting
  return normalized;
}

/**
 * 🔒 Secure timezone resolver with validation
 * 
 * @param input - User-provided timezone string
 * @returns Canonical timezone string
 * @throws SecurityError if timezone is not canonical
 */
export const resolveTimezone = (input: string): string => {
  // Input validation
  if (!input || typeof input !== 'string') {
    throw new SecurityError(`Invalid timezone input: ${typeof input}`);
  }
  
  if (input.length > 64) {
    throw new SecurityError(`Timezone input too long: ${input.length} chars`);
  }
  
  // Normalize to canonical form
  const canonical = lookupCanonical(input);
  
  // Validate against canonical zones
  if (!CANONICAL_ZONES.has(canonical)) {
    throw new SecurityError(`Blocked non-canonical timezone: ${input}`);
  }
  
  return canonical;
};

/**
 * 🛡️ Batch timezone validation for multiple inputs
 */
export const validateTimezones = (inputs: string[]): string[] => {
  const results: string[] = [];
  const errors: string[] = [];
  
  for (const input of inputs) {
    try {
      const resolved = resolveTimezone(input);
      results.push(resolved);
    } catch (error) {
      errors.push(`${input}: ${error.message}`);
    }
  }
  
  if (errors.length > 0) {
    throw new SecurityError(`Timezone validation failed:\n${errors.join('\n')}`);
  }
  
  return results;
};

/**
 * 📊 Get timezone metadata for resolved timezone
 */
export const getTimezoneMetadata = (timezone: string) => {
  const resolved = resolveTimezone(timezone);
  const offset = TIMEZONE_MATRIX.BASELINE_OFFSETS[resolved];
  const hasDst = TIMEZONE_MATRIX.DST_AFFECTED?.[resolved] || false;
  
  return {
    timezone: resolved,
    offset,
    hasDst,
    displayName: `${resolved} (UTC${offset})`,
    isCanonical: true,
    v37Baseline: true
  };
};

/**
 * 🔍 Check if timezone is canonical (without throwing)
 */
export const isCanonicalTimezone = (input: string): boolean => {
  try {
    resolveTimezone(input);
    return true;
  } catch {
    return false;
  }
};

/**
 * 📋 Get all available canonical timezones
 */
export const getCanonicalTimezones = (): string[] => {
  return Array.from(CANONICAL_ZONES).sort();
};

/**
 * 🎯 Scope-based timezone resolver (integrates with Evidence Integrity Pipeline)
 */
export const resolveScopeTimezone = (scope: 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX'): string => {
  const scopeMapping = {
    'ENTERPRISE': 'America/New_York',
    'DEVELOPMENT': 'Europe/London',
    'LOCAL-SANDBOX': 'UTC'
  };
  
  const timezone = scopeMapping[scope];
  if (!timezone) {
    throw new SecurityError(`Invalid scope: ${scope}`);
  }
  
  return resolveTimezone(timezone);
};

// Export canonical zones for external validation
export { CANONICAL_ZONES };

/**
 * 🧪 Test helper - validate all canonical zones are valid
 */
export const validateCanonicalZones = (): boolean => {
  for (const zone of CANONICAL_ZONES) {
    try {
      // Verify each zone can be used with Date.toLocaleString
      new Date().toLocaleString('en-US', { timeZone: zone });
    } catch (error) {
      console.error(`Invalid canonical zone: ${zone}`, error);
      return false;
    }
  }
  return true;
};
