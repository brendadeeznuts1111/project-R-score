// packages/odds-core/src/utils/documented-metadata.ts - Comprehensive JSDoc documentation

import type { 
  EnhancedMetadata, 
  DataCategory, 
  DataSource,
  MarketContext,
  DataQuality,
  ProcessingMetadata,
  TopicAnalysis
} from '../types/topics';

import { 
  MarketTopic
} from '../types/topics';

/**
 * Metadata builder class for creating enhanced metadata with fluent API.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const metadata = new MetadataBuilder('data_001')
 *   .setVersion('2.0.0')
 *   .setTopics([MarketTopic.CRYPTO_SPOT])
 *   .setCategory(DataCategory.MARKET_DATA)
 *   .build();
 * 
 * // Advanced usage with all components
 * const enhancedMetadata = new MetadataBuilder('complex_001')
 *   .setSource({
 *     provider: 'Binance',
 *     feed: 'spot',
 *     latency: 15,
 *     reliability: 0.95,
 *     lastUpdate: Date.now(),
 *     updateFrequency: 100
 *   })
 *   .setMarket({
 *     session: MarketSession.REGULAR,
 *     liquidity: LiquidityLevel.HIGH,
 *     volatility: VolatilityLevel.MEDIUM,
 *     timeZone: 'UTC',
 *     marketHours: {
 *       open: '00:00',
 *       close: '23:59',
 *       currentStatus: 'open'
 *     },
 *     relatedMarkets: ['ETH/USD'],
 *     correlatedSymbols: ['ETH']
 *   })
 *   .setBusiness({
 *     priority: 'high',
 *     retention: 90,
 *     compliance: ['SOX', 'GDPR'],
 *     sensitivity: 'internal'
 *   })
 *   .build();
 * ```
 */
export class MetadataBuilder {
  private metadata: Partial<EnhancedMetadata> = {};

  /**
   * Creates a new MetadataBuilder instance.
   * 
   * @param id - Optional unique identifier for the metadata
   * @throws {Error} If id is provided but not a valid string
   * 
   * @example
   * ```typescript
   * const builder1 = new MetadataBuilder(); // No ID, will auto-generate
   * const builder2 = new MetadataBuilder('my-data-001'); // With specific ID
   * ```
   */
  constructor(id?: string) {
    if (id && (typeof id !== 'string' || id.trim().length === 0)) {
      throw new Error('ID must be a non-empty string if provided');
    }
    if (id) {
      this.metadata.id = id;
    }
  }

  /**
   * Sets the unique identifier for the metadata.
   * 
   * @param id - The unique identifier (must be non-empty string)
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If id is not a valid non-empty string
   * 
   * @example
   * ```typescript
   * builder.setId('unique-data-123');
   * ```
   */
  setId(id: string): MetadataBuilder {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
    this.metadata.id = id;
    return this;
  }

  /**
   * Sets the version of the metadata schema.
   * 
   * @param version - Semantic version string (e.g., '1.0.0', '2.1.3')
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If version is not a valid string
   * 
   * @example
   * ```typescript
   * builder.setVersion('2.0.0');
   * ```
   */
  setVersion(version: string): MetadataBuilder {
    if (!version || typeof version !== 'string' || version.trim().length === 0) {
      throw new Error('Version must be a non-empty string');
    }
    this.metadata.version = version;
    return this;
  }

  /**
   * Sets the timestamp for the metadata.
   * 
   * @param timestamp - Optional timestamp in milliseconds. Defaults to current time.
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If timestamp is not a valid number
   * 
   * @example
   * ```typescript
   * builder.setTimestamp(); // Current time
   * builder.setTimestamp(Date.now() - 60000); // 1 minute ago
   * ```
   */
  setTimestamp(timestamp?: number): MetadataBuilder {
    const ts = timestamp ?? Date.now();
    if (!isFinite(ts) || ts < 0) {
      throw new Error('Timestamp must be a valid positive number');
    }
    this.metadata.timestamp = ts;
    return this;
  }

