// packages/odds-core/src/utils/metadata.ts - Metadata handling utilities

import type {
    EnhancedMetadata,
    DataSource,
    MarketContext,
    DataQuality,
    ProcessingMetadata,
    TopicAnalysis
} from '../types/topics';

import {
    MarketTopic,
    DataCategory
} from '../types/topics';

/**
 * Metadata builder class for creating enhanced metadata
 */
export class MetadataBuilder {
    private metadata: Partial<EnhancedMetadata> = {};

    constructor(id?: string) {
        if (id) {
            this.metadata.id = id;
        }
    }

    /**
     * Set basic identification
     */
    setId(id: string): MetadataBuilder {
        this.metadata.id = id;
        return this;
    }

    setVersion(version: string): MetadataBuilder {
        this.metadata.version = version;
        return this;
    }

    setTimestamp(timestamp?: number): MetadataBuilder {
        this.metadata.timestamp = timestamp || Date.now();
        return this;
    }

    /**
     * Set data source information
     */
    setSource(source: DataSource): MetadataBuilder {
        this.metadata.source = source;
        return this;
    }

    /**
     * Set market context
     */
    setMarket(market: MarketContext): MetadataBuilder {
        this.metadata.market = market;
        return this;
    }

    /**
     * Set classification
     */
    setTopics(topics: MarketTopic[]): MetadataBuilder {
        this.metadata.topics = topics;
        return this;
    }

    setCategory(category: DataCategory): MetadataBuilder {
        this.metadata.category = category;
        return this;
    }

    setTags(tags: string[]): MetadataBuilder {
        this.metadata.tags = tags;
        return this;
    }

    /**
     * Set quality metrics
     */
    setQuality(quality: DataQuality): MetadataBuilder {
        this.metadata.quality = quality;
        return this;
    }

    /**
     * Set processing metadata
     */
    setProcessing(processing: ProcessingMetadata): MetadataBuilder {
        this.metadata.processing = processing;
        return this;
    }

    /**
     * Set business context
     */
    setBusiness(business: EnhancedMetadata['business']): MetadataBuilder {
        this.metadata.business = business;
        return this;
    }

    /**
     * Set technical metadata
     */
    setTechnical(technical: EnhancedMetadata['technical']): MetadataBuilder {
        this.metadata.technical = technical;
        return this;
    }

    /**
     * Set relationships
     */
    setRelationships(relationships: EnhancedMetadata['relationships']): MetadataBuilder {
        this.metadata.relationships = relationships;
        return this;
    }

