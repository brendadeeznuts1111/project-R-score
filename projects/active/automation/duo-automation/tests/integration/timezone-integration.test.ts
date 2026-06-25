// tests/integration/timezone-integration.test.ts
// Integration tests for the complete v3.7 timezone system

import { test, expect, beforeAll, afterAll, describe } from 'bun:test';
import { 
  initializeScopeTimezone, 
  getActiveTimezoneConfig, 
  isTimezoneInitialized,
  _resetTimezoneState 
} from '../../bootstrap-timezone';
import { getDashboardConfig, injectDashboardConfig } from '../../server/dashboard-config-injection';
import { ValidTimezone } from '../../config/constants-v37';

beforeAll(() => {
  // Reset state before integration tests
  _resetTimezoneState();
});

afterAll(() => {
  // Clean up after tests
  _resetTimezoneState();
});

describe('Timezone System Integration', () => {
  
  test('complete enterprise workflow', () => {
    // 1. Set environment and initialize enterprise scope
    process.env.DASHBOARD_SCOPE = 'ENTERPRISE';
    const config = initializeScopeTimezone('ENTERPRISE');
    
    expect(config.scopeTimezone).toBe('America/New_York');
    expect(config.displayName).toBe('America/New_York (UTC-05:00)');
    expect(config.standardOffset).toBe('-05:00');
    expect(config.observesDst).toBe(true);
    expect(config.isUtc).toBe(false);
    
    // 2. Verify runtime accessor
    const activeConfig = getActiveTimezoneConfig();
    expect(activeConfig).toEqual(config);
    expect(isTimezoneInitialized()).toBe(true);
    
    // 3. Verify dashboard configuration
    const dashboardConfig = getDashboardConfig();
    expect(dashboardConfig.DASHBOARD_SCOPE).toBe('ENTERPRISE');
    expect(dashboardConfig.TIMEZONE).toBe('America/New_York');
    expect(dashboardConfig.TIMEZONE_DISPLAY).toBe('America/New_York (UTC-05:00)');
    expect(dashboardConfig.PLATFORM).toBe(process.platform);
    
    // 4. Verify HTML injection
    const sampleHtml = '<html><body><span id="tz"></span></body></html>';
    const injectedHtml = injectDashboardConfig(sampleHtml);
    expect(injectedHtml).toContain('TIMEZONE_DISPLAY');
    expect(injectedHtml).toContain('America/New_York (UTC-05:00)');
  });

  test('development scope workflow', () => {
    _resetTimezoneState();
    
    const config = initializeScopeTimezone('DEVELOPMENT');
    
    expect(config.scopeTimezone).toBe('Europe/London');
    expect(config.displayName).toBe('Europe/London (UTC+00:00)');
    expect(config.standardOffset).toBe('+00:00');
    expect(config.observesDst).toBe(true);
    expect(config.isUtc).toBe(false);
    
    const dashboardConfig = getDashboardConfig();
    expect(dashboardConfig.TIMEZONE_DISPLAY).toBe('Europe/London (UTC+00:00)');
  });

  test('local sandbox UTC workflow', () => {
    _resetTimezoneState();
    
    const config = initializeScopeTimezone('LOCAL-SANDBOX');
    
    expect(config.scopeTimezone).toBe('UTC');
    expect(config.displayName).toBe('UTC (UTC+00:00)');
    expect(config.standardOffset).toBe('+00:00');
    expect(config.observesDst).toBe(false);
    expect(config.isUtc).toBe(true);
    
    const dashboardConfig = getDashboardConfig();
    expect(dashboardConfig.TIMEZONE_DISPLAY).toBe('UTC (UTC+00:00)');
  });

  test('timezone consistency across system components', () => {
    _resetTimezoneState();
    
    // Initialize with enterprise scope
    initializeScopeTimezone('ENTERPRISE');
    
    // All components should report the same timezone
    const bootstrapConfig = getActiveTimezoneConfig();
    const dashboardConfig = getDashboardConfig();
    
    expect(bootstrapConfig.scopeTimezone).toBe(dashboardConfig.TIMEZONE as ValidTimezone);
    expect(bootstrapConfig.displayName).toBe(dashboardConfig.TIMEZONE_DISPLAY);
    expect(bootstrapConfig.standardOffset).toBe('-05:00');
  });

  test('HTML template injection with timezone data', () => {
    _resetTimezoneState();
    process.env.DASHBOARD_SCOPE = 'ENTERPRISE';
    initializeScopeTimezone('ENTERPRISE');
    
    const template = `
      <!DOCTYPE html>
      <html>
      <head><title>Test Dashboard</title></head>
      <body>
        <header>
          <span id="timezone-display">Loading...</span>
        </header>
        <footer>
          <div id="footer-timezone">Loading...</div>
          <div id="footer-current-time">Loading...</div>
        </footer>
      </body>
      </html>
    `;
    
    const injected = injectDashboardConfig(template);
    
    // Verify configuration injection
    expect(injected).toContain('window.DASHBOARD_CONFIG');
    expect(injected).toContain('TIMEZONE_DISPLAY');
    expect(injected).toContain('America/New_York (UTC-05:00)');
    expect(injected).toContain('DASHBOARD_SCOPE');
    expect(injected).toContain('ENTERPRISE');
    
    // Verify structure is preserved
    expect(injected).toContain('<!DOCTYPE html>');
    expect(injected).toContain('</html>');
  });

  test('process.env.TZ synchronization', () => {
    _resetTimezoneState();
    
    // Initialize timezone
    const config = initializeScopeTimezone('DEVELOPMENT');
    
    // Verify process.env.TZ is set correctly
    expect(process.env.TZ).toBe('Europe/London');
    
    // Verify config reflects actual TZ
    expect(config.actualTz).toBe('Europe/London');
    expect(config.scopeTimezone).toBe('Europe/London');
  });

  test('multiple scope transitions', () => {
    _resetTimezoneState();
    
    // Start with enterprise
    let config = initializeScopeTimezone('ENTERPRISE');
    expect(config.scopeTimezone).toBe('America/New_York');
    expect(process.env.TZ).toBe('America/New_York');
    
    // Transition to development (requires reset due to idempotent behavior)
    _resetTimezoneState();
    config = initializeScopeTimezone('DEVELOPMENT');
    expect(config.scopeTimezone).toBe('Europe/London');
    expect(process.env.TZ).toBe('Europe/London');
    
    // Transition to local (requires reset)
    _resetTimezoneState();
    config = initializeScopeTimezone('LOCAL-SANDBOX');
    expect(config.scopeTimezone).toBe('UTC');
    expect(process.env.TZ).toBe('UTC');
    
    // Final state should be accessible
    const finalConfig = getActiveTimezoneConfig();
    expect(finalConfig.scopeTimezone).toBe('UTC');
  });
});

describe('Error Handling Integration', () => {
  
  test('invalid scope throws descriptive error', () => {
    _resetTimezoneState();

    expect(() => {
      initializeScopeTimezone('INVALID_SCOPE');
    }).toThrow('Unknown scope: "INVALID_SCOPE". Cannot determine timezone.');
  });

  test('uninitialized accessor throws error', () => {
    _resetTimezoneState();
    
    expect(() => {
      getActiveTimezoneConfig();
    }).toThrow('Timezone not initialized');
  });

  test('graceful fallback in dashboard config', () => {
    _resetTimezoneState();
    
    // Even without initialization, dashboard config should work
    const config = getDashboardConfig();
    expect(config).toBeDefined();
    expect(config.TIMEZONE).toBeDefined();
    expect(config.TIMEZONE_DISPLAY).toBeDefined();
  });
});
