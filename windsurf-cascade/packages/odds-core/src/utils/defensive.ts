// packages/odds-core/src/utils/defensive.ts - Defensive programming patterns for metadata system

import type { MarketTopic, DataCategory, EnhancedMetadata, DataQuality } from '../types/topics';
import { MetadataErrorFactory, MetadataErrorHandler } from '../errors/metadata-errors';

/**
 * Defensive programming utilities for safe metadata operations
 * 
 * This module provides defensive patterns to handle edge cases,
 * invalid inputs, and unexpected conditions gracefully.
 */

/**
 * Safe type checking with detailed error information
 */
export class SafeTypeChecker {
  /**
   * Safely checks if a value is a valid string
   */
  static isString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  /**
   * Safely checks if a value is a valid number
   */
  static isNumber(value: unknown): value is number {
    return typeof value === 'number' && isFinite(value) && !isNaN(value);
  }

  /**
   * Safely checks if a value is a positive number
   */
  static isPositiveNumber(value: unknown): value is number {
    return this.isNumber(value) && value > 0;
  }

  /**
   * Safely checks if a value is a percentage (0-1)
   */
  static isPercentage(value: unknown): value is number {
    return this.isNumber(value) && value >= 0 && value <= 1;
  }

  /**
   * Safely checks if a value is a valid timestamp
   */
  static isTimestamp(value: unknown): value is number {
    if (!this.isNumber(value) || value < 0) return false;
    
    // Check if timestamp is reasonable (within 50 years)
    const now = Date.now();
    const fiftyYearsAgo = now - (50 * 365 * 24 * 60 * 60 * 1000);
    const fiftyYearsFromNow = now + (50 * 365 * 24 * 60 * 60 * 1000);
    
    return value >= fiftyYearsAgo && value <= fiftyYearsFromNow;
  }

  /**
   * Safely checks if a value is a valid array
   */
  static isArray<T>(value: unknown, itemValidator?: (item: unknown) => item is T): value is T[] {
    if (!Array.isArray(value)) return false;
    
    if (itemValidator) {
      return value.every(itemValidator);
    }
    
    return true;
  }

  /**
   * Safely checks if a value is a valid object
   */
  static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Safely checks if a value is a valid MarketTopic
   */
  static isMarketTopic(value: unknown): value is MarketTopic {
    return typeof value === 'string' && Object.values(MarketTopic).includes(value as MarketTopic);
  }

  /**
   * Safely checks if a value is a valid DataCategory
   */
  static isDataCategory(value: unknown): value is DataCategory {
    return typeof value === 'string' && Object.values(DataCategory).includes(value as DataCategory);
  }
}

/**
 * Safe property access with fallbacks
 */
export class SafePropertyAccess {
  /**
   * Safely gets a property from an object with type checking
   */
  static getProperty<T>(
    obj: unknown, 
    key: string, 
    typeGuard: (value: unknown) => value is T,
    fallback: T
  ): T {
    if (!SafeTypeChecker.isObject(obj)) {
      return fallback;
    }

    const value = obj[key];
    return typeGuard(value) ? value : fallback;
  }

  /**
   * Safely gets a string property
   */
  static getString(obj: unknown, key: string, fallback: string = ''): string {
    return this.getProperty(obj, key, SafeTypeChecker.isString, fallback);
  }

  /**
   * Safely gets a number property
   */
  static getNumber(obj: unknown, key: string, fallback: number = 0): number {
    return this.getProperty(obj, key, SafeTypeChecker.isNumber, fallback);
  }

  /**
   * Safely gets a positive number property
   */
  static getPositiveNumber(obj: unknown, key: string, fallback: number = 1): number {
    return this.getProperty(obj, key, SafeTypeChecker.isPositiveNumber, fallback);
  }

  /**
   * Safely gets a percentage property
   */
  static getPercentage(obj: unknown, key: string, fallback: number = 0.5): number {
    return this.getProperty(obj, key, SafeTypeChecker.isPercentage, fallback);
  }

  /**
   * Safely gets a timestamp property
   */
  static getTimestamp(obj: unknown, key: string, fallback: number = Date.now()): number {
    return this.getProperty(obj, key, SafeTypeChecker.isTimestamp, fallback);
  }

  /**
   * Safely gets an array property
   */
  static getArray<T>(obj: unknown, key: string, itemValidator?: (value: unknown) => value is T, fallback: T[] = []): T[] {
    if (!SafeTypeChecker.isObject(obj)) {
      return fallback;
    }

    const value = obj[key];
    return SafeTypeChecker.isArray(value, itemValidator) ? value : fallback;
  }

