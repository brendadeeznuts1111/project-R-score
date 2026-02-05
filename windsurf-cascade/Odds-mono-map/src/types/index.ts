// =============================================================================
// REFACTORED VAULT TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 2.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Refactored type definitions organized by domain
// =============================================================================

// =============================================================================
// [CORE VAULT TYPES]
// =============================================================================
export {
    VaultFile,
    VaultFolder,
    VaultNode,
    VaultRelationship,
    VaultGraph,
    VaultDocumentType,
    typeHeadingMap,
    VaultMetrics as VaultCoreMetrics,
    FileSystemStats,
    FileOperation,
    FileSystemWatcher,
    VaultOperation,
    VaultOperationResult,
    VaultSearchOptions,
    VaultSearchResult
} from './vault/core-vault-types';

// =============================================================================
// [CONFIGURATION TYPES]
// =============================================================================
export {
    VaultConfig,
    VaultPaths,
    PluginConfigs,
    TasksPluginConfig,
    TaskStatus,
    AutoSuggestConfig,
    DateSettings,
    ExportPluginConfig,
    ExportFormat,
    TemplaterPluginConfig,
    LinterPluginConfig,
    LinterRule,
    DataviewPluginConfig,
    HomepagePluginConfig,
    VaultStandards,
    NamingStandards,
    StructureStandards,
    FolderStructureRule,
    ContentStandards,
    MetadataStandards,
    AutomationConfig,
    AutomationSchedule,
    TemplateConfiguration,
    TemplateVariable,
    TemplateDefinition,
    TemplateRule
} from './config/vault-config-types';

// =============================================================================
// [ANALYTICS TYPES]
// =============================================================================
export {
    VaultAnalytics,
    AnalyticsOverview,
    ContentAnalytics,
    UsageAnalytics,
    PerformanceAnalytics,
    DailyActivity,
    TopDocument,
    SearchQuery,
    LoadTimeMetrics,
    SearchPerformanceMetrics,
    ResourceUsageMetrics,
    MemoryUsage,
    DiskUsage,
    FileSizeInfo,
    CpuUsage,
    HealthMetrics,
    QualityMetrics,
    EngagementMetrics,
    AnalyticsReport,
    AnalyticsInsight,
    Recommendation
} from './analytics/vault-analytics-types';

// =============================================================================
// [MONITORING TYPES]
// =============================================================================
export {
    VaultMetrics,
    ValidationIssue,
    MonitorStatus,
    OrganizationResult,
    DailyReport,
    Logger,
    LogEntry,
    LogConfig,
    VaultEvent,
    EventType,
    EventHandler,
    EventBus,
    Alert,
    AlertType,
    AlertRule,
    Notification,
    NotificationType,
    NotificationChannel
} from './monitoring/vault-monitoring-types';

// =============================================================================
// [TEMPLATE TYPES]
// =============================================================================
export {
    BaseTemplate,
    TemplateContext,
    TemplateResult,
    ProjectTemplate,
    ProjectPhase,
    DocumentTemplate,
    DocumentSection,
    DailyTemplate,
    DailySection,
    TemplateRegistry,
    RegistryMetadata,
    TemplateSearchOptions,
    TemplateSearchResult,
    TemplateProcessor,
    ProcessorOptions,
    TemplateVariable as TemplateVar,
    TemplateFunction,
    TemplateValidationResult,
    ValidationError as TemplateValidationError,
    ValidationWarning,
    TemplateValidator,
    EnhancedTemplate,
    TemplateRequirement,
    TemplateCompatibility,
    TemplateBundle
} from './templates/vault-template-types';

// =============================================================================
// [VALIDATION TYPES]
// =============================================================================
export {
    ValidationRule,
    ValidationCategory,
    ValidationConfig,
    CustomValidationRule,
    ValidationResult,
    ValidationError as ValError,
    ValidationWarning as ValWarning,
    ValidationInfo,
    ValidationEngine,
    ValidationEngineConfig,
    ValidationContext,
    ValidationOptions,
    StandardsValidator,
    NamingValidator,
    StructureValidator,
    ContentValidator,
    MetadataValidator,
    LinkValidator,
    LinkValidationResult,
    LinkIssue,
    PerformanceValidator,
    PerformanceMetrics as PerfMetrics,
    PerformanceThreshold
} from './validation/vault-validation-types';

// =============================================================================
// [AUTOMATION TYPES]
// =============================================================================
export {
    AutomationEngine,
    AutomationTask,
    AutomationTaskType,
    AutomationTaskStatus,
    AutomationTaskConfig,
    AutomationTrigger,
    AutomationCondition,
    AutomationAction,
    FileWatcher,
    FileWatchEvent,
    FileStats,
    FileWatchHandler,
    OrganizationEngine,
    OrganizationRule,
    OrganizationAction,
    OrganizationStrategy,
    OrganizationCondition,
    OrganizationHistory,
    TaskProcessor,
    TaskQueue,
    QueuedTask,
    RunningTask,
    CompletedTask,
    FailedTask,
    TaskResult,
    TaskError,
    TaskMetrics,
    TaskProcessorConfig,
    TaskWorker
} from './automation/vault-automation-types';

// =============================================================================
// [UTILITY TYPES]
// =============================================================================
export {
    DeepPartial,
    RequiredFields,
    OptionalFields,
    ReadOnly,
    WriteOnly,
    PaginatedResult,
    SortedResult,
    FilteredResult,
    FilterCriteria,
    AsyncResult,
    PromiseWithStatus,
    AsyncIterator,
    EventEmitter,
    EventSubscription,
    EventHistory,
    EventFilter,
    Cache,
    LRUCache,
    CacheEntry,
    CacheStats,
    Serializable,
    JsonSerializer,
    SerializationOptions,
    Comparable,
    Sortable,
    DiffResult,
    ModifiedItem,
    ChangeRecord,
    DebouncedFunction,
    ThrottledFunction,
    MemoizedFunction,
    Validator,
    ValidationResult as UtilValidationResult,
    Schema,
    TypeGuard,
    PerformanceTimer,
    PerformanceMetrics as UtilPerfMetrics,
    BenchmarkResult
} from './utils/vault-utility-types';

// =============================================================================
// [LEGACY SUPPORT]
// =============================================================================
// Re-export from the old monolithic file for backward compatibility
// TODO: Remove this after migration is complete
export * from './tick-processor-types';

// =============================================================================
// [MIGRATION HELPERS]
// =============================================================================

/**
 * @deprecated Use the new modular types instead
 * This is a temporary compatibility layer during migration
 */
export interface LegacyVaultTypes {
    // Add any legacy-specific types here during migration
}

/**
 * Migration status and utilities
 */
export interface MigrationStatus {
    phase: 'planning' | 'in_progress' | 'validation' | 'complete';
    completed: string[];
    inProgress: string[];
    blocked: string[];
    lastUpdated: Date;
}

/**
 * Helper to check if a type has been migrated to the new structure
 */
export function isMigratedType(typeName: string): boolean {
    const migratedTypes = [
        'VaultFile',
        'VaultConfig',
        'VaultAnalytics',
        'BaseTemplate',
        'ValidationIssue',
        'VaultEvent'
    ];
    return migratedTypes.includes(typeName);
}
