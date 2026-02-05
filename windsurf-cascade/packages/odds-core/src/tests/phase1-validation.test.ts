// packages/odds-core/src/tests/phase1-validation.test.ts - Proper Bun test suite for Phase 1

import { test, describe, expect } from 'bun:test';
import { MarketTopic, DataCategory } from '../types/topics';
import { createLightweightMetadata } from '../types/lightweight';
import { MetadataBuilder, TopicAnalyzer, QualityAssessor } from '../utils/metadata';
import { MetadataErrorFactory, MetadataErrorHandler, MetadataErrorUtils } from '../errors/metadata-errors';

describe('Phase 1 Foundation Validation', () => {
  
  test('should import core types correctly', () => {
    expect(MarketTopic.CRYPTO_SPOT).toBe('crypto.spot');
    expect(DataCategory.MARKET_DATA).toBe('market_data');
    expect(Object.values(MarketTopic).length).toBeGreaterThan(0);
    expect(Object.values(DataCategory).length).toBeGreaterThan(0);
  });

  test('should create lightweight metadata successfully', () => {
    const lightweightMeta = createLightweightMetadata(
      'test_001',
      MarketTopic.CRYPTO_SPOT,
      DataCategory.MARKET_DATA,
      'binance',
      0.95
    );

    expect(lightweightMeta.id).toBe('test_001');
    expect(lightweightMeta.topic).toBe(MarketTopic.CRYPTO_SPOT);
    expect(lightweightMeta.category).toBe(DataCategory.MARKET_DATA);
    expect(lightweightMeta.source).toBe('binance');
    expect(lightweightMeta.quality).toBe(0.95);
    expect(typeof lightweightMeta.timestamp).toBe('number');
  });

  test('should create enhanced metadata with builder pattern', () => {
    const enhancedMeta = new MetadataBuilder('enhanced_001')
      .setVersion('2.0.0')
      .setTopics([MarketTopic.CRYPTO_SPOT])
      .setCategory(DataCategory.MARKET_DATA)
      .setTags(['test', 'validation'])
      .build();

    expect(enhancedMeta.id).toBe('enhanced_001');
    expect(enhancedMeta.version).toBe('2.0.0');
    expect(enhancedMeta.topics).toContain(MarketTopic.CRYPTO_SPOT);
    expect(enhancedMeta.category).toBe(DataCategory.MARKET_DATA);
    expect(enhancedMeta.tags).toEqual(['test', 'validation']);
    expect(typeof enhancedMeta.timestamp).toBe('number');
  });

  test('should handle error creation and processing', () => {
    const error = MetadataErrorFactory.validation('Test validation error', ['field1', 'field2']);
    
    expect(error.code).toBe('METADATA_VALIDATION_ERROR');
    expect(error.category).toBe('validation');
    expect(error.message).toBe('Test validation error');
    expect(error.validationErrors).toEqual(['field1', 'field2']);
    
    // Test error handling doesn't throw
    expect(() => {
      MetadataErrorHandler.handle(error);
    }).not.toThrow();
    
    // Test user-friendly messages
    expect(error.getUserMessage()).toContain('validation failed');
    expect(error.getSuggestions()).toHaveLength(4);
  });

  test('should perform topic analysis correctly', () => {
    const analysis = TopicAnalyzer.analyzeTopics({
      symbol: 'BTC/USD',
      exchange: 'binance',
      assetClass: 'crypto'
    });

    expect(analysis.primaryTopic).toBe(MarketTopic.CRYPTO_SPOT);
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.confidence).toBeLessThanOrEqual(1);
    expect(typeof analysis.reasoning).toBe('string');
    expect(typeof analysis.detectedAt).toBe('number');
    expect(Array.isArray(analysis.secondaryTopics)).toBe(true);
  });

  test('should perform quality assessment', () => {
    const quality = QualityAssessor.assessQuality({
      symbol: 'ETH/USD',
      price: 3000,
      size: 2.5,
      exchange: 'coinbase',
      timestamp: Date.now(),
      volume: 1500000
    });

    expect(typeof quality.completeness).toBe('number');
    expect(typeof quality.accuracy).toBe('number');
    expect(typeof quality.freshness).toBe('number');
    expect(typeof quality.consistency).toBe('number');
    expect(typeof quality.validity).toBe('number');
    expect(typeof quality.overall).toBe('number');
    
    // All quality scores should be between 0 and 1
    Object.values(quality).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  test('should handle topic operations correctly', () => {
    const topic = MarketTopic.CRYPTO_SPOT;
    const hierarchy = topic.split('.');
    const category = hierarchy[0];
    const subcategory = hierarchy[1];

    expect(hierarchy).toEqual(['crypto', 'spot']);
    expect(category).toBe('crypto');
    expect(subcategory).toBe('spot');
  });

  test('should validate metadata structure', () => {
    const metadata = new MetadataBuilder('validation_test')
      .setTopics([MarketTopic.EQUITIES_US])
      .setCategory(DataCategory.SIGNALS)
      .build();

    // Basic structure validation
    expect(metadata).toHaveProperty('id');
    expect(metadata).toHaveProperty('timestamp');
    expect(metadata).toHaveProperty('version');
    expect(metadata).toHaveProperty('source');
    expect(metadata).toHaveProperty('market');
    expect(metadata).toHaveProperty('topics');
    expect(metadata).toHaveProperty('category');
    expect(metadata).toHaveProperty('tags');
    expect(metadata).toHaveProperty('quality');
    expect(metadata).toHaveProperty('processing');
    expect(metadata).toHaveProperty('business');
    expect(metadata).toHaveProperty('technical');
    expect(metadata).toHaveProperty('relationships');
  });

  test('should handle error recovery patterns', () => {
    // Test safe result wrapper
    const successResult = MetadataErrorUtils.safeResult(
      () => 'success',
      'fallback'
    );
    expect(successResult.success).toBe(true);
    expect(successResult.result).toBe('success');

    const failureResult = MetadataErrorUtils.safeResult(
      () => { throw new Error('Test error'); },
      'fallback'
    );
    expect(failureResult.success).toBe(false);
    expect(failureResult.result).toBe('fallback');
    expect(failureResult.error).toBeInstanceOf(Error);
  });

  test('should maintain backward compatibility', () => {
    // Test that original patterns still work
    const originalMetadata = new MetadataBuilder()
      .setTopics([MarketTopic.CRYPTO_SPOT])
      .setCategory(DataCategory.MARKET_DATA)
      .build();

    expect(originalMetadata.topics).toContain(MarketTopic.CRYPTO_SPOT);
    expect(originalMetadata.category).toBe(DataCategory.MARKET_DATA);
    
    // Test that enhanced features are available
    expect(originalMetadata.source).toBeDefined();
    expect(originalMetadata.quality).toBeDefined();
    expect(originalMetadata.processing).toBeDefined();
  });
});

describe('Phase 1 Performance Validation', () => {
  
  test('should create metadata quickly', () => {
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      new MetadataBuilder(`perf_test_${i}`)
        .setTopics([MarketTopic.CRYPTO_SPOT])
        .setCategory(DataCategory.MARKET_DATA)
        .build();
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should create 100 metadata objects in < 100ms
  });

  test('should perform topic analysis efficiently', () => {
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      TopicAnalyzer.analyzeTopics({
        symbol: 'BTC/USD',
        exchange: 'binance',
        assetClass: 'crypto'
      });
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50); // Should analyze 100 items in < 50ms
  });

  test('should handle batch operations', () => {
    const dataArray = Array.from({ length: 50 }, (_, i) => ({
      symbol: `SYMBOL_${i}`,
      exchange: 'test_exchange',
      assetClass: 'test'
    }));

    const start = performance.now();
    // Use individual analysis in a loop since batch method doesn't exist
    const analyses = dataArray.map(data => TopicAnalyzer.analyzeTopics(data));
    const duration = performance.now() - start;

    expect(analyses).toHaveLength(50);
    expect(duration).toBeLessThan(50); // Should process 50 items in < 50ms
  });
});