  /**
   * Sets the data source information for the metadata.
   * 
   * @param source - Data source configuration including provider, latency, etc.
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If source is missing required fields or has invalid values
   * 
   * @example
   * ```typescript
   * builder.setSource({
   *   provider: 'Binance',
   *   feed: 'spot',
   *   latency: 15,
   *   reliability: 0.95,
   *   lastUpdate: Date.now(),
   *   updateFrequency: 100
   * });
   * ```
   */
  setSource(source: DataSource): MetadataBuilder {
    this.validateSource(source);
    this.metadata.source = source;
    return this;
  }

  /**
   * Sets the market context information.
   * 
   * @param market - Market context including session, liquidity, volatility, etc.
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If market context is invalid
   * 
   * @example
   * ```typescript
   * builder.setMarket({
   *   session: MarketSession.REGULAR,
   *   liquidity: LiquidityLevel.HIGH,
   *   volatility: VolatilityLevel.MEDIUM,
   *   timeZone: 'UTC',
   *   marketHours: {
   *     open: '09:30',
   *     close: '16:00',
   *     currentStatus: 'open'
   *   },
   *   relatedMarkets: ['ETH/USD'],
   *   correlatedSymbols: ['ETH']
   * });
   * ```
   */
  setMarket(market: MarketContext): MetadataBuilder {
    this.validateMarket(market);
    this.metadata.market = market;
    return this;
  }

  /**
   * Sets the topics for classification.
   * 
   * @param topics - Array of market topics from MarketTopic enum
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If topics array is empty or contains invalid topics
   * 
   * @example
   * ```typescript
   * builder.setTopics([MarketTopic.CRYPTO_SPOT]);
   * builder.setTopics([MarketTopic.CRYPTO_SPOT, MarketTopic.CRYPTO_DERIVATIVES]);
   * ```
   */
  setTopics(topics: MarketTopic[]): MetadataBuilder {
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error('Topics must be a non-empty array');
    }
    
    const validTopics = Object.values(MarketTopic);
    for (const topic of topics) {
      if (!validTopics.includes(topic)) {
        throw new Error(`Invalid topic: ${topic}. Must be one of: ${validTopics.join(', ')}`);
      }
    }
    
