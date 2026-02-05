/**
 * Plugin Registry Tests v2.4.1
 *
 * Comprehensive test suite for the workflow plugin registry.
 * Tests cover:
 * - Plugin registration
 * - Plugin validation
 * - Engine attachment
 * - Plugin loading
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  PluginRegistry,
  createPluginRegistry,
  definePlugin,
  WorkflowEngine,
  createWorkflowEngine,
} from '../../../packages/core/src/workflow';
import type { WorkflowPlugin } from '../../../packages/core/src/workflow';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = createPluginRegistry();
  });

  describe('initialization', () => {
    test('should create registry with default config', () => {
      const stats = registry.getStats();
      expect(stats.totalPlugins).toBe(0);
    });

    test('should create registry with custom config', () => {
      const customRegistry = createPluginRegistry({
        enableRemotePlugins: true,
        allowedRemoteHosts: ['example.com'],
      });
      expect(customRegistry).toBeInstanceOf(PluginRegistry);
    });
  });

  describe('plugin registration', () => {
    test('should register a valid plugin', async () => {
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
        },
        stepHandlers: {
          'test.handler': async () => ({ success: true }),
        },
      };

      await registry.register(plugin);
      expect(registry.has('test-plugin')).toBe(true);
    });

    test('should retrieve registered plugin', async () => {
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'my-plugin',
          name: 'My Plugin',
          version: '2.0.0',
        },
        stepHandlers: {
          'my.handler': async () => ({}),
        },
      };

      await registry.register(plugin);
      const retrieved = registry.get('my-plugin');

      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.name).toBe('My Plugin');
      expect(retrieved?.metadata.version).toBe('2.0.0');
    });

    test('should throw when registering duplicate plugin', async () => {
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'duplicate-plugin',
          name: 'Duplicate Plugin',
          version: '1.0.0',
        },
        stepHandlers: {},
      };

      await registry.register(plugin);

      await expect(registry.register(plugin)).rejects.toThrow(
        'Plugin already registered'
      );
    });

    test('should allow override when configured', async () => {
      const plugin1: WorkflowPlugin = {
        metadata: {
          id: 'override-plugin',
          name: 'Original',
          version: '1.0.0',
        },
        stepHandlers: {},
      };

      const plugin2: WorkflowPlugin = {
        metadata: {
          id: 'override-plugin',
          name: 'Override',
          version: '2.0.0',
        },
        stepHandlers: {},
      };

      await registry.register(plugin1);
      await registry.register(plugin2, { overrideExisting: true });

      const retrieved = registry.get('override-plugin');
      expect(retrieved?.metadata.name).toBe('Override');
    });

    test('should call initialize on plugin registration', async () => {
      let initialized = false;

      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'init-plugin',
          name: 'Init Plugin',
          version: '1.0.0',
        },
        stepHandlers: {},
        initialize: async () => {
          initialized = true;
        },
      };

      await registry.register(plugin);
      expect(initialized).toBe(true);
    });
  });

  describe('plugin unregistration', () => {
    test('should unregister a plugin', async () => {
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'removable-plugin',
          name: 'Removable Plugin',
          version: '1.0.0',
        },
        stepHandlers: {},
      };

      await registry.register(plugin);
      expect(registry.has('removable-plugin')).toBe(true);

      const result = await registry.unregister('removable-plugin');
      expect(result).toBe(true);
      expect(registry.has('removable-plugin')).toBe(false);
    });

    test('should call cleanup on unregistration', async () => {
      let cleanedUp = false;

      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'cleanup-plugin',
          name: 'Cleanup Plugin',
          version: '1.0.0',
        },
        stepHandlers: {},
        cleanup: async () => {
          cleanedUp = true;
        },
      };

      await registry.register(plugin);
      await registry.unregister('cleanup-plugin');

      expect(cleanedUp).toBe(true);
    });

    test('should return false for non-existent plugin', async () => {
      const result = await registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('plugin validation', () => {
    test('should validate plugin with valid structure', () => {
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'valid-plugin',
          name: 'Valid Plugin',
          version: '1.0.0',
        },
        stepHandlers: {
          handler: async () => ({}),
        },
      };

      const result = registry.validatePlugin(plugin);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should fail validation for missing metadata.id', () => {
      const plugin = {
        metadata: {
          name: 'No ID Plugin',
          version: '1.0.0',
        },
        stepHandlers: {},
      };

      const result = registry.validatePlugin(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin metadata.id is required');
    });

    test('should fail validation for missing metadata.name', () => {
      const plugin = {
        metadata: {
          id: 'no-name',
          version: '1.0.0',
        },
        stepHandlers: {},
      };

      const result = registry.validatePlugin(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin metadata.name is required');
    });

    test('should fail validation for missing metadata.version', () => {
      const plugin = {
        metadata: {
          id: 'no-version',
          name: 'No Version',
        },
        stepHandlers: {},
      };

      const result = registry.validatePlugin(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin metadata.version is required');
    });

    test('should warn for plugin with no handlers', () => {
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'no-handlers',
          name: 'No Handlers',
          version: '1.0.0',
        },
        stepHandlers: {},
      };

      const result = registry.validatePlugin(plugin);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Plugin has no step handlers');
    });

    test('should fail validation for non-function handler', () => {
      const plugin = {
        metadata: {
          id: 'bad-handler',
          name: 'Bad Handler',
          version: '1.0.0',
        },
        stepHandlers: {
          handler: 'not a function',
        },
      };

      const result = registry.validatePlugin(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must be a function'))).toBe(
        true
      );
    });

    test('should fail validation for invalid hook', () => {
      const plugin = {
        metadata: {
          id: 'bad-hook',
          name: 'Bad Hook',
          version: '1.0.0',
        },
        stepHandlers: {},
        hooks: [
          {
            type: 'beforeWorkflow',
            handler: 'not a function',
          },
        ],
      };

      const result = registry.validatePlugin(plugin);
      expect(result.valid).toBe(false);
    });

    test('should fail validation for invalid object', () => {
      const result = registry.validatePlugin(null);
      expect(result.valid).toBe(false);

      const result2 = registry.validatePlugin('string');
      expect(result2.valid).toBe(false);
    });
  });

  describe('engine attachment', () => {
    test('should attach engine and register handlers', async () => {
      const engine = createWorkflowEngine();
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'engine-plugin',
          name: 'Engine Plugin',
          version: '1.0.0',
        },
        stepHandlers: {
          'engine.handler': async () => ({ ok: true }),
        },
      };

      await registry.register(plugin);
      registry.attachEngine(engine);

      const stats = engine.getStats();
      expect(stats.registeredHandlers).toBe(1);
    });

    test('should register hooks with engine', async () => {
      const engine = createWorkflowEngine();
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'hook-plugin',
          name: 'Hook Plugin',
          version: '1.0.0',
        },
        stepHandlers: {},
        hooks: [
          {
            type: 'beforeWorkflow',
            handler: async () => {},
          },
        ],
      };

      await registry.register(plugin);
      registry.attachEngine(engine);

      const stats = engine.getStats();
      expect(stats.registeredHooks).toBeGreaterThan(0);
    });

    test('should register workflows with engine', async () => {
      const engine = createWorkflowEngine();
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'workflow-plugin',
          name: 'Workflow Plugin',
          version: '1.0.0',
        },
        stepHandlers: {
          noop: async () => ({}),
        },
        workflows: [
          {
            id: 'plugin-workflow',
            name: 'Plugin Workflow',
            version: '1.0.0',
            trigger: 'manual',
            executionMode: 'sequential',
            steps: [
              {
                id: 'step1',
                name: 'Step 1',
                type: 'noop',
                handler: 'noop',
              },
            ],
            enabled: true,
          },
        ],
      };

      await registry.register(plugin);
      registry.attachEngine(engine);

      const workflow = engine.getWorkflow('plugin-workflow');
      expect(workflow).toBeDefined();
    });
  });

  describe('plugin listing', () => {
    test('should get all registered plugins', async () => {
      const plugin1: WorkflowPlugin = {
        metadata: { id: 'p1', name: 'Plugin 1', version: '1.0.0' },
        stepHandlers: {},
      };
      const plugin2: WorkflowPlugin = {
        metadata: { id: 'p2', name: 'Plugin 2', version: '1.0.0' },
        stepHandlers: {},
      };

      await registry.register(plugin1);
      await registry.register(plugin2);

      const all = registry.getAll();
      expect(all.length).toBe(2);
    });

    test('should get plugin metadata', async () => {
      const plugin: WorkflowPlugin = {
        metadata: {
          id: 'meta-plugin',
          name: 'Meta Plugin',
          version: '3.0.0',
          description: 'A test plugin',
          author: 'Test Author',
        },
        stepHandlers: {},
      };

      await registry.register(plugin);
      const metadata = registry.getMetadata('meta-plugin');

      expect(metadata).toBeDefined();
      expect(metadata?.version).toBe('3.0.0');
      expect(metadata?.description).toBe('A test plugin');
      expect(metadata?.author).toBe('Test Author');
    });
  });

  describe('statistics', () => {
    test('should track plugin statistics', async () => {
      const plugin: WorkflowPlugin = {
        metadata: { id: 'stat-plugin', name: 'Stat Plugin', version: '1.0.0' },
        stepHandlers: {
          h1: async () => ({}),
          h2: async () => ({}),
        },
        workflows: [
          {
            id: 'w1',
            name: 'Workflow 1',
            version: '1.0.0',
            trigger: 'manual',
            executionMode: 'sequential',
            steps: [],
            enabled: true,
          },
        ],
      };

      await registry.register(plugin);
      const stats = registry.getStats();

      expect(stats.totalPlugins).toBe(1);
      expect(stats.localPlugins).toBe(1);
      expect(stats.totalHandlers).toBe(2);
      expect(stats.totalWorkflows).toBe(1);
    });
  });

  describe('health check', () => {
    test('should report unhealthy without engine', () => {
      const health = registry.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('No workflow engine attached');
    });

    test('should report healthy with engine attached', async () => {
      const engine = createWorkflowEngine();
      registry.attachEngine(engine);

      const health = registry.healthCheck();
      expect(health.healthy).toBe(true);
    });
  });
});

describe('definePlugin', () => {
  test('should return the same plugin object', () => {
    const plugin: WorkflowPlugin = {
      metadata: {
        id: 'defined-plugin',
        name: 'Defined Plugin',
        version: '1.0.0',
      },
      stepHandlers: {},
    };

    const defined = definePlugin(plugin);
    expect(defined).toBe(plugin);
  });
});
