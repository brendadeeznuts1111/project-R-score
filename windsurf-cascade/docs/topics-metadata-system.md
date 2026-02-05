# Topics Tracking & Metadata System

This document describes the enhanced topics tracking and metadata system implemented in Phase 1 of the Odds Protocol enhancement.

## 🎯 Overview

The topics tracking and metadata system provides:
- **Systematic topic categorization** for all market data and signals
- **Comprehensive metadata schema** for data lineage, quality, and context
- **Enhanced data structures** with rich metadata integration
- **Utility functions** for metadata creation, validation, and manipulation

## 📋 Core Components

### 1. Topics Enumeration (`MarketTopic`)

Hierarchical topic system using dot notation for better organization:

```typescript
enum MarketTopic {
  // Sports Markets
  SPORTS_BASKETBALL = 'sports.basketball',
  SPORTS_FOOTBALL = 'sports.football',
  SPORTS_BASEBALL = 'sports.baseball',
  
  // Cryptocurrency Markets
  CRYPTO_SPOT = 'crypto.spot',
  CRYPTO_DERIVATIVES = 'crypto.derivatives',
  CRYPTO_DEFI = 'crypto.defi',
  
  // Equities Markets
  EQUITIES_US = 'equities.us',
  EQUITIES_GLOBAL = 'equities.global',
  EQUITIES_ETFS = 'equities.etfs',
  
  // Foreign Exchange
  FOREX_MAJOR = 'forex.major',
  FOREX_MINOR = 'forex.minor',
  FOREX_EXOTIC = 'forex.exotic',
  
  // And more...
}
```

### 2. Data Categories (`DataCategory`)

Classification system for different types of data:

```typescript
enum DataCategory {
  MARKET_DATA = 'market_data',
  SIGNALS = 'signals',
  ARBITRAGE = 'arbitrage',
  RISK = 'risk',
  PERFORMANCE = 'performance',
  NEWS = 'news',
  SENTIMENT = 'sentiment',
  // And more...
}
```

### 3. Enhanced Metadata Schema

Comprehensive metadata structure with multiple dimensions:

```typescript
interface EnhancedMetadata {
  // Basic identification
  id: string;
  timestamp: number;
  version: string;
  
  // Data lineage
  source: DataSource;
  
  // Market context
  market: MarketContext;
  
  // Classification
  topics: MarketTopic[];
  category: DataCategory;
  tags: string[];
  
  // Quality metrics
  quality: DataQuality;
  
  // Processing information
  processing: ProcessingMetadata;
  
  // Business context
  business: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    retention: number;
    compliance: string[];
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  };
  
  // Technical metadata
  technical: {
    schema: string;
    encoding: string;
    compression: string;
    size: number;
    checksum: string;
  };
  
  // Relationships
  relationships: {
    parentId?: string;
    childIds: string[];
    relatedIds: string[];
    dependencies: string[];
  };
}
```

### 4. Enhanced Data Structures

All major data structures now include enhanced metadata:

- `EnhancedOddsTick` - Market data with topics and metadata
- `EnhancedMarketData` - Order book data with context
- `EnhancedArbitrageOpportunity` - Arbitrage with detailed analysis
- `EnhancedSharpDetectionResult` - Sharp signals with classification
- `EnhancedTradingSignal` - Trading signals with reasoning
- `EnhancedWebSocketMessage` - Messages with routing and performance data

## 🛠️ Utility Functions

### MetadataBuilder

Fluent API for creating enhanced metadata:

```typescript
const metadata = new MetadataBuilder('data_001')
  .setVersion('2.0.0')
  .setTopics([MarketTopic.CRYPTO_SPOT])
  .setCategory(DataCategory.MARKET_DATA)
  .setTags(['bitcoin', 'crypto'])
  .setSource({
    provider: 'Binance',
    feed: 'spot',
    latency: 15,
    reliability: 0.95,
    lastUpdate: Date.now(),
    updateFrequency: 100
  })
  .build();
```

### TopicAnalyzer

Automatic topic detection and analysis:

```typescript
const data = { symbol: 'BTC/USD', exchange: 'binance' };
const analysis = TopicAnalyzer.analyzeTopics(data);

// Returns:
// {
//   primaryTopic: MarketTopic.CRYPTO_SPOT,
//   secondaryTopics: [],
//   confidence: 0.8,
//   reasoning: 'symbol "BTC/USD" indicates crypto.spot; exchange "binance" supports crypto.spot',
//   detectedAt: 1699999999999
// }
```

### QualityAssessor

Data quality assessment:

```typescript
const data = { symbol: 'BTC/USD', price: 45000, timestamp: Date.now() };
const quality = QualityAssessor.assessQuality(data);

// Returns quality metrics (0-1 scores):
// {
//   completeness: 0.75,
//   accuracy: 0.8,
//   freshness: 0.9,
//   consistency: 0.9,
//   validity: 0.9,
//   overall: 0.81
// }
```

### MetadataValidator

Structure validation:

