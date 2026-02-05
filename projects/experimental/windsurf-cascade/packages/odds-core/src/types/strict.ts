// packages/odds-core/src/types/strict.ts - Stricter TypeScript types and constraints

import type { MarketTopic, DataCategory, MarketSession, LiquidityLevel, VolatilityLevel } from './topics';

/**
 * Branded types with validation
 */
export type StrictTopicId = string & { readonly __brand: 'TopicId' };
export type StrictMetadataId = string & { readonly __brand: 'MetadataId' };
export type StrictSymbolId = string & { readonly __brand: 'SymbolId' };
export type StrictExchangeId = string & { readonly __brand: 'ExchangeId' };

/**
 * Non-nullable and stricter basic types
 */
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' };
export type PositiveNumber = number & { readonly __brand: 'PositiveNumber' };
export type Percentage = number & { readonly __brand: 'Percentage' }; // 0-1
export type TimestampMs = number & { readonly __brand: 'TimestampMs' };
export type LatencyMs = number & { readonly __brand: 'LatencyMs' };

/**
 * Array types with minimum length constraints
 */
export type NonEmptyArray<T> = [T, ...T[]];
export type TopicArray = NonEmptyArray<MarketTopic>;
export type StringArray = NonEmptyArray<string>;

/**
 * Strict quality score with range validation
 */
export type StrictQualityScore = Percentage & { readonly __brand: 'QualityScore' };

/**
 * Strict price with validation
 */
export type StrictPrice = PositiveNumber & { readonly __brand: 'Price' };

/**
 * Strict size with validation
 */
export type StrictSize = PositiveNumber & { readonly __brand: 'Size' };

/**
 * Strict confidence score
 */
export type StrictConfidence = Percentage & { readonly __brand: 'Confidence' };

/**
 * Validation utilities for branded types
 */
export class StrictTypeValidators {
  /**
   * Validate and create non-empty string
   */
  static validateNonEmptyString(value: unknown): NonEmptyString {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError('Value must be a non-empty string');
    }
    return value as NonEmptyString;
  }

  /**
   * Validate and create positive number
   */
  static validatePositiveNumber(value: unknown): PositiveNumber {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
      throw new TypeError('Value must be a positive finite number');
    }
    return value as PositiveNumber;
  }

  /**
   * Validate and create percentage (0-1)
   */
  static validatePercentage(value: unknown): Percentage {
    if (typeof value !== 'number' || !isFinite(value) || value < 0 || value > 1) {
      throw new TypeError('Value must be a number between 0 and 1');
    }
    return value as Percentage;
  }

  /**
   * Validate and create timestamp
   */
  static validateTimestamp(value: unknown): TimestampMs {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) {
      throw new TypeError('Value must be a valid timestamp in milliseconds');
    }
    // Check if timestamp is reasonable (not too far in past or future)
    const now = Date.now();
    const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60 * 1000);
    const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);
    
    if (value < tenYearsAgo || value > tenYearsFromNow) {
      throw new TypeError('Timestamp must be within ±10 years of current time');
    }
    
    return value as TimestampMs;
  }

  /**
   * Validate and create latency
   */
  static validateLatency(value: unknown): LatencyMs {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) {
      throw new TypeError('Value must be a non-negative finite number representing milliseconds');
    }
    return value as LatencyMs;
  }

  /**
   * Validate and create topic ID
   */
  static validateTopicId(value: unknown): StrictTopicId {
    const str = this.validateNonEmptyString(value);
    if (!/^[a-zA-Z0-9_-]+$/.test(str)) {
      throw new TypeError('Topic ID must contain only alphanumeric characters, hyphens, and underscores');
    }
    return str as StrictTopicId;
  }

  /**
   * Validate and create metadata ID
   */
  static validateMetadataId(value: unknown): StrictMetadataId {
    const str = this.validateNonEmptyString(value);
    if (!/^[a-zA-Z0-9_-]+$/.test(str)) {
      throw new TypeError('Metadata ID must contain only alphanumeric characters, hyphens, and underscores');
    }
    return str as StrictMetadataId;
  }

  /**
   * Validate and create symbol ID
   */
  static validateSymbolId(value: unknown): StrictSymbolId {
    const str = this.validateNonEmptyString(value);
    if (!/^[A-Z0-9/._-]+$/i.test(str)) {
      throw new TypeError('Symbol ID must contain only alphanumeric characters, forward slash, dot, hyphen, and underscore');
    }
    return str as StrictSymbolId;
  }

  /**
   * Validate and create exchange ID
   */
  static validateExchangeId(value: unknown): StrictExchangeId {
    const str = this.validateNonEmptyString(value);
    if (!/^[a-zA-Z0-9_-]+$/.test(str)) {
      throw new TypeError('Exchange ID must contain only alphanumeric characters, hyphens, and underscores');
    }
    return str as StrictExchangeId;
  }

  /**
   * Validate and create non-empty array
   */
  static validateNonEmptyArray<T>(value: unknown, itemValidator?: (item: unknown) => T): NonEmptyArray<T> {
    if (!Array.isArray(value) || value.length === 0) {
      throw new TypeError('Value must be a non-empty array');
    }

    if (itemValidator) {
      const validated = value.map(item => itemValidator(item));
      return validated as NonEmptyArray<T>;
    }

    return value as NonEmptyArray<T>;
  }

  /**
   * Validate and create topic array
   */
  static validateTopicArray(value: unknown): TopicArray {
    return this.validateNonEmptyArray(value, (item) => {
      if (!Object.values(MarketTopic).includes(item as MarketTopic)) {
        throw new TypeError(`Invalid topic: ${item}`);
      }
      return item as MarketTopic;
    });
  }

  /**
   * Validate and create string array
   */
  static validateStringArray(value: unknown): StringArray {
    return this.validateNonEmptyArray(value, (item) => {
      if (typeof item !== 'string') {
        throw new TypeError('Array items must be strings');
      }
      return item;
    });
  }
}