  /**
   * Safely gets a MarketTopic property
   */
  static getMarketTopic(obj: unknown, key: string, fallback: MarketTopic = MarketTopic.MARKET_DATA): MarketTopic {
    return this.getProperty(obj, key, SafeTypeChecker.isMarketTopic, fallback);
  }

  /**
   * Safely gets a DataCategory property
   */
  static getDataCategory(obj: unknown, key: string, fallback: DataCategory = DataCategory.MARKET_DATA): DataCategory {
    return this.getProperty(obj, key, SafeTypeChecker.isDataCategory, fallback);
  }
}

/**
 * Safe array operations with bounds checking
 */
export class SafeArrayOperations {
  /**
   * Safely gets an item from an array with bounds checking
   */
  static getItem<T>(array: unknown, index: number, fallback: T): T {
    if (!Array.isArray(array) || index < 0 || index >= array.length) {
      return fallback;
    }
    return array[index] as T;
  }

  /**
   * Safely gets the first item from an array
   */
  static getFirst<T>(array: unknown, fallback: T): T {
    return this.getItem(array, 0, fallback);
  }

  /**
   * Safely gets the last item from an array
   */
  static getLast<T>(array: unknown, fallback: T): T {
    if (!Array.isArray(array) || array.length === 0) {
      return fallback;
    }
    return array[array.length - 1] as T;
  }

  /**
   * Safely slices an array with bounds checking
   */
  static slice<T>(array: unknown, start: number, end?: number): T[] {
    if (!Array.isArray(array)) {
      return [];
    }

    const safeStart = Math.max(0, Math.min(start, array.length));
    const safeEnd = end !== undefined ? Math.max(safeStart, Math.min(end, array.length)) : array.length;

    return array.slice(safeStart, safeEnd) as T[];
  }

  /**
   * Safely maps an array with error handling
   */
  static safeMap<T, R>(
    array: unknown, 
    mapper: (item: T, index: number) => R, 
    fallback: R[] = []
  ): R[] {
    if (!Array.isArray(array)) {
      return fallback;
    }

    try {
      return array.map((item, index) => mapper(item as T, index));
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'safeMap' })
      );
      return fallback;
    }
  }

  /**
   * Safely filters an array with error handling
   */
  static safeFilter<T>(
    array: unknown, 
    predicate: (item: T, index: number) => boolean, 
    fallback: T[] = []
  ): T[] {
    if (!Array.isArray(array)) {
      return fallback;
    }

    try {
      return array.filter((item, index) => predicate(item as T, index)) as T[];
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'safeFilter' })
      );
      return fallback;
    }
  }
}

/**
 * Safe string operations with validation
 */
export class SafeStringOperations {
  /**
   * Safely trims a string with null/undefined handling
   */
  static trim(value: unknown, fallback: string = ''): string {
    if (value === null || value === undefined) {
      return fallback;
    }
    
    const str = String(value);
    return str.trim();
  }

  /**
   * Safely converts a value to uppercase with validation
   */
  static toUpperCase(value: unknown, fallback: string = ''): string {
    return this.trim(value, fallback).toUpperCase();
  }

  /**
   * Safely converts a value to lowercase with validation
   */
  static toLowerCase(value: unknown, fallback: string = ''): string {
    return this.trim(value, fallback).toLowerCase();
  }

  /**
   * Safely checks if a string contains a substring
   */
  static contains(value: unknown, search: string, caseSensitive: boolean = false): boolean {
    const str = this.trim(value);
    const searchStr = this.trim(search);
    
    if (str.length === 0 || searchStr.length === 0) {
      return false;
    }

    return caseSensitive 
      ? str.includes(searchStr)
      : str.toLowerCase().includes(searchStr.toLowerCase());
  }

  /**
   * Safely splits a string with validation
   */
  static split(value: unknown, separator: string, fallback: string[] = []): string[] {
    const str = this.trim(value);
    
    if (str.length === 0) {
      return fallback;
    }

    try {
      return str.split(separator);
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'split', value, separator })
      );
      return fallback;
    }
  }

  /**
   * Safely extracts a substring with bounds checking
   */
  static substring(value: unknown, start: number, end?: number, fallback: string = ''): string {
    const str = this.trim(value, fallback);
    
    if (str.length === 0) {
      return fallback;
    }

    try {
      const safeStart = Math.max(0, Math.min(start, str.length));
      const safeEnd = end !== undefined ? Math.max(safeStart, Math.min(end, str.length)) : str.length;
      return str.substring(safeStart, safeEnd);
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'substring', value, start, end })
      );
      return fallback;
    }
  }
}

/**
 * Safe mathematical operations with overflow checking
 */
