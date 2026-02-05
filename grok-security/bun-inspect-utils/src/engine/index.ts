// [70.0.0.0] TENSION ENGINE MODULE
// Unified Bun-native state management, archiving, and monitoring
// Zero-npm, enterprise-grade, Bun v1.3.5+ native

// Main engine export
export { TensionEngine, default } from "./tension-engine";

// Core modules
export { TensionCore } from "./cores/tension-core";
export { ArchiveCore, type LogFileEntry } from "./cores/archive-core";
export { MonitoringCore } from "./cores/monitoring-core";

// Storage adapters
export { MemoryAdapter, FilesystemAdapter } from "./adapters";

// Types
export type {
  TensionValue,
  HealthStatus,
  CompressionFormat,
  StorageType,
  ErrorSeverity,
  TensionEngineConfig,
  TensionState,
  ErrorContext,
  ArchiveMetadata,
  HealthReport,
  EngineMetrics,
  TensionEngineEvents,
  EventHandler,
  StorageAdapter,
  CoreModule,
} from "./types";

export { DEFAULT_CONFIG } from "./types";
