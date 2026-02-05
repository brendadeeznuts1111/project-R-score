// packages/odds-core/src/examples/topics-metadata-example.ts
// Example usage of topics tracking and metadata functionality

import { 
  MetadataBuilder, 
  TopicAnalyzer, 
  QualityAssessor,
  MetadataValidator,
  MetadataUtils
} from '../utils/metadata';

import { 
  MarketTopic, 
  DataCategory
} from '../types/topics';

import { 
  EnhancedOddsTick,
  EnhancedTradingSignal
} from '../types/enhanced';

/**
 * Example 1: Creating enhanced metadata for market data
 */
export function createEnhancedMarketData() {
  // Sample market data
  const marketData = {
    symbol: 'BTC/USD',
    price: 45000.50,
    size: 1.5,
    exchange: 'binance',
    side: 'buy' as const,
    timestamp: Date.now()
  };

  // Analyze topics
  const topicAnalysis = TopicAnalyzer.analyzeTopics(marketData);
  console.log('Topic Analysis:', topicAnalysis);

  // Assess quality
  const quality = QualityAssessor.assessQuality(marketData);
  console.log('Quality Assessment:', quality);

  // Build enhanced metadata
  const metadata = new MetadataBuilder('market_data_001')
    .setVersion('2.0.0')
    .setTopics(topicAnalysis.secondaryTopics.length > 0 ? 
      [topicAnalysis.primaryTopic, ...topicAnalysis.secondaryTopics] : 
      [topicAnalysis.primaryTopic])
    .setCategory(DataCategory.MARKET_DATA)
    .setTags(['crypto', 'bitcoin', 'spot'])
    .setQuality(quality)
    .setSource({
      provider: 'Binance',
      feed: 'spot',
      endpoint: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
      latency: 15,
      reliability: 0.95,
      lastUpdate: Date.now(),
      updateFrequency: 100
    })
    .setMarket({
      session: 'regular' as any,
      liquidity: 'high' as any,
      volatility: 'medium' as any,
      timeZone: 'UTC',
      marketHours: {
        open: '00:00',
        close: '23:59',
        currentStatus: 'open'
      },
      relatedMarkets: ['ETH/USD', 'BTC/USDT'],
      correlatedSymbols: ['ETH', 'LTC']
    })
    .setBusiness({
      priority: 'high',
      retention: 90,
      compliance: ['SOX', 'GDPR'],
      sensitivity: 'internal'
    })
    .setTechnical({
      schema: 'odds-tick-v2',
      encoding: 'utf-8',
      compression: 'gzip',
      size: 256,
      checksum: 'abc123def456'
    })
    .build();

  // Validate metadata
  const validation = MetadataValidator.validate(metadata);
  console.log('Metadata Validation:', validation);

  // Create enhanced odds tick
  const enhancedTick: EnhancedOddsTick = {
    id: 'tick_001',
    timestamp: marketData.timestamp,
    symbol: marketData.symbol,
    price: marketData.price,
    size: marketData.size,
    exchange: marketData.exchange,
    side: marketData.side,
    metadata,
    topics: metadata.topics,
    category: metadata.category,
    marketContext: {
      session: 'regular',
      liquidity: 'high',
      volatility: 'medium',
      relatedMarkets: metadata.market.relatedMarkets,
      impactFactors: {
        news: 0.3,
        sentiment: 0.6,
        technical: 0.8,
        fundamental: 0.4
      }
    },
    quality: {
      confidence: quality.overall,
      reliability: metadata.source.reliability,
      freshness: quality.freshness,
      completeness: quality.completeness
    },
    processing: {
      latency: metadata.source.latency,
      pipeline: ['ingestion', 'validation', 'enrichment'],
      enrichments: ['topic-analysis', 'quality-assessment'],
      sourceLatency: metadata.source.latency
    }
  };

  return enhancedTick;
}

/**
 * Example 2: Creating enhanced trading signal
 */
export function createEnhancedTradingSignal() {
  const signalData = {
    symbol: 'AAPL',
    type: 'momentum' as const,
    confidence: 0.85,
    expectedReturn: 0.12,
    risk: 0.08,
    timestamp: Date.now(),
    expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
  };

  const topicAnalysis = TopicAnalyzer.analyzeTopics(signalData);
  const quality = QualityAssessor.assessQuality(signalData);

  const metadata = new MetadataBuilder('signal_001')
    .setTopics([MarketTopic.EQUITIES_US])
    .setCategory(DataCategory.SIGNALS)
    .setTags(['apple', 'stocks', 'momentum', 'us-equities'])
    .setQuality(quality)
    .build();

  const enhancedSignal: EnhancedTradingSignal = {
    id: signalData.symbol + '_' + Date.now(),
    type: signalData.type,
    symbol: signalData.symbol,
    confidence: signalData.confidence,
    expectedReturn: signalData.expectedReturn,
    risk: signalData.risk,
    timestamp: signalData.timestamp,
    expiry: signalData.expiry,
    metadata,
    topics: metadata.topics,
    category: metadata.category,
    reasoning: {
      primary: 'Strong momentum detected with increasing volume',
      secondary: ['Technical indicators bullish', 'Market sentiment positive'],
      confidence: signalData.confidence,
      evidence: {
        technical: 0.8,
        fundamental: 0.6,
        sentiment: 0.7,
        flow: 0.5
      }
    },
    riskMetrics: {
      maxDrawdown: 0.15,
      sharpeRatio: 1.8,
      sortinoRatio: 2.2,
      beta: 1.2,
      correlation: 0.7
    },
    execution: {
      entryPrice: 150.25,
      stopLoss: 142.50,
      takeProfit: 165.00,
      positionSize: 1000,
      timeHorizon: 24
    }
  };

  return enhancedSignal;
}