    this.metadata.topics = topics;
    return this;
  }

  /**
   * Sets the data category for classification.
   * 
   * @param category - Data category from DataCategory enum
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If category is not a valid DataCategory
   * 
   * @example
   * ```typescript
   * builder.setCategory(DataCategory.MARKET_DATA);
   * builder.setCategory(DataCategory.SIGNALS);
   * ```
   */
  setCategory(category: DataCategory): MetadataBuilder {
    const validCategories = Object.values(DataCategory);
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`);
    }
    this.metadata.category = category;
    return this;
  }

  /**
   * Sets tags for additional categorization and search.
   * 
   * @param tags - Array of tag strings for metadata
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If tags array contains invalid items
   * 
   * @example
   * ```typescript
   * builder.setTags(['crypto', 'bitcoin', 'spot', 'real-time']);
   * ```
   */
  setTags(tags: string[]): MetadataBuilder {
    if (!Array.isArray(tags)) {
      throw new Error('Tags must be an array');
    }
    
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw new Error('All tags must be non-empty strings');
      }
    }
    
    this.metadata.tags = tags;
    return this;
  }

  /**
   * Sets the quality metrics for the data.
   * 
   * @param quality - Quality metrics including completeness, accuracy, etc.
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If quality metrics are invalid (out of range, wrong type)
   * 
   * @example
   * ```typescript
   * builder.setQuality({
   *   completeness: 0.95,
   *   accuracy: 0.90,
   *   freshness: 0.85,
   *   consistency: 0.92,
   *   validity: 0.88,
   *   overall: 0.90
   * });
   * ```
   */
  setQuality(quality: DataQuality): MetadataBuilder {
    this.validateQuality(quality);
    this.metadata.quality = quality;
    return this;
  }

  /**
   * Sets the processing metadata.
   * 
   * @param processing - Processing information including pipeline, enrichments, etc.
   * @returns This MetadataBuilder instance for method chaining
   * @throws {Error} If processing metadata is invalid
   * 
   * @example
   * ```typescript
   * builder.setProcessing({
   *   pipeline: ['ingestion', 'validation', 'enrichment'],
   *   enrichments: ['topic-analysis', 'quality-assessment'],
   *   transformations: ['normalization', 'filtering'],
   *   validation: ['price-range', 'size-limits'],
   *   processingTime: 25,
   *   version: '1.2.0'
   * });
   * ```
   */
  setProcessing(processing: ProcessingMetadata): MetadataBuilder {
    this.validateProcessing(processing);
    this.metadata.processing = processing;
    return this;
  }

  /**
   * Builds the final EnhancedMetadata object with all configured properties.
   * 
   * @returns Complete EnhancedMetadata object
   * @throws {Error} If required properties are missing or invalid
   * 
   * @example
   * ```typescript
   * const metadata = new MetadataBuilder('data_001')
   *   .setTopics([MarketTopic.CRYPTO_SPOT])
   *   .setCategory(DataCategory.MARKET_DATA)
   *   .build();
   * 
   * console.log(metadata.id); // 'data_001'
   * console.log(metadata.topics); // ['crypto.spot']
   * ```
   */
  build(): EnhancedMetadata {
    // Validate required fields
    if (!this.metadata.id) {
      this.metadata.id = this.generateId();
    }
    
    if (!this.metadata.timestamp) {
      this.metadata.timestamp = Date.now();
    }
    
    if (!this.metadata.version) {
      this.metadata.version = '1.0.0';
    }
    
    // Set defaults for required fields if not provided
    if (!this.metadata.source) {
      this.metadata.source = this.createDefaultSource();
    }
    
    if (!this.metadata.market) {
      this.metadata.market = this.createDefaultMarket();
    }
    
    if (!this.metadata.topics) {
      this.metadata.topics = [];
    }
    
    if (!this.metadata.category) {
      this.metadata.category = DataCategory.MARKET_DATA;
    }
    
    if (!this.metadata.tags) {
      this.metadata.tags = [];
    }
    
    if (!this.metadata.quality) {
      this.metadata.quality = this.createDefaultQuality();
    }
    
    if (!this.metadata.processing) {
      this.metadata.processing = this.createDefaultProcessing();
    }
    
    if (!this.metadata.business) {
      this.metadata.business = this.createDefaultBusiness();
    }
    
    if (!this.metadata.technical) {
      this.metadata.technical = this.createDefaultTechnical();
    }
    
    if (!this.metadata.relationships) {
      this.metadata.relationships = this.createDefaultRelationships();
    }

    return this.metadata as EnhancedMetadata;
  }

  // Private validation methods
  private validateSource(source: DataSource): void {
    if (!source || typeof source !== 'object') {
      throw new Error('Source must be a valid object');
    }
    
    if (!source.provider || typeof source.provider !== 'string') {
      throw new Error('Source provider is required and must be a string');
    }
    
    if (!source.feed || typeof source.feed !== 'string') {
      throw new Error('Source feed is required and must be a string');
    }
    
    if (typeof source.latency !== 'number' || source.latency < 0) {
      throw new Error('Source latency must be a non-negative number');
    }
    
    if (typeof source.reliability !== 'number' || source.reliability < 0 || source.reliability > 1) {
      throw new Error('Source reliability must be a number between 0 and 1');
    }
  }

  private validateMarket(market: MarketContext): void {
    if (!market || typeof market !== 'object') {
      throw new Error('Market must be a valid object');
    }
    
    if (!market.session || typeof market.session !== 'string') {
      throw new Error('Market session is required and must be a string');
    }
    
    if (!market.liquidity || typeof market.liquidity !== 'string') {
      throw new Error('Market liquidity is required and must be a string');
    }
    
    if (!market.volatility || typeof market.volatility !== 'string') {
      throw new Error('Market volatility is required and must be a string');
    }
    
    if (!market.timeZone || typeof market.timeZone !== 'string') {
      throw new Error('Market time zone is required and must be a string');
    }
  }

  private validateQuality(quality: DataQuality): void {
    if (!quality || typeof quality !== 'object') {
      throw new Error('Quality must be a valid object');
    }
    
    const metrics = ['completeness', 'accuracy', 'freshness', 'consistency', 'validity', 'overall'];
    for (const metric of metrics) {
      const value = (quality as any)[metric];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`Quality ${metric} must be a number between 0 and 1`);
      }
    }
  }

  private validateProcessing(processing: ProcessingMetadata): void {
    if (!processing || typeof processing !== 'object') {
      throw new Error('Processing must be a valid object');
    }
    
    if (!Array.isArray(processing.pipeline)) {
      throw new Error('Processing pipeline must be an array');
    }
    
    if (!Array.isArray(processing.enrichments)) {
      throw new Error('Processing enrichments must be an array');
    }
    
    if (typeof processing.processingTime !== 'number' || processing.processingTime < 0) {
      throw new Error('Processing time must be a non-negative number');
    }
  }

  // Private helper methods
  private generateId(): string {
    return `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createDefaultSource(): DataSource {
    return {
      provider: 'unknown',
      feed: 'default',
      latency: 0,
      reliability: 0.5,
      lastUpdate: Date.now(),
      updateFrequency: 1000
    };
  }

  private createDefaultMarket(): MarketContext {
    return {
      session: 'regular' as any,
      liquidity: 'medium' as any,
      volatility: 'medium' as any,
      timeZone: 'UTC',
      marketHours: {
        open: '09:30',
        close: '16:00',
        currentStatus: 'closed'
      },
      relatedMarkets: [],
      correlatedSymbols: []
    };
  }

  private createDefaultQuality(): DataQuality {
    return {
      completeness: 0.5,
      accuracy: 0.5,
      freshness: 0,
      consistency: 0.5,
      validity: 0.5,
      overall: 0.5
    };
  }

  private createDefaultProcessing(): ProcessingMetadata {
    return {
      pipeline: [],
      enrichments: [],
      transformations: [],
      validation: [],
      processingTime: 0,
      version: '1.0.0'
    };
  }

  private createDefaultBusiness(): EnhancedMetadata['business'] {
    return {
      priority: 'medium',
      retention: 30,
      compliance: [],
      sensitivity: 'internal'
    };
  }

  private createDefaultTechnical(): EnhancedMetadata['technical'] {
    return {
      schema: 'unknown',
      encoding: 'utf-8',
      compression: 'none',
      size: 0,
      checksum: ''
    };
  }

  private createDefaultRelationships(): EnhancedMetadata['relationships'] {
    return {
      childIds: [],
      relatedIds: [],
      dependencies: []
    };
  }
}

