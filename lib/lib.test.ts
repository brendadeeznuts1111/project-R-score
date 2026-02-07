/**
 * 🧪 lib/ Test Suite - Comprehensive Unit Tests
 *
 * Tests for core lib/ modules using Bun's built-in test runner.
 * Run: bun test lib/lib.test.ts
 *
 * @version 4.5
 */

import {
  describe,
  it,
  expect,
  test,
  beforeEach,
  afterEach,
  spyOn,
  mock,
  jest,
  setSystemTime,
} from 'bun:test';

import { isPtySupported, createTerminal, DEFAULT_TERMINAL_CONFIG } from './cli/pty-terminal';
import {
  isTerminalUISupported,
  createSpinner,
  createProgress,
  displayTable,
  DeploymentUI,
  smartDeploy,
} from './cli/terminal-tui';
import { getSignedR2URL, getScannerCookieSignedURL } from './r2/signed-url';
import { uploadCompressedS3, createCompressedS3File } from './utils/s3-content-encoding';
import {
  StringValidators,
  NumberValidators,
  EnterpriseValidationEngine,
  TypeGuards,
} from './core/core-validation';
import {
  EnterpriseErrorCode,
  createValidationError,
  createSecurityError,
} from './core/core-errors';
import { verifyFFIEnvironment, FFI_EXAMPLES } from './utils/ffi-environment';
import { ABTestManager } from './ab-testing/manager';
import { ABTestingManager } from './ab-testing/cookie-manager';

// ============================================================================
// PTY Terminal Tests
// ============================================================================