export class SafeMathOperations {
  /**
   * Safely adds two numbers with overflow checking
   */
  static add(a: unknown, b: unknown, fallback: number = 0): number {
    const numA = SafeTypeChecker.isNumber(a) ? a : fallback;
    const numB = SafeTypeChecker.isNumber(b) ? b : fallback;

    try {
      const result = numA + numB;
      
      // Check for overflow
      if (!isFinite(result)) {
        throw new Error('Mathematical overflow in addition');
      }
      
      return result;
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'add', a, b })
      );
      return fallback;
    }
  }

  /**
   * Safely multiplies two numbers with overflow checking
   */
  static multiply(a: unknown, b: unknown, fallback: number = 0): number {
    const numA = SafeTypeChecker.isNumber(a) ? a : fallback;
    const numB = SafeTypeChecker.isNumber(b) ? b : fallback;

    try {
      const result = numA * numB;
      
      // Check for overflow
      if (!isFinite(result)) {
        throw new Error('Mathematical overflow in multiplication');
      }
      
      return result;
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'multiply', a, b })
      );
      return fallback;
    }
  }

  /**
   * Safely divides two numbers with zero division checking
   */
  static divide(a: unknown, b: unknown, fallback: number = 0): number {
    const numA = SafeTypeChecker.isNumber(a) ? a : fallback;
    const numB = SafeTypeChecker.isNumber(b) ? b : fallback;

    try {
      if (numB === 0) {
        throw new Error('Division by zero');
      }
      
      const result = numA / numB;
      
      // Check for overflow
      if (!isFinite(result)) {
        throw new Error('Mathematical overflow in division');
      }
      
      return result;
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'divide', a, b })
      );
      return fallback;
    }
  }

  /**
   * Safely calculates the average of an array
   */
  static average(values: unknown, fallback: number = 0): number {
    if (!Array.isArray(values) || values.length === 0) {
      return fallback;
    }

    const numbers = values.filter(SafeTypeChecker.isNumber);
    
    if (numbers.length === 0) {
      return fallback;
    }

    const sum = numbers.reduce((acc, val) => this.add(acc, val, 0), 0);
    return this.divide(sum, numbers.length, fallback);
  }

  /**
   * Safely finds the minimum value in an array
   */
  static min(values: unknown, fallback: number = 0): number {
    if (!Array.isArray(values) || values.length === 0) {
      return fallback;
    }

    const numbers = values.filter(SafeTypeChecker.isNumber);
    
    if (numbers.length === 0) {
      return fallback;
    }

    return Math.min(...numbers);
  }

  /**
   * Safely finds the maximum value in an array
   */
  static max(values: unknown, fallback: number = 0): number {
    if (!Array.isArray(values) || values.length === 0) {
      return fallback;
    }

    const numbers = values.filter(SafeTypeChecker.isNumber);
    
    if (numbers.length === 0) {
      return fallback;
    }

    return Math.max(...numbers);
  }
}

/**
 * Safe object operations with deep validation
 */
export class SafeObjectOperations {
  /**
   * Safely clones an object with circular reference protection
   */
  static clone<T>(obj: unknown, fallback: T): T {
    if (obj === null || typeof obj !== 'object') {
      return fallback;
    }

    try {
      // Handle Date objects
      if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T;
      }

      // Handle Array objects
      if (Array.isArray(obj)) {
        return obj.map(item => this.clone(item, item)) as unknown as T;
      }

      // Handle plain objects
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.clone(obj[key], obj[key]);
        }
      }

      return cloned;
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'clone' })
      );
      return fallback;
    }
  }

  /**
   * Safely merges two objects with conflict resolution
   */
  static merge<T extends Record<string, unknown>>(
    base: unknown, 
    update: unknown, 
    fallback: T,
    strategy: 'overwrite' | 'preserve' | 'merge' = 'overwrite'
  ): T {
    if (!SafeTypeChecker.isObject(base) || !SafeTypeChecker.isObject(update)) {
      return fallback;
    }

    try {
      const result = { ...base };

      for (const key in update) {
        if (update.hasOwnProperty(key)) {
          const baseValue = result[key];
          const updateValue = update[key];

          switch (strategy) {
            case 'overwrite':
              result[key] = updateValue;
              break;
            
            case 'preserve':
              if (baseValue === undefined) {
                result[key] = updateValue;
              }
              break;
            
            case 'merge':
              if (SafeTypeChecker.isObject(baseValue) && SafeTypeChecker.isObject(updateValue)) {
                result[key] = this.merge(baseValue, updateValue, {}, strategy);
              } else {
                result[key] = updateValue;
              }
              break;
          }
        }
      }

      return result as T;
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'merge', strategy })
      );
      return fallback;
    }
  }

  /**
   * Safely checks if an object has a property
   */
  static hasProperty(obj: unknown, key: string): boolean {
    return SafeTypeChecker.isObject(obj) && key in obj;
  }

  /**
   * Safely gets the keys of an object
   */
  static getKeys(obj: unknown): string[] {
    if (!SafeTypeChecker.isObject(obj)) {
      return [];
    }

    try {
      return Object.keys(obj);
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'getKeys' })
      );
      return [];
    }
  }
}

