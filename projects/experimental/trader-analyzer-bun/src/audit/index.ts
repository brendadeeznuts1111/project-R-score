/**
 * @fileoverview Audit System Module Exports
 * @description Central export point for all audit system components
 * @module audit
 */

// Core Components
export {
	ComprehensiveAuditOrchestrator,
	type AuditConfig,
	type AuditMatch,
	type OrphanedNumber,
	type AuditResult,
} from "./comprehensive-audit-orchestrator";

export {
	PatternMatchingEngine,
	type PatternMatch,
	type PatternMatchOptions,
	type PatternMatchResult,
} from "./pattern-matching-engine";

export {
	DocumentationNumberExtractor,
	type ExtractedDocNumber,
	type DocNumberValidation,
} from "./documentation-number-extractor";

export {
	CrossReferenceIndexBuilder,
	type CrossReferenceIndex,
	type ReferenceEntry,
	type SourceEntry,
} from "./cross-reference-index-builder";

export {
	EnhancedOrphanDetector,
	type OrphanDetectionResult,
	type OrphanDetectionOptions,
} from "./enhanced-orphan-detector";

export {
	RealTimeFileWatcher,
	type FileChangeEvent,
	type WatcherConfig,
	type Watcher,
} from "./real-time-file-watcher";

// Legacy Components (for backward compatibility)
export { MainAuditOrchestrator } from "./main-audit-orchestrator";
export { OrphanDetector } from "./orphan-detector";
export { RealTimeProcessManager } from "./real-time-process-manager";