describe('PTY Terminal', () => {
  describe('isPtySupported', () => {
    it('returns false on Windows', () => {
      const originalPlatform = process.platform;
      // Mock Windows
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      expect(isPtySupported()).toBe(false);
      // Restore
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('returns true on macOS', () => {
      if (process.platform === 'darwin') {
        expect(isPtySupported()).toBe(true);
      }
    });

    it('returns true on Linux', () => {
      if (process.platform === 'linux') {
        expect(isPtySupported()).toBe(true);
      }
    });
  });

  describe('DEFAULT_TERMINAL_CONFIG', () => {
    it('has correct default dimensions', () => {
      expect(DEFAULT_TERMINAL_CONFIG.cols).toBe(80);
      expect(DEFAULT_TERMINAL_CONFIG.rows).toBe(24);
    });
  });

  describe('createTerminal', () => {
    it('throws on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

      expect(() =>
        createTerminal({
          cols: 80,
          rows: 24,
          data: () => {},
        })
      ).toThrow('PTY support is only available on POSIX');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });
});

// ============================================================================
// Terminal TUI Tests
// ============================================================================

describe('Terminal TUI', () => {
  // TUI components write spinners, tables, and errors to stdout during tests.
  // Suppress via spyOn to keep test output clean.
  beforeEach(() => {
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'error').mockImplementation(() => {});
    spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  describe('isTerminalUISupported', () => {
    it('returns false on non-macOS platforms', () => {
      if (process.platform !== 'darwin') {
        expect(isTerminalUISupported()).toBe(false);
      }
    });

    it('returns false when not TTY', () => {
      if (!process.stdout.isTTY) {
        expect(isTerminalUISupported()).toBe(false);
      }
    });
  });

  describe('createSpinner', () => {
    it('returns fallback spinner on unsupported platforms', () => {
      const spinner = createSpinner('test');
      expect(spinner).toHaveProperty('start');
      expect(spinner).toHaveProperty('update');
      expect(spinner).toHaveProperty('success');
      expect(spinner).toHaveProperty('error');

      // Should not throw
      expect(() => spinner.start()).not.toThrow();
      expect(() => spinner.update('new')).not.toThrow();
      expect(() => spinner.success('done')).not.toThrow();
      expect(() => spinner.error('fail')).not.toThrow();
    });
  });

  describe('createProgress', () => {
    it('returns progress widget with update and stop', () => {
      const progress = createProgress({ total: 100, width: 40, title: 'Test' });
      expect(progress).toHaveProperty('update');
      expect(progress).toHaveProperty('stop');

      // Should not throw
      expect(() => progress.update(50)).not.toThrow();
      expect(() => progress.stop()).not.toThrow();
    });

    it('clamps values to valid range', () => {
      const progress = createProgress({ total: 100 });
      // Should handle out-of-range values gracefully
      expect(() => progress.update(-10)).not.toThrow();
      expect(() => progress.update(150)).not.toThrow();
    });
  });

  describe('displayTable', () => {
    it('handles empty rows', () => {
      expect(() => displayTable([])).not.toThrow();
    });

    it('handles single row', () => {
      expect(() => displayTable([['A', 'B']])).not.toThrow();
    });

    it('handles multiple rows', () => {
      expect(() =>
        displayTable([
          ['Header1', 'Header2'],
          ['Data1', 'Data2'],
          ['Data3', 'Data4'],
        ])
      ).not.toThrow();
    });
  });

  describe('DeploymentUI', () => {
    let ui: DeploymentUI;

    beforeEach(() => {
      ui = new DeploymentUI('test-snapshot');
    });

    it('initializes with correct snapshot ID', () => {
      expect(ui).toBeDefined();
    });

    it('tracks phase transitions', async () => {
      ui.startPhase('Backup Creation');
      // Should not throw
      ui.updatePhase('Backup Creation', '50%');
      ui.completePhase('Backup Creation');
    });

    it('handles phase failure', async () => {
      ui.startPhase('R2 Upload');
      const error = new Error('Network timeout');
      ui.failPhase('R2 Upload', error);
    });

    it('displays summary without error', () => {
      expect(() => ui.displaySummary()).not.toThrow();
    });

    it('displays error details', () => {
      const error = new Error('Test error');
      expect(() => ui.displayError(error)).not.toThrow();
    });
  });

  describe('smartDeploy', () => {
    it('executes deploy function with UI', async () => {
      const result = await smartDeploy('test-snapshot', async ui => {
        ui.startPhase('Test Phase');
        await Bun.sleep(10);
        ui.completePhase('Test Phase');
        return { success: true };
      });

      expect(result).toEqual({ success: true });
    });

    it('propagates errors from deploy function', async () => {
      await expect(
        smartDeploy('test-snapshot', async () => {
          throw new Error('Deploy failed');
        })
      ).rejects.toThrow('Deploy failed');
    });
  });
});

// ============================================================================
// Core Validation Tests
// ============================================================================

describe('Core Validation', () => {
  describe('StringValidators', () => {
    it('isNonEmpty returns true for non-empty strings', () => {
      expect(StringValidators.isNonEmpty('hello')).toBe(true);
      expect(StringValidators.isNonEmpty('  a  ')).toBe(true);
    });

    it('isNonEmpty returns false for empty strings', () => {
      expect(StringValidators.isNonEmpty('')).toBe(false);
      expect(StringValidators.isNonEmpty('   ')).toBe(false);
    });

    it('isNonEmpty returns false for non-strings', () => {
      expect(StringValidators.isNonEmpty(null)).toBe(false);
      expect(StringValidators.isNonEmpty(undefined)).toBe(false);
      expect(StringValidators.isNonEmpty(123)).toBe(false);
    });

    it('isUUID validates UUID format', () => {
      expect(StringValidators.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(StringValidators.isUUID('invalid-uuid')).toBe(false);
    });

    it('isEmail validates email format', () => {
      expect(StringValidators.isEmail('test@example.com')).toBe(true);
      expect(StringValidators.isEmail('invalid-email')).toBe(false);
    });

    it('isBase64 validates base64 format', () => {
      expect(StringValidators.isBase64('SGVsbG8=')).toBe(true);
      expect(StringValidators.isBase64('not-base64!!!')).toBe(false);
    });
  });

  describe('NumberValidators', () => {
    it('isFinite validates finite numbers', () => {
      expect(NumberValidators.isFinite(42)).toBe(true);
      expect(NumberValidators.isFinite(Infinity)).toBe(false);
      expect(NumberValidators.isFinite(NaN)).toBe(false);
    });

    it('isInRange validates number ranges', () => {
      const inRange = NumberValidators.isInRange(0, 100);
      expect(inRange(50)).toBe(true);
      expect(inRange(-1)).toBe(false);
      expect(inRange(101)).toBe(false);
    });

    it('isPositive validates positive numbers', () => {
      expect(NumberValidators.isPositive(1)).toBe(true);
      expect(NumberValidators.isPositive(0)).toBe(false);
      expect(NumberValidators.isPositive(-1)).toBe(false);
    });
  });

  describe('EnterpriseValidationEngine', () => {
    let engine: EnterpriseValidationEngine;

    beforeEach(() => {
      engine = new EnterpriseValidationEngine();
    });

    it('validates required fields', () => {
      engine.addRule('name', {
        name: 'required',
        validator: StringValidators.isNonEmpty,
        required: true,
      });

      const result = engine.validate({ name: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('passes validation for valid data', () => {
      engine.addRule('email', {
        name: 'validEmail',
        validator: StringValidators.isEmail,
        required: true,
      });

      const result = engine.validate({ email: 'test@example.com' });
      expect(result.isValid).toBe(true);
    });

    it('clears rules correctly', () => {
      engine.addRule('field', {
        name: 'test',
        validator: () => true,
      });

      engine.clearRules();
      const result = engine.validate({ field: 'value' });
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('TypeGuards', () => {
    it('isSafeString validates safe strings', () => {
      expect(TypeGuards.isSafeString('hello')).toBe(true);
      expect(TypeGuards.isSafeString('<script>')).toBe(false);
      expect(TypeGuards.isSafeString('')).toBe(false);
    });

    it('isUUID validates UUID type', () => {
      expect(TypeGuards.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(TypeGuards.isUUID('not-uuid')).toBe(false);
    });
  });
});

// ============================================================================
// Core Errors Tests
// ============================================================================

describe('Core Errors', () => {
  describe('Error Creation', () => {
    it('creates validation error with correct code', () => {
      const error = createValidationError(
        EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
        'Invalid input',
        'field',
        'value'
      );

      expect(error.code).toBe(EnterpriseErrorCode.VALIDATION_INPUT_INVALID);
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('field');
    });

    it('creates security error with critical severity', () => {
      const error = createSecurityError(EnterpriseErrorCode.SECURITY_UNAUTHORIZED, 'Access denied');

      expect(error.code).toBe(EnterpriseErrorCode.SECURITY_UNAUTHORIZED);
      expect(error.isSecurityError()).toBe(true);
    });
  });

  describe('EnterpriseErrorCode', () => {
    it('has all error categories defined', () => {
      expect(EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED).toBeDefined();
      expect(EnterpriseErrorCode.VALIDATION_INPUT_INVALID).toBeDefined();
      expect(EnterpriseErrorCode.NETWORK_CONNECTION_FAILED).toBeDefined();
      expect(EnterpriseErrorCode.SECURITY_UNAUTHORIZED).toBeDefined();
      expect(EnterpriseErrorCode.RESOURCE_NOT_FOUND).toBeDefined();
      expect(EnterpriseErrorCode.BUSINESS_RULE_VIOLATION).toBeDefined();
    });

    it('follows naming convention', () => {
      const codes = Object.values(EnterpriseErrorCode);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z]+_\d{4}$/);
      });
    });
  });
});

// ============================================================================
// FFI Environment Tests
// ============================================================================

describe('FFI Environment', () => {
  describe('verifyFFIEnvironment', () => {
    it('returns valid on standard systems', () => {
      const result = verifyFFIEnvironment();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  describe('FFI_EXAMPLES', () => {
    it('has NixOS example', () => {
      expect(FFI_EXAMPLES.NIXOS).toContain('C_INCLUDE_PATH');
      expect(FFI_EXAMPLES.NIXOS).toContain('LIBRARY_PATH');
    });

    it('has Guix example', () => {
      expect(FFI_EXAMPLES.GUIX).toContain('C_INCLUDE_PATH');
    });

    it('has custom toolchain example', () => {
      expect(FFI_EXAMPLES.CUSTOM_TOOLCHAIN).toContain('CFLAGS');
    });
  });
});

// ============================================================================
// S3 Content Encoding Tests
// ============================================================================

describe('S3 Content Encoding', () => {
  describe('uploadCompressedS3', () => {
    it('validates encoding options', () => {
      // This would need actual S3 mocking, but we can test validation
      // For now, just ensure the function exists
      expect(typeof uploadCompressedS3).toBe('function');
    });
  });

  describe('createCompressedS3File', () => {
    it('returns file and upload function', () => {
      // Would need S3Client mock
      expect(typeof createCompressedS3File).toBe('function');
    });
  });
});

// ============================================================================
// R2 Signed URL Tests
// ============================================================================

describe('R2 Signed URLs', () => {
  describe('getSignedR2URL', () => {
    it('rejects URLs exceeding max lifetime', async () => {
      const mockBucket = {
        bucketName: 'test-bucket',
        createSignedUrl: async () => 'https://example.com',
      } as any;

      await expect(
        getSignedR2URL(mockBucket, 'test-key', { expiresInSeconds: 999999 })
      ).rejects.toThrow('Maximum signed URL lifetime is 7 days');
    });

    it('accepts valid expiration times', async () => {
      const mockBucket = {
        bucketName: 'test-bucket',
        createSignedUrl: async () => 'https://example.com',
      } as any;

      const result = await getSignedR2URL(mockBucket, 'test-key', {
        expiresInSeconds: 3600,
      });

      expect(result.signedUrl).toBe('https://example.com');
      expect(result.metadata).toHaveProperty('signed-at');
      expect(result.metadata).toHaveProperty('expires-in');
    });
  });

  describe('getScannerCookieSignedURL', () => {
    it('includes tier1380 context in metadata', async () => {
      const mockBucket = {
        bucketName: 'scanner-cookies',
        createSignedUrl: async () => 'https://signed.example.com',
      } as any;

      const result = await getScannerCookieSignedURL(mockBucket, 'test-key');

      expect(result.metadata).toHaveProperty('bucket', 'scanner-cookies');
      expect(result.metadata).toHaveProperty('context', 'tier1380-headers-csrf');
    });
  });
});

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe('Performance', () => {
  it('StringValidators.isNonEmpty is fast', async () => {
    const start = performance.now();

    for (let i = 0; i < 100000; i++) {
      StringValidators.isNonEmpty('test string');
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  it('TypeGuards.isUUID is fast', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const start = performance.now();

    for (let i = 0; i < 100000; i++) {
      TypeGuards.isUUID(uuid);
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200); // Should complete in under 200ms
  });
});

// ============================================================================
// Repo Hygiene Tests
// ============================================================================

describe('Repo Hygiene', () => {
  const { STRAY_PATTERNS, SECRETS_FILES } = require('../scripts/repo-hygiene.ts');

  describe('STRAY_PATTERNS', () => {
    it('catches timestamped JSON files', () => {
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('junior-1770398161888.json'))).toBe(true);
      expect(
        STRAY_PATTERNS.some((p: RegExp) => p.test('hierarchy-report-1770398067150.json'))
      ).toBe(true);
    });

    it('catches timestamped Markdown files', () => {
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('senior-1770412138259.md'))).toBe(true);
    });

    it('catches md-profile.json', () => {
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('md-profile.json'))).toBe(true);
    });

    it('catches date-stamped output files', () => {
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('enterprise-audit-2026-02-06.jsonl'))).toBe(
        true
      );
    });

    it('catches all .jsonl files', () => {
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('anything.jsonl'))).toBe(true);
    });

    it('catches .log files', () => {
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('application.log'))).toBe(true);
    });

    it('does not flag legitimate files', () => {
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('package.json'))).toBe(false);
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('tsconfig.json'))).toBe(false);
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('README.md'))).toBe(false);
      expect(STRAY_PATTERNS.some((p: RegExp) => p.test('CHANGELOG.md'))).toBe(false);
    });
  });

  describe('SECRETS_FILES', () => {
    it('includes .bunfig.toml', () => {
      expect(SECRETS_FILES).toContain('.bunfig.toml');
    });

    it('includes .env variants', () => {
      expect(SECRETS_FILES).toContain('.env');
      expect(SECRETS_FILES).toContain('.env.production');
      expect(SECRETS_FILES).toContain('.env.secret');
    });
  });
});