/**
 * Example 3: Working with topics
 */
export function demonstrateTopicOperations() {
  console.log('=== Topic Operations Demo ===');

  // Get topic hierarchy
  const btcTopic = MarketTopic.CRYPTO_SPOT;
  const hierarchy = getTopicHierarchy(btcTopic);
  console.log('BTC Topic Hierarchy:', hierarchy); // ['crypto', 'spot']

  // Get topic category
  const category = getTopicCategory(btcTopic);
  console.log('BTC Topic Category:', category); // 'crypto'

  // Get topic subcategory
  const subcategory = getTopicSubcategory(btcTopic);
  console.log('BTC Topic Subcategory:', subcategory); // 'spot'

  // Check if topics are related
  const isRelated = areTopicsRelated(
    MarketTopic.CRYPTO_SPOT, 
    MarketTopic.CRYPTO_DERIVATIVES
  );
  console.log('Are crypto topics related?', isRelated); // true

  // Get all topics in a category
  const cryptoTopics = getTopicsInCategory('crypto');
  console.log('All Crypto Topics:', cryptoTopics);

  // Topic analysis
  const sampleData = {
    symbol: 'BTC/USD',
    exchange: 'binance',
    assetClass: 'crypto'
  };

  const analysis = TopicAnalyzer.analyzeTopics(sampleData);
  console.log('Topic Analysis Result:', analysis);
}

/**
 * Example 4: Metadata utilities
 */
export function demonstrateMetadataUtilities() {
  console.log('=== Metadata Utilities Demo ===');

  // Create base metadata
  const baseMetadata = new MetadataBuilder('base_001')
    .setTopics([MarketTopic.CRYPTO_SPOT])
    .setCategory(DataCategory.MARKET_DATA)
    .build();

  // Clone metadata
  const clonedMetadata = MetadataUtils.clone(baseMetadata);
  console.log('Cloned metadata ID:', clonedMetadata.id);

  // Update timestamp
  const updatedMetadata = MetadataUtils.updateTimestamp(baseMetadata);
  console.log('Updated timestamp:', updatedMetadata.timestamp);

  // Add topics
  const withMoreTopics = MetadataUtils.addTopics(baseMetadata, [
    MarketTopic.CRYPTO_DERIVATIVES,
    MarketTopic.ALT_DATA_SENTIMENT
  ]);
  console.log('Added topics:', withMoreTopics.topics);

  // Remove topics
  const withFewerTopics = MetadataUtils.removeTopics(withMoreTopics, [
    MarketTopic.CRYPTO_DERIVATIVES
  ]);
  console.log('Removed topics:', withFewerTopics.topics);

  // Merge metadata
  const updateData = {
    version: '2.1.0',
    tags: ['updated', 'merged']
  };

  const mergedMetadata = MetadataUtils.merge(baseMetadata, updateData);
  console.log('Merged metadata version:', mergedMetadata.version);
  console.log('Merged metadata tags:', mergedMetadata.tags);
}

/**
 * Example 5: Quality assessment
 */
export function demonstrateQualityAssessment() {
  console.log('=== Quality Assessment Demo ===');

  // High quality data
  const highQualityData = {
    symbol: 'ETH/USD',
    price: 3000.25,
    size: 2.5,
    exchange: 'coinbase',
    timestamp: Date.now(),
    volume: 1500000
  };

  const highQuality = QualityAssessor.assessQuality(highQualityData);
  console.log('High Quality Data Score:', highQuality.overall);

  // Low quality data
  const lowQualityData = {
    symbol: 'INVALID',
    price: -100, // Invalid price
    size: null, // Missing size
    exchange: '',
    timestamp: Date.now() - 1000000 // Old data
  };

  const lowQuality = QualityAssessor.assessQuality(lowQualityData);
  console.log('Low Quality Data Score:', lowQuality.overall);
  console.log('Quality Issues:', lowQuality);
}

// Helper functions (these would be imported from topics.ts)
function getTopicHierarchy(topic: MarketTopic): string[] {
  return topic.split('.');
}

function getTopicCategory(topic: MarketTopic): string {
  return topic.split('.')[0];
}

function getTopicSubcategory(topic: MarketTopic): string | null {
  const parts = topic.split('.');
  return parts.length > 1 ? parts[1] : null;
}

function areTopicsRelated(topic1: MarketTopic, topic2: MarketTopic): boolean {
  const category1 = getTopicCategory(topic1);
  const category2 = getTopicCategory(topic2);
  return category1 === category2;
}

function getTopicsInCategory(category: string): MarketTopic[] {
  return Object.values(MarketTopic).filter(topic => 
    getTopicCategory(topic) === category
  );
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('🚀 Topics Tracking & Metadata Examples\n');

  console.log('1. Creating Enhanced Market Data:');
  const enhancedTick = createEnhancedMarketData();
  console.log('Enhanced Tick:', enhancedTick);

  console.log('\n2. Creating Enhanced Trading Signal:');
  const enhancedSignal = createEnhancedTradingSignal();
  console.log('Enhanced Signal:', enhancedSignal);

  console.log('\n3. Topic Operations:');
  demonstrateTopicOperations();

  console.log('\n4. Metadata Utilities:');
  demonstrateMetadataUtilities();

  console.log('\n5. Quality Assessment:');
  demonstrateQualityAssessment();

  console.log('\n✅ All examples completed!');
}

// Export for easy testing
if (import.meta.main) {
  runAllExamples();
}