    /**
     * Build the final metadata
     */
    build(): EnhancedMetadata {
        // Set defaults for required fields
        const metadata: EnhancedMetadata = {
            id: this.metadata.id || this.generateId(),
            timestamp: this.metadata.timestamp || Date.now(),
            version: this.metadata.version || '1.0.0',
            source: this.metadata.source || this.createDefaultSource(),
            market: this.metadata.market || this.createDefaultMarket(),
            topics: this.metadata.topics || [],
            category: this.metadata.category || DataCategory.MARKET_DATA,
            tags: this.metadata.tags || [],
            quality: this.metadata.quality || this.createDefaultQuality(),
            processing: this.metadata.processing || this.createDefaultProcessing(),
            business: this.metadata.business || this.createDefaultBusiness(),
            technical: this.metadata.technical || this.createDefaultTechnical(),
            relationships: this.metadata.relationships || this.createDefaultRelationships()
        };

        return metadata;
    }

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
 * Topic analysis utilities
 */
export class TopicAnalyzer {
    /**
     * Analyze data to determine relevant topics
     */
    static analyzeTopics(data: any): TopicAnalysis {
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
     * Extract potential topics from data
     */
    private static extractTopics(data: any): MarketTopic[] {
        const topics: MarketTopic[] = [];

        // Extract from symbol
        if (data.symbol) {
            const symbolTopics = this.extractTopicsFromSymbol(data.symbol);
            topics.push(...symbolTopics);
        }

        // Extract from exchange
        if (data.exchange) {
            const exchangeTopics = this.extractTopicsFromExchange(data.exchange);
            topics.push(...exchangeTopics);
        }

        // Extract from other properties
        if (data.assetClass) {
            const assetTopics = this.extractTopicsFromAssetClass(data.assetClass);
            topics.push(...assetTopics);
        }

        return [...new Set(topics)]; // Remove duplicates
    }

    /**
     * Extract topics from symbol name
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
     * Extract topics from exchange name
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
     * Extract topics from asset class
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
     * Select primary topic from list of topics
     */
    private static selectPrimaryTopic(topics: MarketTopic[]): MarketTopic {
        if (topics.length === 0) {
            return MarketTopic.SPORTS_BASKETBALL; // Default fallback
        }

        // Simple heuristic: return the first topic
        // In a real implementation, this could be more sophisticated
        return topics[0]!; // Non-null assertion since we check length
    }

    /**
     * Calculate confidence in topic assignment
     */
    private static calculateTopicConfidence(data: any, topic: MarketTopic): number {
        // Simple confidence calculation based on data completeness
        let confidence = 0.5; // Base confidence

        if (data.symbol) confidence += 0.2;
        if (data.exchange) confidence += 0.1;
        if (data.price) confidence += 0.1;
        if (data.volume) confidence += 0.1;

        return Math.min(confidence, 1.0);
    }

    /**
     * Generate reasoning for topic assignment
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

/**
 * Quality assessment utilities
 */
export class QualityAssessor {
    /**
     * Assess data quality based on various metrics
     */
    static assessQuality(data: any): DataQuality {
        const completeness = this.assessCompleteness(data);
        const accuracy = this.assessAccuracy(data);
        const freshness = this.assessFreshness(data);
        const consistency = this.assessConsistency(data);
        const validity = this.assessValidity(data);

        const overall = (completeness + accuracy + freshness + consistency + validity) / 5;

        return {
            completeness,
            accuracy,
            freshness,
            consistency,
            validity,
            overall
        };
    }

    private static assessCompleteness(data: any): number {
        const requiredFields = ['symbol', 'price', 'timestamp'];
        const presentFields = requiredFields.filter(field => data[field] !== undefined && data[field] !== null);
        return presentFields.length / requiredFields.length;
    }

    private static assessAccuracy(data: any): number {
        // Simple accuracy assessment - in real implementation, this would be more sophisticated
        let accuracy = 0.8; // Base accuracy

        if (data.price && (data.price < 0 || !isFinite(data.price))) {
            accuracy -= 0.3;
        }
        if (data.size && (data.size < 0 || !isFinite(data.size))) {
            accuracy -= 0.2;
        }

        return Math.max(0, Math.min(1, accuracy));
    }

    private static assessFreshness(data: any): number {
        if (!data.timestamp) return 0;

        const now = Date.now();
        const age = (now - data.timestamp) / 1000; // Convert to seconds

        // Freshness decreases with age
        if (age < 1) return 1.0;
        if (age < 5) return 0.9;
        if (age < 30) return 0.7;
        if (age < 300) return 0.5;
        return 0.3;
    }

    private static assessConsistency(data: any): number {
        // Simple consistency check
        let consistency = 0.9;

        if (data.bid && data.ask && data.bid >= data.ask) {
            consistency -= 0.4; // Bid should be less than ask
        }

        return Math.max(0, consistency);
    }

    private static assessValidity(data: any): number {
        // Check for valid data types and ranges
        let validity = 0.9;

        if (data.price !== undefined && (typeof data.price !== 'number' || !isFinite(data.price))) {
            validity -= 0.5;
        }
        if (data.size !== undefined && (typeof data.size !== 'number' || !isFinite(data.size))) {
            validity -= 0.3;
        }

        return Math.max(0, validity);
    }
}

/**
 * Metadata validation utilities
 */
// Custom validation rule interfaces
export interface ValidationRule {
    readonly name: string;
    readonly description: string;
    readonly severity: 'error' | 'warning' | 'info';
    readonly validate: (metadata: EnhancedMetadata) => ValidationResult;
}

export interface ValidationSchema {
    readonly name: string;
    readonly version: string;
    readonly rules: ValidationRule[];
    readonly requiredFields?: string[];
    readonly optionalFields?: string[];
}

export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
    readonly info: string[];
}

export interface ValidationContext {
    readonly schema?: ValidationSchema;
    readonly customRules?: ValidationRule[];
    readonly strictMode?: boolean;
    readonly includeWarnings?: boolean;
}

export class MetadataValidator {
    private static customSchemas = new Map<string, ValidationSchema>();
    private static globalRules: ValidationRule[] = [];

    /**
     * Register a custom validation schema
     */
    static registerSchema(schema: ValidationSchema): void {
        this.customSchemas.set(schema.name, schema);
    }

    /**
     * Unregister a custom validation schema
     */
    static unregisterSchema(schemaName: string): void {
        this.customSchemas.delete(schemaName);
    }

    /**
     * Get all registered schemas
     */
    static getRegisteredSchemas(): ValidationSchema[] {
        return Array.from(this.customSchemas.values());
    }

    /**
     * Add a global validation rule (applies to all validations)
     */
    static addGlobalRule(rule: ValidationRule): void {
        this.globalRules.push(rule);
    }

    /**
     * Remove a global validation rule
     */
    static removeGlobalRule(ruleName: string): void {
        this.globalRules = this.globalRules.filter(rule => rule.name !== ruleName);
    }