/**
 * Strict data interfaces with validation
 */
export interface StrictOddsTick {
  readonly id: StrictSymbolId;
  readonly timestamp: TimestampMs;
  readonly symbol: NonEmptyString;
  readonly price: StrictPrice;
  readonly size: StrictSize;
  readonly exchange: StrictExchangeId;
  readonly side: 'buy' | 'sell';
}

export interface StrictLightweightMetadata {
  readonly id: StrictMetadataId;
  readonly timestamp: TimestampMs;
  readonly topic: MarketTopic;
  readonly category: DataCategory;
  readonly source: StrictExchangeId;
  readonly quality: StrictQualityScore;
}

export interface StrictLightweightOddsTick extends StrictOddsTick {
  readonly metadata: StrictLightweightMetadata;
}

/**
 * Strict validation functions
 */
export class StrictDataValidator {
  /**
   * Validate odds tick with all constraints
   */
  static validateOddsTick(data: unknown): StrictOddsTick {
    if (!data || typeof data !== 'object') {
      throw new TypeError('Data must be an object');
    }

    const obj = data as Record<string, unknown>;

    return {
      id: StrictTypeValidators.validateSymbolId(obj.id),
      timestamp: StrictTypeValidators.validateTimestamp(obj.timestamp),
      symbol: StrictTypeValidators.validateNonEmptyString(obj.symbol),
      price: StrictTypeValidators.validatePositiveNumber(obj.price) as StrictPrice,
      size: StrictTypeValidators.validatePositiveNumber(obj.size) as StrictSize,
      exchange: StrictTypeValidators.validateExchangeId(obj.exchange),
      side: this.validateSide(obj.side)
    };
  }

