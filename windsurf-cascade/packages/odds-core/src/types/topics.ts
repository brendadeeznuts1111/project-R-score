// packages/odds-core/src/types/topics.ts - Topics and metadata type definitions

/**
 * Market topic enumeration for systematic categorization
 * Uses hierarchical dot notation for better organization
 */
export enum MarketTopic {
    // Sports Markets
    SPORTS_BASKETBALL = 'sports.basketball',
    SPORTS_FOOTBALL = 'sports.football',
    SPORTS_BASEBALL = 'sports.baseball',
    SPORTS_HOCKEY = 'sports.hockey',
    SPORTS_SOCCER = 'sports.soccer',
    SPORTS_TENNIS = 'sports.tennis',
    SPORTS_GOLF = 'sports.golf',
    SPORTS_MMA = 'sports.mma',
    SPORTS_BOXING = 'sports.boxing',
    SPORTS_AUTO_RACING = 'sports.auto_racing',

    // Cryptocurrency Markets
    CRYPTO_SPOT = 'crypto.spot',
    CRYPTO_DERIVATIVES = 'crypto.derivatives',
    CRYPTO_DEFI = 'crypto.defi',
    CRYPTO_NFT = 'crypto.nft',
    CRYPTO_STAKING = 'crypto.staking',

    // Equities Markets
    EQUITIES_US = 'equities.us',
    EQUITIES_GLOBAL = 'equities.global',
    EQUITIES_ETFS = 'equities.etfs',
    EQUITIES_OPTIONS = 'equities.options',
    EQUITIES_FUTURES = 'equities.futures',

    // Foreign Exchange
    FOREX_MAJOR = 'forex.major',
    FOREX_MINOR = 'forex.minor',
    FOREX_EXOTIC = 'forex.exotic',
    FOREX_CROSS = 'forex.cross',

    // Commodities
    COMMODITY_ENERGY = 'commodity.energy',
    COMMODITY_METALS = 'commodity.metals',
    COMMODITY_AGRICULTURE = 'commodity.agriculture',
    COMMODITY_LIVESTOCK = 'commodity.livestock',

    // Fixed Income
    FIXED_INCOME_GOVT = 'fixed_income.government',
    FIXED_INCOME_CORPORATE = 'fixed_income.corporate',
    FIXED_INCOME_MUNICIPAL = 'fixed_income.municipal',
    FIXED_INCOME_MBS = 'fixed_income.mbs',

    // Alternative Data
    ALT_DATA_NEWS = 'alt_data.news',
    ALT_DATA_SENTIMENT = 'alt_data.sentiment',
    ALT_DATA_SOCIAL = 'alt_data.social',
    ALT_DATA_WEATHER = 'alt_data.weather',
    ALT_DATA_ECONOMIC = 'alt_data.economic'
}

/**
 * Data category enumeration for type classification
 */
export enum DataCategory {
    MARKET_DATA = 'market_data',
    SIGNALS = 'signals',
    ARBITRAGE = 'arbitrage',
    RISK = 'risk',
    PERFORMANCE = 'performance',
    NEWS = 'news',
    SENTIMENT = 'sentiment',
    WEATHER = 'weather',
    ECONOMIC = 'economic',
    SOCIAL = 'social',
    TECHNICAL = 'technical',
    FUNDAMENTAL = 'fundamental'
}

/**
 * Market session enumeration
 */
export enum MarketSession {
    PRE_MARKET = 'pre_market',
    REGULAR = 'regular',
    AFTER_HOURS = 'after_hours',
    CLOSED = 'closed',
    WEEKEND = 'weekend',
    HOLIDAY = 'holiday'
}

/**
 * Liquidity level enumeration
 */
export enum LiquidityLevel {
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
    VERY_LOW = 'very_low'
}

/**
 * Volatility level enumeration
 */
export enum VolatilityLevel {
    EXTREME = 'extreme',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
    VERY_LOW = 'very_low'
}

/**
 * Data source information
 */
export interface DataSource {
    id: string;
    provider: string;
    feed: string;
    endpoint?: string;
    latency: number; // in milliseconds
    reliability: number; // 0-1 score
    lastUpdate: number; // timestamp
    updateFrequency: number; // in milliseconds
    name?: string;
    type: string;
    cost: number;
}

/**
 * Market context information
 */
export interface MarketContext {
    session: MarketSession;
    liquidity: LiquidityLevel;
    volatility: VolatilityLevel;
    timeZone: string;
    name?: string;
    marketHours: {
        open: string;
        close: string;
        currentStatus: 'open' | 'closed' | 'pre_open' | 'post_close';
    };
    relatedMarkets: string[];
    correlatedSymbols: string[];
}

/**
 * Data quality metrics
 */
export interface DataQuality {
    completeness: number; // 0-1 score
    accuracy: number; // 0-1 score
    freshness: number; // seconds ago
    consistency: number; // 0-1 score
    validity: number; // 0-1 score
    overall: number; // 0-1 aggregated score
    score?: number;
}

/**
 * Processing pipeline metadata
 */
export interface ProcessingMetadata {
    pipeline: string[];
    enrichments: string[];
    transformations: string[];
    validation: string[];
    processingTime: number; // in milliseconds
    version: string;
}

/**
 * Enhanced metadata schema for comprehensive data tracking
 */
export interface EnhancedMetadata {
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
        retention: number; // in days
        compliance: string[];
        sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
    };

    // Technical metadata
    technical: {
        schema: string;
        encoding: string;
        compression: string;
        size: number; // in bytes
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

/**
 * Topic analysis result
 */
export interface TopicAnalysis {
    primaryTopic: MarketTopic;
    secondaryTopics: MarketTopic[];
    confidence: number; // 0-1
    reasoning: string;
    detectedAt: number;
}

/**
 * Topic trend information
 */
export interface TopicTrend {
    topic: MarketTopic;
    direction: 'rising' | 'falling' | 'stable';
    magnitude: number; // 0-1
    volume: number;
    change: number; // percentage change
    timeframe: string;
}

/**
 * Topic correlation data
 */
export interface TopicCorrelation {
    topic1: MarketTopic;
    topic2: MarketTopic;
    correlation: number; // -1 to 1
    significance: number; // 0-1 p-value
    timeframe: string;
}

/**
 * Topic metadata for tracking and analytics
 */
export interface TopicMetadata {
    topic: MarketTopic;
    firstSeen: number;
    lastSeen: number;
    frequency: number;
    avgConfidence: number;
    totalOccurrences: number;
    relatedTopics: MarketTopic[];
    tags: string[];
}

/**
 * Helper function to get topic hierarchy
 */
export function getTopicHierarchy(topic: MarketTopic): string[] {
    return topic.split('.');
}

/**
 * Helper function to get topic category
 */
export function getTopicCategory(topic: MarketTopic): string {
    return topic.split('.')[0]!;
}

/**
 * Helper function to get topic subcategory
 */
export function getTopicSubcategory(topic: MarketTopic): string | null {
    const parts = topic.split('.');
    return parts.length > 1 ? parts[1]! : null;
}

/**
 * Helper function to check if topics are related
 */
export function areTopicsRelated(topic1: MarketTopic, topic2: MarketTopic): boolean {
    const category1 = getTopicCategory(topic1);
    const category2 = getTopicCategory(topic2);
    return category1 === category2;
}

/**
 * Helper function to get all topics in a category
 */
export function getTopicsInCategory(category: string): MarketTopic[] {
    return Object.values(MarketTopic).filter(topic =>
        getTopicCategory(topic) === category
    );
}