    /**
     * Validate enhanced metadata structure (backward compatible)
     */
    static validate(metadata: EnhancedMetadata): { valid: boolean; errors: string[] } {
        const result = this.validateWithContext(metadata, {});
        return {
            valid: result.valid,
            errors: result.errors
        };
    }

    /**
     * Validate with custom context and rules
     */
    static validateWithContext(
        metadata: EnhancedMetadata,
        context: ValidationContext = {}
    ): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const info: string[] = [];

        // Default validation (backward compatibility)
        this.performDefaultValidation(metadata, errors, warnings);

        // Apply custom schema if provided
        if (context.schema) {
            this.applyCustomSchema(metadata, context.schema, errors, warnings, info);
        }

        // Apply global rules
        this.applyGlobalRules(metadata, errors, warnings, info);

        // Apply custom rules
        if (context.customRules) {
            this.applyCustomRules(metadata, context.customRules, errors, warnings, info);
        }

        // Filter results based on context
        const filteredResult = this.filterValidationResult(
            { valid: errors.length === 0, errors, warnings, info },
            context
        );

        return filteredResult;
    }

    /**
     * Validate using a specific registered schema
     */
    static validateWithSchema(
        metadata: EnhancedMetadata,
        schemaName: string,
        context: Omit<ValidationContext, 'schema'> = {}
    ): ValidationResult {
        const schema = this.customSchemas.get(schemaName);
        if (!schema) {
            throw new Error(`Schema '${schemaName}' not found. Available schemas: ${Array.from(this.customSchemas.keys()).join(', ')}`);
        }

        return this.validateWithContext(metadata, { ...context, schema });
    }

    /**
     * Validate topic assignment (enhanced with context)
     */
    static validateTopics(
        topics: MarketTopic[],
        context: { allowCustom?: boolean; customTopics?: string[] } = {}
    ): { valid: boolean; errors: string[]; warnings?: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        const validTopics = Object.values(MarketTopic);

        for (const topic of topics) {
            if (!validTopics.includes(topic)) {
                if (context.allowCustom && context.customTopics?.includes(topic)) {
                    warnings.push(`Using custom topic: ${topic}`);
                } else {
                    errors.push(`Invalid topic: ${topic}`);
                }
            }
        }

        const result: { valid: boolean; errors: string[]; warnings?: string[] } = {
            valid: errors.length === 0,
            errors
        };

        if (warnings.length > 0) {
            result.warnings = warnings;
        }

        return result;
    }

    /**
     * Create a custom validation rule
     */
    static createRule(
        name: string,
        description: string,
        validator: (metadata: EnhancedMetadata) => { valid: boolean; message: string; severity?: 'error' | 'warning' | 'info' },
        severity: 'error' | 'warning' | 'info' = 'error'
    ): ValidationRule {
        return {
            name,
            description,
            severity,
            validate: (metadata) => {
                const result = validator(metadata);
                return {
                    valid: result.valid,
                    errors: result.valid ? [] : [result.message],
                    warnings: result.severity === 'warning' && !result.valid ? [result.message] : [],
                    info: result.severity === 'info' && !result.valid ? [result.message] : []
                };
            }
        };
    }

    /**
     * Create a custom validation schema
     */
    static createSchema(
        name: string,
        version: string,
        rules: ValidationRule[],
        requiredFields?: string[],
        optionalFields?: string[]
    ): ValidationSchema {
        return {
            name,
            version,
            rules,
            requiredFields,
            optionalFields
        };
    }

