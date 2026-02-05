#!/usr/bin/env bun

/**
 * 🚀 Bun v1.3.1 Enhanced YAML Utilities
 * 
 * Leverages the latest Bun v1.3.1 YAML improvements:
 * - Ellipsis in double-quoted strings no longer cause document end errors
 * - Indicator characters are properly quoted in stringification
 * - Reliable round-trip operations for all YAML content
 */

import { YAML } from "bun";

export interface YamlUtilsV13Config {
    /** Enable performance monitoring for YAML operations */
    enablePerformanceMonitoring?: boolean;
    /** Cache parsed YAML for performance */
    enableCaching?: boolean;
    /** Maximum cache size */
    maxCacheSize?: number;
    /** Enable validation for round-trip operations */
    enableRoundTripValidation?: boolean;
}

export interface YamlParseResult<T = any> {
    /** Parsed data */
    data: T;
    /** Parse time in milliseconds */
    parseTime: number;
    /** Whether the result was cached */
    cached: boolean;
    /** Original YAML string */
    original: string;
    /** Whether the parse was successful */
    success: boolean;
}

export interface YamlStringifyResult {
    /** Stringified YAML */
    yaml: string;
    /** Stringify time in milliseconds */
    stringifyTime: number;
    /** Whether validation was performed */
    validated: boolean;
}

export interface YamlRoundTripResult<T = any> {
    /** Original data */
    original: T;
    /** Round-tripped data */
    roundTripped: T;
    /** Total time for round-trip operation */
    totalTime: number;
    /** Whether the round-trip was successful */
    success: boolean;
    /** Generated YAML */
    yaml: string;
}

/**
 * Enhanced YAML utility class leveraging Bun v1.3.1 improvements
 */
export class YamlUtilsV13 {
    private config: Required<YamlUtilsV13Config>;
    private cache = new Map<string, any>();
    private performanceMetrics = {
        parseCount: 0,
        stringifyCount: 0,
        roundTripCount: 0,
        totalParseTime: 0,
        totalStringifyTime: 0,
        totalRoundTripTime: 0,
        cacheHits: 0
    };

    constructor(config: YamlUtilsV13Config = {}) {
        this.config = {
            enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true,
            enableCaching: config.enableCaching ?? true,
            maxCacheSize: config.maxCacheSize ?? 1000,
            enableRoundTripValidation: config.enableRoundTripValidation ?? true
        };
    }

    /**
     * Parse YAML with enhanced error handling and caching
     */
    parse<T = any>(yaml: string): YamlParseResult<T> {
        const startTime = performance.now();

        // Check cache first
        if (this.config.enableCaching && this.cache.has(yaml)) {
            const data = this.cache.get(yaml);
            const parseTime = performance.now() - startTime;

            if (this.config.enablePerformanceMonitoring) {
                this.performanceMetrics.parseCount++;
                this.performanceMetrics.cacheHits++;
                this.performanceMetrics.totalParseTime += parseTime;
            }

            return {
                data,
                parseTime,
                cached: true,
                original: yaml,
                success: true
            };
        }

        try {
            // Parse using Bun v1.3.1 improved YAML parser
            const data = YAML.parse(yaml) as T;
            const parseTime = performance.now() - startTime;

            // Cache the result
            if (this.config.enableCaching) {
                this.cache.set(yaml, data);
                if (this.cache.size > this.config.maxCacheSize) {
                    // Remove oldest entry
                    const firstKey = this.cache.keys().next().value;
                    if (firstKey) {
                        this.cache.delete(firstKey);
                    }
                }
            }

            if (this.config.enablePerformanceMonitoring) {
                this.performanceMetrics.parseCount++;
                this.performanceMetrics.totalParseTime += parseTime;
            }

            return {
                data,
                parseTime,
                cached: false,
                original: yaml,
                success: true
            };
        } catch (error) {
            const parseTime = performance.now() - startTime;

            if (this.config.enablePerformanceMonitoring) {
                this.performanceMetrics.parseCount++;
                this.performanceMetrics.totalParseTime += parseTime;
            }

            throw new YamlParseError(
                `Failed to parse YAML: ${(error as Error).message}`,
                yaml,
                parseTime
            );
        }
    }

    /**
     * Stringify data to YAML with Bun v1.3.1 improvements
     */
    stringify(data: any): YamlStringifyResult {
        const startTime = performance.now();

        try {
            // Stringify using Bun v1.3.1 improved YAML stringifier
            const yaml = YAML.stringify(data);
            const stringifyTime = performance.now() - startTime;

            let validated = false;
            if (this.config.enableRoundTripValidation) {
                // Validate round-trip
                const reparsed = YAML.parse(yaml);
                validated = JSON.stringify(reparsed) === JSON.stringify(data);
            }

            if (this.config.enablePerformanceMonitoring) {
                this.performanceMetrics.stringifyCount++;
                this.performanceMetrics.totalStringifyTime += stringifyTime;
            }

            return {
                yaml,
                stringifyTime,
                validated
            };
        } catch (error) {
            const stringifyTime = performance.now() - startTime;

            if (this.config.enablePerformanceMonitoring) {
                this.performanceMetrics.stringifyCount++;
                this.performanceMetrics.totalStringifyTime += stringifyTime;
            }

            throw new YamlStringifyError(
                `Failed to stringify YAML: ${(error as Error).message}`,
                data,
                stringifyTime
            );
        }
    }

