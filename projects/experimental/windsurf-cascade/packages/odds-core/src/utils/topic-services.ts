// packages/odds-core/src/utils/topic-services.ts - Single responsibility topic services

import { MarketTopic } from '../types/topics';

/**
 * Topic mapping service - maps symbols/exchanges to topics
 */
export class TopicMapper {
  private symbolMappings = new Map<string, MarketTopic[]>();
  private exchangeMappings = new Map<string, MarketTopic[]>();
  private assetClassMappings = new Map<string, MarketTopic[]>();

  constructor() {
    this.initializeMappings();
  }

  /**
   * Map symbol to potential topics
   */
  mapSymbol(symbol: string): MarketTopic[] {
    const upperSymbol = symbol.toUpperCase();
    const topics: MarketTopic[] = [];

    // Sports symbols
    if (this.isSportsSymbol(upperSymbol)) {
      topics.push(...this.getSportsTopics(upperSymbol));
    }

    // Crypto symbols
    if (this.isCryptoSymbol(upperSymbol)) {
      topics.push(...this.getCryptoTopics(upperSymbol));
    }

    // Forex symbols
    if (this.isForexSymbol(upperSymbol)) {
      topics.push(...this.getForexTopics(upperSymbol));
    }

    // Equity symbols
    if (this.isEquitySymbol(upperSymbol)) {
      topics.push(...this.getEquityTopics(upperSymbol));
    }

    return topics;
  }

  /**
   * Map exchange to potential topics
   */
  mapExchange(exchange: string): MarketTopic[] {
    const upperExchange = exchange.toUpperCase();
    const topics: MarketTopic[] = [];

    if (this.isCryptoExchange(upperExchange)) {
      topics.push(MarketTopic.CRYPTO_SPOT);
    }

    if (this.isEquityExchange(upperExchange)) {
      topics.push(MarketTopic.EQUITIES_US);
    }

    if (this.isForexExchange(upperExchange)) {
      topics.push(MarketTopic.FOREX_MAJOR);
    }

    return topics;
  }

  /**
   * Map asset class to topics
   */
  mapAssetClass(assetClass: string): MarketTopic[] {
    const upperAssetClass = assetClass.toUpperCase();
    
    switch (upperAssetClass) {
      case 'CRYPTO':
        return [MarketTopic.CRYPTO_SPOT];
      case 'EQUITIES':
      case 'STOCKS':
        return [MarketTopic.EQUITIES_US];
      case 'FOREX':
        return [MarketTopic.FOREX_MAJOR];
      case 'COMMODITIES':
        return [MarketTopic.COMMODITY_ENERGY];
      case 'SPORTS':
        return [MarketTopic.SPORTS_BASKETBALL];
      default:
        return [];
    }
  }

  /**
   * Add custom mapping
   */
  addSymbolMapping(symbol: string, topics: MarketTopic[]): void {
    this.symbolMappings.set(symbol.toUpperCase(), topics);
  }

  /**
   * Add custom exchange mapping
   */
  addExchangeMapping(exchange: string, topics: MarketTopic[]): void {
    this.exchangeMappings.set(exchange.toUpperCase(), topics);
  }

  private initializeMappings(): void {
    // Initialize common symbol mappings
    this.symbolMappings.set('BTC', [MarketTopic.CRYPTO_SPOT]);
    this.symbolMappings.set('ETH', [MarketTopic.CRYPTO_SPOT]);
    this.symbolMappings.set('AAPL', [MarketTopic.EQUITIES_US]);
    
    // Initialize exchange mappings
    this.exchangeMappings.set('BINANCE', [MarketTopic.CRYPTO_SPOT]);
    this.exchangeMappings.set('COINBASE', [MarketTopic.CRYPTO_SPOT]);
    this.exchangeMappings.set('NYSE', [MarketTopic.EQUITIES_US]);
    this.exchangeMappings.set('NASDAQ', [MarketTopic.EQUITIES_US]);
  }

  private isSportsSymbol(symbol: string): boolean {
    return symbol.includes('NBA') || symbol.includes('NFL') || 
           symbol.includes('MLB') || symbol.includes('NHL');
  }