/**
 * Topic analysis utilities with comprehensive documentation.
 * 
 * @example
 * ```typescript
 * // Analyze market data to determine topics
 * const marketData = {
 *   symbol: 'BTC/USD',
 *   exchange: 'binance',
 *   assetClass: 'crypto'
 * };
 * 
 * const analysis = TopicAnalyzer.analyzeTopics(marketData);
 * console.log(analysis.primaryTopic); // 'crypto.spot'
 * console.log(analysis.confidence); // 0.8
 * ```
 */
export class TopicAnalyzer {
  /**
   * Analyzes data to determine relevant market topics with confidence scoring.
   * 
   * @param data - The data object to analyze (should contain symbol, exchange, assetClass, etc.)
   * @returns TopicAnalysis object with primary/secondary topics, confidence, and reasoning
   * @throws {Error} If data is null or undefined
   * 
   * @example
   * ```typescript
   * const analysis = TopicAnalyzer.analyzeTopics({
   *   symbol: 'AAPL',
   *   exchange: 'NASDAQ',
   *   assetClass: 'equities'
   * });
   * 
   * // Returns:
   * // {
   * //   primaryTopic: 'equities.us',
   * //   secondaryTopics: [],
   * //   confidence: 0.8,
   * //   reasoning: 'symbol "AAPL" indicates equities.us; exchange "NASDAQ" supports equities.us',
   * //   detectedAt: 1699999999999
   * // }
   * ```
   */
  static analyzeTopics(data: any): TopicAnalysis {
    if (!data) {
      throw new Error('Data cannot be null or undefined');
    }

    const topics = this.extractTopics(data);
    const primaryTopic = this.selectPrimaryTopic(topics);
    const secondaryTopics = topics.filter(t => t !== primaryTopic);
    const confidence = this.calculateTopicConfidence(data, primaryTopic);
    const reasoning = this.generateTopicReasoning(data, primaryTopic);

    return {
      primaryTopic,
      secondaryTopics,
      confidence,
      reasoning,
      detectedAt: Date.now()
    };
  }

