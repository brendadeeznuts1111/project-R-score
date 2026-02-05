// packages/odds-core/src/tests/micro-enhancements.test.ts - Test for micro enhancements

import { test, describe, expect } from 'bun:test';
import { MarketTopic, DataCategory } from '../types/topics';
import { createLightweightMetadata, isLightweightMetadata } from '../types/lightweight';
import { 
  LazyQualityAssessor, 
  QuickQualityAssessor, 
  QualityAssessorFactory
} from '../utils/lazy-quality';
import {
  TopicMapper,
  TopicValidator,
  TopicAnalysisService,
  TopicServiceFactory
} from '../utils/topic-services';

describe('Phase 1 Micro Enhancements', () => {
  
  test('should create and validate lightweight metadata', () => {
    const lightweightMeta = createLightweightMetadata(
      'lt_001',
      MarketTopic.CRYPTO_SPOT,
      DataCategory.MARKET_DATA,
      'binance',
      0.95
    );

    expect(isLightweightMetadata(lightweightMeta)).toBe(true);
    expect(lightweightMeta.id).toBe('lt_001');
    expect(lightweightMeta.quality).toBe(0.95);
    
    // Should have minimal properties (id, timestamp, topic, category, source, quality)
    expect(Object.keys(lightweightMeta)).toHaveLength(6);
  });

  test('should handle lazy quality assessment', () => {
    const data = {
      symbol: 'BTC/USD',
      price: 45000,
      size: 1.5,
      exchange: 'binance',
      timestamp: Date.now()
    };

    const lazyAssessor = QualityAssessorFactory.getLazyAssessor();
    const lazyQuality = lazyAssessor.assessLazy(data);
    
    // Should not compute quality initially (no cache key provided)
    expect(lazyQuality.isAssessed).toBe(false);
    
    // Should compute when requested
    const quality = lazyQuality.assess();
    expect(typeof quality.overall).toBe('number');
    expect(quality.overall).toBeGreaterThanOrEqual(0);
    expect(quality.overall).toBeLessThanOrEqual(1);
    
    // Should return same values on subsequent calls
    const quality2 = lazyQuality.assess();
    expect(quality2.overall).toBe(quality.overall);
    expect(quality2.completeness).toBe(quality.completeness);
    expect(quality2.accuracy).toBe(quality.accuracy);
  });

  test('should handle quick quality assessment', () => {
    const data = {
      symbol: 'ETH/USD',
      price: 3000,
      size: 2.5,
      exchange: 'coinbase',
      timestamp: Date.now()
    };

    const quickAssessor = QualityAssessorFactory.getQuickAssessor();
    const quickScore = quickAssessor.assessQuick(data);
    
    expect(typeof quickScore).toBe('number');
    expect(quickScore).toBeGreaterThanOrEqual(0);
    expect(quickScore).toBeLessThanOrEqual(1);
  });

  test('should use quality assessor factory', () => {
    const lazyAssessor = QualityAssessorFactory.getLazyAssessor();
    const quickAssessor = QualityAssessorFactory.getQuickAssessor();

    expect(lazyAssessor).toBeInstanceOf(LazyQualityAssessor);
    expect(quickAssessor).toBeInstanceOf(QuickQualityAssessor);
  });

  test('should handle topic mapping', () => {
    const mapper = new TopicMapper();
    
    const cryptoTopics = mapper.mapSymbol('BTC/USD');
    expect(cryptoTopics).toContain(MarketTopic.CRYPTO_SPOT);
    
    const exchangeTopics = mapper.mapExchange('binance');
    expect(exchangeTopics).toContain(MarketTopic.CRYPTO_SPOT);
  });

  test('should handle topic validation', () => {
    const validator = new TopicValidator();
    
    const validTopics = [MarketTopic.CRYPTO_SPOT, MarketTopic.CRYPTO_DERIVATIVES];
    const invalidTopics = [MarketTopic.CRYPTO_SPOT, 'invalid.topic' as MarketTopic];
    
    const validResult = validator.validateTopics(validTopics);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);
    
    const invalidResult = validator.validateTopics(invalidTopics);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  test('should check topic relationships', () => {
    const validator = new TopicValidator();
    
    expect(validator.areTopicsRelated(MarketTopic.CRYPTO_SPOT, MarketTopic.CRYPTO_DERIVATIVES)).toBe(true);
    expect(validator.areTopicsRelated(MarketTopic.CRYPTO_SPOT, MarketTopic.EQUITIES_US)).toBe(false);
  });

  test('should handle topic analysis service', () => {
    const mapper = new TopicMapper();
    const validator = new TopicValidator();
    const analysisService = new TopicAnalysisService(mapper, validator);
    
    const analysis = analysisService.analyzeTopics({
      symbol: 'AAPL',
      exchange: 'NASDAQ',
      assetClass: 'equities'
    });
    
    expect(analysis.primaryTopic).toBe(MarketTopic.EQUITIES_US);
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.reasoning).toBeDefined();
  });

  test('should use topic service factory', () => {
    const mapper = TopicServiceFactory.getMapper();
    const validator = TopicServiceFactory.getValidator();
    const analysisService = TopicServiceFactory.getAnalysisService();
    
    expect(mapper).toBeInstanceOf(TopicMapper);
    expect(validator).toBeInstanceOf(TopicValidator);
    expect(analysisService).toBeInstanceOf(TopicAnalysisService);
  });

  test('should demonstrate performance benefits', () => {
    const data = {
      symbol: 'BTC/USD',
      price: 45000,
      size: 1.5,
      exchange: 'binance',
      timestamp: Date.now()
    };

    const lazyAssessor = QualityAssessorFactory.getLazyAssessor();
    const quickAssessor = QualityAssessorFactory.getQuickAssessor();

    // Test lazy quality creation speed
    const start = performance.now();
    const lazyQualities = Array.from({ length: 1000 }, () => 
      lazyAssessor.assessLazy(data)
    );
    const lazyCreationTime = performance.now() - start;

    // Test quick quality speed
    const quickStart = performance.now();
    const quickScores = Array.from({ length: 1000 }, () => 
      quickAssessor.assessQuick(data)
    );
    const quickTime = performance.now() - quickStart;

    expect(lazyQualities).toHaveLength(1000);
    expect(quickScores).toHaveLength(1000);
    expect(lazyCreationTime).toBeLessThan(50); // Should be very fast
    expect(quickTime).toBeLessThan(100); // Should be fast
  });

  test('should maintain backward compatibility', () => {
    // Test that original patterns still work alongside enhancements
    const lightweightMeta = createLightweightMetadata(
      'compat_test',
      MarketTopic.CRYPTO_SPOT,
      DataCategory.MARKET_DATA,
      'binance',
      0.9
    );

    // Should work with new utilities
    const lazyAssessor = QualityAssessorFactory.getLazyAssessor();
    const lazyQuality = lazyAssessor.assessLazy({
      symbol: 'ETH/USD',
      price: 3000,
      exchange: 'coinbase'
    });

    // Should work with topic services
    const mapper = TopicServiceFactory.getMapper();
    const topics = mapper.mapSymbol('BTC/USD');

    expect(lightweightMeta.id).toBe('compat_test');
    expect(typeof lazyQuality.assess().overall).toBe('number');
    expect(topics).toContain(MarketTopic.CRYPTO_SPOT);
  });
});