```typescript
const validation = MetadataValidator.validate(metadata);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}
```

### MetadataUtils

Utility functions for metadata manipulation:

```typescript
// Clone metadata
const cloned = MetadataUtils.clone(metadata);

// Update timestamp
const updated = MetadataUtils.updateTimestamp(metadata);

// Add topics
const withTopics = MetadataUtils.addTopics(metadata, [MarketTopic.CRYPTO_DERIVATIVES]);

// Remove topics
const withoutTopics = MetadataUtils.removeTopics(metadata, [MarketTopic.CRYPTO_DERIVATIVES]);

// Merge metadata
const merged = MetadataUtils.merge(base, update);
```

## 📚 Topic Helper Functions

```typescript
// Get topic hierarchy
const hierarchy = getTopicHierarchy(MarketTopic.CRYPTO_SPOT);
// Returns: ['crypto', 'spot']

// Get topic category
const category = getTopicCategory(MarketTopic.CRYPTO_SPOT);
// Returns: 'crypto'

// Get topic subcategory
const subcategory = getTopicSubcategory(MarketTopic.CRYPTO_SPOT);
// Returns: 'spot'

// Check if topics are related
const related = areTopicsRelated(MarketTopic.CRYPTO_SPOT, MarketTopic.CRYPTO_DERIVATIVES);
// Returns: true

// Get all topics in category
const cryptoTopics = getTopicsInCategory('crypto');
// Returns: [MarketTopic.CRYPTO_SPOT, MarketTopic.CRYPTO_DERIVATIVES, ...]
```

## 🚀 Usage Examples

### Creating Enhanced Market Data

```typescript
import { MetadataBuilder, TopicAnalyzer, QualityAssessor } from 'odds-core';

// Analyze topics and quality
const topicAnalysis = TopicAnalyzer.analyzeTopics(marketData);
const quality = QualityAssessor.assessQuality(marketData);

// Build enhanced metadata
const metadata = new MetadataBuilder('market_001')
  .setTopics([topicAnalysis.primaryTopic])
  .setCategory(DataCategory.MARKET_DATA)
  .setQuality(quality)
  .build();

// Create enhanced data structure
const enhancedTick: EnhancedOddsTick = {
  id: 'tick_001',
  symbol: 'BTC/USD',
  price: 45000,
  size: 1.5,
  exchange: 'binance',
  side: 'buy',
  timestamp: Date.now(),
  metadata,
  topics: metadata.topics,
  category: metadata.category,
  marketContext: {
    session: 'regular',
    liquidity: 'high',
    volatility: 'medium',
    relatedMarkets: ['ETH/USD'],
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
```

### Topic-Based Processing

```typescript
// Filter data by topic
const cryptoData = allData.filter(item => 
  item.topics.includes(MarketTopic.CRYPTO_SPOT)
);

// Group data by topic category
const dataByCategory = allData.reduce((groups, item) => {
  const category = getTopicCategory(item.topics[0]);
  groups[category] = groups[category] || [];
  groups[category].push(item);
  return groups;
}, {});

// Find related data
const relatedData = findRelatedData(currentData, allData);
```

## 🔄 Migration Guide

### From Basic Types to Enhanced Types

```typescript
// Before
const basicTick: OddsTick = {
  id: 'tick_001',
  symbol: 'BTC/USD',
  price: 45000,
  size: 1.5,
  exchange: 'binance',
  side: 'buy',
  timestamp: Date.now()
};

// After
const enhancedTick: EnhancedOddsTick = {
  ...basicTick,
  metadata: createMetadata(basicTick),
  topics: analyzeTopics(basicTick),
  category: DataCategory.MARKET_DATA,
  marketContext: enrichMarketContext(basicTick),
  quality: assessQuality(basicTick),
  processing: trackProcessing(basicTick)
};
```

## 📊 Benefits

### 1. **Better Data Organization**
- Systematic categorization of all data
- Hierarchical topic structure
- Consistent classification

### 2. **Enhanced Searchability**
- Topic-based filtering
- Category-based queries
- Tag-based discovery

### 3. **Improved Analytics**
- Topic trend analysis
- Cross-topic correlations
- Quality metrics tracking

### 4. **Smart Routing**
- Topic-based message distribution
- Priority-based processing
- Context-aware routing

### 5. **Quality Tracking**
- Comprehensive quality metrics
- Data lineage tracking
- Reliability scoring

### 6. **Context Awareness**
- Rich market context
- Related market information
- Impact factor analysis

## 🔮 Next Steps

Phase 1 establishes the foundation. Future phases will include:

- **Phase 2**: Topics tracking engine and MCP server enhancements
- **Phase 3**: Advanced analytics and predictive modeling
- **Phase 4**: Integration with WebSocket routing and signal generation

## 📝 Examples

See `packages/odds-core/src/examples/topics-metadata-example.ts` for comprehensive usage examples.

Run the examples:
```bash
bun run packages/odds-core/src/examples/topics-metadata-example.ts
```
