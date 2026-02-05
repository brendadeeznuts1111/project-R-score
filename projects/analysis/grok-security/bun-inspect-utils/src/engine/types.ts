// [70.0.0.0] TENSION ENGINE TYPES
// Zero-npm, Bun-native type definitions for the unified tension engine
// Enterprise-grade, TypeScript strict mode compatible

/**
 * [70.1.0.0] Tension value range (0-100)
 * 0 = healthy, 100 = critical
 */
export type TensionValue = number;

/**
 * [70.2.0.0] Health status levels
 */
export type HealthStatus = "healthy" | "warning" | "critical";

/**
 * [70.3.0.0] Compression formats supported by Bun.Archive
 */
export type CompressionFormat = "gzip" | "deflate" | "brotli";

/**
 * [70.4.0.0] Storage adapter types
 */
export type StorageType = "memory" | "filesystem" | "kv" | "s3";

/**
 * [70.5.0.0] Error severity levels
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * [70.6.0.0] Tension engine configuration
 */
export interface TensionEngineConfig {
  initialTension?: TensionValue;
  archiveFormat?: CompressionFormat;
  compressionLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  healthThresholds?: {
    warning: number;
    critical: number;
  };
  storageType?: StorageType;
  enableMetrics?: boolean;
  enableAutoArchive?: boolean;
  archiveIntervalMs?: number;
}

/**
 * [70.7.0.0] Tension state snapshot
 */
export interface TensionState {
  value: TensionValue;
  lastUpdate: number;
  errorCount: number;
  isHealthy: boolean;
  health: HealthStatus;
}

/**
 * [70.8.0.0] Error context for precise debugging
 */
export interface ErrorContext {
  file?: string;
  line?: number;
  column?: number;
  timestamp: number;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
}

/**
 * [70.9.0.0] Archive metadata
 */
export interface ArchiveMetadata {
  archiveId: string;
  timestamp: number;
  fileCount: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: CompressionFormat;
  level: number;
  status: "pending" | "completed" | "failed";
  storageKey?: string;
}

/**
 * [70.10.0.0] Health report
 */
export interface HealthReport {
  status: HealthStatus;
  tension: TensionValue;
  errors: number;
  uptime: number;
  lastArchive?: ArchiveMetadata;
  metrics?: EngineMetrics;
}

/**
 * [70.11.0.0] Engine metrics
 */
export interface EngineMetrics {
  totalOperations: number;
  totalArchives: number;
  totalErrors: number;
  averageTension: number;
  peakTension: number;
  uptimeMs: number;
}

/**
 * [70.12.0.0] Event types for the engine event bus
 */
export type TensionEngineEvents = {
  tensionChange: TensionState;
  healthChange: HealthReport;
  error: ErrorContext;
  archive: ArchiveMetadata;
  metrics: EngineMetrics;
};

/**
 * [70.13.0.0] Event handler type
 */
export type EventHandler<T> = (data: T) => void;

/**
 * [70.14.0.0] Storage adapter interface
 */
export interface StorageAdapter {
  name: StorageType;
  put(key: string, data: ArrayBuffer, metadata?: Record<string, unknown>): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * [70.15.0.0] Core module interface
 */
export interface CoreModule {
  initialize(): Promise<void>;
  dispose(): void;
  isInitialized(): boolean;
}

/**
 * [70.16.0.0] Default configuration values
 */
export const DEFAULT_CONFIG: Required<TensionEngineConfig> = {
  initialTension: 0,
  archiveFormat: "gzip",
  compressionLevel: 9,
  healthThresholds: { warning: 50, critical: 75 },
  storageType: "memory",
  enableMetrics: true,
  enableAutoArchive: false,
  archiveIntervalMs: 3600000, // 1 hour
};

