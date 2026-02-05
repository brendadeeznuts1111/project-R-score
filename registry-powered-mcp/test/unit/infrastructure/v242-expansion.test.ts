/**
 * v2.4.2 Expansion Components Tests (#46-54)
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  URLPatternEngine,
  FakeTimersEngine,
  ProxyHeadersHandler,
  HttpAgentConnectionPool,
  StandaloneExecutableOptimizer,
  ConsoleJSONFormatter,
  CVEHardeningLayer,
  NodeJSCompatBridge,
  getMatrixStatistics,
  INFRASTRUCTURE_MATRIX,
  V242_COMPONENTS,
} from '../../../packages/core/src/infrastructure/index';

describe('v2.4.2 Expansion Components', () => {
  describe('Component #46: URLPattern API Engine', () => {
    beforeEach(() => {
      URLPatternEngine.clearCache();
    });

    test('compiles patterns', () => {
      const compiled = URLPatternEngine.compile('/users/:id');
      expect(compiled.source).toBe('/users/:id');
      expect(compiled.hasGroups).toBe(true);
    });

    test('matches URLs with params', () => {
      const result = URLPatternEngine.match('/users/123', '/users/:id');
      expect(result.matched).toBe(true);
      expect(result.params.id).toBe('123');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('returns false for non-matching URLs', () => {
      const result = URLPatternEngine.match('/posts/123', '/users/:id');
      expect(result.matched).toBe(false);
    });

    test('caches compiled patterns', () => {
      URLPatternEngine.compile('/test');
      URLPatternEngine.compile('/test');
      const stats = URLPatternEngine.getCacheStats();
      expect(stats.size).toBe(1);
    });

    test('test() returns boolean', () => {
      expect(URLPatternEngine.test('/users/123', '/users/:id')).toBe(true);
      expect(URLPatternEngine.test('/posts/123', '/users/:id')).toBe(false);
    });
  });

  describe('Component #47: Fake Timers Engine', () => {
    beforeEach(() => {
      // Ensure clean state before each test
      FakeTimersEngine.useRealTimers();
    });

    afterEach(() => {
      FakeTimersEngine.useRealTimers();
    });

    test('useFakeTimers initializes correctly', () => {
      FakeTimersEngine.useFakeTimers({ now: 1000 });
      expect(FakeTimersEngine.isFakeTimersEnabled()).toBe(true);
      expect(FakeTimersEngine.now()).toBe(1000);
    });

    test('advanceTimersByTime moves time forward', () => {
      FakeTimersEngine.useFakeTimers({ now: 0 });
      expect(FakeTimersEngine.isFakeTimersEnabled()).toBe(true);
      FakeTimersEngine.advanceTimersByTime(1000);
      const currentTime = FakeTimersEngine.now();
      expect(currentTime).toBe(1000);
    });

    test('useRealTimers restores original behavior', () => {
      FakeTimersEngine.useFakeTimers();
      FakeTimersEngine.useRealTimers();
      expect(FakeTimersEngine.isFakeTimersEnabled()).toBe(false);
    });

    test('setSystemTime sets specific time', () => {
      FakeTimersEngine.useFakeTimers();
      FakeTimersEngine.setSystemTime(5000);
      expect(FakeTimersEngine.now()).toBe(5000);
    });
  });

  describe('Component #48: Custom Proxy Headers', () => {
    test('createProxyConfig creates valid config', () => {
      const config = ProxyHeadersHandler.createProxyConfig('http://proxy:8080');
      expect(config.url).toBe('http://proxy:8080/');
      expect(config.headers['Proxy-Connection']).toBe('Keep-Alive');
    });

    test('sanitizeHeaders removes control characters', () => {
      const result = ProxyHeadersHandler.sanitizeHeaders({
        'X-Custom': 'value\r\nwith\nnewlines',
      });
      expect(result.headers['X-Custom']).toBe('valuewithnewlines');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('sanitizeHeaders blocks forbidden headers', () => {
      const result = ProxyHeadersHandler.sanitizeHeaders({
        Host: 'example.com',
        'X-Custom': 'valid',
      });
      expect(result.blocked).toContain('Host');
      expect(result.headers['X-Custom']).toBe('valid');
    });

    test('parseProxyUrl extracts components', () => {
      const result = ProxyHeadersHandler.parseProxyUrl('http://user:pass@proxy:8080');
      expect(result.host).toBe('proxy');
      expect(result.port).toBe(8080);
      expect(result.auth?.username).toBe('user');
    });
  });

  describe('Component #49: HttpAgent Connection Pool', () => {
    let pool: HttpAgentConnectionPool;

    beforeEach(() => {
      pool = new HttpAgentConnectionPool({ maxSockets: 5 });
    });

    afterEach(() => {
      pool.destroy();
    });

    test('creates connections', async () => {
      const connId = await pool.getConnection('localhost', 3000);
      expect(connId).toBeTruthy();
      expect(connId).toMatch(/^conn_\d+$/);
    });

    test('tracks connection stats', async () => {
      await pool.getConnection('localhost', 3000);
      const stats = pool.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
    });

    test('releases connections to idle pool', async () => {
      const connId = await pool.getConnection('localhost', 3000);
      pool.releaseConnection(connId);
      const stats = pool.getStats();
      expect(stats.idleConnections).toBe(1);
    });

    test('verifyConnectionReuse checks for idle connections', async () => {
      const connId = await pool.getConnection('localhost', 3000);
      pool.releaseConnection(connId);
      expect(pool.verifyConnectionReuse('localhost', 3000)).toBe(true);
    });
  });

  describe('Component #50: Standalone Executable Optimizer', () => {
    test('BUILD_OPTIONS disables autoloading', () => {
      expect(StandaloneExecutableOptimizer.BUILD_OPTIONS.tsconfig).toBe(false);
      expect(StandaloneExecutableOptimizer.BUILD_OPTIONS.packageJson).toBe(false);
      expect(StandaloneExecutableOptimizer.BUILD_OPTIONS.dotenv).toBe(false);
    });

    test('getRecommendedConfig returns production config', () => {
      const config = StandaloneExecutableOptimizer.getRecommendedConfig('production');
      expect(config.minify).toBe(true);
      expect(config.sourcemap).toBe(false);
    });

    test('getRecommendedConfig returns development config', () => {
      const config = StandaloneExecutableOptimizer.getRecommendedConfig('development');
      expect(config.minify).toBe(false);
      expect(config.sourcemap).toBe('inline');
    });
  });

  describe('Component #51: Console JSON Formatter', () => {
    test('formatLog handles %j specifier', () => {
      const result = ConsoleJSONFormatter.formatLog('Data: %j', { foo: 'bar' });
      expect(result).toBe('Data: {"foo":"bar"}');
    });

    test('formatLog handles %s specifier', () => {
      const result = ConsoleJSONFormatter.formatLog('Hello %s', 'world');
      expect(result).toBe('Hello world');
    });

    test('formatLog handles %d specifier', () => {
      const result = ConsoleJSONFormatter.formatLog('Count: %d', 42);
      expect(result).toBe('Count: 42');
    });

    test('formatLog handles %% escape', () => {
      const result = ConsoleJSONFormatter.formatLog('100%% complete');
      expect(result).toBe('100% complete');
    });

    test('prettyPrint formats objects with indentation', () => {
      const result = ConsoleJSONFormatter.prettyPrint({ a: 1 }, 2);
      expect(result).toContain('\n');
    });

    test('createLogEntry creates structured entry', () => {
      const entry = ConsoleJSONFormatter.createLogEntry('info', 'test message');
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('test message');
      expect(entry.timestamp).toBeTruthy();
    });
  });

  describe('Component #53: CVE Hardening Layer', () => {
    test('validatePackageSource trusts npm registry', () => {
      const result = CVEHardeningLayer.validatePackageSource(
        'lodash',
        'https://registry.npmjs.org/lodash'
      );
      expect(result.trusted).toBe(true);
    });

    test('validatePackageSource blocks file: protocol', () => {
      const result = CVEHardeningLayer.validatePackageSource(
        'malicious',
        'file:./malicious.tgz'
      );
      expect(result.trusted).toBe(false);
      expect(result.requiresExplicitTrust).toBe(true);
      expect(result.blockedProtocol).toBe('file:');
    });

    test('validatePackageSource allows explicit trust', () => {
      const result = CVEHardeningLayer.validatePackageSource(
        'local-pkg',
        'file:./local.tgz',
        ['local-pkg']
      );
      expect(result.trusted).toBe(true);
    });

    test('createIsolatedSandbox returns safe context', () => {
      const sandbox = CVEHardeningLayer.createIsolatedSandbox();
      expect(sandbox.context.console).toBeDefined();
      expect(sandbox.context.JSON).toBeDefined();
      expect(sandbox.evaluate).toBeInstanceOf(Function);
      sandbox.destroy();
    });

    test('getActiveMitigations returns CVE list', () => {
      const mitigations = CVEHardeningLayer.getActiveMitigations();
      expect(mitigations.length).toBeGreaterThan(0);
      expect(mitigations.some((m) => m.cveId === 'CVE-2024-TRUSTED-DEPS')).toBe(true);
    });

    test('timingSafeEqual compares strings securely', () => {
      expect(CVEHardeningLayer.timingSafeEqual('abc', 'abc')).toBe(true);
      expect(CVEHardeningLayer.timingSafeEqual('abc', 'def')).toBe(false);
      expect(CVEHardeningLayer.timingSafeEqual('abc', 'abcd')).toBe(false);
    });
  });

  describe('Component #54: Node.js Compatibility Bridge', () => {
    test('hexSlice converts buffer to hex', () => {
      const buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
      const result = NodeJSCompatBridge.hexSlice(buffer, 0, 4);
      expect(result).toBe('deadbeef');
    });

    test('napiTypeof returns object for boxed primitives', () => {
      expect(NodeJSCompatBridge.napiTypeof(new String('test'))).toBe('object');
      expect(NodeJSCompatBridge.napiTypeof(new Number(42))).toBe('object');
      expect(NodeJSCompatBridge.napiTypeof(new Boolean(true))).toBe('object');
    });

    test('napiTypeof returns normal type for primitives', () => {
      expect(NodeJSCompatBridge.napiTypeof('test')).toBe('string');
      expect(NodeJSCompatBridge.napiTypeof(42)).toBe('number');
      expect(NodeJSCompatBridge.napiTypeof(true)).toBe('boolean');
    });

    test('deepStrictEqual compares objects correctly', () => {
      expect(NodeJSCompatBridge.deepStrictEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(NodeJSCompatBridge.deepStrictEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    test('deepStrictEqual handles boxed primitives', () => {
      expect(NodeJSCompatBridge.deepStrictEqual(new Number(1), new Number(1))).toBe(true);
      expect(NodeJSCompatBridge.deepStrictEqual(new Number(1), new Number(2))).toBe(false);
    });

    test('bufferEquals compares buffers', () => {
      const a = Buffer.from([1, 2, 3]);
      const b = Buffer.from([1, 2, 3]);
      const c = Buffer.from([1, 2, 4]);
      expect(NodeJSCompatBridge.bufferEquals(a, b)).toBe(true);
      expect(NodeJSCompatBridge.bufferEquals(a, c)).toBe(false);
    });

    test('bufferCompare returns correct ordering', () => {
      const a = Buffer.from([1, 2]);
      const b = Buffer.from([1, 3]);
      const c = Buffer.from([1, 2]);
      expect(NodeJSCompatBridge.bufferCompare(a, b)).toBe(-1);
      expect(NodeJSCompatBridge.bufferCompare(b, a)).toBe(1);
      expect(NodeJSCompatBridge.bufferCompare(a, c)).toBe(0);
    });

    test('inspect formats objects', () => {
      const result = NodeJSCompatBridge.inspect({ foo: 'bar' });
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });

    test('hrtimeBigint returns bigint', () => {
      const result = NodeJSCompatBridge.hrtimeBigint();
      expect(typeof result).toBe('bigint');
    });

    test('hrtime returns tuple', () => {
      const result = NodeJSCompatBridge.hrtime();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('Golden Matrix v2.4.2 Statistics', () => {
    test('INFRASTRUCTURE_MATRIX has 54 components', () => {
      expect(INFRASTRUCTURE_MATRIX.totalComponents).toBe(54);
    });

    test('INFRASTRUCTURE_MATRIX has 23 zero-cost components', () => {
      expect(INFRASTRUCTURE_MATRIX.zeroCostComponents).toBe(23);
    });

    test('V242_COMPONENTS includes expansion components', () => {
      const componentIds = V242_COMPONENTS.map(
        (c) => (c.metadata as { component: number })?.component
      );
      expect(componentIds).toContain(46);
      expect(componentIds).toContain(47);
      expect(componentIds).toContain(48);
      expect(componentIds).toContain(49);
      expect(componentIds).toContain(50);
      expect(componentIds).toContain(51);
      expect(componentIds).toContain(52);
      expect(componentIds).toContain(53);
      expect(componentIds).toContain(54);
    });

    test('getMatrixStatistics returns correct totals', () => {
      const stats = getMatrixStatistics();
      expect(stats.totalComponents).toBe(54);
      expect(stats.zeroCostComponents).toBe(23);
      expect(stats.quantumReady).toBe(true);
    });
  });
});
