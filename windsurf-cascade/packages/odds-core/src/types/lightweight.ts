// packages/odds-core/src/types/lightweight.ts - Lightweight metadata for simple use cases

import type { MarketTopic, DataCategory } from './topics';
import type { DataSource, MarketContext, DataQuality, ProcessingMetadata } from './topics';

/**
 * Branded types for better type safety
 */
export type TopicId = string & { readonly brand: unique symbol };
export type MetadataId = string & { readonly brand: unique symbol };
export type SymbolId = string & { readonly brand: unique symbol };

/**
 * Lightweight metadata for simple use cases
 * Perfect for high-frequency data where full metadata is overkill
 */
export interface LightweightMetadata {
  id: MetadataId;
  timestamp: number;
  topic: MarketTopic; // Single topic, not array
  category: DataCategory;
  source: string; // Simple string, not full object
  quality: number; // Single score 0-1
}

/**
 * Base metadata interface for composition
 */
export interface BaseMetadata {
  id: MetadataId;
  timestamp: number;
  version: string;
}

/**
 * Technical metadata component
 */
export interface TechnicalMetadata {
  schema: string;
  encoding: string;
  compression: string;
  size: number; // in bytes
  checksum: string;
}

/**
 * Business metadata component (optional)
 */
export interface BusinessMetadata {
  priority: 'critical' | 'high' | 'medium' | 'low';
  retention: number; // in days
  compliance: string[];
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
}

/**
 * Composable enhanced metadata
 * Uses composition over the monolithic approach
 */
export interface ComposableEnhancedMetadata extends BaseMetadata {
  // Required components
  source: DataSource;
  market: MarketContext;
  topics: MarketTopic[];
  category: DataCategory;
  tags: string[];
  quality: DataQuality;

  // Optional components (only include when needed)
  technical?: TechnicalMetadata;
  business?: BusinessMetadata;
  processing?: ProcessingMetadata;

  // Relationships (always useful)
  relationships: {
    parentId?: MetadataId;
    childIds: MetadataId[];
    relatedIds: MetadataId[];
    dependencies: string[];
  };
}


/**
 * Smart metadata type - chooses appropriate format based on use case
 */
export type SmartMetadata = LightweightMetadata | ComposableEnhancedMetadata;

/**
 * Type guard to check if metadata is lightweight
 */
export function isLightweightMetadata(metadata: SmartMetadata): metadata is LightweightMetadata {
  return 'topic' in metadata && !('topics' in metadata);
}

/**
 * Type guard to check if metadata is enhanced
 */
export function isEnhancedMetadata(metadata: SmartMetadata): metadata is ComposableEnhancedMetadata {
  return 'topics' in metadata;
}

/**
 * Lightweight odds tick for high-frequency use cases
 */
export interface LightweightOddsTick {
  id: SymbolId;
  timestamp: number;
  symbol: string;
  price: number;
  size: number;
  exchange: string;
  side: 'buy' | 'sell';

  // Lightweight metadata
  metadata: LightweightMetadata;
}

/**
 * Smart odds tick that can be either lightweight or enhanced
 */
export type SmartOddsTick = LightweightOddsTick | import('./enhanced').EnhancedTradeTick;


/**
 * Utility functions for branded types
 */
export const BrandedTypeUtils = {
  createTopicId(id: string): TopicId {
    return id as TopicId;
  },

  createMetadataId(id: string): MetadataId {
    return id as MetadataId;
  },

  createSymbolId(id: string): SymbolId {
    return id as SymbolId;
  },

  isValidTopicId(id: string): id is TopicId {
    return typeof id === 'string' && id.length > 0;
  },

  isValidMetadataId(id: string): id is MetadataId {
    return typeof id === 'string' && id.length > 0;
  },

  isValidSymbolId(id: string): id is SymbolId {
    return typeof id === 'string' && id.length > 0;
  }
};

/**
 * Helper to create lightweight metadata quickly
 */
export function createLightweightMetadata(
  id: string,
  topic: MarketTopic,
  category: DataCategory,
  source: string,
  quality: number = 0.8
): LightweightMetadata {
  return {
    id: BrandedTypeUtils.createMetadataId(id),
    timestamp: Date.now(),
    topic,
    category,
    source,
    quality: Math.max(0, Math.min(1, quality))
  };
}

/**
 * Helper to create composable metadata with only essential components
 */
export function createEssentialMetadata(
  id: string,
  source: import('./topics').DataSource,
  market: import('./topics').MarketContext,
  topics: MarketTopic[],
  category: DataCategory,
  quality: import('./topics').DataQuality
): ComposableEnhancedMetadata {
  return {
    id: BrandedTypeUtils.createMetadataId(id),
    timestamp: Date.now(),
    version: '2.0.0',
    source,
    market,
    topics,
    category,
    tags: [],
    quality,
    relationships: {
      childIds: [],
      relatedIds: [],
      dependencies: []
    }
  };
}