/**
 * Comprehensive defensive wrapper for metadata operations
 */
export class DefensiveMetadataWrapper {
  /**
   * Safely creates metadata with full validation
   */
  static safeCreateMetadata(data: unknown, fallback: EnhancedMetadata): EnhancedMetadata {
    try {
      if (!SafeTypeChecker.isObject(data)) {
        throw new Error('Data must be an object');
      }

      // Validate required fields with safe property access
      const id = SafePropertyAccess.getString(data, 'id', `auto_${Date.now()}`);
      const timestamp = SafePropertyAccess.getTimestamp(data, 'timestamp', Date.now());
      const version = SafePropertyAccess.getString(data, 'version', '1.0.0');

      // Validate topics safely
      const topics = SafePropertyAccess.getArray(
        data, 
        'topics', 
        SafeTypeChecker.isMarketTopic, 
        [MarketTopic.MARKET_DATA]
      );

      // Validate category safely
      const category = SafePropertyAccess.getDataCategory(
        data, 
        'category', 
        DataCategory.MARKET_DATA
      );

      // Create minimal valid metadata
      return {
        id,
        timestamp,
        version,
        source: SafePropertyAccess.getProperty(
          data, 
          'source', 
          SafeTypeChecker.isObject, 
          {
            provider: 'unknown',
            feed: 'default',
            latency: 0,
            reliability: 0.5,
            lastUpdate: timestamp,
            updateFrequency: 1000
          }
        ) as any,
        market: SafePropertyAccess.getProperty(
          data, 
          'market', 
          SafeTypeChecker.isObject, 
          {
            session: 'regular',
            liquidity: 'medium',
            volatility: 'medium',
            timeZone: 'UTC',
            marketHours: {
              open: '09:30',
              close: '16:00',
              currentStatus: 'closed'
            },
            relatedMarkets: [],
            correlatedSymbols: []
          }
        ) as any,
        topics,
        category,
        tags: SafePropertyAccess.getArray(data, 'tags', SafeTypeChecker.isString, []),
        quality: SafePropertyAccess.getProperty(
          data, 
          'quality', 
          SafeTypeChecker.isObject, 
          {
            completeness: 0.5,
            accuracy: 0.5,
            freshness: 0,
            consistency: 0.5,
            validity: 0.5,
            overall: 0.5
          }
        ) as any,
        processing: SafePropertyAccess.getProperty(
          data, 
          'processing', 
          SafeTypeChecker.isObject, 
          {
            pipeline: [],
            enrichments: [],
            transformations: [],
            validation: [],
            processingTime: 0,
            version: '1.0.0'
          }
        ) as any,
        business: SafePropertyAccess.getProperty(
          data, 
          'business', 
          SafeTypeChecker.isObject, 
          {
            priority: 'medium',
            retention: 30,
            compliance: [],
            sensitivity: 'internal'
          }
        ) as any,
        technical: SafePropertyAccess.getProperty(
          data, 
          'technical', 
          SafeTypeChecker.isObject, 
          {
            schema: 'unknown',
            encoding: 'utf-8',
            compression: 'none',
            size: 0,
            checksum: ''
          }
        ) as any,
        relationships: SafePropertyAccess.getProperty(
          data, 
          'relationships', 
          SafeTypeChecker.isObject, 
          {
            childIds: [],
            relatedIds: [],
            dependencies: []
          }
        ) as any
      };
    } catch (error) {
      MetadataErrorHandler.handle(
        MetadataErrorFactory.fromUnknown(error, { operation: 'safeCreateMetadata' })
      );
      return fallback;
    }
  }

  /**
   * Safely updates metadata with conflict resolution
   */
  static safeUpdateMetadata(
    existing: unknown, 
    updates: unknown, 
    fallback: EnhancedMetadata
  ): EnhancedMetadata {
    const existingMetadata = this.safeCreateMetadata(existing, fallback);
    const updatesMetadata = SafeTypeChecker.isObject(updates) ? updates : {};

    return SafeObjectOperations.merge(
      existingMetadata,
      updatesMetadata,
      fallback,
      'overwrite'
    );
  }
}