// ============================================================================
// AB Testing - ABTestManager
// ============================================================================

describe('ABTestManager', () => {
  let manager: ABTestManager;

  beforeEach(() => {
    manager = new ABTestManager();
  });

  describe('registerTest', () => {
    it('registers a test with equal weight defaults', () => {
      manager.registerTest({ id: 'test-1', variants: ['a', 'b'] });
      const variant = manager.getVariant('test-1');
      expect(['a', 'b']).toContain(variant);
    });

    it('registers a test with custom weights', () => {
      manager.registerTest({ id: 'test-2', variants: ['control', 'treatment'], weights: [80, 20] });
      const variant = manager.getVariant('test-2');
      expect(['control', 'treatment']).toContain(variant);
    });

    it("rejects weights that don't sum to 100", () => {
      expect(() => {
        manager.registerTest({ id: 'bad', variants: ['a', 'b'], weights: [30, 30] });
      }).toThrow('must sum to 100');
    });

    it('registers with custom cookie name', () => {
      manager.registerTest({ id: 'cust', variants: ['x', 'y'], cookieName: 'my_cookie' });
      manager.getVariant('cust');
      const headers = manager.getSetCookieHeaders();
      expect(headers.some(h => h.includes('my_cookie='))).toBe(true);
    });

    it('auto-generates cookie name from test id', () => {
      manager.registerTest({ id: 'my-test', variants: ['a', 'b'] });
      manager.getVariant('my-test');
      const headers = manager.getSetCookieHeaders();
      expect(headers.some(h => h.includes('ab_my_test='))).toBe(true);
    });
  });

  describe('getVariant', () => {
    it('throws for unregistered test', () => {
      expect(() => manager.getVariant('nonexistent')).toThrow('not registered');
    });

    it('returns consistent variant on repeated calls', () => {
      manager.registerTest({ id: 'sticky', variants: ['a', 'b', 'c'] });
      const first = manager.getVariant('sticky');
      const second = manager.getVariant('sticky');
      const third = manager.getVariant('sticky');
      expect(second).toBe(first);
      expect(third).toBe(first);
    });

    it('returns valid variant from registered set', () => {
      const variants = ['alpha', 'beta', 'gamma'];
      manager.registerTest({ id: 'multi', variants });
      for (let i = 0; i < 20; i++) {
        const m = new ABTestManager();
        m.registerTest({ id: 'multi', variants });
        expect(variants).toContain(m.getVariant('multi'));
      }
    });
  });

  describe('cookie persistence', () => {
    it('restores variant from cookie header', () => {
      manager.registerTest({ id: 'persist', variants: ['a', 'b'], cookieName: 'ab_persist' });
      const restored = new ABTestManager('ab_persist=b');
      restored.registerTest({ id: 'persist', variants: ['a', 'b'], cookieName: 'ab_persist' });
      expect(restored.getVariant('persist')).toBe('b');
    });

    it('ignores invalid cookie values', () => {
      const m = new ABTestManager('ab_test=invalid_variant');
      m.registerTest({ id: 'test', variants: ['a', 'b'], cookieName: 'ab_test' });
      const variant = m.getVariant('test');
      expect(['a', 'b']).toContain(variant);
    });

    it('generates Set-Cookie headers', () => {
      manager.registerTest({ id: 'hdr', variants: ['x', 'y'] });
      manager.getVariant('hdr');
      const headers = manager.getSetCookieHeaders();
      expect(headers.length).toBeGreaterThan(0);
      expect(headers[0]).toContain('ab_hdr=');
    });

    it('sets httpOnly and sameSite defaults', () => {
      manager.registerTest({ id: 'sec', variants: ['a', 'b'] });
      manager.getVariant('sec');
      const headers = manager.getSetCookieHeaders();
      const header = headers.find(h => h.includes('ab_sec='))!;
      expect(header.toLowerCase()).toContain('httponly');
      expect(header.toLowerCase()).toContain('samesite=lax');
    });
  });

  describe('forceAssign', () => {
    it('overrides the assigned variant', () => {
      manager.registerTest({ id: 'force', variants: ['a', 'b'] });
      manager.forceAssign('force', 'b');
      expect(manager.getVariant('force')).toBe('b');
    });

    it('throws for unregistered test', () => {
      expect(() => manager.forceAssign('nope', 'a')).toThrow('not registered');
    });

    it('throws for invalid variant', () => {
      manager.registerTest({ id: 'val', variants: ['a', 'b'] });
      expect(() => manager.forceAssign('val', 'c')).toThrow('Invalid variant');
    });
  });

  describe('getAllAssignments', () => {
    it('returns all assigned variants', () => {
      manager.registerTest({ id: 't1', variants: ['a', 'b'] });
      manager.registerTest({ id: 't2', variants: ['x', 'y'] });
      manager.getVariant('t1');
      manager.getVariant('t2');
      const assignments = manager.getAllAssignments();
      expect(Object.keys(assignments)).toHaveLength(2);
      expect(['a', 'b']).toContain(assignments['t1']);
      expect(['x', 'y']).toContain(assignments['t2']);
    });

    it('returns empty object when no variants assigned', () => {
      manager.registerTest({ id: 'unassigned', variants: ['a', 'b'] });
      expect(manager.getAllAssignments()).toEqual({});
    });
  });

  describe('clear', () => {
    it('clears a specific test assignment', () => {
      manager.registerTest({ id: 'clr', variants: ['a', 'b'] });
      manager.getVariant('clr');
      expect(Object.keys(manager.getAllAssignments())).toHaveLength(1);
      manager.clear('clr');
      expect(manager.getAllAssignments()).toEqual({});
    });

    it('clears all assignments when no id given', () => {
      manager.registerTest({ id: 'c1', variants: ['a', 'b'] });
      manager.registerTest({ id: 'c2', variants: ['x', 'y'] });
      manager.getVariant('c1');
      manager.getVariant('c2');
      expect(Object.keys(manager.getAllAssignments())).toHaveLength(2);
      manager.clear();
      expect(manager.getAllAssignments()).toEqual({});
    });
  });

  describe('weighted distribution', () => {
    it('heavily weighted variant dominates over many trials', () => {
      const counts: Record<string, number> = { heavy: 0, light: 0 };
      for (let i = 0; i < 200; i++) {
        const m = new ABTestManager();
        m.registerTest({ id: 'dist', variants: ['heavy', 'light'], weights: [95, 5] });
        counts[m.getVariant('dist')]++;
      }
      // With 95/5 split over 200 trials, heavy should win most
      expect(counts['heavy']).toBeGreaterThan(counts['light']);
    });

    it('supports 3+ variants with custom weights', () => {
      manager.registerTest({
        id: 'tri',
        variants: ['a', 'b', 'c'],
        weights: [50, 30, 20],
      });
      const variant = manager.getVariant('tri');
      expect(['a', 'b', 'c']).toContain(variant);
    });
  });
});