describe('Phase 1 Error Handling Validation', () => {
  
  test('should create specific error types', () => {
    const validationError = MetadataErrorFactory.validation('Test', ['field1']);
    const topicError = MetadataErrorFactory.topic('Invalid topic', ['bad.topic']);
    const qualityError = MetadataErrorFactory.quality('Quality failed');
    const processingError = MetadataErrorFactory.processing('Processing failed');
    const typeError = MetadataErrorFactory.type('Type error', 'string', 'number');

    expect(validationError.category).toBe('validation');
    expect(topicError.category).toBe('topic');
    expect(qualityError.category).toBe('quality');
    expect(processingError.category).toBe('processing');
    expect(typeError.category).toBe('type');
  });

  test('should provide helpful error suggestions', () => {
    const validationError = MetadataErrorFactory.validation('Test', ['field1']);
    const suggestions = validationError.getSuggestions();
    
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(typeof suggestions[0]).toBe('string');
  });

  test('should track error statistics', () => {
    // Clear any existing stats
    MetadataErrorHandler.resetStats();
    
    // Handle some errors
    MetadataErrorHandler.handle(MetadataErrorFactory.validation('Test 1'));
    MetadataErrorHandler.handle(MetadataErrorFactory.validation('Test 2'));
    MetadataErrorHandler.handle(MetadataErrorFactory.topic('Test 3'));
    
    const stats = MetadataErrorHandler.getErrorStats();
    expect(Object.keys(stats).length).toBeGreaterThan(0);
    expect(stats['validation:METADATA_VALIDATION_ERROR']).toBe(2);
  });
});
