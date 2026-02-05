// packages/odds-core/src/__tests__/lightweight-types.test.ts
// Comprehensive tests for lightweight metadata types

import { test, expect, describe } from "bun:test";
import {
  TopicId,
  MetadataId,
  SymbolId,
  LightweightMetadata,
  BaseMetadata,
  TechnicalMetadata,
  BusinessMetadata,
  ComposableEnhancedMetadata,
  SmartMetadata,
  LightweightOddsTick,
  SmartOddsTick,
  isLightweightMetadata,
  isEnhancedMetadata,
  BrandedTypeUtils,
  createLightweightMetadata,
  createEssentialMetadata
} from '../types/lightweight.js';
import { MarketTopic, DataCategory, DataSource, MarketContext, DataQuality, ProcessingMetadata } from '../types/topics.js';

describe('Lightweight Types', () => {
  describe('Branded Type Utils', () => {
    test('should create branded type IDs', () => {
      const topicId = BrandedTypeUtils.createTopicId('topic_123');
      const metadataId = BrandedTypeUtils.createMetadataId('meta_456');
      const symbolId = BrandedTypeUtils.createSymbolId('symbol_789');

      expect(topicId as string).toBe('topic_123');
      expect(metadataId as string).toBe('meta_456');
      expect(symbolId as string).toBe('symbol_789');
    });

    test('should validate branded type IDs', () => {
      expect(BrandedTypeUtils.isValidTopicId('valid_topic')).toBe(true);
      expect(BrandedTypeUtils.isValidMetadataId('valid_metadata')).toBe(true);
      expect(BrandedTypeUtils.isValidSymbolId('valid_symbol')).toBe(true);

      expect(BrandedTypeUtils.isValidTopicId('')).toBe(false);
      expect(BrandedTypeUtils.isValidMetadataId('')).toBe(false);
      expect(BrandedTypeUtils.isValidSymbolId('')).toBe(false);
    });
  });

  describe('Type Guards', () => {
    test('should identify lightweight metadata', () => {
      const lightweight: LightweightMetadata = {
        id: BrandedTypeUtils.createMetadataId('test_1'),
        timestamp: Date.now(),
        topic: MarketTopic.CRYPTO_SPOT,
        category: DataCategory.MARKET_DATA,
        source: 'test',
        quality: 0.9
      };

      expect(isLightweightMetadata(lightweight)).toBe(true);
      expect(isEnhancedMetadata(lightweight)).toBe(false);
    });

    test('should identify enhanced metadata', () => {
      const enhanced: ComposableEnhancedMetadata = {
        id: BrandedTypeUtils.createMetadataId('test_2'),
        timestamp: Date.now(),
        version: '2.0.0',
        source: {
          id: 'test_source',
          provider: 'test_provider',
          feed: 'test_feed',
          latency: 100,
          reliability: 0.95,
          lastUpdate: Date.now(),
          updateFrequency: 1000,
          name: 'test',
          type: 'api',
          cost: 0.01
        },
        market: {
          session: 'continuous' as any,
          liquidity: 'high' as any,
          volatility: 'medium' as any,
          timeZone: 'UTC',
          name: 'crypto',
          marketHours: {
            open: '00:00',
            close: '23:59',
            currentStatus: 'open' as const
          },
          relatedMarkets: ['BTC', 'ETH'],
          correlatedSymbols: ['BTC/USD', 'ETH/USD']
        },
        topics: [MarketTopic.CRYPTO_SPOT],
        category: DataCategory.MARKET_DATA,
        tags: [],
        quality: {
          completeness: 0.9,
          accuracy: 0.95,
          freshness: 100,
          consistency: 0.9,
          validity: 0.95,
          overall: 0.9,
          score: 0.9
        },
        relationships: {
          childIds: [],
          relatedIds: [],
          dependencies: []
        }
      };

      expect(isLightweightMetadata(enhanced)).toBe(false);
      expect(isEnhancedMetadata(enhanced)).toBe(true);
    });
  });

  describe('Lightweight Metadata Creation', () => {
    test('should create lightweight metadata with default quality', () => {
      const metadata = createLightweightMetadata(
        'test_001',
        MarketTopic.CRYPTO_SPOT,
        DataCategory.MARKET_DATA,
        'test_source'
      );

      expect(metadata.id as string).toEqual('test_001');
      expect(metadata.topic).toBe(MarketTopic.CRYPTO_SPOT);
      expect(metadata.category).toBe(DataCategory.MARKET_DATA);
      expect(metadata.source).toBe('test_source');
      expect(metadata.quality).toBe(0.8); // default value
      expect(typeof metadata.timestamp).toBe('number');
    });

    test('should create lightweight metadata with custom quality', () => {
      const metadata = createLightweightMetadata(
        'test_002',
        MarketTopic.EQUITIES_FUTURES,
        DataCategory.SIGNALS,
        'test_source',
        0.95
      );

      expect(metadata.quality).toBe(0.95);
    });

    test('should clamp quality values', () => {
      const highQuality = createLightweightMetadata(
        'test_003',
        MarketTopic.EQUITIES_OPTIONS,
        DataCategory.MARKET_DATA,
        'test_source',
        1.5 // Should be clamped to 1
      );

      const lowQuality = createLightweightMetadata(
        'test_004',
        MarketTopic.CRYPTO_DERIVATIVES,
        DataCategory.MARKET_DATA,
        'test_source',
        -0.5 // Should be clamped to 0
      );

      expect(highQuality.quality).toBe(1);
      expect(lowQuality.quality).toBe(0);
    });
  });

  describe('Enhanced Metadata Creation', () => {
    test('should create essential metadata', () => {
      const source: DataSource = {
        id: 'test_source',
        provider: 'test_provider',
        feed: 'test_feed',
        latency: 100,
        reliability: 0.95,
        lastUpdate: Date.now(),
        updateFrequency: 1000,
        name: 'test_api',
        type: 'api',
        cost: 0.01
      };
      const market: MarketContext = {
        session: 'continuous' as any,
        liquidity: 'high' as any,
        volatility: 'medium' as any,
        timeZone: 'UTC',
        name: 'crypto',
        marketHours: {
          open: '00:00',
          close: '23:59',
          currentStatus: 'open' as const
        },
        relatedMarkets: ['BTC', 'ETH'],
        correlatedSymbols: ['BTC/USD', 'ETH/USD']
      };
      const quality: DataQuality = {
        completeness: 0.9,
        accuracy: 0.95,
        freshness: 100,
        consistency: 0.9,
        validity: 0.95,
        overall: 0.9,
        score: 0.9
      };

      const metadata = createEssentialMetadata(
        'test_005',
        source,
        market,
        [MarketTopic.CRYPTO_SPOT],
        DataCategory.MARKET_DATA,
        quality
      );

      expect(metadata.id as string).toEqual('test_005');
      expect(metadata.source).toEqual(source);
      expect(metadata.market).toEqual(market);
      expect(metadata.topics).toEqual([MarketTopic.CRYPTO_SPOT]);
      expect(metadata.category).toBe(DataCategory.MARKET_DATA);
      expect(metadata.quality).toEqual(quality);
      expect(metadata.version).toBe('2.0.0');
      expect(metadata.tags).toEqual([]);
      expect(metadata.relationships.childIds).toEqual([]);
      expect(metadata.relationships.relatedIds).toEqual([]);
      expect(metadata.relationships.dependencies).toEqual([]);
    });
  });

  describe('Lightweight Odds Tick', () => {
    test('should create lightweight odds tick', () => {
      const metadata: LightweightMetadata = {
        id: BrandedTypeUtils.createMetadataId('meta_001'),
        timestamp: Date.now(),
        topic: MarketTopic.CRYPTO_SPOT,
        category: DataCategory.MARKET_DATA,
        source: 'exchange',
        quality: 0.95
      };

      const tick: LightweightOddsTick = {
        id: BrandedTypeUtils.createSymbolId('BTC/USD'),
        timestamp: Date.now(),
        symbol: 'BTC/USD',
        price: 45000.50,
        size: 1.5,
        exchange: 'binance',
        side: 'buy',
        metadata
      };

      expect(tick.id as string).toEqual('BTC/USD');
      expect(tick.symbol).toBe('BTC/USD');
      expect(tick.price).toBe(45000.50);
      expect(tick.size).toBe(1.5);
      expect(tick.exchange).toBe('binance');
      expect(tick.side).toBe('buy');
      expect(tick.metadata).toEqual(metadata);
    });

    test('should validate side property', () => {
      const validSides: Array<'buy' | 'sell'> = ['buy', 'sell'];

      validSides.forEach(side => {
        const tick: LightweightOddsTick = {
          id: BrandedTypeUtils.createSymbolId('test'),
          timestamp: Date.now(),
          symbol: 'TEST/USD',
          price: 100,
          size: 1,
          exchange: 'test',
          side,
          metadata: createLightweightMetadata('test', MarketTopic.CRYPTO_SPOT, DataCategory.MARKET_DATA, 'test')
        };

        expect(['buy', 'sell']).toContain(tick.side);
      });
    });
  });

  describe('Smart Metadata Type Union', () => {
    test('should handle smart metadata type union', () => {
      const lightweight: SmartMetadata = createLightweightMetadata(
        'smart_1',
        MarketTopic.CRYPTO_SPOT,
        DataCategory.MARKET_DATA,
        'test'
      );

      const enhanced: SmartMetadata = createEssentialMetadata(
        'smart_2',
        {
          id: 'test_source',
          provider: 'test_provider',
          feed: 'test_feed',
          latency: 100,
          reliability: 0.95,
          lastUpdate: Date.now(),
          updateFrequency: 1000,
          name: 'test',
          type: 'api',
          cost: 0.01
        },
        {
          session: 'continuous' as any,
          liquidity: 'high' as any,
          volatility: 'medium' as any,
          timeZone: 'UTC',
          name: 'crypto',
          marketHours: {
            open: '00:00',
            close: '23:59',
            currentStatus: 'open' as const
          },
          relatedMarkets: ['BTC', 'ETH'],
          correlatedSymbols: ['BTC/USD', 'ETH/USD']
        },
        [MarketTopic.CRYPTO_SPOT],
        DataCategory.MARKET_DATA,
        {
          completeness: 0.9,
          accuracy: 0.95,
          freshness: 100,
          consistency: 0.9,
          validity: 0.95,
          overall: 0.9,
          score: 0.9,
        }
      );

      expect(isLightweightMetadata(lightweight)).toBe(true);
      expect(isEnhancedMetadata(enhanced)).toBe(true);
    });
  });

  describe('Optional Components', () => {
    test('should handle optional technical metadata', () => {
      const technical: TechnicalMetadata = {
        schema: 'v1.0',
        encoding: 'json',
        compression: 'gzip',
        size: 1024,
        checksum: 'abc123'
      };

      const metadata: ComposableEnhancedMetadata = {
        id: BrandedTypeUtils.createMetadataId('tech_test'),
        timestamp: Date.now(),
        version: '2.0.0',
        source: {
          id: 'test_source',
          provider: 'test_provider',
          feed: 'test_feed',
          latency: 100,
          reliability: 0.95,
          lastUpdate: Date.now(),
          updateFrequency: 1000,
          name: 'test',
          type: 'api',
          cost: 0.01
        },
        market: {
          session: 'continuous' as any,
          liquidity: 'high' as any,
          volatility: 'medium' as any,
          timeZone: 'UTC',
          name: 'crypto',
          marketHours: {
            open: '00:00',
            close: '23:59',
            currentStatus: 'open' as const
          },
          relatedMarkets: ['BTC', 'ETH'],
          correlatedSymbols: ['BTC/USD', 'ETH/USD']
        },
        topics: [MarketTopic.CRYPTO_SPOT],
        category: DataCategory.MARKET_DATA,
        tags: [],
        quality: {
          completeness: 0.9,
          accuracy: 0.95,
          freshness: 100,
          consistency: 0.9,
          validity: 0.95,
          overall: 0.9,
          score: 0.9,
        },
        technical,
        relationships: {
          childIds: [],
          relatedIds: [],
          dependencies: []
        }
      };

      expect(metadata.technical).toEqual(technical);
      expect(metadata.technical?.schema).toBe('v1.0');
    });

    test('should handle optional business metadata', () => {
      const business: BusinessMetadata = {
        priority: 'high',
        retention: 30,
        compliance: ['GDPR', 'SOC2'],
        sensitivity: 'internal'
      };

      const metadata: ComposableEnhancedMetadata = {
        id: BrandedTypeUtils.createMetadataId('biz_test'),
        timestamp: Date.now(),
        version: '2.0.0',
        source: {
          id: 'test_source',
          provider: 'test_provider',
          feed: 'test_feed',
          latency: 100,
          reliability: 0.95,
          lastUpdate: Date.now(),
          updateFrequency: 1000,
          name: 'test',
          type: 'api',
          cost: 0.01
        },
        market: {
          session: 'continuous' as any,
          liquidity: 'high' as any,
          volatility: 'medium' as any,
          timeZone: 'UTC',
          name: 'crypto',
          marketHours: {
            open: '00:00',
            close: '23:59',
            currentStatus: 'open' as const
          },
          relatedMarkets: ['BTC', 'ETH'],
          correlatedSymbols: ['BTC/USD', 'ETH/USD']
        },
        topics: [MarketTopic.CRYPTO_SPOT],
        category: DataCategory.MARKET_DATA,
        tags: [],
        quality: {
          completeness: 0.9,
          accuracy: 0.95,
          freshness: 100,
          consistency: 0.9,
          validity: 0.95,
          overall: 0.9,
          score: 0.9,
        },
        business,
        relationships: {
          childIds: [],
          relatedIds: [],
          dependencies: []
        }
      };

      expect(metadata.business).toEqual(business);
      expect(metadata.business?.priority).toBe('high');
    });

    test('should handle optional processing metadata', () => {
      const processing: ProcessingMetadata = {
        pipeline: ['validation', 'enrichment'],
        enrichments: ['market_data', 'technical_indicators'],
        transformations: ['normalization', 'aggregation'],
        validation: ['schema_check', 'range_validation'],
        processingTime: 150,
        version: '1.2.0'
      };

      const metadata: ComposableEnhancedMetadata = {
        id: BrandedTypeUtils.createMetadataId('proc_test'),
        timestamp: Date.now(),
        version: '2.0.0',
        source: {
          id: 'test_source',
          provider: 'test_provider',
          feed: 'test_feed',
          latency: 100,
          reliability: 0.95,
          lastUpdate: Date.now(),
          updateFrequency: 1000,
          name: 'test',
          type: 'api',
          cost: 0.01
        },
        market: {
          session: 'continuous' as any,
          liquidity: 'high' as any,
          volatility: 'medium' as any,
          timeZone: 'UTC',
          name: 'crypto',
          marketHours: {
            open: '00:00',
            close: '23:59',
            currentStatus: 'open' as const
          },
          relatedMarkets: ['BTC', 'ETH'],
          correlatedSymbols: ['BTC/USD', 'ETH/USD']
        },
        topics: [MarketTopic.CRYPTO_SPOT],
        category: DataCategory.MARKET_DATA,
        tags: [],
        quality: {
          completeness: 0.9,
          accuracy: 0.95,
          freshness: 100,
          consistency: 0.9,
          validity: 0.95,
          overall: 0.9,
          score: 0.9
        },
        processing,
        relationships: {
          childIds: [],
          relatedIds: [],
          dependencies: []
        }
      };

      expect(metadata.processing).toEqual(processing);
      expect(metadata.processing?.processingTime).toBe(150);
    });
  });

  describe('Relationships', () => {
    test('should handle metadata relationships', () => {
      const parentId = BrandedTypeUtils.createMetadataId('parent_1');
      const childId1 = BrandedTypeUtils.createMetadataId('child_1');
      const childId2 = BrandedTypeUtils.createMetadataId('child_2');
      const relatedId = BrandedTypeUtils.createMetadataId('related_1');

      const metadata: ComposableEnhancedMetadata = {
        id: BrandedTypeUtils.createMetadataId('main_1'),
        timestamp: Date.now(),
        version: '2.0.0',
        source: {
          id: 'test_source',
          provider: 'test_provider',
          feed: 'test_feed',
          latency: 100,
          reliability: 0.95,
          lastUpdate: Date.now(),
          updateFrequency: 1000,
          name: 'test',
          type: 'api',
          cost: 0.01
        },
        market: {
          session: 'continuous' as any,
          liquidity: 'high' as any,
          volatility: 'medium' as any,
          timeZone: 'UTC',
          name: 'crypto',
          marketHours: {
            open: '00:00',
            close: '23:59',
            currentStatus: 'open' as const
          },
          relatedMarkets: ['BTC', 'ETH'],
          correlatedSymbols: ['BTC/USD', 'ETH/USD']
        },
        topics: [MarketTopic.CRYPTO_SPOT],
        category: DataCategory.MARKET_DATA,
        tags: [],
        quality: {
          completeness: 0.9,
          accuracy: 0.95,
          freshness: 100,
          consistency: 0.9,
          validity: 0.95,
          overall: 0.9,
          score: 0.9
        },
        relationships: {
          parentId,
          childIds: [childId1, childId2],
          relatedIds: [relatedId],
          dependencies: ['dependency_1', 'dependency_2']
        }
      };

      expect(metadata.relationships.parentId).toBe(parentId);
      expect(metadata.relationships.childIds).toEqual([childId1, childId2]);
      expect(metadata.relationships.relatedIds).toEqual([relatedId]);
      expect(metadata.relationships.dependencies).toEqual(['dependency_1', 'dependency_2']);
    });
  });

  describe('Type Safety', () => {
    test('should enforce branded type constraints', () => {
      // These should compile and work at runtime
      const topicId: TopicId = BrandedTypeUtils.createTopicId('test_topic');
      const metadataId: MetadataId = BrandedTypeUtils.createMetadataId('test_meta');
      const symbolId: SymbolId = BrandedTypeUtils.createSymbolId('test_symbol');

      expect(typeof topicId).toBe('string');
      expect(typeof metadataId).toBe('string');
      expect(typeof symbolId).toBe('string');
    });

    test('should handle quality score bounds', () => {
      const validQualities = [0, 0.5, 0.8, 1];

      validQualities.forEach(quality => {
        const metadata = createLightweightMetadata(
          'test',
          MarketTopic.CRYPTO_SPOT,
          DataCategory.MARKET_DATA,
          'test',
          quality
        );

        expect(metadata.quality).toBeGreaterThanOrEqual(0);
        expect(metadata.quality).toBeLessThanOrEqual(1);
      });
    });
  });
});