  private isCryptoSymbol(symbol: string): boolean {
    return symbol.includes('BTC') || symbol.includes('ETH') || 
           symbol.includes('USDT') || symbol.includes('USD');
  }

  private isForexSymbol(symbol: string): boolean {
    return symbol.includes('USD') || symbol.includes('EUR') || 
           symbol.includes('GBP') || symbol.includes('JPY');
  }

  private isEquitySymbol(symbol: string): boolean {
    return symbol.length <= 5 && /^[A-Z]+$/.test(symbol);
  }

  private isCryptoExchange(exchange: string): boolean {
    return exchange.includes('BINANCE') || exchange.includes('COINBASE') || 
           exchange.includes('KRAKEN') || exchange.includes('BITFINEX');
  }

  private isEquityExchange(exchange: string): boolean {
    return exchange.includes('NYSE') || exchange.includes('NASDAQ') || 
           exchange.includes('ARCA');
  }

  private isForexExchange(exchange: string): boolean {
    return exchange.includes('FX') || exchange.includes('FOREX') || 
           exchange.includes('OANDA');
  }

  private getSportsTopics(symbol: string): MarketTopic[] {
    if (symbol.includes('NBA')) return [MarketTopic.SPORTS_BASKETBALL];
    if (symbol.includes('NFL')) return [MarketTopic.SPORTS_FOOTBALL];
    if (symbol.includes('MLB')) return [MarketTopic.SPORTS_BASEBALL];
    if (symbol.includes('NHL')) return [MarketTopic.SPORTS_HOCKEY];
    return [];
  }

  private getCryptoTopics(symbol: string): MarketTopic[] {
    const topics: MarketTopic[] = [MarketTopic.CRYPTO_SPOT];
    
    if (symbol.includes('DERIV') || symbol.includes('FUTURES')) {
      topics.push(MarketTopic.CRYPTO_DERIVATIVES);
    }
    
    return topics;
  }

  private getForexTopics(symbol: string): MarketTopic[] {
    const topics: MarketTopic[] = [MarketTopic.FOREX_MAJOR];
    
    if (symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('JPY')) {
      topics.push(MarketTopic.FOREX_CROSS);
    }
    
    return topics;
  }

  private getEquityTopics(symbol: string): MarketTopic[] {
    return [MarketTopic.EQUITIES_US];
  }
}

/**
 * Topic validation service
 */
export class TopicValidator {
  private validTopics = new Set(Object.values(MarketTopic));

  /**
   * Validate single topic
   */
  validateTopic(topic: MarketTopic): { valid: boolean; error?: string } {
    if (this.validTopics.has(topic)) {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      error: `Invalid topic: ${topic}. Must be one of: ${Array.from(this.validTopics).join(', ')}` 
    };
  }

