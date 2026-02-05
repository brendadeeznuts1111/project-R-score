// test/bun-production-config.test.ts
//! Comprehensive test suite for production-ready 13-byte config
//! Tests persistence, cluster sync, team-friendly API, and edge cases

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { BunProductionConfig, createProductionConfig, createDevelopmentConfig, ConfigCore13Byte } from '../src/core/config/bun-production-config.js';
import { unlinkSync, existsSync } from 'fs';

describe('BunProductionConfig - Production Features', () => {
  let config: BunProductionConfig;
  const testDbPath = './test-config.db';
  
  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });
  
  afterEach(() => {
    config?.destroy();
    
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });
  
  describe('Core 13-Byte Functionality', () => {
    test('preserves 13-byte size and performance', () => {
      config = new BunProductionConfig();
      const core = config.getCore();
      const buffer = core.toBuffer();
      
      expect(buffer.byteLength).toBe(13);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });
    
    test('validates config constraints', () => {
      config = new BunProductionConfig();
      
      // Valid config should pass
      expect(config.validate().isValid).toBe(true);
      
      // Test invalid values through core access and update
      const core = config.getCore();
      core.setTerminalRows(0); // Invalid: must be 1-255
      
      // Update config with the modified core
      config.updateFromBuffer(core.toBuffer());
      
      const validation = config.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid rows: 0 (must be 1-255)');
    });
    
    test('handles hex serialization correctly', () => {
      config = new BunProductionConfig();
      const debugView = config.getDebugView();
      
      expect(debugView.raw.hex).toMatch(/^0x[a-f0-9]{26}$/);
      expect(debugView.raw.bytes).toHaveLength(13);
    });
  });
  
  describe('Team-Friendly Feature API', () => {
    beforeEach(() => {
      config = new BunProductionConfig({ debugMode: true });
    });
    
    test('enables and disables features by name', () => {
      // Initially some default features might be enabled (0x7 = bits 0,1,2)
      // We'll clear them to start from a known state
      config.disableFeature('debug');
      config.disableFeature('verbose');
      config.disableFeature('metrics');
      
      expect(config.isFeatureEnabled('debug')).toBe(false);
      expect(config.isFeatureEnabled('metrics')).toBe(false);
      
      // Enable features
      config.enableFeature('debug');
      config.enableFeature('metrics');
      
      expect(config.isFeatureEnabled('debug')).toBe(true);
      expect(config.isFeatureEnabled('metrics')).toBe(true);
      
      // Disable feature
      config.disableFeature('debug');
      expect(config.isFeatureEnabled('debug')).toBe(false);
      expect(config.isFeatureEnabled('metrics')).toBe(true);
    });
    
    test('lists enabled features correctly', () => {
      config.enableFeature('debug');
      config.enableFeature('logging');
      config.enableFeature('caching');
      
      const enabled = config.getEnabledFeatures();
      expect(enabled).toContain('debug');
      expect(enabled).toContain('logging');
      expect(enabled).toContain('caching');
      expect(enabled).not.toContain('verbose'); // Not enabled
    });
    
    test('provides debug view with human-readable info', () => {
      config.enableFeature('debug');
      config.enableFeature('metrics');
      config.setTerminalSettings(2, 50, 120);
      
      const debugView = config.getDebugView();
      
      expect(debugView.features.enabled).toContain('debug');
      expect(debugView.features.enabled).toContain('metrics');
      expect(debugView.features.disabled).toContain('verbose');
      expect(debugView.terminal.dimensions).toBe('50x120');
      expect(debugView.terminal.mode).toBe(2);
      expect(debugView.version).toBe(1);
    });
    
    test('throws helpful errors for unknown features', () => {
      expect(() => config.enableFeature('unknown_feature')).toThrow(
        'Unknown feature: unknown_feature. Available: debug, verbose, metrics, logging, caching, compression, encryption, validation'
      );
      
      expect(() => config.isFeatureEnabled('unknown_feature')).toThrow(
        'Unknown feature: unknown_feature'
      );
    });
  });
  
  describe('Bun-Native Persistence', () => {
    test('persists and loads config successfully', async () => {
      config = new BunProductionConfig({ 
        persistPath: testDbPath,
        debugMode: true 
      });
      
      // Clear defaults for testing
      config.disableFeature('debug');
      config.disableFeature('verbose');
      config.disableFeature('metrics');
      
      // Modify config
      config.enableFeature('debug');
      config.enableFeature('metrics');
      config.setTerminalSettings(1, 40, 100);
      
      // Persist config
      await config.persist('test_persistence');
      
      // Create new instance and load
      const config2 = new BunProductionConfig({ 
        persistPath: testDbPath,
        debugMode: true 
      });
      
      const loaded = await config2.YAML.parse();
      expect(loaded).toBe(true);
      
      // Verify loaded config
      expect(config2.isFeatureEnabled('debug')).toBe(true);
      expect(config2.isFeatureEnabled('metrics')).toBe(true);
      expect(config2.isFeatureEnabled('verbose')).toBe(false);
      
      const terminalSettings = config2.getTerminalSettings();
      expect(terminalSettings.mode).toBe(1);
      expect(terminalSettings.rows).toBe(40);
      expect(terminalSettings.cols).toBe(100);
    });
    
    test('maintains config history', async () => {
      config = new BunProductionConfig({ persistPath: testDbPath });
      
      // Reset features for history tracking test
      config.disableFeature('debug');
      config.disableFeature('verbose');
      config.disableFeature('metrics');
      
      // Make multiple changes
      await config.persist('initial_state');
      config.enableFeature('debug');
      await config.persist('enabled_debug');
      config.enableFeature('metrics');
      await config.persist('enabled_metrics');
      
      // Check history
      const history = await config.getHistory(10);
      expect(history).toHaveLength(3);
      
      expect(history[0].changeReason).toBe('enabled_metrics');
      expect(history[1].changeReason).toBe('enabled_debug');
      expect(history[2].changeReason).toBe('initial_state');
      
      // Verify hex representations are different
      expect(history[0].configHex).not.toBe(history[1].configHex);
      expect(history[1].configHex).not.toBe(history[2].configHex);
    });
    
    test('handles missing persistence gracefully', async () => {
      config = new BunProductionConfig(); // No persistence
      
      expect(config.persist()).rejects.toThrow(
        'Persistence not enabled. Initialize with persistPath option.'
      );
      
      expect(config.YAML.parse()).rejects.toThrow(
        'Persistence not enabled.'
      );
    });
  });
  
  describe('Performance and Benchmarks', () => {
    test('feature operations are fast', () => {
      config = new BunProductionConfig();
      
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        config.enableFeature('debug');
        config.disableFeature('debug');
        config.isFeatureEnabled('debug');
      }
      
      const duration = performance.now() - start;
      const opsPerMs = iterations / duration;
      
      expect(opsPerMs).toBeGreaterThan(1000); // Should be very fast
      console.log(`Feature operations: ${opsPerMs.toFixed(0)} ops/ms`);
    });
    
    test('debug view generation is efficient', () => {
      config = new BunProductionConfig();
      config.enableFeature('debug');
      config.enableFeature('metrics');
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        config.getDebugView();
      }
      
      const duration = performance.now() - start;
      const viewsPerMs = iterations / duration;
      
      expect(viewsPerMs).toBeGreaterThan(100); // Should be reasonably fast
      console.log(`Debug view generation: ${viewsPerMs.toFixed(0)} views/ms`);
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    test('handles invalid buffer sizes', () => {
      config = new BunProductionConfig();
      
      expect(() => config.updateFromBuffer(new ArrayBuffer(12))).toThrow(
        'Buffer must be exactly 13 bytes'
      );
      
      expect(() => config.updateFromBuffer(new ArrayBuffer(14))).toThrow(
        'Buffer must be exactly 13 bytes'
      );
    });
    
    test('validates terminal setting ranges', () => {
      config = new BunProductionConfig();
      
      // Test valid ranges
      expect(() => config.setTerminalSettings(0, 1, 1)).not.toThrow();
      expect(() => config.setTerminalSettings(3, 255, 255)).not.toThrow();
      
      // Test invalid ranges
      expect(() => config.setTerminalSettings(-1, 1, 1)).toThrow();
      expect(() => config.setTerminalSettings(4, 1, 1)).toThrow();
      expect(() => config.setTerminalSettings(1, 0, 1)).toThrow();
      expect(() => config.setTerminalSettings(1, 256, 1)).toThrow();
      expect(() => config.setTerminalSettings(1, 1, 0)).toThrow();
      expect(() => config.setTerminalSettings(1, 1, 256)).toThrow();
    });
    
    test('handles concurrent operations safely', async () => {
      config = new BunProductionConfig({ persistPath: testDbPath });
      
      // Simulate concurrent operations
      const promises = Array.from({ length: 10 }, (_, i) => 
        config.persist(`concurrent_op_${i}`)
      );
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
      
      // Verify final state is consistent
      const validation = config.validate();
      expect(validation.isValid).toBe(true);
    });
  });
  
  describe('Factory Functions', () => {
    test('createProductionConfig with sensible defaults', () => {
      const prodConfig = createProductionConfig({
        persistPath: testDbPath,
        debugMode: true
      });
      
      expect(prodConfig).toBeInstanceOf(BunProductionConfig);
      const debugView = prodConfig.getDebugView();
      expect(debugView.version).toBe(1);
      
      prodConfig.destroy();
    });
    
    test('createDevelopmentConfig with debug features', () => {
      const devConfig = createDevelopmentConfig();
      
      expect(devConfig.isFeatureEnabled('debug')).toBe(true);
      expect(devConfig.isFeatureEnabled('verbose')).toBe(true);
      expect(devConfig.isFeatureEnabled('logging')).toBe(true);
      expect(devConfig.isFeatureEnabled('metrics')).toBe(false);
      
      devConfig.destroy();
    });
  });
  
  describe('Integration with Core', () => {
    test('low-level core access for advanced operations', () => {
      config = new BunProductionConfig();
      
      const core = config.getCore();
      expect(core).toBeInstanceOf(ConfigCore13Byte);
      
      // Modify core directly
      core.setFeature(0, true); // Enable debug
      core.setFeature(2, true); // Enable metrics
      
      // Update config from modified core
      config.updateFromBuffer(core.toBuffer());
      
      expect(config.isFeatureEnabled('debug')).toBe(true);
      expect(config.isFeatureEnabled('metrics')).toBe(true);
    });
    
    test('maintains immutability of core', () => {
      config = new BunProductionConfig();
      
      const core1 = config.getCore();
      const core2 = config.getCore();
      
      // Should be different instances
      expect(core1).not.toBe(core2);
      
      // But have same values
      expect(core1.toHex()).toBe(core2.toHex());
      
      // Modifying one shouldn't affect the other
      core1.setFeature(0, true);
      expect(core1.hasFeature(0)).toBe(true);
      expect(core2.hasFeature(0)).toBe(false);
    });
  });
});

