// packages/odds-core/src/tests/lifecycle-management.test.ts - Phase 2.2 Lifecycle Tests

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { MetadataLifecycleManager } from '../utils/lifecycle-manager';
import { InMemoryLifecycleStorage } from '../utils/lifecycle-storage';
import {
  MetadataLifecycleState,
  LifecycleManagementRequest,
  LifecycleConfig
} from '../types/lifecycle';
import { RealtimeMetadata } from '../types/realtime';

describe('Phase 2.2 - Metadata Lifecycle Management', () => {

  describe('MetadataLifecycleManager', () => {
    let lifecycleManager: MetadataLifecycleManager;
    let storage: InMemoryLifecycleStorage;
    let config: LifecycleConfig;

    beforeEach(() => {
      storage = new InMemoryLifecycleStorage();
      config = {
        activeTimeout: 24 * 60 * 60 * 1000, // 24 hours
        validationInterval: 60 * 60 * 1000, // 1 hour
        archivalDelay: 7 * 24 * 60 * 60 * 1000, // 7 days
        deletionDelay: 30 * 24 * 60 * 60 * 1000, // 30 days
        minQualityThreshold: 0.7,
        maxAgeThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
        allowedTransitions: new Map([
          [MetadataLifecycleState.CREATED, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DELETED]],
          [MetadataLifecycleState.ACTIVE, [MetadataLifecycleState.UPDATING, MetadataLifecycleState.VALIDATING, MetadataLifecycleState.DEPRECATED, MetadataLifecycleState.ARCHIVING]],
          [MetadataLifecycleState.UPDATING, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DEPRECATED]],
          [MetadataLifecycleState.VALIDATING, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DEPRECATED]],
          [MetadataLifecycleState.DEPRECATED, [MetadataLifecycleState.ARCHIVING, MetadataLifecycleState.DELETED]],
          [MetadataLifecycleState.ARCHIVING, [MetadataLifecycleState.ARCHIVED, MetadataLifecycleState.ACTIVE]],
          [MetadataLifecycleState.ARCHIVED, [MetadataLifecycleState.DELETED, MetadataLifecycleState.ACTIVE]],
          [MetadataLifecycleState.DELETED, []]
        ]),
        autoTransitions: new Map([
          [MetadataLifecycleState.ARCHIVING, {
            condition: 'archiving_complete',
            targetState: MetadataLifecycleState.ARCHIVED,
            cooldown: 5 * 60 * 1000, // 5 minutes
            enabled: true
          }]
        ])
      };
      lifecycleManager = new MetadataLifecycleManager(storage, config);
    });

    afterEach(async () => {
      if (lifecycleManager) {
        await lifecycleManager.stop();
      }
      await storage.clear();
    });

    test('should initialize with correct configuration', () => {
      expect(lifecycleManager).toBeDefined();
      expect(storage).toBeDefined();
    });

    test('should handle manager lifecycle', async () => {
      await lifecycleManager.start();
      expect(lifecycleManager).toBeDefined();

      const stats = await lifecycleManager.getStats();
      expect(stats).toBeDefined();
      expect(stats.total).toBe(0);

      await lifecycleManager.stop();
    });

    test('should create metadata lifecycle', async () => {
      await lifecycleManager.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const lifecycle = await lifecycleManager.createLifecycle(metadata, 'test_user');
      
      expect(lifecycle).toBeDefined();
      expect(lifecycle.id).toBe(metadata.id);
      expect(lifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE); // Should auto-transition to active
      expect(lifecycle.version).toBe(2); // Initial + auto-transition
      expect(lifecycle.history).toHaveLength(2);
      expect(lifecycle.transitions).toHaveLength(2);

      await lifecycleManager.stop();
    });

    test('should transition states correctly', async () => {
      await lifecycleManager.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata, 'test_user');

      // Transition to updating
      const response = await lifecycleManager.transitionState(
        'test_metadata',
        MetadataLifecycleState.UPDATING,
        'Manual update',
        'test_user'
      );

      expect(response.success).toBe(true);
      expect(response.oldState).toBe(MetadataLifecycleState.ACTIVE);
      expect(response.newState).toBe(MetadataLifecycleState.UPDATING);
      expect(response.transition.reason).toBe('Manual update');

      const lifecycle = lifecycleManager.getLifecycle('test_metadata');
      expect(lifecycle?.currentState).toBe(MetadataLifecycleState.UPDATING);

      await lifecycleManager.stop();
    });

    test('should validate transitions', async () => {
      await lifecycleManager.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata, 'test_user');

      // Try invalid transition (from ACTIVE to DELETED - not allowed)
      const response = await lifecycleManager.transitionState(
        'test_metadata',
        MetadataLifecycleState.DELETED,
        'Invalid transition',
        'test_user'
      );

      expect(response.success).toBe(false);
      expect(response.errors).toContain('Transition from active to deleted is not allowed');

      await lifecycleManager.stop();
    });

    test('should process lifecycle management requests', async () => {
      await lifecycleManager.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata, 'test_user');

      // Process extend request
      const extendRequest: LifecycleManagementRequest = {
        metadataId: 'test_metadata',
        action: 'extend',
        reason: 'Extend lifecycle for testing',
        userId: 'test_user'
      };

      const response = await lifecycleManager.processRequest(extendRequest);
      expect(response.success).toBe(true);
      expect(response.newState).toBe(MetadataLifecycleState.ACTIVE);

      const lifecycle = lifecycleManager.getLifecycle('test_metadata');
      expect(lifecycle?.expiresAt).toBeDefined();
      expect(lifecycle?.expiresAt! > Date.now()).toBe(true);

      await lifecycleManager.stop();
    });

    test('should handle archival process', async () => {
      await lifecycleManager.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata, 'test_user');

      // Archive metadata
      const archiveRequest: LifecycleManagementRequest = {
        metadataId: 'test_metadata',
        action: 'archive',
        reason: 'Test archival',
        userId: 'test_user'
      };

      const response = await lifecycleManager.processRequest(archiveRequest);
      expect(response.success).toBe(true);
      expect(response.newState).toBe(MetadataLifecycleState.ARCHIVING);

      await lifecycleManager.stop();
    });

    test('should handle restore process', async () => {
      await lifecycleManager.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata, 'test_user');

      // Archive first
      await lifecycleManager.transitionState(
        'test_metadata',
        MetadataLifecycleState.ARCHIVING,
        'Archive for test',
        'test_user'
      );

      await lifecycleManager.transitionState(
        'test_metadata',
        MetadataLifecycleState.ARCHIVED,
        'Archival complete',
        'test_user'
      );

      // Restore metadata
      const restoreRequest: LifecycleManagementRequest = {
        metadataId: 'test_metadata',
        action: 'restore',
        reason: 'Restore from archive',
        userId: 'test_user'
      };

      const response = await lifecycleManager.processRequest(restoreRequest);
      expect(response.success).toBe(true);
      expect(response.newState).toBe(MetadataLifecycleState.ACTIVE);

      await lifecycleManager.stop();
    });

    test('should get lifecycles by state', async () => {
      await lifecycleManager.start();

      // Create multiple metadata items
      const metadata1: RealtimeMetadata = {
        id: 'test_metadata_1',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const metadata2: RealtimeMetadata = {
        id: 'test_metadata_2',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata1, 'test_user');
      await lifecycleManager.createLifecycle(metadata2, 'test_user');

      // Transition one to updating
      await lifecycleManager.transitionState(
        'test_metadata_1',
        MetadataLifecycleState.UPDATING,
        'Test update',
        'test_user'
      );

      const activeLifecycles = lifecycleManager.getLifecyclesByState(MetadataLifecycleState.ACTIVE);
      const updatingLifecycles = lifecycleManager.getLifecyclesByState(MetadataLifecycleState.UPDATING);

      expect(activeLifecycles).toHaveLength(1);
      expect(updatingLifecycles).toHaveLength(1);
      expect(activeLifecycles[0].id).toBe('test_metadata_2');
      expect(updatingLifecycles[0].id).toBe('test_metadata_1');

      await lifecycleManager.stop();
    });

    test('should update access time', async () => {
      await lifecycleManager.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata, 'test_user');

      const originalAccessTime = lifecycleManager.getLifecycle('test_metadata')?.lastAccessedAt;
      
      // Wait a bit and update access time
      await new Promise(resolve => setTimeout(resolve, 10));
      lifecycleManager.updateAccessTime('test_metadata');

      const newAccessTime = lifecycleManager.getLifecycle('test_metadata')?.lastAccessedAt;
      expect(newAccessTime).toBeGreaterThan(originalAccessTime!);

      await lifecycleManager.stop();
    });

    test('should calculate statistics correctly', async () => {
      await lifecycleManager.start();

      // Create multiple metadata items in different states
      const metadata1: RealtimeMetadata = {
        id: 'test_metadata_1',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const metadata2: RealtimeMetadata = {
        id: 'test_metadata_2',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await lifecycleManager.createLifecycle(metadata1, 'test_user');
      await lifecycleManager.createLifecycle(metadata2, 'test_user');

      // Transition one to updating
      await lifecycleManager.transitionState(
        'test_metadata_1',
        MetadataLifecycleState.UPDATING,
        'Test update',
        'test_user'
      );

      const stats = await lifecycleManager.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.byState[MetadataLifecycleState.ACTIVE]).toBe(1);
      expect(stats.byState[MetadataLifecycleState.UPDATING]).toBe(1);
      expect(stats.averageAge).toBeGreaterThan(0);
      expect(stats.transitionsToday).toBeGreaterThan(0);

      await lifecycleManager.stop();
    });
  });

  describe('InMemoryLifecycleStorage', () => {
    let storage: InMemoryLifecycleStorage;

    beforeEach(() => {
      storage = new InMemoryLifecycleStorage();
    });

    afterEach(async () => {
      await storage.clear();
    });

    test('should save and load lifecycles', async () => {
      const mockLifecycle = {
        id: 'test_lifecycle',
        currentState: MetadataLifecycleState.ACTIVE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        version: 1,
        history: [],
        transitions: [],
        config: {} as any
      };

      await storage.save(mockLifecycle);
      
      const loaded = await storage.YAML.parse('test_lifecycle');
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe('test_lifecycle');
      expect(loaded?.currentState).toBe(MetadataLifecycleState.ACTIVE);
    });

    test('should find lifecycles by state', async () => {
      const lifecycle1 = {
        id: 'lifecycle_1',
        currentState: MetadataLifecycleState.ACTIVE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        version: 1,
        history: [],
        transitions: [],
        config: {} as any
      };

      const lifecycle2 = {
        id: 'lifecycle_2',
        currentState: MetadataLifecycleState.UPDATING,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        version: 1,
        history: [],
        transitions: [],
        config: {} as any
      };

      await storage.save(lifecycle1);
      await storage.save(lifecycle2);

      const activeLifecycles = await storage.findByState(MetadataLifecycleState.ACTIVE);
      const updatingLifecycles = await storage.findByState(MetadataLifecycleState.UPDATING);

      expect(activeLifecycles).toHaveLength(1);
      expect(updatingLifecycles).toHaveLength(1);
      expect(activeLifecycles[0].id).toBe('lifecycle_1');
      expect(updatingLifecycles[0].id).toBe('lifecycle_2');
    });

    test('should handle delete operations', async () => {
      const mockLifecycle = {
        id: 'test_lifecycle',
        currentState: MetadataLifecycleState.ACTIVE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        version: 1,
        history: [],
        transitions: [],
        config: {} as any
      };

      await storage.save(mockLifecycle);
      
      let loaded = await storage.YAML.parse('test_lifecycle');
      expect(loaded).toBeDefined();

      await storage.delete('test_lifecycle');
      
      loaded = await storage.YAML.parse('test_lifecycle');
      expect(loaded).toBeNull();
    });

    test('should calculate statistics', async () => {
      const lifecycle1 = {
        id: 'lifecycle_1',
        currentState: MetadataLifecycleState.ACTIVE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        version: 1,
        history: [],
        transitions: [],
        config: {} as any
      };

      const lifecycle2 = {
        id: 'lifecycle_2',
        currentState: MetadataLifecycleState.UPDATING,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        version: 1,
        history: [],
        transitions: [],
        config: {} as any
      };

      await storage.save(lifecycle1);
      await storage.save(lifecycle2);

      const stats = await storage.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.byState[MetadataLifecycleState.ACTIVE]).toBe(1);
      expect(stats.byState[MetadataLifecycleState.UPDATING]).toBe(1);
      expect(stats.averageAge).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should handle high volume lifecycle operations', async () => {
      const storage = new InMemoryLifecycleStorage();
      const lifecycleManager = new MetadataLifecycleManager(storage);
      
      await lifecycleManager.start();

      const startTime = performance.now();
      
      // Create 100 lifecycles
      const createPromises = Array.from({ length: 100 }, (_, i) => {
        const metadata: RealtimeMetadata = {
          id: `test_metadata_${i}`,
          timestamp: Date.now(),
          version: '1.0.0',
          source: { provider: 'test', reliability: 0.9 },
          market: { session: 'test', liquidity: 'high' },
          topics: [],
          category: 'market_data' as any,
          tags: ['test'],
          quality: { 
            overall: 0.85, 
            completeness: 0.9, 
            accuracy: 0.8, 
            freshness: 0.9, 
            consistency: 0.85, 
            validity: 0.9 
          },
          realtime: {
            lastUpdated: Date.now(),
            updateFrequency: 1,
            dataFreshness: 0.9,
            streamId: `test_stream_${i}`,
            timestamp: Date.now()
          },
          stream: {
            source: 'test',
            latency: 25,
            isLive: true,
            quality: {
              bandwidth: 1000,
              packetLoss: 0,
              jitter: 0,
              reliability: 0.95,
              status: 'excellent'
            }
          }
        };
        return lifecycleManager.createLifecycle(metadata, 'test_user');
      });

      await Promise.all(createPromises);
      
      const creationTime = performance.now() - startTime;
      
      // Should create 100 lifecycles in under 1 second
      expect(creationTime).toBeLessThan(1000);
      
      const stats = await lifecycleManager.getStats();
      expect(stats.total).toBe(100);

      await lifecycleManager.stop();
      await storage.clear();
    });
  });
});
