// tests/unit/timezones/timezone-matrix.test.ts
import { test, expect } from 'bun:test';
import { TIMEZONE_MATRIX } from '../../../config/constants-v37';
import { initializeScopeTimezone, getActiveTimezoneConfig, isTimezoneInitialized, _resetTimezoneState } from '../../../bootstrap-timezone';

// Bun test automatically uses UTC—leverage it!
test('TIMEZONE_MATRIX has valid offsets', () => {
  for (const [zone, offset] of Object.entries(TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
    // Verify format: ±HH:MM
    expect(offset).toMatch(/^[-+]\d{2}:\d{2}$/);
    
    // Ensure it's a valid IANA timezone
    expect(() => new Date().toLocaleString('en-US', { timeZone: zone })).not.toThrow();
  }
});

test('DST flags are boolean', () => {
  for (const [zone, hasDst] of Object.entries(TIMEZONE_MATRIX.DST_AFFECTED)) {
    expect(typeof hasDst).toBe('boolean');
  }
});

test('initializeScopeTimezone sets TZ correctly', () => {
  // Store original TZ
  const originalTz = process.env.TZ;
  
  try {
    const config = initializeScopeTimezone("ENTERPRISE");
    expect(config.scopeTimezone).toBe("America/New_York");
    expect(process.env.TZ).toBe("America/New_York");
    expect(config.isUtc).toBe(false);
    
    // Validate new metadata fields
    expect(config.standardOffset).toBe("-05:00");
    expect(config.observesDst).toBe(true);
    expect(config.displayName).toBe("America/New_York (UTC-05:00)");
    expect(config.v37Baseline).toBe(true);

    // Verify runtime accessor works
    const activeConfig = getActiveTimezoneConfig();
    expect(activeConfig.scopeTimezone).toBe("America/New_York");
    expect(activeConfig.standardOffset).toBe("-05:00");
    expect(activeConfig.observesDst).toBe(true);
    expect(activeConfig.displayName).toBe("America/New_York (UTC-05:00)");
    expect(isTimezoneInitialized()).toBe(true);
    
  } finally {
    // Restore original TZ
    if (originalTz) {
      process.env.TZ = originalTz;
    } else {
      delete process.env.TZ;
    }
  }
});

test('initializeScopeTimezone handles UTC correctly', () => {
  const originalTz = process.env.TZ;
  
  try {
    // Reset state to ensure fresh initialization
    _resetTimezoneState();
    
    const config = initializeScopeTimezone("LOCAL-SANDBOX");
    expect(config.scopeTimezone).toBe("UTC");
    expect(process.env.TZ).toBe("UTC");
    expect(config.isUtc).toBe(true);
    
    // Validate UTC metadata
    expect(config.standardOffset).toBe("+00:00");
    expect(config.observesDst).toBe(false);
    expect(config.displayName).toBe("UTC (UTC+00:00)");
    
  } finally {
    if (originalTz) {
      process.env.TZ = originalTz;
    } else {
      delete process.env.TZ;
    }
  }
});

test('getActiveTimezoneConfig throws when not initialized', () => {
  // Clear any existing initialization
  const originalTz = process.env.TZ;
  delete process.env.TZ;
  
  // Reset the internal state
  _resetTimezoneState();
  
  expect(() => getActiveTimezoneConfig()).toThrow('Timezone not initialized');
  expect(isTimezoneInitialized()).toBe(false);
  
  // Restore
  if (originalTz) {
    process.env.TZ = originalTz;
  }
});

test("table displays only canonical timezones", () => {
  // Initialize timezone first
  initializeScopeTimezone("ENTERPRISE");
  
  const config = getActiveTimezoneConfig();
  expect(config.scopeTimezone).toBeOneOf([
    "America/New_York",
    "Europe/London", 
    "UTC"
  ]);
  // All are canonical per tz database 2025c ✅
});

test("all TIMEZONE_MATRIX entries are canonical IANA zones", () => {
  // List of known canonical zones from tz database 2025c
  // Including all zones actually used in our TIMEZONE_MATRIX
  const canonicalZones = [
    "America/New_York",
    "America/Los_Angeles", 
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
    "UTC"
  ];
  
  // Verify all our TIMEZONE_MATRIX zones are canonical
  for (const zone of Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
    expect(canonicalZones).toContain(zone);
    expect(zone).toMatch(/^[A-Za-z_\/]+$/); // Valid IANA format
  }
  
  // Verify no deprecated zones like US/Pacific or Europe/Berlin
  const deprecatedZones = ["US/Pacific", "US/Eastern", "Europe/Berlin", "Asia/Calcutta"];
  for (const deprecated of deprecatedZones) {
    expect(Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS)).not.toContain(deprecated);
  }
});