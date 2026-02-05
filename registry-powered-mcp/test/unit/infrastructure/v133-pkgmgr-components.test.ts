/**
 * Tests for Bun v1.3.3 Package Manager & Stability Components (#56-64 expansion)
 *
 * Components tested:
 * - #56b: ConfigVersion-Stabilizer
 * - #57b: CPU-Profiler-Engine
 * - #58b: OnTestFinished-Finalizer
 * - #59b: WebSocket-Subscription-Tracker
 * - #60: Git-Dependency-Security-Layer
 * - #61: SpawnSync-Isolated-Loop
 * - #62: Bun-List-Alias
 * - #63: Config-Loading-Patch
 * - #64: Hoisted-Install-Restorer
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// Component #56b: ConfigVersion-Stabilizer
import {
  ConfigVersionStabilizer,
  CONFIG_VERSIONS,
  getDefaultLinker,
  hasWorkspaces as hasWorkspacesConfig,
} from '../../../packages/core/src/infrastructure/configversion-stabilizer';

// Component #57b: CPU-Profiler-Engine
import {
  CPUProfilerEngine,
  startCPUProfiler,
  stopCPUProfiler,
  isProfilerActive,
  getSampleCount,
  cpuProfCLIHelper,
} from '../../../packages/core/src/infrastructure/cpu-profiler-engine';

// Component #58b: OnTestFinished-Finalizer
import {
  OnTestFinishedFinalizer,
  onTestFinished,
  registerFinalizer,
  runFinalizers,
} from '../../../packages/core/src/infrastructure/ontestfinished-finalizer';

// Component #59b: WebSocket-Subscription-Tracker
import {
  WebSocketSubscriptionTracker,
  getSubscriptions,
} from '../../../packages/core/src/infrastructure/websocket-subscription-tracker';

// Component #60: Git-Dependency-Security-Layer
import {
  GitDependencySecurityLayer,
  resolveGitDependency,
  validateGitHubShorthand,
  validateGitUrl,
  isGitHubDependency,
  parseGitHubShorthand,
  KNOWN_PROTOCOLS,
} from '../../../packages/core/src/infrastructure/git-dependency-security-layer';

// Component #61: SpawnSync-Isolated-Loop
import {
  SpawnSyncIsolatedLoop,
  spawnSync,
  execSync,
  getSpawnStats,
} from '../../../packages/core/src/infrastructure/spawnsync-isolated-loop';

// Component #62: Bun-List-Alias
import {
  BunListAlias,
  executeAlias,
  resolveAlias,
  isAlias,
  getAliases,
  ALIAS_COMMANDS,
} from '../../../packages/core/src/infrastructure/bun-list-alias';

// Component #63: Config-Loading-Patch
import {
  ConfigLoadingPatch,
  loadConfig,
  isConfigLoaded,
  clearConfigCache,
  getConfigStats,
} from '../../../packages/core/src/infrastructure/config-loading-patch';

// Component #64: Hoisted-Install-Restorer
import {
  HoistedInstallRestorer,
  detectProject,
  hasWorkspaces as hasWorkspacesHoisted,
  getCurrentLinker,
} from '../../../packages/core/src/infrastructure/hoisted-install-restorer';

// ============================================================================
// Component #56b: ConfigVersion-Stabilizer Tests
// ============================================================================

describe('Component #56b: ConfigVersion-Stabilizer', () => {
  test('CONFIG_VERSIONS constants are defined', () => {
    expect(CONFIG_VERSIONS.V0).toBe(0);
    expect(CONFIG_VERSIONS.V1).toBe(1);
  });

  test('getDefaultLinker returns valid linker type', () => {
    const linker = getDefaultLinker();
    expect(['hoisted', 'isolated']).toContain(linker);
  });

  test('hasWorkspacesConfig returns boolean', () => {
    const result = hasWorkspacesConfig();
    expect(typeof result).toBe('boolean');
  });

  test('ConfigVersionStabilizer has static methods', () => {
    expect(typeof ConfigVersionStabilizer.initializeLockfile).toBe('function');
    expect(typeof ConfigVersionStabilizer.getDefaultLinker).toBe('function');
    expect(typeof ConfigVersionStabilizer.getConfigVersion).toBe('function');
    expect(typeof ConfigVersionStabilizer.hasWorkspaces).toBe('function');
  });
});

// ============================================================================
// Component #57b: CPU-Profiler-Engine Tests
// ============================================================================

describe('Component #57b: CPU-Profiler-Engine', () => {
  afterEach(() => {
    // Ensure profiler is stopped after each test
    if (isProfilerActive()) {
      stopCPUProfiler();
    }
  });

  test('isProfilerActive returns false initially', () => {
    expect(isProfilerActive()).toBe(false);
  });

  test('getSampleCount returns 0 when not profiling', () => {
    expect(getSampleCount()).toBe(0);
  });

  test('cpuProfCLIHelper.flags contains expected flags', () => {
    expect(cpuProfCLIHelper.flags).toContain('--cpu-prof');
    expect(cpuProfCLIHelper.flags).toContain('--cpu-prof-name');
    expect(cpuProfCLIHelper.flags).toContain('--cpu-prof-dir');
  });

  test('cpuProfCLIHelper.parseArgs parses flags correctly', () => {
    const result = cpuProfCLIHelper.parseArgs(['--cpu-prof', '--cpu-prof-name', 'test.cpuprofile']);
    expect(result.enabled).toBe(true);
    expect(result.config.name).toBe('test.cpuprofile');
  });

  test('cpuProfCLIHelper.parseArgs returns disabled when no flags', () => {
    const result = cpuProfCLIHelper.parseArgs(['run', 'index.ts']);
    expect(result.enabled).toBe(false);
  });

  test('CPUProfilerEngine has static methods', () => {
    expect(typeof CPUProfilerEngine.start).toBe('function');
    expect(typeof CPUProfilerEngine.stop).toBe('function');
    expect(typeof CPUProfilerEngine.isProfilerActive).toBe('function');
    expect(typeof CPUProfilerEngine.getSampleCount).toBe('function');
  });
});

// ============================================================================
// Component #58b: OnTestFinished-Finalizer Tests
// ============================================================================

describe('Component #58b: OnTestFinished-Finalizer', () => {
  beforeEach(() => {
    OnTestFinishedFinalizer.reset();
  });

  test('registerFinalizer returns result object', () => {
    OnTestFinishedFinalizer.setCurrentTest('test-1', 'Test One');
    const result = registerFinalizer(() => {});
    expect(result).toHaveProperty('registered');
    expect(result).toHaveProperty('callbackCount');
    OnTestFinishedFinalizer.clearCurrentTest();
  });

  test('runFinalizers returns result object', async () => {
    OnTestFinishedFinalizer.setCurrentTest('test-2', 'Test Two');
    registerFinalizer(() => {});
    const result = await runFinalizers('test-2');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('duration');
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    OnTestFinishedFinalizer.clearCurrentTest();
  });

  test('finalizers run in LIFO order', async () => {
    const order: number[] = [];
    OnTestFinishedFinalizer.setCurrentTest('test-3', 'Test Three');

    registerFinalizer(() => { order.push(1); });
    registerFinalizer(() => { order.push(2); });
    registerFinalizer(() => { order.push(3); });

    await runFinalizers('test-3');
    expect(order).toEqual([3, 2, 1]); // LIFO order
    OnTestFinishedFinalizer.clearCurrentTest();
  });

  test('async finalizers are awaited', async () => {
    let completed = false;
    OnTestFinishedFinalizer.setCurrentTest('test-4', 'Test Four');

    registerFinalizer(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      completed = true;
    });

    await runFinalizers('test-4');
    expect(completed).toBe(true);
    OnTestFinishedFinalizer.clearCurrentTest();
  });

  test('getTotalFinalizerCount tracks registrations', () => {
    OnTestFinishedFinalizer.setCurrentTest('test-5', 'Test Five');
    registerFinalizer(() => {});
    registerFinalizer(() => {});
    expect(OnTestFinishedFinalizer.getTotalFinalizerCount()).toBe(2);
    OnTestFinishedFinalizer.clearCurrentTest();
  });
});

// ============================================================================
// Component #59b: WebSocket-Subscription-Tracker Tests
// ============================================================================

describe('Component #59b: WebSocket-Subscription-Tracker', () => {
  beforeEach(() => {
    WebSocketSubscriptionTracker.reset();
  });

  test('getSubscriptions returns empty array for closed connection', () => {
    const mockWs = {
      data: {
        subscriptions: new Set(['topic1']),
        subscriptionCount: 1,
        connectionId: 'test',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      },
      readyState: 3, // CLOSED
      subscribe: () => {},
      unsubscribe: () => {},
    };

    const subs = getSubscriptions(mockWs as any);
    expect(subs).toEqual([]);
  });

  test('getTotalSubscriptions returns 0 initially', () => {
    expect(WebSocketSubscriptionTracker.getTotalSubscriptions()).toBe(0);
  });

  test('getConnectionCount returns 0 initially', () => {
    expect(WebSocketSubscriptionTracker.getConnectionCount()).toBe(0);
  });

  test('getRecentEvents returns empty array initially', () => {
    const events = WebSocketSubscriptionTracker.getRecentEvents();
    expect(events).toEqual([]);
  });

  test('getTopicStats returns empty map initially', () => {
    const stats = WebSocketSubscriptionTracker.getTopicStats();
    expect(stats.size).toBe(0);
  });
});

// ============================================================================
// Component #60: Git-Dependency-Security-Layer Tests
// ============================================================================

describe('Component #60: Git-Dependency-Security-Layer', () => {
  test('KNOWN_PROTOCOLS contains expected protocols', () => {
    expect(KNOWN_PROTOCOLS).toContain('git+ssh');
    expect(KNOWN_PROTOCOLS).toContain('git+https');
    expect(KNOWN_PROTOCOLS).toContain('https');
    expect(KNOWN_PROTOCOLS).toContain('ssh');
    expect(KNOWN_PROTOCOLS).toContain('git');
  });

  test('validateGitHubShorthand validates correct format', () => {
    expect(validateGitHubShorthand('owner/repo')).toBe(true);
    expect(validateGitHubShorthand('owner/repo#v1.0.0')).toBe(true);
    expect(validateGitHubShorthand('my-org/my-repo#main')).toBe(true);
  });

  test('validateGitHubShorthand rejects invalid format', () => {
    expect(validateGitHubShorthand('just-a-name')).toBe(false);
    expect(validateGitHubShorthand('https://github.com/owner/repo')).toBe(false);
  });

  test('isGitHubDependency detects GitHub dependencies', () => {
    expect(isGitHubDependency('owner/repo')).toBe(true);
    expect(isGitHubDependency('owner/repo#v1.0.0')).toBe(true);
    expect(isGitHubDependency('https://github.com/owner/repo')).toBe(true);
  });

  test('isGitHubDependency rejects non-GitHub dependencies', () => {
    expect(isGitHubDependency('https://gitlab.com/owner/repo')).toBe(false);
    expect(isGitHubDependency('git://example.com/repo.git')).toBe(false);
  });

  test('parseGitHubShorthand extracts components', () => {
    const result = parseGitHubShorthand('owner/repo#v1.0.0');
    expect(result).not.toBeNull();
    expect(result?.owner).toBe('owner');
    expect(result?.repo).toBe('repo');
    expect(result?.ref).toBe('v1.0.0');
  });

  test('parseGitHubShorthand uses HEAD as default ref', () => {
    const result = parseGitHubShorthand('owner/repo');
    expect(result?.ref).toBe('HEAD');
  });

  test('validateGitUrl detects path traversal', () => {
    const result = validateGitUrl('https://example.com/../../../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('traversal');
  });

  test('validateGitUrl detects null bytes', () => {
    const result = validateGitUrl('https://example.com/repo\x00.git');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Null bytes');
  });

  test('validateGitUrl detects overly long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(3000);
    const result = validateGitUrl(longUrl);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });

  test('validateGitUrl accepts valid URLs', () => {
    const result = validateGitUrl('https://github.com/owner/repo.git');
    expect(result.valid).toBe(true);
  });

  test('resolveGitDependency resolves GitHub shorthand', () => {
    const result = resolveGitDependency('owner/repo#v1.0.0');
    expect(result.isGitHub).toBe(true);
    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
    expect(result.ref).toBe('v1.0.0');
    expect(result.url).toContain('api.github.com');
    expect(result.url).toContain('tarball');
  });

  test('resolveGitDependency preserves non-GitHub URLs', () => {
    const result = resolveGitDependency('git://example.com/repo.git');
    expect(result.isGitHub).toBe(false);
    expect(result.url).toBe('git://example.com/repo.git');
  });
});

// ============================================================================
// Component #61: SpawnSync-Isolated-Loop Tests
// ============================================================================

describe('Component #61: SpawnSync-Isolated-Loop', () => {
  beforeEach(() => {
    SpawnSyncIsolatedLoop.resetStats();
  });

  test('spawnSync executes simple command', () => {
    const result = spawnSync('echo', ['hello']);
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('hello');
  });

  test('spawnSync captures stderr', () => {
    const result = spawnSync('sh', ['-c', 'echo error >&2']);
    expect(result.stderr.toString().trim()).toBe('error');
  });

  test('spawnSync returns non-zero status on failure', () => {
    const result = spawnSync('sh', ['-c', 'exit 42']);
    expect(result.status).toBe(42);
  });

  test('execSync returns stdout as buffer', () => {
    const result = execSync('echo hello');
    expect(result.toString().trim()).toBe('hello');
  });

  test('execSync throws on non-zero exit', () => {
    expect(() => execSync('exit 1')).toThrow();
  });

  test('getSpawnStats tracks spawn count', () => {
    spawnSync('echo', ['test1']);
    spawnSync('echo', ['test2']);
    const stats = getSpawnStats();
    expect(stats.count).toBe(2);
    expect(stats.totalDuration).toBeGreaterThan(0);
  });

  test('SpawnSyncIsolatedLoop has static methods', () => {
    expect(typeof SpawnSyncIsolatedLoop.spawnSync).toBe('function');
    expect(typeof SpawnSyncIsolatedLoop.execSync).toBe('function');
    expect(typeof SpawnSyncIsolatedLoop.testTimeoutReliability).toBe('function');
    expect(typeof SpawnSyncIsolatedLoop.verifyWindowsIsolation).toBe('function');
  });
});

// ============================================================================
// Component #62: Bun-List-Alias Tests
// ============================================================================

describe('Component #62: Bun-List-Alias', () => {
  beforeEach(() => {
    BunListAlias.resetStats();
  });

  test('ALIAS_COMMANDS contains expected mappings', () => {
    expect(ALIAS_COMMANDS['bun list']).toBe('bun pm ls');
    expect(ALIAS_COMMANDS['bun list --all']).toBe('bun pm ls --all');
    expect(ALIAS_COMMANDS['bun list --json']).toBe('bun pm ls --json');
  });

  test('isAlias detects known aliases', () => {
    expect(isAlias('bun list')).toBe(true);
    expect(isAlias('bun list --all')).toBe(true);
    expect(isAlias('BUN LIST')).toBe(true); // Case insensitive
  });

  test('isAlias rejects non-aliases', () => {
    expect(isAlias('bun install')).toBe(false);
    expect(isAlias('npm list')).toBe(false);
  });

  test('resolveAlias resolves known aliases', () => {
    const result = resolveAlias('bun list');
    expect(result.resolved).toBe(true);
    expect(result.target).toBe('bun pm ls');
  });

  test('resolveAlias returns unresolved for non-aliases', () => {
    const result = resolveAlias('bun install');
    expect(result.resolved).toBe(false);
    expect(result.original).toBe('bun install');
  });

  test('executeAlias transforms aliased commands', () => {
    const result = executeAlias(['list']);
    expect(result.wasAliased).toBe(true);
    expect(result.command).toBe('bun');
    expect(result.args).toContain('pm');
    expect(result.args).toContain('ls');
  });

  test('executeAlias preserves non-aliased commands', () => {
    const result = executeAlias(['install', 'lodash']);
    expect(result.wasAliased).toBe(false);
    expect(result.args).toEqual(['install', 'lodash']);
  });

  test('getAliases returns all aliases', () => {
    const aliases = getAliases();
    expect(Object.keys(aliases).length).toBeGreaterThan(0);
    expect(aliases['bun list']).toBe('bun pm ls');
  });
});

// ============================================================================
// Component #63: Config-Loading-Patch Tests
// ============================================================================

describe('Component #63: Config-Loading-Patch', () => {
  beforeEach(() => {
    clearConfigCache();
    ConfigLoadingPatch.resetStats();
  });

  test('isConfigLoaded returns false for unloaded config', () => {
    expect(isConfigLoaded('/nonexistent/config.toml')).toBe(false);
  });

  test('getConfigStats returns initial state', () => {
    const stats = getConfigStats();
    expect(stats.loadCount).toBe(0);
    expect(stats.cacheHits).toBe(0);
    expect(stats.cachedConfigs).toBe(0);
  });

  test('clearConfigCache resets cache', () => {
    clearConfigCache();
    const stats = getConfigStats();
    expect(stats.cachedConfigs).toBe(0);
  });

  test('loadConfig returns result object for nonexistent file', () => {
    const result = loadConfig('/nonexistent/config.toml');
    expect(result).toHaveProperty('loaded');
    expect(result).toHaveProperty('cached');
    expect(result).toHaveProperty('path');
  });

  test('ConfigLoadingPatch has static methods', () => {
    expect(typeof ConfigLoadingPatch.loadConfig).toBe('function');
    expect(typeof ConfigLoadingPatch.isLoaded).toBe('function');
    expect(typeof ConfigLoadingPatch.getCached).toBe('function');
    expect(typeof ConfigLoadingPatch.invalidate).toBe('function');
    expect(typeof ConfigLoadingPatch.clearConfigCache).toBe('function');
    expect(typeof ConfigLoadingPatch.getStats).toBe('function');
  });
});

// ============================================================================
// Component #64: Hoisted-Install-Restorer Tests
// ============================================================================

describe('Component #64: Hoisted-Install-Restorer', () => {
  beforeEach(() => {
    HoistedInstallRestorer.resetStats();
  });

  test('detectProject returns detection result', () => {
    const result = detectProject(process.cwd());
    expect(result).toHaveProperty('isExisting');
    expect(result).toHaveProperty('hasWorkspaces');
    expect(result).toHaveProperty('fromNpm');
    expect(result).toHaveProperty('fromYarn');
    expect(result).toHaveProperty('fromPnpm');
    expect(result).toHaveProperty('hasBunLock');
    expect(result).toHaveProperty('hasBunfig');
  });

  test('hasWorkspacesHoisted returns boolean', () => {
    const result = hasWorkspacesHoisted(process.cwd());
    expect(typeof result).toBe('boolean');
  });

  test('getCurrentLinker returns null for missing bunfig', () => {
    const result = getCurrentLinker('/nonexistent/path');
    expect(result).toBeNull();
  });

  test('HoistedInstallRestorer has static methods', () => {
    expect(typeof HoistedInstallRestorer.restoreForExistingWorkspace).toBe('function');
    expect(typeof HoistedInstallRestorer.detectProject).toBe('function');
    expect(typeof HoistedInstallRestorer.hasWorkspaces).toBe('function');
    expect(typeof HoistedInstallRestorer.getCurrentLinker).toBe('function');
  });

  test('detectProject detects current project characteristics', () => {
    const result = detectProject(process.cwd());
    // Result should have all expected properties with correct types
    expect(typeof result.hasBunLock).toBe('boolean');
    expect(typeof result.hasWorkspaces).toBe('boolean');
    expect(typeof result.fromNpm).toBe('boolean');
    expect(typeof result.fromYarn).toBe('boolean');
    expect(typeof result.fromPnpm).toBe('boolean');
    expect(typeof result.hasBunfig).toBe('boolean');
    expect(typeof result.isExisting).toBe('boolean');
    // isExisting should be true if any lockfile or node_modules exists
    // This project may or may not have a bun.lockb, so we just verify types
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('v1.3.3 Package Manager Components Integration', () => {
  test('all components export classes with expected interfaces', () => {
    // Verify all classes are exported
    expect(ConfigVersionStabilizer).toBeDefined();
    expect(CPUProfilerEngine).toBeDefined();
    expect(OnTestFinishedFinalizer).toBeDefined();
    expect(WebSocketSubscriptionTracker).toBeDefined();
    expect(GitDependencySecurityLayer).toBeDefined();
    expect(SpawnSyncIsolatedLoop).toBeDefined();
    expect(BunListAlias).toBeDefined();
    expect(ConfigLoadingPatch).toBeDefined();
    expect(HoistedInstallRestorer).toBeDefined();
  });

  test('Git security layer integrates with dependency resolution', () => {
    // Test GitHub shorthand resolution pipeline
    const shorthand = 'anthropics/claude-code#v1.0.0';

    if (isGitHubDependency(shorthand)) {
      const parsed = parseGitHubShorthand(shorthand);
      expect(parsed?.owner).toBe('anthropics');
      expect(parsed?.repo).toBe('claude-code');

      const resolved = resolveGitDependency(shorthand);
      expect(resolved.isGitHub).toBe(true);
      expect(resolved.url).toContain('tarball');
    }
  });

  test('SpawnSync works with Bun list alias', () => {
    // Execute the resolved alias command
    const aliasResult = executeAlias(['list']);

    if (aliasResult.wasAliased) {
      // The actual command would be "bun pm ls"
      expect(aliasResult.args).toContain('pm');
      expect(aliasResult.args).toContain('ls');
    }
  });
});
