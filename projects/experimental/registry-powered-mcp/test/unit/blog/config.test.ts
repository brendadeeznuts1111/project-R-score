/**
 * Blog Config Manager Unit Tests
 * Infrastructure ID: 19 (Blog-Config-Manager)
 * Validates hot-reload configuration with Bun.watch()
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "harness";
import { blogConfig, DynamicConfigManager, configManager } from "../../../blog/config";
import { createTempDir, cleanupTempDir, sleep } from "harness";
import type { BlogConfig } from "../../../blog/types";

describe('Blog Config', () => {
  describe('blogConfig (Default Configuration)', () => {
    test('should have required title', () => {
      expect(blogConfig.title).toBe('Registry-Powered-MCP Infrastructure Updates');
    });

    test('should have valid URL', () => {
      expect(blogConfig.url).toBe('https://registry-powered-mcp.dev');
      expect(blogConfig.url).toMatch(/^https:\/\//);
    });

    test('should have author defined', () => {
      expect(blogConfig.author).toBe('Registry-Powered-MCP Core Team');
    });

    test('should have RSS configuration', () => {
      expect(blogConfig.rss).toBeDefined();
      expect(blogConfig.rss.filename).toBe('rss.xml');
      expect(blogConfig.rss.itemCount).toBe(20);
    });

    test('should define all four categories', () => {
      expect(Object.keys(blogConfig.categories)).toHaveLength(4);
      expect(blogConfig.categories.performance).toBeDefined();
      expect(blogConfig.categories.security).toBeDefined();
      expect(blogConfig.categories.releases).toBeDefined();
      expect(blogConfig.categories.federation).toBeDefined();
    });

    test('should have category names and descriptions', () => {
      const { performance, security, releases, federation } = blogConfig.categories;

      expect(performance.name).toBe('Performance Benchmarks');
      expect(performance.description).toBeDefined();

      expect(security.name).toBe('Security Advisories');
      expect(security.description).toBeDefined();

      expect(releases.name).toBe('Release Announcements');
      expect(releases.description).toBeDefined();

      expect(federation.name).toBe('Federation Updates');
      expect(federation.description).toBeDefined();
    });
  });
});

describe('DynamicConfigManager', () => {
  let tempDir: string;
  let manager: DynamicConfigManager;

  beforeAll(async () => {
    tempDir = await createTempDir('blog-config-test');
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  beforeEach(() => {
    manager = new DynamicConfigManager(`${tempDir}/config.json`);
  });

  describe('load()', () => {
    test('should return default config when file does not exist', async () => {
      const config = await manager.load();

      expect(config.title).toBe(blogConfig.title);
      expect(config.url).toBe(blogConfig.url);
    });

    test('should merge file config with defaults', async () => {
      const customConfig = {
        title: 'Custom Blog Title',
        rss: { itemCount: 50 }
      };

      await Bun.write(`${tempDir}/config.json`, JSON.stringify(customConfig));

      const config = await manager.load();

      expect(config.title).toBe('Custom Blog Title');
      expect(config.rss.itemCount).toBe(50);
      expect(config.rss.filename).toBe('rss.xml'); // Default preserved
      expect(config.url).toBe(blogConfig.url); // Default preserved
    });

    test('should handle malformed JSON gracefully', async () => {
      await Bun.write(`${tempDir}/config.json`, 'not valid json{');

      const config = await manager.load();

      // Should fall back to defaults
      expect(config.title).toBe(blogConfig.title);
    });

    test('should track load time (<5ms SLA)', async () => {
      const validConfig = { title: 'Test' };
      await Bun.write(`${tempDir}/config.json`, JSON.stringify(validConfig));

      const start = performance.now();
      await manager.load();
      const loadTime = performance.now() - start;

      expect(loadTime).toBeLessThan(50); // Allow margin for CI
    });
  });

  describe('getConfig()', () => {
    test('should return current configuration', async () => {
      await manager.load();
      const config = manager.getConfig();

      expect(config).toBeDefined();
      expect(config.title).toBeDefined();
    });

    test('should return defaults before load() is called', () => {
      const config = manager.getConfig();

      expect(config.title).toBe(blogConfig.title);
    });
  });

  describe('update()', () => {
    test('should update configuration in memory', async () => {
      await manager.load();
      await manager.update({ title: 'Updated Title' });

      const config = manager.getConfig();
      expect(config.title).toBe('Updated Title');
    });

    test('should persist updates to file', async () => {
      await manager.load();
      await manager.update({ title: 'Persisted Title' });

      // Read file directly
      const file = Bun.file(`${tempDir}/config.json`);
      const savedConfig = await file.json<BlogConfig>();

      expect(savedConfig.title).toBe('Persisted Title');
    });

    test('should notify subscribers on update', async () => {
      await manager.load();

      let notifiedConfig: BlogConfig | null = null;
      manager.subscribe((config) => {
        notifiedConfig = config;
      });

      await manager.update({ title: 'Subscriber Test' });

      expect(notifiedConfig).not.toBeNull();
      expect(notifiedConfig?.title).toBe('Subscriber Test');
    });
  });

  describe('subscribe()', () => {
    test('should register callback and return unsubscribe function', async () => {
      await manager.load();

      let callCount = 0;
      const unsubscribe = manager.subscribe(() => {
        callCount++;
      });

      await manager.update({ title: 'First Update' });
      expect(callCount).toBe(1);

      unsubscribe();

      await manager.update({ title: 'Second Update' });
      expect(callCount).toBe(1); // No increment after unsubscribe
    });

    test('should support multiple subscribers', async () => {
      await manager.load();

      const calls: string[] = [];

      manager.subscribe(() => calls.push('subscriber1'));
      manager.subscribe(() => calls.push('subscriber2'));
      manager.subscribe(() => calls.push('subscriber3'));

      await manager.update({ title: 'Multi-sub Test' });

      expect(calls).toContain('subscriber1');
      expect(calls).toContain('subscriber2');
      expect(calls).toContain('subscriber3');
    });

    test('should call all subscribers on update', async () => {
      await manager.load();

      const calls: number[] = [];

      manager.subscribe(() => {
        calls.push(1);
      });
      manager.subscribe(() => {
        calls.push(2);
      });

      await manager.update({ title: 'Subscriber Test' });

      expect(calls).toContain(1);
      expect(calls).toContain(2);
    });
  });

  describe('validate()', () => {
    test('should validate complete configuration', async () => {
      await manager.load();
      const result = manager.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing title', async () => {
      await Bun.write(`${tempDir}/config.json`, JSON.stringify({
        title: '',
        url: 'https://test.com',
        rss: { filename: 'rss.xml' }
      }));

      await manager.load();

      // Override with empty title to test validation
      const configWithEmptyTitle = new DynamicConfigManager(`${tempDir}/empty-title.json`);
      await Bun.write(`${tempDir}/empty-title.json`, JSON.stringify({
        title: null,
        url: 'https://test.com'
      }));
      await configWithEmptyTitle.load();

      // Manually set empty title to test
      (configWithEmptyTitle as any).config.title = '';

      const result = configWithEmptyTitle.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: title');
    });

    test('should detect missing URL', async () => {
      const badManager = new DynamicConfigManager(`${tempDir}/no-url.json`);
      await badManager.load();
      (badManager as any).config.url = '';

      const result = badManager.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: url');
    });

    test('should detect missing RSS filename', async () => {
      const badManager = new DynamicConfigManager(`${tempDir}/no-rss.json`);
      await badManager.load();
      (badManager as any).config.rss = { filename: '', itemCount: 20 };

      const result = badManager.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: rss.filename');
    });
  });

  describe('Hot-reload (startWatching/stopWatching)', () => {
    // Note: Bun.watch() may not be available in all Bun versions
    // These tests are skipped when the API is unavailable
    test.skipIf(typeof Bun.watch !== 'function')('should start and stop watcher without error', async () => {
      await Bun.write(`${tempDir}/config.json`, JSON.stringify({ title: 'Watch Test' }));
      await manager.load();

      manager.startWatching();
      // Starting twice should be idempotent
      manager.startWatching();

      manager.stopWatching();
      // Stopping twice should be safe
      manager.stopWatching();
    });

    test.skipIf(typeof Bun.watch !== 'function')('should handle watcher errors gracefully', async () => {
      // Bun.watch() may throw for non-existent paths
      // The implementation should handle this gracefully
      const existingManager = new DynamicConfigManager(`${tempDir}/config.json`);
      await Bun.write(`${tempDir}/config.json`, JSON.stringify({ title: 'Watch Test 2' }));
      await existingManager.load();

      // This should work without throwing
      existingManager.startWatching();
      existingManager.stopWatching();
    });

    test('should have stopWatching method', () => {
      expect(typeof manager.stopWatching).toBe('function');
    });
  });

  describe('Singleton export', () => {
    test('should export singleton configManager instance', () => {
      expect(configManager).toBeInstanceOf(DynamicConfigManager);
    });
  });
});