  /**
   * Batch analyzes multiple data items for improved performance.
   * 
   * @param dataArray - Array of data objects to analyze
   * @returns Array of TopicAnalysis objects
   * @throws {Error} If dataArray is not an array
   * 
   * @example
   * ```typescript
   * const dataArray = [
   *   { symbol: 'BTC/USD', exchange: 'binance' },
   *   { symbol: 'AAPL', exchange: 'NASDAQ' },
   *   { symbol: 'EUR/USD', exchange: 'oanda' }
   * ];
   * 
   * const analyses = TopicAnalyzer.analyzeTopicsBatch(dataArray);
   * console.log(analyses.length); // 3
   * ```
   */
  static analyzeTopicsBatch(dataArray: any[]): TopicAnalysis[] {
    if (!Array.isArray(dataArray)) {
      throw new Error('Input must be an array');
    }

    return dataArray.map(data => this.analyzeTopics(data));
  }

  // Private methods with documentation
  private static extractTopics(data: any): MarketTopic[] {
    const topics: MarketTopic[] = [];
    
    if (data.symbol) {
      const symbolTopics = this.extractTopicsFromSymbol(data.symbol);
      topics.push(...symbolTopics);
    }

    if (data.exchange) {
      const exchangeTopics = this.extractTopicsFromExchange(data.exchange);
      topics.push(...exchangeTopics);
    }

    if (data.assetClass) {
      const assetTopics = this.extractTopicsFromAssetClass(data.assetClass);
      topics.push(...assetTopics);
    }

    return [...new Set(topics)];
  }

  /**
   * Extracts potential topics from a symbol name.
   * 
   * @param symbol - The trading symbol to analyze
   * @returns Array of potential MarketTopic values
   * 
   * @example
   * ```typescript
   * const topics = TopicAnalyzer.extractTopicsFromSymbol('BTC/USD');
   * console.log(topics); // ['crypto.spot', 'forex.major']
   * ```
   */
  private static extractTopicsFromSymbol(symbol: string): MarketTopic[] {
    const topics: MarketTopic[] = [];
    const upperSymbol = symbol.toUpperCase();

    // Sports symbols
    if (upperSymbol.includes('NBA') || upperSymbol.includes('BASKETBALL')) {
      topics.push(MarketTopic.SPORTS_BASKETBALL);
    }
    if (upperSymbol.includes('NFL') || upperSymbol.includes('FOOTBALL')) {
      topics.push(MarketTopic.SPORTS_FOOTBALL);
    }
    if (upperSymbol.includes('MLB') || upperSymbol.includes('BASEBALL')) {
      topics.push(MarketTopic.SPORTS_BASEBALL);
    }
    if (upperSymbol.includes('NHL') || upperSymbol.includes('HOCKEY')) {
      topics.push(MarketTopic.SPORTS_HOCKEY);
    }

    // Crypto symbols
    if (upperSymbol.includes('BTC') || upperSymbol.includes('BITCOIN')) {
      topics.push(MarketTopic.CRYPTO_SPOT);
    }
    if (upperSymbol.includes('ETH') || upperSymbol.includes('ETHEREUM')) {
      topics.push(MarketTopic.CRYPTO_SPOT);
    }

    // Forex symbols
    if (upperSymbol.includes('USD') || upperSymbol.includes('EUR') || upperSymbol.includes('GBP')) {
      topics.push(MarketTopic.FOREX_MAJOR);
    }

    return topics;
  }