    /**
     * Validate specific field
     */
    static validateField(
        metadata: EnhancedMetadata,
        fieldName: string,
        customValidator?: (value: any) => { valid: boolean; message: string }
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const value = (metadata as any)[fieldName];

        // Check if field exists
        if (value === undefined || value === null) {
            errors.push(`Missing required field: ${fieldName}`);
            return { valid: false, errors };
        }

        // Apply custom validator if provided
        if (customValidator) {
            const result = customValidator(value);
            if (!result.valid) {
                errors.push(`${fieldName}: ${result.message}`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Batch validate multiple metadata objects
     */
    static validateBatch(
        metadataArray: EnhancedMetadata[],
        context: ValidationContext = {}
    ): Array<{ metadata: EnhancedMetadata; result: ValidationResult; index: number }> {
        return metadataArray.map((metadata, index) => ({
            metadata,
            result: this.validateWithContext(metadata, context),
            index
        }));
    }

    /**
     * Get validation summary statistics
     */
    static getValidationSummary(results: ValidationResult[]): {
        total: number;
        valid: number;
        invalid: number;
        totalErrors: number;
        totalWarnings: number;
        totalInfo: number;
        errorRate: number;
        warningRate: number;
    } {
        const total = results.length;
        const valid = results.filter(r => r.valid).length;
        const invalid = total - valid;
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
        const totalInfo = results.reduce((sum, r) => sum + r.info.length, 0);

        return {
            total,
            valid,
            invalid,
            totalErrors,
            totalWarnings,
            totalInfo,
            errorRate: total > 0 ? invalid / total : 0,
            warningRate: total > 0 ? totalWarnings / total : 0
        };
    }

    // ===== PRIVATE METHODS =====

    private static performDefaultValidation(
        metadata: EnhancedMetadata,
        errors: string[],
        warnings: string[]
    ): void {
        // Required fields (original validation logic)
        const requiredFields = [
            'id', 'timestamp', 'version', 'source', 'market', 'topics',
            'category', 'quality', 'processing', 'business', 'technical', 'relationships'
        ];

        for (const field of requiredFields) {
            if (!(metadata as any)[field]) {
                errors.push(`Missing ${field}`);
            }
        }

        // Field validation (original logic)
        if (metadata.topics && !Array.isArray(metadata.topics)) {
            errors.push('Topics must be an array');
        }
        if (metadata.tags && !Array.isArray(metadata.tags)) {
            errors.push('Tags must be an array');
        }
        if (metadata.quality && (metadata.quality.overall < 0 || metadata.quality.overall > 1)) {
            errors.push('Quality overall score must be between 0 and 1');
        }
    }

    private static applyCustomSchema(
        metadata: EnhancedMetadata,
        schema: ValidationSchema,
        errors: string[],
        warnings: string[],
        info: string[]
    ): void {
        // Check required fields for schema
        if (schema.requiredFields) {
            for (const field of schema.requiredFields) {
                if (!(metadata as any)[field]) {
                    errors.push(`Schema required field missing: ${field}`);
                }
            }
        }

        // Apply schema rules
        for (const rule of schema.rules) {
            const result = rule.validate(metadata);
            errors.push(...result.errors);
            warnings.push(...result.warnings);
            info.push(...result.info);
        }
    }

    private static applyGlobalRules(
        metadata: EnhancedMetadata,
        errors: string[],
        warnings: string[],
        info: string[]
    ): void {
        for (const rule of this.globalRules) {
            const result = rule.validate(metadata);
            errors.push(...result.errors);
            warnings.push(...result.warnings);
            info.push(...result.info);
        }
    }

    private static applyCustomRules(
        metadata: EnhancedMetadata,
        customRules: ValidationRule[],
        errors: string[],
        warnings: string[],
        info: string[]
    ): void {
        for (const rule of customRules) {
            const result = rule.validate(metadata);
            errors.push(...result.errors);
            warnings.push(...result.warnings);
            info.push(...result.info);
        }
    }

    private static filterValidationResult(
        result: ValidationResult,
        context: ValidationContext
    ): ValidationResult {
        if (context.strictMode) {
            // In strict mode, warnings are treated as errors
            const strictErrors = [...result.errors, ...result.warnings];
            return {
                valid: strictErrors.length === 0,
                errors: strictErrors,
                warnings: [],
                info: context.includeWarnings ? result.info : []
            };
        }

        if (!context.includeWarnings) {
            return {
                ...result,
                warnings: []
            };
        }

        return result;
    }
}

/**
 * Utility functions for metadata operations
 */
export const MetadataUtils = {
    /**
     * Create a deep copy of metadata
     */
    clone(metadata: EnhancedMetadata): EnhancedMetadata {
        return JSON.parse(JSON.stringify(metadata));
    },

    /**
     * Merge two metadata objects
     */
    merge(base: EnhancedMetadata, update: Partial<EnhancedMetadata>): EnhancedMetadata {
        return {
            ...base,
            ...update,
            source: { ...base.source, ...update.source },
            market: { ...base.market, ...update.market },
            quality: { ...base.quality, ...update.quality },
            processing: { ...base.processing, ...update.processing },
            business: { ...base.business, ...update.business },
            technical: { ...base.technical, ...update.technical },
            relationships: { ...base.relationships, ...update.relationships }
        };
    },

    /**
     * Update metadata timestamp
     */
    updateTimestamp(metadata: EnhancedMetadata): EnhancedMetadata {
        return {
            ...metadata,
            timestamp: Date.now()
        };
    },

    /**
     * Add topics to metadata
     */
    addTopics(metadata: EnhancedMetadata, topics: MarketTopic[]): EnhancedMetadata {
        const existingTopics = new Set(metadata.topics);
        const newTopics = topics.filter(topic => !existingTopics.has(topic));

        return {
            ...metadata,
            topics: [...metadata.topics, ...newTopics]
        };
    },

    /**
     * Remove topics from metadata
     */
    removeTopics(metadata: EnhancedMetadata, topicsToRemove: MarketTopic[]): EnhancedMetadata {
        return {
            ...metadata,
            topics: metadata.topics.filter(topic => !topicsToRemove.includes(topic))
        };
    }
};