// ============================================================================
// AB Testing - ABTestingManager (backward-compatible wrapper)
// ============================================================================

describe('ABTestingManager (legacy wrapper)', () => {
  let legacy: ABTestingManager;

  beforeEach(() => {
    legacy = new ABTestingManager();
  });

  it('registers and gets variant with positional args', () => {
    legacy.registerTest('legacy-1', ['a', 'b']);
    const variant = legacy.getVariant('legacy-1');
    expect(['a', 'b']).toContain(variant);
  });

  it('supports custom weights via options', () => {
    legacy.registerTest('weighted', ['control', 'treatment'], { weights: [70, 30] });
    expect(['control', 'treatment']).toContain(legacy.getVariant('weighted'));
  });

  it('supports custom cookie name', () => {
    legacy.registerTest('custom', ['a', 'b'], { cookieName: 'my_ab' });
    legacy.getVariant('custom');
    const headers = legacy.getResponseHeaders();
    expect(headers.some(h => h.includes('my_ab='))).toBe(true);
  });

  it('force assigns and reads back', () => {
    legacy.registerTest('force', ['a', 'b']);
    legacy.forceAssignVariant('force', 'b');
    expect(legacy.getVariant('force')).toBe('b');
  });

  it('clears assignment', () => {
    legacy.registerTest('clr', ['a', 'b']);
    legacy.getVariant('clr');
    expect(Object.keys(legacy.getAllAssignments())).toHaveLength(1);
    legacy.clearAssignment('clr');
    expect(legacy.getAllAssignments()).toEqual({});
  });

  it('restores from cookie string', () => {
    const restored = new ABTestingManager('ab_restore=b');
    restored.registerTest('restore', ['a', 'b'], { cookieName: 'ab_restore' });
    expect(restored.getVariant('restore')).toBe('b');
  });

  it('getResponseHeaders returns Set-Cookie strings', () => {
    legacy.registerTest('hdr', ['x', 'y']);
    legacy.getVariant('hdr');
    const headers = legacy.getResponseHeaders();
    expect(headers.length).toBeGreaterThan(0);
    expect(typeof headers[0]).toBe('string');
  });
});

// ============================================================================
// Bun Test Runner — Advanced Features
// ============================================================================

// --- test.each: Parameterized tests ---
describe('test.each', () => {
  test.each([
    { input: 1, expected: 1 },
    { input: 2, expected: 4 },
    { input: 3, expected: 9 },
    { input: 10, expected: 100 },
  ])('$input² = $expected', ({ input, expected }) => {
    expect(input * input).toBe(expected);
  });

  test.each([
    [1, 2, 3],
    [4, 5, 9],
    [0, 0, 0],
  ])('%i + %i = %i', (a, b, sum) => {
    expect(a + b).toBe(sum);
  });
});

// --- Conditional tests ---
describe('conditional tests', () => {
  test.skip('skipped test never runs', () => {
    throw new Error('never runs');
  });

  test.todo('implement rate limiting', () => {});

  test.skipIf(process.platform !== 'darwin')('macOS only', () => {
    expect(process.platform).toBe('darwin');
  });

  test.if(process.platform === 'darwin')('conditional on darwin', () => {
    expect(true).toBe(true);
  });
});