    /**
     * Perform a complete round-trip operation with validation
     */
    roundTrip<T = any>(data: T): YamlRoundTripResult<T> {
        const startTime = performance.now();

        try {
            // Stringify the data
            const { yaml } = this.stringify(data);

            // Parse it back
            const { data: roundTripped } = this.parse<T>(yaml);

            const totalTime = performance.now() - startTime;
            const success = JSON.stringify(roundTripped) === JSON.stringify(data);

            if (this.config.enablePerformanceMonitoring) {
                this.performanceMetrics.roundTripCount++;
                this.performanceMetrics.totalRoundTripTime += totalTime;
            }

            return {
                original: data,
                roundTripped,
                totalTime,
                success,
                yaml
            };
        } catch (error) {
            const totalTime = performance.now() - startTime;

            if (this.config.enablePerformanceMonitoring) {
                this.performanceMetrics.roundTripCount++;
                this.performanceMetrics.totalRoundTripTime += totalTime;
            }

            throw new YamlRoundTripError(
                `Round-trip failed: ${(error as Error).message}`,
                data,
                totalTime
            );
        }
    }

    /**
     * Test specific YAML v1.3.1 improvements
     */
    testV13Improvements(): {
        ellipsisSupport: boolean;
        indicatorCharacterQuoting: boolean;
        internationalContent: boolean;
        roundTripReliability: boolean;
    } {
        const results = {
            ellipsisSupport: false,
            indicatorCharacterQuoting: false,
            internationalContent: false,
            roundTripReliability: false
        };

        try {
            // Test 1: Ellipsis support
            const ellipsisYaml = 'message: "Loading..."';
            const ellipsisResult = this.parse(ellipsisYaml);
            results.ellipsisSupport = ellipsisResult.data.message === "Loading...";

            // Test 2: Indicator character quoting
            const indicatorData = { key: ":secret_value" };
            const indicatorResult = this.roundTrip(indicatorData);
            results.indicatorCharacterQuoting = indicatorResult.success;

            // Test 3: International content
            const internationalYaml = 'chinese: "更多内容..."';
            const internationalResult = this.parse(internationalYaml);
            results.internationalContent = internationalResult.data.chinese === "更多内容...";

            // Test 4: Complex round-trip reliability
            const complexData = {
                ui: {
                    loading: "加载中...",
                    error: "错误：无法连接..."
                },
                config: {
                    api_key: ":secret_123",
                    webhook: "#webhook_endpoint"
                },
                messages: [
                    "Processing data... 50%",
                    "git commit -m 'Fix...'"
                ]
            };
            const complexResult = this.roundTrip(complexData);
            results.roundTripReliability = complexResult.success;
        } catch (error) {
            console.error("Error testing v1.3.1 improvements:", error);
        }

        return results;
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.performanceMetrics,
            averageParseTime: this.performanceMetrics.parseCount > 0
                ? this.performanceMetrics.totalParseTime / this.performanceMetrics.parseCount
                : 0,
            averageStringifyTime: this.performanceMetrics.stringifyCount > 0
                ? this.performanceMetrics.totalStringifyTime / this.performanceMetrics.stringifyCount
                : 0,
            averageRoundTripTime: this.performanceMetrics.roundTripCount > 0
                ? this.performanceMetrics.totalRoundTripTime / this.performanceMetrics.roundTripCount
                : 0,
            cacheHitRate: this.performanceMetrics.parseCount > 0
                ? (this.performanceMetrics.cacheHits / this.performanceMetrics.parseCount) * 100
                : 0,
            cacheSize: this.cache.size
        };
    }

    /**
     * Clear cache and reset metrics
     */
    reset(): void {
        this.cache.clear();
        this.performanceMetrics = {
            parseCount: 0,
            stringifyCount: 0,
            roundTripCount: 0,
            totalParseTime: 0,
            totalStringifyTime: 0,
            totalRoundTripTime: 0,
            cacheHits: 0
        };
    }

    /**
     * Process configuration files with v1.3.1 improvements
     */
    async processConfig<T = any>(configPath: string): Promise<YamlParseResult<T>> {
        try {
            const yamlContent = await Bun.file(configPath).text();
            return this.parse<T>(yamlContent);
        } catch (error) {
            throw new Error(`Failed to process config file ${configPath}: ${(error as Error).message}`);
        }
    }

    /**
     * Save configuration with proper v1.3.1 stringification
     */
    saveConfig(configPath: string, data: any): YamlStringifyResult {
        try {
            const result = this.stringify(data);
            Bun.write(configPath, result.yaml);
            return result;
        } catch (error) {
            throw new Error(`Failed to save config file ${configPath}: ${(error as Error).message}`);
        }
    }
}

/**
 * Custom error classes for better error handling
 */
export class YamlParseError extends Error {
    constructor(
        message: string,
        public yaml: string,
        public parseTime: number
    ) {
        super(message);
        this.name = 'YamlParseError';
    }
}

export class YamlStringifyError extends Error {
    constructor(
        message: string,
        public data: any,
        public stringifyTime: number
    ) {
        super(message);
        this.name = 'YamlStringifyError';
    }
}

export class YamlRoundTripError extends Error {
    constructor(
        message: string,
        public data: any,
        public totalTime: number
    ) {
        super(message);
        this.name = 'YamlRoundTripError';
    }
}

/**
 * Default instance for immediate use
 */
export const yamlUtils = new YamlUtilsV13();

/**
 * Convenience functions for common operations
 */
export function parseYaml<T = any>(yaml: string): YamlParseResult<T> {
    return yamlUtils.parse<T>(yaml);
}

export function stringifyYaml(data: any): YamlStringifyResult {
    return yamlUtils.stringify(data);
}

export function roundTripYaml<T = any>(data: T): YamlRoundTripResult<T> {
    return yamlUtils.roundTrip<T>(data);
}

export function testYamlV13() {
    return yamlUtils.testV13Improvements();
}

export function getYamlMetrics() {
    return yamlUtils.getMetrics();
}
