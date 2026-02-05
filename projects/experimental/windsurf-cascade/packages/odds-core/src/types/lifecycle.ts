// packages/odds-core/src/types/lifecycle.ts - Metadata Lifecycle Types

import { RealtimeMetadata } from './realtime';
import { QualityMetrics } from './enhanced';

/**
 * Metadata lifecycle states
 */
export enum MetadataLifecycleState {
  CREATED = 'created',
  ACTIVE = 'active',
  UPDATING = 'updating',
  VALIDATING = 'validating',
  DEPRECATED = 'deprecated',
  ARCHIVING = 'archiving',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Lifecycle transition rules
 */
export interface LifecycleTransition {
  from: MetadataLifecycleState;
  to: MetadataLifecycleState;
  timestamp: number;
  reason: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Lifecycle configuration
 */
export interface LifecycleConfig {
  // Time-based rules
  activeTimeout: number; // milliseconds
  validationInterval: number; // milliseconds
  archivalDelay: number; // milliseconds before archival
  deletionDelay: number; // milliseconds before deletion
  
  // Quality-based rules
  minQualityThreshold: number;
  maxAgeThreshold: number; // milliseconds
  
  // Transition rules
  allowedTransitions: Map<MetadataLifecycleState, MetadataLifecycleState[]>;
  autoTransitions: Map<MetadataLifecycleState, LifecycleTransitionRule>;
}

/**
 * Automatic transition rules
 */
export interface LifecycleTransitionRule {
  condition: string;
  targetState: MetadataLifecycleState;
  cooldown: number; // milliseconds
  enabled: boolean;
}

/**
 * Metadata history entry
 */
export interface MetadataHistoryEntry {
  version: number;
  timestamp: number;
  state: MetadataLifecycleState;
  changes: MetadataChange[];
  quality: QualityMetrics;
  userId?: string;
  reason: string;
}

/**
 * Metadata change tracking
 */
export interface MetadataChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'create' | 'update' | 'delete';
}

/**
 * Lifecycle management interface
 */
export interface MetadataLifecycle {
  id: string;
  currentState: MetadataLifecycleState;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  expiresAt?: number;
  version: number;
  history: MetadataHistoryEntry[];
  transitions: LifecycleTransition[];
  config: LifecycleConfig;
}

/**
 * Lifecycle event types
 */
export interface LifecycleEvent {
  id: string;
  metadataId: string;
  type: 'state_change' | 'quality_change' | 'expiration' | 'manual_action';
  timestamp: number;
  data: {
    oldState?: MetadataLifecycleState;
    newState?: MetadataLifecycleState;
    reason: string;
    userId?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Lifecycle statistics
 */
export interface LifecycleStats {
  total: number;
  byState: Record<MetadataLifecycleState, number>;
  averageAge: number;
  transitionsToday: number;
  expiredCount: number;
  archivalCandidates: number;
}

/**
 * Lifecycle management request
 */
export interface LifecycleManagementRequest {
  metadataId: string;
  action: 'transition' | 'extend' | 'archive' | 'delete' | 'restore';
  targetState?: MetadataLifecycleState;
  reason: string;
  userId?: string;
  force?: boolean;
}

/**
 * Lifecycle management response
 */
export interface LifecycleManagementResponse {
  success: boolean;
  metadataId: string;
  oldState: MetadataLifecycleState;
  newState: MetadataLifecycleState;
  transition: LifecycleTransition;
  warnings: string[];
  errors: string[];
}

/**
 * Storage interface for lifecycle management
 */
export interface LifecycleStorage {
  // Basic CRUD operations
  save(lifecycle: MetadataLifecycle): Promise<void>;
  YAML.parse(metadataId: string): Promise<MetadataLifecycle | null>;
  delete(metadataId: string): Promise<void>;
  
  // Query operations
  findByState(state: MetadataLifecycleState): Promise<MetadataLifecycle[]>;
  findExpired(): Promise<MetadataLifecycle[]>;
  findArchivalCandidates(): Promise<MetadataLifecycle[]>;
  
  // Bulk operations
  updateMultiple(updates: MetadataLifecycle[]): Promise<void>;
  getStats(): Promise<LifecycleStats>;
}
