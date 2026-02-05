/**
 * @fileoverview Enhanced Audit System Exports
 * @description Central export point for enhanced audit system
 * @module audit/enhanced
 */

// Core orchestrator
export {
	MainAuditOrchestrator,
	type AuditState,
	type AuditMetrics,
	type AuditStrategy,
	type AuditOptions,
	type AuditResult,
	type AuditChainResult,
	type AuditPhase,
	type AuditContext,
	type AuditChain,
	type OrchestratorConfig,
	DocumentationStrategy,
	SecurityStrategy,
	ComplianceStrategy,
	PerformanceStrategy,
	PatternMatchingPhase,
	CrossReferencePhase,
	OrphanDetectionPhase,
	ValidationPhase,
} from "./orchestrator";

// Pattern matching
export {
	PatternMatchingEngine,
	type PatternMatch,
	type PatternValidation,
	type AIMatch,
	PatternRegistry,
	PatternCache,
	PatternValidator,
	AIService,
	PatternClassifier,
} from "./pattern-matcher";

// Documentation extraction
export {
	DocumentationNumberExtractor,
	type DocumentNumber,
	type FormatExtraction,
	HierarchicalExtractor,
	SemanticExtractor,
	ContextualExtractor,
} from "./documentation-extractor";

// Cross-reference builder
export {
	CrossReferenceIndexBuilder,
	type ReferenceNode,
	type ReferenceEdge,
	type ReferenceGraph,
	type CircularReference,
	type Visualization,
	type VisualizationMetrics,
	GraphValidator,
} from "./cross-reference-builder";

// Orphan detection
export {
	OrphanDetectionLogic,
	type OrphanDetectionResult,
	type OrphanedNumber,
	type BrokenReference,
	type OrphanStatistics,
	type DetectionContext,
	type TemporalOrphan,
	type ResolutionPlan,
	type Resolution,
	type ResolutionSummary,
	type ResolutionTimeline,
	type OrphanStrategy,
	ReferenceCountStrategy,
	TemporalAnalysisStrategy,
	UsagePatternStrategy,
	SemanticRelationshipStrategy,
} from "./orphan-detector";

// File watcher
export {
	RealTimeFileWatcher,
	type WatchOptions,
	type WatchSubscription,
	type FileChange,
	type ContentDelta,
	type ChangeCorrelation,
	type ContentAnalyzer,
	ContentStructureAnalyzer,
	SemanticAnalyzer,
	DependencyAnalyzer,
	FileContentAnalyzer,
} from "./file-watcher";

// Event emitter
export {
	EnhancedEventEmitter,
	type AuditEventEmitter,
	type PatternMatch as EventPatternMatch,
	type OrphanedNumber as EventOrphanedNumber,
	type AuditResults as EventAuditResults,
	type RealTimeUpdate,
	type ScanProgress,
	type ScanError,
	type ValidationResult,
	type ReferenceLink,
	type BrokenReference as EventBrokenReference,
	type EventMetrics,
	type EventFilter,
	EventBus,
} from "./event-emitter";

// Methods
export {
	HybridAuditOrchestrator,
	DirectoryScanner,
	MultiPatternMatcher,
	TimeoutHandler,
	ResultAggregator,
	CleanupResourceManager,
	RealTimeMatchHandler,
	StaticAnalyzer,
	type AuditOptions as MethodAuditOptions,
	type AuditResults as MethodAuditResults,
	type StaticAnalysis,
	type ScanOptions,
	type ScanResult,
	type ScanAnalysis,
	type IncrementalResult,
	type Pattern,
	type PatternMatch as MethodPatternMatch,
	type MatchingContext,
	type ContextualMatch,
	type TimeoutResult,
	type AggregationContext,
	type AggregatedResult,
	type StreamAggregation,
	type WindowAggregation,
	type Resource,
	type ManagedResource,
	type CleanupReport,
	type ValidatedMatch,
	type TimeoutError,
} from "./methods";