describe('ConfigCore13Byte - Low-Level Tests', () => {
  test('byte layout is correct', () => {
    const core = new ConfigCore13Byte();
    
    // Test default values
    expect(core.version).toBe(1);
    expect(core.registryHash).toBe(0x12345678);
    expect(core.featureFlags).toBe(0x00000007);
    expect(core.terminalMode).toBe(2);
    expect(core.terminalRows).toBe(24);
    expect(core.terminalCols).toBe(80);
  });
  
  test('feature bit manipulation works correctly', () => {
    const core = new ConfigCore13Byte();
    
    // Initially features 0, 1, 2 should be enabled (0b00000111 = 7)
    expect(core.hasFeature(0)).toBe(true);
    expect(core.hasFeature(1)).toBe(true);
    expect(core.hasFeature(2)).toBe(true);
    expect(core.hasFeature(3)).toBe(false);
    
    // Toggle feature 3
    core.toggleFeature(3);
    expect(core.hasFeature(3)).toBe(true);
    expect(core.featureFlags).toBe(0b00001111);
    
    // Set feature 4
    core.setFeature(4, true);
    expect(core.hasFeature(4)).toBe(true);
    expect(core.featureFlags).toBe(0b00011111);
    
    // Clear feature 0
    core.setFeature(0, false);
    expect(core.hasFeature(0)).toBe(false);
    expect(core.hasFeature(1)).toBe(true);
    expect(core.featureFlags).toBe(0b00011110);
  });
  
  test('serialization is reversible', () => {
    const core1 = new ConfigCore13Byte();
    
    // Modify core
    core1.setVersion(42);
    core1.setRegistryHash(0xdeadbeef);
    core1.setFeatureFlags(0b10101010);
    core1.setTerminalMode(1);
    core1.setTerminalRows(50);
    core1.setTerminalCols(120);
    
    // Serialize and deserialize
    const buffer = core1.toBuffer();
    const core2 = new ConfigCore13Byte(buffer);
    
    // Should be identical
    expect(core2.version).toBe(core1.version);
    expect(core2.registryHash).toBe(core1.registryHash);
    expect(core2.featureFlags).toBe(core1.featureFlags);
    expect(core2.terminalMode).toBe(core1.terminalMode);
    expect(core2.terminalRows).toBe(core1.terminalRows);
    expect(core2.terminalCols).toBe(core1.terminalCols);
    expect(core2.toHex()).toBe(core1.toHex());
  });
});