  /**
   * Extracts topics from exchange name.
   * 
   * @param exchange - The exchange name to analyze
   * @returns Array of potential MarketTopic values
   */
  private static extractTopicsFromExchange(exchange: string): MarketTopic[] {
    const topics: MarketTopic[] = [];
    const upperExchange = exchange.toUpperCase();

    if (upperExchange.includes('BINANCE') || upperExchange.includes('COINBASE')) {
      topics.push(MarketTopic.CRYPTO_SPOT);
    }
    if (upperExchange.includes('NYSE') || upperExchange.includes('NASDAQ')) {
      topics.push(MarketTopic.EQUITIES_US);
    }

    return topics;
  }

  /**
   * Extracts topics from asset class.
   * 
   * @param assetClass - The asset class to analyze
   * @returns Array of potential MarketTopic values
   */
  private static extractTopicsFromAssetClass(assetClass: string): MarketTopic[] {
    const topics: MarketTopic[] = [];
    const upperAssetClass = assetClass.toUpperCase();

    switch (upperAssetClass) {
      case 'CRYPTO':
        topics.push(MarketTopic.CRYPTO_SPOT);
        break;
      case 'EQUITIES':
      case 'STOCKS':
        topics.push(MarketTopic.EQUITIES_US);
        break;
      case 'FOREX':
        topics.push(MarketTopic.FOREX_MAJOR);
        break;
      case 'COMMODITIES':
        topics.push(MarketTopic.COMMODITY_ENERGY);
        break;
    }

    return topics;
  }

  /**
   * Selects the primary topic from a list of candidates.
   * 
   * @param topics - Array of topic candidates
   * @returns The selected primary topic
   */
  private static selectPrimaryTopic(topics: MarketTopic[]): MarketTopic {
    if (topics.length === 0) {
      return MarketTopic.MARKET_DATA;
    }
    
    return topics[0];
  }

  /**
   * Calculates confidence score for topic assignment.
   * 
   * @param data - The original data object
   * @param topic - The assigned topic
   * @returns Confidence score between 0 and 1
   */
  private static calculateTopicConfidence(data: any, topic: MarketTopic): number {
    let confidence = 0.5;

    if (data.symbol) confidence += 0.2;
    if (data.exchange) confidence += 0.1;
    if (data.price) confidence += 0.1;
    if (data.volume) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generates human-readable reasoning for topic assignment.
   * 
   * @param data - The original data object
   * @param topic - The assigned topic
   * @returns Human-readable reasoning string
   */
  private static generateTopicReasoning(data: any, topic: MarketTopic): string {
    const reasons: string[] = [];

    if (data.symbol) {
      reasons.push(`symbol "${data.symbol}" indicates ${topic}`);
    }
    if (data.exchange) {
      reasons.push(`exchange "${data.exchange}" supports ${topic}`);
    }
    if (data.assetClass) {
      reasons.push(`asset class "${data.assetClass}" maps to ${topic}`);
    }

    return reasons.join('; ') || `default assignment to ${topic}`;
  }
}
