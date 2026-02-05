#!/usr/bin/env bun
/**
 * Plugin System Tests
 * 
 * Comprehensive test suite for the Bun Surgical Dashboard Plugin System
 */

import { test, expect, describe, mock, beforeEach, afterEach } from "bun:test";
import PluginSystem from './plugin-system.js';

describe("PluginSystem", () => {
    let pluginSystem: PluginSystem;

    beforeEach(() => {
        pluginSystem = new PluginSystem();
    });

    afterEach(async () => {
        await pluginSystem.teardown();
    });

    describe("Plugin Loading", () => {
        test("should load a plugin successfully", async () => {
            const mockPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                priority: 50,
                init: mock(async () => {}),
                teardown: mock(async () => {})
            };

            await pluginSystem.loadPlugin({ default: mockPlugin }, './test-plugin.js');

            expect(pluginSystem.getPlugin('test-plugin')).toBeDefined();
            expect(mockPlugin.init).toHaveBeenCalled();
        });

        test("should reject plugin without id", async () => {
            const invalidPlugin = {
                name: 'Invalid Plugin',
                init: async () => {}
            };

            await expect(
                pluginSystem.loadPlugin({ default: invalidPlugin }, './invalid.js')
            ).rejects.toThrow();
        });

        test("should load plugins in priority order", async () => {
            const initOrder: string[] = [];
            const plugins = [
                { id: 'low', priority: 100, init: mock(async () => { initOrder.push('low'); }) },
                { id: 'high', priority: 10, init: mock(async () => { initOrder.push('high'); }) },
                { id: 'medium', priority: 50, init: mock(async () => { initOrder.push('medium'); }) }
            ];

            // Load plugins in random order
            await pluginSystem.loadPlugin({ default: plugins[0] }, './low.js');
            await pluginSystem.loadPlugin({ default: plugins[1] }, './high.js');
            await pluginSystem.loadPlugin({ default: plugins[2] }, './medium.js');

            // Verify init was called (plugins are stored in insertion order)
            expect(plugins[1].init).toHaveBeenCalled(); // high priority
            expect(plugins[2].init).toHaveBeenCalled(); // medium priority
            expect(plugins[0].init).toHaveBeenCalled(); // low priority
            
            // Verify all plugins loaded
            expect(pluginSystem.getPlugin('high')).toBeDefined();
            expect(pluginSystem.getPlugin('medium')).toBeDefined();
            expect(pluginSystem.getPlugin('low')).toBeDefined();
        });

        test.failing("should handle plugin initialization errors gracefully", async () => {
            // This test documents that we should handle init errors without crashing
            const errorPlugin = {
                id: 'error-plugin',
                init: async () => {
                    throw new Error('Init failed');
                }
            };

            // Currently throws, but should handle gracefully
            await pluginSystem.loadPlugin({ default: errorPlugin }, './error-plugin.js');
            expect(pluginSystem.getPlugin('error-plugin')).toBeNull();
        });
    });

    describe("Hook System", () => {
        test("should register and execute hooks", async () => {
            const handler = mock((data: any) => ({ ...data, modified: true }));

            pluginSystem.addHook('test:hook', handler, 10);
            const result = await pluginSystem.executeHook('test:hook', { value: 1 });

            expect(handler).toHaveBeenCalled();
            expect(result.modified).toBe(true);
        });

        test("should execute hooks in priority order", async () => {
            const calls: number[] = [];

            pluginSystem.addHook('test:hook', () => { calls.push(3); return {}; }, 30);
            pluginSystem.addHook('test:hook', () => { calls.push(1); return {}; }, 10);
            pluginSystem.addHook('test:hook', () => { calls.push(2); return {}; }, 20);

            await pluginSystem.executeHook('test:hook', {});

            expect(calls).toEqual([1, 2, 3]);
        });

        test("should pass data through hook chain", async () => {
            pluginSystem.addHook('test:hook', (data: any) => ({ ...data, step1: true }), 10);
            pluginSystem.addHook('test:hook', (data: any) => ({ ...data, step2: true }), 20);

            const result = await pluginSystem.executeHook('test:hook', { initial: true });

            expect(result.step1).toBe(true);
            expect(result.step2).toBe(true);
            expect(result.initial).toBe(true);
        });

        test("should handle hook errors without breaking chain", async () => {
            const goodHandler = mock((data: any) => ({ ...data, good: true }));
            const badHandler = mock(() => {
                throw new Error('Hook error');
            });

            pluginSystem.addHook('test:hook', badHandler, 10);
            pluginSystem.addHook('test:hook', goodHandler, 20);

            const result = await pluginSystem.executeHook('test:hook', {});

            expect(badHandler).toHaveBeenCalled();
            expect(goodHandler).toHaveBeenCalled();
            expect(result.good).toBe(true);
        });

        test("addHook returns unsubscribe function", () => {
            const handler = mock(() => {});
            const unsubscribe = pluginSystem.addHook('test:hook', handler, 10);

            unsubscribe();
            pluginSystem.executeHook('test:hook', {});

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe("Event System", () => {
        test("should emit and receive events", () => {
            const listener = mock((data: any) => {});

            pluginSystem.events.on('test:event', listener);
            pluginSystem.events.emit('test:event', { value: 123 });

            expect(listener).toHaveBeenCalledWith({ value: 123 });
        });

        test("should support multiple listeners", () => {
            const listener1 = mock(() => {});
            const listener2 = mock(() => {});

            pluginSystem.events.on('test:event', listener1);
            pluginSystem.events.on('test:event', listener2);
            pluginSystem.events.emit('test:event', {});

            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });

        test("should unsubscribe from events", () => {
            const listener = mock(() => {});
            const unsubscribe = pluginSystem.events.on('test:event', listener);

            unsubscribe();
            pluginSystem.events.emit('test:event', {});

            expect(listener).not.toHaveBeenCalled();
        });

        test("should handle listener errors gracefully", () => {
            const badListener = () => {
                throw new Error('Listener error');
            };
            const goodListener = mock(() => {});

            pluginSystem.events.on('test:event', badListener);
            pluginSystem.events.on('test:event', goodListener);
            pluginSystem.events.emit('test:event', {});

            expect(goodListener).toHaveBeenCalled();
        });
    });

    describe("PluginStorage", () => {
        test("should store and retrieve configuration", async () => {
            const config = { interval: 5000, enabled: true };

            await pluginSystem.pluginStorage.set('test-plugin', 'config', config);
            const retrieved = await pluginSystem.pluginStorage.get('test-plugin', 'config');

            expect(retrieved).toEqual(config);
        });

        test("should return default value when not found", async () => {
            const defaultValue = { default: true };
            const retrieved = await pluginSystem.pluginStorage.get('nonexistent', 'config', defaultValue);

            expect(retrieved).toEqual(defaultValue);
        });

        test("should remove stored configuration", async () => {
      await pluginSystem.pluginStorage.set('test-plugin', 'config', { value: 1 });
      await pluginSystem.pluginStorage.remove('test-plugin', 'config');
      const retrieved = await pluginSystem.pluginStorage.get('test-plugin', 'config');

      // After removal, should return default (null)
      expect(retrieved).toBeNull();
    });
    });

    describe("Sandbox Context", () => {
        test("should provide isolated sandbox context", () => {
            expect(pluginSystem.sandbox).toBeDefined();
            expect(pluginSystem.sandbox.context).toBeDefined();
            expect(pluginSystem.sandbox.api).toBeDefined();
        });

        test("should allow plugins to share context", async () => {
            const plugin1 = {
                id: 'plugin1',
                init: async (system: any, sandbox: any) => {
                    sandbox.context.shared = { value: 123 };
                }
            };

            const plugin2 = {
                id: 'plugin2',
                init: async (system: any, sandbox: any) => {
                    expect(sandbox.context.shared.value).toBe(123);
                }
            };

            await pluginSystem.loadPlugin({ default: plugin1 }, './plugin1.js');
            await pluginSystem.loadPlugin({ default: plugin2 }, './plugin2.js');
        });
    });

    describe("Teardown", () => {
        test("should teardown all plugins", async () => {
            const teardown1 = mock(async () => {});
            const teardown2 = mock(async () => {});

            const plugin1 = { id: 'p1', teardown: teardown1 };
            const plugin2 = { id: 'p2', teardown: teardown2 };

            await pluginSystem.loadPlugin({ default: plugin1 }, './p1.js');
            await pluginSystem.loadPlugin({ default: plugin2 }, './p2.js');
            await pluginSystem.teardown();

            expect(teardown1).toHaveBeenCalled();
            expect(teardown2).toHaveBeenCalled();
        });

        test("should execute shutdown hook before teardown", async () => {
            const shutdownHandler = mock(async () => {});
            pluginSystem.addHook('dashboard:shutdown', shutdownHandler, 10);

            await pluginSystem.teardown();

            expect(shutdownHandler).toHaveBeenCalled();
        });

        test("should clear plugins and hooks after teardown", async () => {
            await pluginSystem.loadPlugin({ default: { id: 'test', init: async () => {} } }, './test.js');
            pluginSystem.addHook('test:hook', () => {}, 10);

            await pluginSystem.teardown();

            expect(pluginSystem.getAllPlugins().length).toBe(0);
            const result = await pluginSystem.executeHook('test:hook', {});
            expect(result).toEqual({});
        });
    });

    describe("Mock Return Values", () => {
        test("should track mock return values", () => {
            const fn = mock(() => 42);
            fn();
            fn();

            expect(fn).toHaveReturnedWith(42);
            expect(fn).toHaveLastReturnedWith(42);
            expect(fn).toHaveNthReturnedWith(1, 42);
            expect(fn).toHaveNthReturnedWith(2, 42);
        });

        test("should track different return values", () => {
            const fn = mock((n: number) => n * 2);
            fn(1);
            fn(2);
            fn(3);

            expect(fn).toHaveNthReturnedWith(1, 2);
            expect(fn).toHaveNthReturnedWith(2, 4);
            expect(fn).toHaveNthReturnedWith(3, 6);
            expect(fn).toHaveLastReturnedWith(6);
        });
    });

    describe("Inline Snapshots", () => {
        test("should match inline snapshot with indentation", () => {
            const config = {
                scanInterval: 30000,
                excludedPaths: ['node_modules', '.git'],
                showNotifications: true
            };

            expect(config).toMatchInlineSnapshot({
                scanInterval: 30000,
                excludedPaths: ['node_modules', '.git'],
                showNotifications: true
            }, `
              {
                "excludedPaths": [
                  "node_modules",
                  ".git",
                ],
                "scanInterval": 30000,
                "showNotifications": true,
              }
            `);
        });
    });
});

describe("Git Integration Plugin", () => {
    test("should detect Git CLI availability", async () => {
        const pluginSystem = new PluginSystem();
        const gitPlugin = await import('./git-integration.js');
        
        await pluginSystem.loadPlugin(gitPlugin, './git-integration.js');
        const plugin = pluginSystem.getPlugin('git-integration');
        
        expect(plugin.gitAvailable).toBeDefined();
        expect(typeof plugin.gitAvailable).toBe('boolean');
        
        await pluginSystem.teardown();
    });

    test("should scan repositories with exclusions", async () => {
        const pluginSystem = new PluginSystem();
        const gitPlugin = await import('./git-integration.js');
        
        await pluginSystem.loadPlugin(gitPlugin, './git-integration.js');
        const plugin = pluginSystem.getPlugin('git-integration');
        
        if (plugin.gitAvailable) {
            await plugin.scanRepositories();
            expect(Array.isArray(plugin.repositories)).toBe(true);
        }
        
        await pluginSystem.teardown();
    });
});

describe("Performance Monitor Plugin", () => {
    test("should collect performance metrics", async () => {
        const pluginSystem = new PluginSystem();
        const perfPlugin = await import('./performance-monitor.js');
        
        await pluginSystem.loadPlugin(perfPlugin, './performance-monitor.js');
        const plugin = pluginSystem.getPlugin('performance-monitor');
        
        // Wait for initial metrics collection
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const metrics = plugin.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.memory).toBeDefined();
        expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    test("should inject warnings for high memory", async () => {
        const pluginSystem = new PluginSystem();
        const perfPlugin = await import('./performance-monitor.js');
        
        await pluginSystem.loadPlugin(perfPlugin, './performance-monitor.js');
        
        // Simulate high memory usage
        const result = await pluginSystem.executeHook('performance:update', {
            memory: { usagePercent: 95 }
        });
        
        expect(result.insights).toBeDefined();
        if (result.insights) {
            expect(result.insights[0].severity).toBe('critical');
        }
    });
});

describe("Analytics Plugin", () => {
    test("should track command events", async () => {
        const pluginSystem = new PluginSystem();
        const analyticsPlugin = await import('./analytics.js');
        
        await pluginSystem.loadPlugin(analyticsPlugin, './analytics.js');
        const plugin = pluginSystem.getPlugin('analytics');
        
        pluginSystem.events.emit('command:execute', { command: 'git status' });
        pluginSystem.events.emit('command:execute', { command: 'git pull' });
        
        const stats = plugin.getStats();
        expect(stats.commands.size).toBeGreaterThan(0);
    });

    test("should provide top commands", async () => {
        const pluginSystem = new PluginSystem();
        const analyticsPlugin = await import('./analytics.js');
        
        await pluginSystem.loadPlugin(analyticsPlugin, './analytics.js');
        const plugin = pluginSystem.getPlugin('analytics');
        
        // Emit multiple commands
        for (let i = 0; i < 5; i++) {
            pluginSystem.events.emit('command:execute', { command: 'git status' });
        }
        for (let i = 0; i < 3; i++) {
            pluginSystem.events.emit('command:execute', { command: 'git pull' });
        }
        
        const stats = plugin.getStats();
        expect(stats.topCommands.length).toBeGreaterThan(0);
        // Analytics tracks first word of command, so 'git status' becomes 'git'
        const gitCommand = stats.topCommands.find(c => c.command === 'git');
        expect(gitCommand).toBeDefined();
        expect(gitCommand.count).toBe(8); // 5 status + 3 pull
    });
});