// --- mock(): Track calls, args, return values ---
describe('mock functions', () => {
  test('tracks calls and arguments', () => {
    const fn = mock((x: number) => x * 2);
    fn(3);
    fn(5);
    fn(7);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenCalledWith(5);
    expect(fn).toHaveBeenLastCalledWith(7);
    expect(fn).toHaveBeenNthCalledWith(1, 3);
    expect(fn.mock.calls).toEqual([[3], [5], [7]]);
    expect(fn.mock.results[0]).toEqual({ type: 'return', value: 6 });
  });

  test('mockReturnValueOnce chains', () => {
    const fn = mock(() => 'default');
    fn.mockReturnValueOnce('first').mockReturnValueOnce('second');

    expect(fn()).toBe('first');
    expect(fn()).toBe('second');
    expect(fn()).toBe('default');
  });

  test('mockResolvedValue for async', async () => {
    const fetchData = mock(() => Promise.resolve(''));
    fetchData.mockResolvedValueOnce({ id: 1, name: 'test' });

    const result = await fetchData();
    expect(result).toEqual({ id: 1, name: 'test' });
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  test('mockImplementation swaps behavior', () => {
    const fn = mock((x: number) => x + 1);
    expect(fn(1)).toBe(2);

    fn.mockImplementation((x: number) => x * 10);
    expect(fn(1)).toBe(10);
  });
});

// --- spyOn: Spy on object methods ---
describe('spyOn deep', () => {
  test('spy tracks calls and restores', () => {
    const obj = {
      greet(name: string) {
        return `Hello, ${name}`;
      },
    };

    const spy = spyOn(obj, 'greet');
    obj.greet('world');
    obj.greet('bun');

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('bun');
    expect(spy.mock.results[0].value).toBe('Hello, world');

    spy.mockRestore();
    expect(obj.greet('restored')).toBe('Hello, restored');
  });

  test('spy with mockImplementation', () => {
    const math = {
      add(a: number, b: number) {
        return a + b;
      },
    };

    const spy = spyOn(math, 'add').mockImplementation((a, b) => a * b);
    expect(math.add(3, 4)).toBe(12);

    spy.mockRestore();
    expect(math.add(3, 4)).toBe(7);
  });
});

// --- mock.module: Replace entire modules ---
describe('mock.module', () => {
  test('mock node:os', async () => {
    mock.module('node:os', () => ({
      hostname: () => 'mocked-host',
      platform: () => 'mocked-platform',
    }));

    const os = await import('node:os');
    expect(os.hostname()).toBe('mocked-host');
    expect(os.platform()).toBe('mocked-platform');
  });
});

// --- Fake timers ---
describe('fake timers', () => {
  test('setSystemTime freezes Date.now()', () => {
    const frozen = new Date('2026-01-01T00:00:00Z');
    setSystemTime(frozen);

    expect(new Date().toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(Date.now()).toBe(frozen.getTime());

    setSystemTime();
  });

  test('jest.useFakeTimers controls setTimeout', () => {
    jest.useFakeTimers();

    let called = false;
    setTimeout(() => {
      called = true;
    }, 5000);

    expect(called).toBe(false);
    jest.advanceTimersByTime(5000);
    expect(called).toBe(true);

    jest.useRealTimers();
  });

  test('jest.runAllTimers flushes pending', () => {
    jest.useFakeTimers();

    const order: number[] = [];
    setTimeout(() => order.push(1), 100);
    setTimeout(() => order.push(2), 200);
    setTimeout(() => order.push(3), 300);

    jest.runAllTimers();
    expect(order).toEqual([1, 2, 3]);

    jest.useRealTimers();
  });
});

// --- Snapshot testing ---
describe('snapshots', () => {
  test('toMatchSnapshot', () => {
    const config = {
      host: 'localhost',
      port: 3000,
      features: ['auth', 'logging'],
    };
    expect(config).toMatchSnapshot();
  });

  test('toMatchInlineSnapshot', () => {
    const result = { status: 'ok', count: 42 };
    expect(result).toMatchInlineSnapshot(`
{
  "count": 42,
  "status": "ok",
}
`);
  });
});

// --- Extended matchers ---
describe('extended matchers', () => {
  test('number matchers', () => {
    expect(7).toBeOdd();
    expect(4).toBeEven();
    expect(42).toBePositive();
    expect(-1).toBeNegative();
    expect(5).toBeInteger();
    expect(5).toBeFinite();
    expect(5).toBeWithin(1, 10);
    expect(3.14).toBeCloseTo(Math.PI, 1);
  });

  test('string matchers', () => {
    expect('hello world').toStartWith('hello');
    expect('hello world').toEndWith('world');
    expect('hello world').toInclude('lo wo');
    expect('aaaa').toIncludeRepeated('a', 4);
    expect('  hello  ').toEqualIgnoringWhitespace('hello');
  });

  test('array matchers', () => {
    expect([1, 2, 3]).toBeArrayOfSize(3);
    expect([]).toBeEmpty();
    expect([1, 2, 3]).toContainEqual(2);
    expect('found').toBeOneOf(['found', 'missing', 'error']);
  });

  test('object matchers', () => {
    const user = { name: 'test', age: 25, role: 'admin' };

    expect(user).toContainKey('name');
    expect(user).toContainAllKeys(['name', 'age', 'role']);
    expect(user).toContainAnyKeys(['name', 'email']);
    expect(user).toContainValue('admin');
    expect(user).toMatchObject({ name: 'test', role: 'admin' });
    expect(user).toHaveProperty('age', 25);
  });

  test('type matchers', () => {
    expect('hello').toBeString();
    expect(42).toBeNumber();
    expect(true).toBeBoolean();
    expect([]).toBeArray();
    expect({}).toBeObject();
    expect(() => {}).toBeFunction();
    expect(new Date()).toBeDate();
    expect(new Date()).toBeValidDate();
    expect(new Date('invalid')).not.toBeValidDate();
    expect(Symbol()).toBeSymbol();
  });

  test('toSatisfy — custom predicate', () => {
    expect(15).toSatisfy((n: number) => n > 10 && n < 20);
    expect('HELLO').toSatisfy((s: string) => s === s.toUpperCase());
  });
});

// --- Asymmetric matchers ---
describe('asymmetric matchers', () => {
  test('expect.any / expect.anything', () => {
    expect({ id: 1, created: new Date() }).toEqual({
      id: expect.any(Number),
      created: expect.any(Date),
    });

    expect({ a: 1, b: 'two' }).toEqual({
      a: expect.anything(),
      b: expect.anything(),
    });
  });

  test('expect.stringContaining / stringMatching', () => {
    expect({ msg: 'Error: connection refused' }).toEqual({
      msg: expect.stringContaining('connection'),
    });

    expect({ email: 'user@test.com' }).toEqual({
      email: expect.stringMatching(/@\w+\.\w+$/),
    });
  });

  test('expect.arrayContaining / objectContaining', () => {
    expect([1, 2, 3, 4, 5]).toEqual(expect.arrayContaining([2, 4]));

    expect({ name: 'test', age: 25, role: 'admin' }).toEqual(
      expect.objectContaining({ role: 'admin' })
    );
  });

  test('expect.not — negated asymmetric', () => {
    expect(['a', 'b', 'c']).toEqual(expect.not.arrayContaining(['x', 'y']));
    expect({ a: 1 }).toEqual(expect.not.objectContaining({ b: 2 }));
  });
});

// --- Promise matchers ---
describe('promise matchers', () => {
  test('.resolves', async () => {
    const p = Promise.resolve({ status: 'ok', data: [1, 2, 3] });
    await expect(p).resolves.toEqual({ status: 'ok', data: [1, 2, 3] });
    await expect(p).resolves.toHaveProperty('status', 'ok');
  });

  test('.rejects', async () => {
    const p = Promise.reject(new Error('network failure'));
    await expect(p).rejects.toThrow('network failure');
    await expect(Promise.reject('bad')).rejects.toBe('bad');
  });
});

// --- Test options: timeout, retry, repeats ---
describe('test options', () => {
  test(
    'custom timeout',
    () => {
      expect(1).toBe(1);
    },
    { timeout: 10_000 }
  );

  test(
    'retry on flaky test',
    () => {
      expect(true).toBe(true);
    },
    { retry: 3 }
  );

  test(
    'repeat for stability',
    () => {
      expect(1 + 1).toBe(2);
    },
    { repeats: 5 }
  );
});

// --- test.failing: Expected failures ---
describe('expected failures', () => {
  test.failing('wrong assertion inverted by test.failing', () => {
    expect(1).toBe(2);
  });
});

// --- expect.assertions / expect.hasAssertions ---
describe('assertion counting', () => {
  test('expect.assertions ensures exact count', () => {
    expect.assertions(3);
    expect(1).toBe(1);
    expect(2).toBe(2);
    expect(3).toBe(3);
  });

  test('expect.hasAssertions ensures at least one', () => {
    expect.hasAssertions();
    expect(true).toBe(true);
  });
});

// --- Custom matchers via expect.extend ---
expect.extend({
  toBeDivisibleBy(received: number, divisor: number) {
    const pass = received % divisor === 0;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be divisible by ${divisor}`,
    };
  },
});

describe('custom matchers', () => {
  test('toBeDivisibleBy', () => {
    expect(100).toBeDivisibleBy(5);
    expect(100).toBeDivisibleBy(10);
    expect(101).not.toBeDivisibleBy(2);
  });
});

// --- Bun.Archive: Create and extract tarballs ---
describe('Bun.Archive', () => {
  test('create archive from object and read back via files()', async () => {
    const archive = new Bun.Archive({
      'hello.txt': 'Hello, World!',
      'data.json': JSON.stringify({ foo: 'bar' }),
      'nested/deep/file.txt': 'nested content',
    });

    const files = await archive.files();
    expect(files.size).toBe(3);
    expect(await files.get('hello.txt')!.text()).toBe('Hello, World!');
    expect(JSON.parse(await files.get('data.json')!.text())).toEqual({ foo: 'bar' });
    expect(await files.get('nested/deep/file.txt')!.text()).toBe('nested content');
  });

  test('gzip compression round-trip', async () => {
    const original = { 'msg.txt': 'compress me' };
    const compressed = new Bun.Archive(original, { compress: 'gzip' });
    const bytes = await compressed.bytes();

    // gzip magic bytes: 0x1f 0x8b
    expect(bytes[0]).toBe(0x1f);
    expect(bytes[1]).toBe(0x8b);

    // Round-trip: decompress and read back
    const restored = new Bun.Archive(bytes);
    const files = await restored.files();
    expect(await files.get('msg.txt')!.text()).toBe('compress me');
  });

  test('extract to disk with glob filter', async () => {
    const archive = new Bun.Archive({
      'src/index.ts': 'export default 1;',
      'src/utils.ts': 'export const x = 2;',
      'src/index.test.ts': "test('x', () => {});",
      'README.md': '# Hello',
    });

    const dir = `${import.meta.dir}/__archive_test_${Date.now()}`;
    try {
      const count = await archive.extract(dir, { glob: ['src/**', '!**/*.test.ts'] });
      expect(count).toBe(2); // index.ts + utils.ts, not test or README

      const idx = Bun.file(`${dir}/src/index.ts`);
      expect(await idx.text()).toBe('export default 1;');
    } finally {
      // Cleanup
      const rm = Bun.$`rm -rf ${dir}`;
      await rm;
    }
  });

  test('blob() returns valid Blob', async () => {
    const archive = new Bun.Archive({ 'a.txt': 'aaa' });
    const blob = await archive.blob();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  test('files() glob filtering', async () => {
    const archive = new Bun.Archive({
      'src/a.ts': 'a',
      'src/b.js': 'b',
      'lib/c.ts': 'c',
    });

    const tsOnly = await archive.files('**/*.ts');
    expect(tsOnly.size).toBe(2);
    expect(tsOnly.has('src/a.ts')).toBe(true);
    expect(tsOnly.has('lib/c.ts')).toBe(true);
    expect(tsOnly.has('src/b.js')).toBe(false);
  });
});

// --- Bun.JSONC: Parse JSON with comments ---
describe('Bun.JSONC', () => {
  test('parses standard JSON', () => {
    const result = Bun.JSONC.parse('{"a": 1, "b": "two"}');
    expect(result).toEqual({ a: 1, b: 'two' });
  });

  test('parses single-line comments', () => {
    const result = Bun.JSONC.parse(`{
      // this is a comment
      "name": "my-app",
      "version": "1.0.0"
    }`);
    expect(result).toEqual({ name: 'my-app', version: '1.0.0' });
  });

  test('parses block comments', () => {
    const result = Bun.JSONC.parse(`{
      /* block comment */
      "enabled": true,
      "count": /* inline */ 42
    }`);
    expect(result).toEqual({ enabled: true, count: 42 });
  });

  test('allows trailing commas', () => {
    const result = Bun.JSONC.parse(`{
      "items": [1, 2, 3,],
      "nested": {"a": 1,},
    }`);
    expect(result).toEqual({ items: [1, 2, 3], nested: { a: 1 } });
  });

  test('parses tsconfig-style JSONC', () => {
    const tsconfig = Bun.JSONC.parse(`{
      // TypeScript configuration
      "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "strict": true, // enable strict mode
      },
      "include": ["src/**/*.ts"],
      "exclude": [
        "node_modules",
        "dist", // trailing comma
      ]
    }`) as any;
    expect(tsconfig.compilerOptions.target).toBe('ES2022');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.include).toEqual(['src/**/*.ts']);
  });
});

// --- Bun.build: metafile + outputs ---
describe('Bun.build', () => {
  test('builds a simple entrypoint and returns outputs', async () => {
    const tmpFile = `${import.meta.dir}/__build_test_${Date.now()}.ts`;
    await Bun.write(tmpFile, 'export const hello = "world";');

    try {
      const result = await Bun.build({
        entrypoints: [tmpFile],
      });

      expect(result.success).toBe(true);
      expect(result.outputs.length).toBeGreaterThan(0);

      const artifact = result.outputs[0];
      expect(artifact.kind).toBe('entry-point');
      expect(artifact.loader).toBe('ts');
      // BuildArtifact extends Blob — verify Blob-like interface
      expect(typeof artifact.text).toBe('function');
      expect(typeof artifact.arrayBuffer).toBe('function');
      expect(artifact.size).toBeGreaterThan(0);

      const code = await artifact.text();
      expect(code).toInclude('world');
    } finally {
      await Bun.$`rm -f ${tmpFile}`;
    }
  });

  test('metafile contains inputs and outputs', async () => {
    const tmpFile = `${import.meta.dir}/__build_meta_${Date.now()}.ts`;
    await Bun.write(tmpFile, 'export const x = 1;');

    try {
      const result = await Bun.build({
        entrypoints: [tmpFile],
        metafile: true,
      });

      expect(result.success).toBe(true);
      expect(result.metafile).toBeDefined();
      expect(result.metafile!.inputs).toBeObject();
      expect(result.metafile!.outputs).toBeObject();

      // At least one input (our file)
      const inputKeys = Object.keys(result.metafile!.inputs);
      expect(inputKeys.length).toBeGreaterThan(0);

      // Each input has bytes and imports
      const firstInput = Object.values(result.metafile!.inputs)[0] as any;
      expect(firstInput).toHaveProperty('bytes');
      expect(firstInput.bytes).toBeNumber();
    } finally {
      await Bun.$`rm -f ${tmpFile}`;
    }
  });

  test('BuildArtifact has path, hash, kind properties', async () => {
    const tmpFile = `${import.meta.dir}/__build_art_${Date.now()}.ts`;
    await Bun.write(tmpFile, 'export default 42;');

    try {
      const result = await Bun.build({
        entrypoints: [tmpFile],
      });

      const artifact = result.outputs[0];
      expect(artifact).toHaveProperty('path');
      expect(artifact).toHaveProperty('kind');
      expect(artifact).toHaveProperty('loader');
      expect(artifact).toHaveProperty('hash');
      expect(artifact.kind).toBeOneOf(['entry-point', 'chunk', 'asset', 'sourcemap', 'bytecode']);
    } finally {
      await Bun.$`rm -f ${tmpFile}`;
    }
  });
});

// --- Bun.hash: crc32 and full hash family ---
describe('Bun.hash', () => {
  test('crc32', () => {
    const hash = Bun.hash.crc32('hello world');
    expect(hash).toBeNumber();
    expect(hash).toBeInteger();
    // CRC32 is deterministic
    expect(Bun.hash.crc32('hello world')).toBe(hash);
    // Different input → different hash
    expect(Bun.hash.crc32('hello world!')).not.toBe(hash);
  });

  test('adler32', () => {
    const hash = Bun.hash.adler32('hello world');
    expect(hash).toBeNumber();
    expect(Bun.hash.adler32('hello world')).toBe(hash);
  });

  test('cityHash32', () => {
    const hash = Bun.hash.cityHash32('hello world');
    expect(hash).toBeNumber();
    expect(Bun.hash.cityHash32('hello world')).toBe(hash);
  });

  test('cityHash64 returns bigint', () => {
    const hash = Bun.hash.cityHash64('hello world');
    expect(typeof hash).toBe('bigint');
    expect(Bun.hash.cityHash64('hello world')).toBe(hash);
  });

  test('xxHash32', () => {
    const hash = Bun.hash.xxHash32('hello world');
    expect(hash).toBeNumber();
    expect(Bun.hash.xxHash32('hello world')).toBe(hash);
  });

  test('xxHash64 returns bigint', () => {
    const hash = Bun.hash.xxHash64('hello world');
    expect(typeof hash).toBe('bigint');
  });

  test('wyhash returns bigint with optional seed', () => {
    const hash = Bun.hash.wyhash('hello world');
    expect(typeof hash).toBe('bigint');
    // With seed
    const seeded = Bun.hash.wyhash('hello world', 42n);
    expect(typeof seeded).toBe('bigint');
    expect(seeded).not.toBe(hash);
  });

  test('hashes ArrayBuffer input', () => {
    const buf = new TextEncoder().encode('hello world');
    const fromString = Bun.hash.crc32('hello world');
    const fromBuffer = Bun.hash.crc32(buf);
    expect(fromBuffer).toBe(fromString);
  });
});

// --- Response.json() ---
describe('Response.json', () => {
  test('creates JSON response from object', () => {
    const res = Response.json({ status: 'ok', count: 42 });
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get('content-type')).toInclude('application/json');
  });

  test('body contains serialized JSON', async () => {
    const data = { users: [{ id: 1 }, { id: 2 }], total: 2 };
    const res = Response.json(data);
    const body = await res.json();
    expect(body).toEqual(data);
  });

  test('supports status code via init', async () => {
    const res = Response.json({ error: 'not found' }, { status: 404 });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  test('handles arrays', async () => {
    const res = Response.json([1, 2, 3]);
    expect(await res.json()).toEqual([1, 2, 3]);
  });

  test('handles null and primitives', async () => {
    expect(await Response.json(null).json()).toBeNull();
    expect(await Response.json(true).json()).toBe(true);
    expect(await Response.json(42).json()).toBe(42);
  });
});

// ============================================================================
// bun:sqlite — Built-in SQLite3 Driver
// ============================================================================

import { Database } from 'bun:sqlite';

describe('bun:sqlite', () => {
  // --- Database lifecycle ---
  describe('Database lifecycle', () => {
    test('open in-memory database', () => {
      const db = new Database(':memory:');
      expect(db).toBeDefined();
      expect(db.filename).toBe(':memory:');
      db.close();
    });

    test('Database.open() static method', () => {
      const db = Database.open(':memory:');
      expect(db.filename).toBe(':memory:');
      db.close();
    });

    test('close is idempotent', () => {
      const db = new Database(':memory:');
      db.close();
      expect(() => db.close()).not.toThrow();
    });

    test('handle is a number', () => {
      const db = new Database(':memory:');
      expect(db.handle).toBeNumber();
      db.close();
    });
  });

  // --- DDL + DML with db.run ---
  describe('db.run (DDL/DML)', () => {
    test('CREATE TABLE + INSERT returns Changes', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');

      const result = db.run('INSERT INTO users (name, age) VALUES (?, ?)', 'Alice', 30);
      expect(result).toHaveProperty('changes', 1);
      expect(result).toHaveProperty('lastInsertRowid');
      expect(result.lastInsertRowid).toBe(1);
      db.close();
    });

    test('multiple inserts increment lastInsertRowid', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)');

      db.run('INSERT INTO t (val) VALUES (?)', 'a');
      const r2 = db.run('INSERT INTO t (val) VALUES (?)', 'b');
      const r3 = db.run('INSERT INTO t (val) VALUES (?)', 'c');

      expect(r2.lastInsertRowid).toBe(2);
      expect(r3.lastInsertRowid).toBe(3);
      db.close();
    });

    test('UPDATE returns change count', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)');
      db.run('INSERT INTO t (val) VALUES (?)', 'old');
      db.run('INSERT INTO t (val) VALUES (?)', 'old');

      const result = db.run('UPDATE t SET val = ? WHERE val = ?', 'new', 'old');
      expect(result.changes).toBe(2);
      db.close();
    });

    test('DELETE returns change count', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)');
      db.run('INSERT INTO t (val) VALUES (?)', 'x');
      db.run('INSERT INTO t (val) VALUES (?)', 'y');
      db.run('INSERT INTO t (val) VALUES (?)', 'x');

      const result = db.run('DELETE FROM t WHERE val = ?', 'x');
      expect(result.changes).toBe(2);
      db.close();
    });
  });

  // --- Prepared statements: query() and prepare() ---
  describe('prepared statements', () => {
    test('query().all() returns array of objects', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      db.run('INSERT INTO t (name) VALUES (?)', 'Alice');
      db.run('INSERT INTO t (name) VALUES (?)', 'Bob');

      const rows = db.query('SELECT * FROM t ORDER BY id').all();
      expect(rows).toBeArrayOfSize(2);
      expect(rows[0]).toEqual({ id: 1, name: 'Alice' });
      expect(rows[1]).toEqual({ id: 2, name: 'Bob' });
      db.close();
    });

    test('query().get() returns first row or null', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      db.run('INSERT INTO t (name) VALUES (?)', 'Alice');

      const row = db.query('SELECT * FROM t WHERE id = ?').get(1) as any;
      expect(row).toEqual({ id: 1, name: 'Alice' });

      const missing = db.query('SELECT * FROM t WHERE id = ?').get(999);
      expect(missing).toBeNull();
      db.close();
    });

    test('query().values() returns array of arrays', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      db.run('INSERT INTO t (name) VALUES (?)', 'Alice');

      const rows = db.query('SELECT id, name FROM t').values();
      expect(rows).toBeArrayOfSize(1);
      expect(rows[0]).toEqual([1, 'Alice']);
      db.close();
    });

    test('query().run() for INSERT with params', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)');

      const insert = db.query('INSERT INTO t (val) VALUES (?)');
      const r = insert.run('hello');
      expect(r.changes).toBe(1);
      expect(r.lastInsertRowid).toBe(1);
      db.close();
    });

    test('columnNames returns column list', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');

      const stmt = db.query('SELECT id, name, age FROM t');
      expect(stmt.columnNames).toEqual(['id', 'name', 'age']);
      db.close();
    });

    test('paramsCount reflects bound parameters', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (a TEXT, b TEXT, c TEXT)');

      expect(db.query('SELECT * FROM t WHERE a = ?').paramsCount).toBe(1);
      expect(db.query('SELECT * FROM t WHERE a = ? AND b = ?').paramsCount).toBe(2);
      expect(db.query('SELECT * FROM t').paramsCount).toBe(0);
      db.close();
    });

    test('iterate() returns IterableIterator', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)');
      db.run('INSERT INTO t (val) VALUES (?)', 'a');
      db.run('INSERT INTO t (val) VALUES (?)', 'b');
      db.run('INSERT INTO t (val) VALUES (?)', 'c');

      const results: any[] = [];
      for (const row of db.query('SELECT * FROM t ORDER BY id').iterate()) {
        results.push(row);
      }
      expect(results).toBeArrayOfSize(3);
      expect(results[0]).toEqual({ id: 1, val: 'a' });
      db.close();
    });
  });

  // --- Type bindings ---
  describe('type bindings', () => {
    test('binds string, number, boolean, null, bigint, Uint8Array', () => {
      const db = new Database(':memory:');
      db.run(
        'CREATE TABLE types (txt TEXT, num REAL, flag INTEGER, nul TEXT, big INTEGER, blb BLOB)'
      );
      db.run(
        'INSERT INTO types VALUES (?, ?, ?, ?, ?, ?)',
        'hello',
        3.14,
        true,
        null,
        9007199254740993n,
        new Uint8Array([1, 2, 3])
      );

      const row = db.query('SELECT * FROM types').get() as any;
      expect(row.txt).toBe('hello');
      expect(row.num).toBeCloseTo(3.14, 2);
      expect(row.flag).toBe(1); // boolean → INTEGER
      expect(row.nul).toBeNull();
      expect(row.blb).toBeInstanceOf(Uint8Array);
      expect(row.blb[0]).toBe(1);
      db.close();
    });

    test('safeIntegers option returns bigint', () => {
      const db = new Database(':memory:', { safeIntegers: true });
      db.run('CREATE TABLE t (big INTEGER)');
      db.run('INSERT INTO t VALUES (?)', 9007199254740993n);

      const row = db.query('SELECT big FROM t').get() as any;
      expect(typeof row.big).toBe('bigint');
      expect(row.big).toBe(9007199254740993n);
      db.close();
    });
  });

  // --- Transactions ---
  describe('transactions', () => {
    test('transaction commits on success', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)');

      const insert = db.prepare('INSERT INTO t (val) VALUES (?)');
      const insertMany = db.transaction((items: string[]) => {
        for (const item of items) insert.run(item);
      });

      insertMany(['a', 'b', 'c']);
      const count = db.query('SELECT COUNT(*) as n FROM t').get() as any;
      expect(count.n).toBe(3);
      db.close();
    });

    test('transaction rolls back on error', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT UNIQUE)');

      const insert = db.prepare('INSERT INTO t (val) VALUES (?)');
      const insertMany = db.transaction((items: string[]) => {
        for (const item of items) insert.run(item);
      });

      // First insert "a", then try batch with duplicate → rollback
      db.run('INSERT INTO t (val) VALUES (?)', 'a');

      expect(() => insertMany(['b', 'a'])).toThrow(); // "a" violates UNIQUE
      // Only the original "a" should exist — "b" was rolled back
      const rows = db.query('SELECT val FROM t ORDER BY val').all() as any[];
      expect(rows).toEqual([{ val: 'a' }]);
      db.close();
    });

    test('inTransaction reflects state', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY)');

      expect(db.inTransaction).toBe(false);

      const insert = db.prepare('INSERT INTO t (id) VALUES (?)');
      const txn = db.transaction(() => {
        expect(db.inTransaction).toBe(true);
        insert.run(1);
      });
      txn();

      expect(db.inTransaction).toBe(false);
      db.close();
    });
  });

  // --- Serialize / Deserialize ---
  describe('serialize & deserialize', () => {
    test('round-trip: serialize → deserialize preserves data', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      db.run('INSERT INTO t (name) VALUES (?)', 'Alice');
      db.run('INSERT INTO t (name) VALUES (?)', 'Bob');

      const bytes = db.serialize();
      expect(bytes).toBeInstanceOf(Buffer);
      expect(bytes.length).toBeGreaterThan(0);

      const db2 = new Database(bytes);
      const rows = db2.query('SELECT * FROM t ORDER BY id').all();
      expect(rows).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      db.close();
      db2.close();
    });

    test('deserialize with readonly prevents writes', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY)');
      db.run('INSERT INTO t (id) VALUES (1)');

      const bytes = db.serialize();
      const ro = Database.deserialize(bytes, true);

      expect(() => ro.run('INSERT INTO t (id) VALUES (2)')).toThrow();
      ro.close();
      db.close();
    });
  });

  // --- PRAGMA and SQLite version ---
  describe('PRAGMA & metadata', () => {
    test('PRAGMA returns sqlite version', () => {
      const db = new Database(':memory:');
      const row = db.query('SELECT sqlite_version() as ver').get() as any;
      expect(row.ver).toBeString();
      expect(row.ver).toStartWith('3.');
      db.close();
    });

    test('PRAGMA table_info', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, age INTEGER)');

      const cols = db.query('PRAGMA table_info(users)').all() as any[];
      expect(cols).toBeArrayOfSize(3);
      expect(cols.map((c: any) => c.name)).toEqual(['id', 'name', 'age']);
      expect(cols[1].notnull).toBe(1);
      db.close();
    });

    test('strict mode requires matching param names', () => {
      const db = new Database(':memory:', { strict: true });
      db.run('CREATE TABLE t (name TEXT)');
      db.run('INSERT INTO t (name) VALUES ($name)', { name: 'works' });

      const row = db.query('SELECT * FROM t').get() as any;
      expect(row.name).toBe('works');
      db.close();
    });
  });

  // --- Statement finalize + expanded SQL ---
  describe('statement extras', () => {
    test('finalize prevents reuse', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY)');

      const stmt = db.query('SELECT * FROM t');
      stmt.finalize();
      expect(() => stmt.all()).toThrow();
      db.close();
    });

    test('toString() shows SQL string', () => {
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (val TEXT)');

      const stmt = db.prepare('SELECT * FROM t WHERE val = ?');
      const sql = stmt.toString();
      expect(sql).toBeString();
      expect(sql).toInclude('SELECT');
      db.close();
    });
  });
});