  /**
   * Validate lightweight metadata
   */
  static validateLightweightMetadata(data: unknown): StrictLightweightMetadata {
    if (!data || typeof data !== 'object') {
      throw new TypeError('Data must be an object');
    }

    const obj = data as Record<string, unknown>;

    return {
      id: StrictTypeValidators.validateMetadataId(obj.id),
      timestamp: StrictTypeValidators.validateTimestamp(obj.timestamp),
      topic: this.validateTopic(obj.topic),
      category: this.validateDataCategory(obj.category),
      source: StrictTypeValidators.validateExchangeId(obj.source),
      quality: StrictTypeValidators.validatePercentage(obj.quality) as StrictQualityScore
    };
  }

  /**
   * Validate lightweight odds tick
   */
  static validateLightweightOddsTick(data: unknown): StrictLightweightOddsTick {
    const tick = this.validateOddsTick(data);
    const obj = data as Record<string, unknown>;
    
    return {
      ...tick,
      metadata: this.validateLightweightMetadata(obj.metadata)
    };
  }

  private static validateSide(value: unknown): 'buy' | 'sell' {
    if (value !== 'buy' && value !== 'sell') {
      throw new TypeError('Side must be either "buy" or "sell"');
    }
    return value as 'buy' | 'sell';
  }

  private static validateTopic(value: unknown): MarketTopic {
    if (!Object.values(MarketTopic).includes(value as MarketTopic)) {
      throw new TypeError(`Invalid topic: ${value}`);
    }
    return value as MarketTopic;
  }

  private static validateDataCategory(value: unknown): DataCategory {
    if (!Object.values(DataCategory).includes(value as DataCategory)) {
      throw new TypeError(`Invalid data category: ${value}`);
    }
    return value as DataCategory;
  }
}

/**
 * Type guards for strict types
 */
export class StrictTypeGuards {
  static isStrictTopicId(value: unknown): value is StrictTopicId {
    try {
      StrictTypeValidators.validateTopicId(value);
      return true;
    } catch {
      return false;
    }
  }

  static isStrictMetadataId(value: unknown): value is StrictMetadataId {
    try {
      StrictTypeValidators.validateMetadataId(value);
      return true;
    } catch {
      return false;
    }
  }

  static isStrictSymbolId(value: unknown): value is StrictSymbolId {
    try {
      StrictTypeValidators.validateSymbolId(value);
      return true;
    } catch {
      return false;
    }
  }

  static isStrictPercentage(value: unknown): value is Percentage {
    try {
      StrictTypeValidators.validatePercentage(value);
      return true;
    } catch {
      return false;
    }
  }

  static isStrictTimestamp(value: unknown): value is TimestampMs {
    try {
      StrictTypeValidators.validateTimestamp(value);
      return true;
    } catch {
      return false;
    }
  }

  static isStrictOddsTick(value: unknown): value is StrictOddsTick {
    try {
      StrictDataValidator.validateOddsTick(value);
      return true;
    } catch {
      return false;
    }
  }

  static isStrictLightweightMetadata(value: unknown): value is StrictLightweightMetadata {
    try {
      StrictDataValidator.validateLightweightMetadata(value);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Utility functions for strict types
 */
export const StrictTypeUtils = {
  /**
   * Create strict topic ID safely
   */
  createTopicId(id: string): StrictTopicId {
    return StrictTypeValidators.validateTopicId(id);
  },

  /**
   * Create strict metadata ID safely
   */
  createMetadataId(id: string): StrictMetadataId {
    return StrictTypeValidators.validateMetadataId(id);
  },

  /**
   * Create strict symbol ID safely
   */
  createSymbolId(id: string): StrictSymbolId {
    return StrictTypeValidators.validateSymbolId(id);
  },

  /**
   * Create strict percentage safely
   */
  createPercentage(value: number): Percentage {
    return StrictTypeValidators.validatePercentage(value);
  },

  /**
   * Create strict timestamp safely
   */
  createTimestamp(value?: number): TimestampMs {
    return StrictTypeValidators.validateTimestamp(value ?? Date.now());
  },

  /**
   * Safely cast to strict type with fallback
   */
  safeCast<T>(value: unknown, validator: (v: unknown) => T, fallback: T): T {
    try {
      return validator(value);
    } catch {
      return fallback;
    }
  }
};