  /**
   * Validate topic array
   */
  validateTopics(topics: MarketTopic[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const topic of topics) {
      const validation = this.validateTopic(topic);
      if (!validation.valid && validation.error) {
        errors.push(validation.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if topics are related
   */
  areTopicsRelated(topic1: MarketTopic, topic2: MarketTopic): boolean {
    const category1 = this.getTopicCategory(topic1);
    const category2 = this.getTopicCategory(topic2);
    return category1 === category2;
  }

  /**
   * Get topic category
   */
  getTopicCategory(topic: MarketTopic): string {
    return topic.split('.')[0];
  }

  /**
   * Get topic subcategory
   */
  getTopicSubcategory(topic: MarketTopic): string | null {
    const parts = topic.split('.');
    return parts.length > 1 ? parts[1] : null;
  }

  /**
   * Filter valid topics
   */
  filterValidTopics(topics: string[]): MarketTopic[] {
    return topics.filter(topic => this.validTopics.has(topic as MarketTopic)) as MarketTopic[];
  }
}

/**
 * Topic analysis service - coordinates mapper and validator
 */
export class TopicAnalysisService {
  constructor(
    private mapper: TopicMapper = new TopicMapper(),
    private validator: TopicValidator = new TopicValidator()
  ) {}

  /**
   * Analyze data and extract topics
   */
  analyzeTopics(data: any): import('../types/topics').TopicAnalysis {
    const topics = this.extractTopics(data);
    const primaryTopic = this.selectPrimaryTopic(topics);
    const secondaryTopics = topics.filter(t => t !== primaryTopic);
    const confidence = this.calculateConfidence(data, primaryTopic);
    const reasoning = this.generateReasoning(data, primaryTopic);

    return {
      primaryTopic,
      secondaryTopics,
      confidence,
      reasoning,
      detectedAt: Date.now()
    };
  }

  /**
   * Batch analyze multiple data items
   */
  analyzeTopicsBatch(dataArray: any[]): import('../types/topics').TopicAnalysis[] {
    return dataArray.map(data => this.analyzeTopics(data));
  }

  /**
   * Get topics in category
   */
  getTopicsInCategory(category: string): MarketTopic[] {
    return Object.values(MarketTopic).filter(topic => 
      this.validator.getTopicCategory(topic) === category
    );
  }

  /**
   * Get topic hierarchy
   */
  getTopicHierarchy(topic: MarketTopic): string[] {
    return topic.split('.');
  }

  private extractTopics(data: any): MarketTopic[] {
    const topics: MarketTopic[] = [];
    
    // Extract from symbol
    if (data.symbol) {
      topics.push(...this.mapper.mapSymbol(data.symbol));
    }

    // Extract from exchange
    if (data.exchange) {
      topics.push(...this.mapper.mapExchange(data.exchange));
    }

    // Extract from asset class
    if (data.assetClass) {
      topics.push(...this.mapper.mapAssetClass(data.assetClass));
    }

    // Remove duplicates
    return [...new Set(topics)];
  }

  private selectPrimaryTopic(topics: MarketTopic[]): MarketTopic {
    if (topics.length === 0) {
      return MarketTopic.MARKET_DATA; // Default fallback
    }
    
    // Simple heuristic: return the first topic
    // Could be enhanced with priority scoring
    return topics[0];
  }

  private calculateConfidence(data: any, topic: MarketTopic): number {
    let confidence = 0.5; // Base confidence

    if (data.symbol) confidence += 0.2;
    if (data.exchange) confidence += 0.1;
    if (data.price) confidence += 0.1;
    if (data.volume) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateReasoning(data: any, topic: MarketTopic): string {
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

/**
 * Topic service factory - creates appropriate service instances
 */
export class TopicServiceFactory {
  private static mapperInstance = new TopicMapper();
  private static validatorInstance = new TopicValidator();
  private static analysisInstance = new TopicAnalysisService(
    this.mapperInstance, 
    this.validatorInstance
  );

  /**
   * Get topic mapper instance
   */
  static getMapper(): TopicMapper {
    return this.mapperInstance;
  }

  /**
   * Get topic validator instance
   */
  static getValidator(): TopicValidator {
    return this.validatorInstance;
  }

  /**
   * Get topic analysis service instance
   */
  static getAnalysisService(): TopicAnalysisService {
    return this.analysisInstance;
  }

  /**
   * Create custom analysis service with custom mapper/validator
   */
  static createCustomAnalysisService(
    mapper?: TopicMapper,
    validator?: TopicValidator
  ): TopicAnalysisService {
    return new TopicAnalysisService(
      mapper || new TopicMapper(),
      validator || new TopicValidator()
    );
  }
}

/**
 * Utility functions for topic services
 */
export const TopicServiceUtils = {
  /**
   * Quick topic analysis using default service
   */
  analyzeQuick(data: any): import('../types/topics').TopicAnalysis {
    return TopicServiceFactory.getAnalysisService().analyzeTopics(data);
  },

  /**
   * Validate topics quickly
   */
  validateTopicsQuick(topics: MarketTopic[]): boolean {
    return TopicServiceFactory.getValidator().validateTopics(topics).valid;
  },

  /**
   * Map symbol to topics quickly
   */
  mapSymbolQuick(symbol: string): MarketTopic[] {
    return TopicServiceFactory.getMapper().mapSymbol(symbol);
  },

  /**
   * Check if topics are related quickly
   */
  areRelatedQuick(topic1: MarketTopic, topic2: MarketTopic): boolean {
    return TopicServiceFactory.getValidator().areTopicsRelated(topic1, topic2);
  }
};
