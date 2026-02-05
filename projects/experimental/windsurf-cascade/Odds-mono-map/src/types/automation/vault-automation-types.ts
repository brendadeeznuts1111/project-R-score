// =============================================================================
// VAULT AUTOMATION TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Automation type definitions extracted from monolithic file
// =============================================================================

export interface AutomationSchedule {
    id: string;
    name: string;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
    lastRun: Date;
    nextRun: Date;
    actions: string[];
}

export interface AutomationHistory {
    timestamp: Date;
    action: string;
    success: boolean;
    duration: number;
    error?: string;
}

// =============================================================================
// [AUTOMATION_TYPES] - 2025-11-19
// =============================================================================

export interface AutomationEngine {
    active: boolean;
    tasks: Map<string, AutomationTask>;
    schedules: Map<string, AutomationSchedule>;
    history: AutomationHistory[];
}

export interface AutomationTask {
    id: string;
    name: string;
    description: string;
    type: AutomationTaskType;
    config: AutomationTaskConfig;
    status: AutomationTaskStatus;
    lastRun?: Date;
    nextRun?: Date;
    enabled: boolean;
}

export enum AutomationTaskType {
    VALIDATE = 'validate',
    ORGANIZE = 'organize',
    CLEANUP = 'cleanup',
    BACKUP = 'backup',
    INDEX = 'index',
    METRICS = 'metrics',
    NOTIFICATION = 'notification'
}

export enum AutomationTaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export interface AutomationTaskConfig {
    triggers: AutomationTrigger[];
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    options: Record<string, unknown>;
}

export interface AutomationTrigger {
    type: 'manual' | 'schedule' | 'event' | 'file_change';
    config: Record<string, unknown>;
}

export interface AutomationCondition {
    type: 'time' | 'file_count' | 'file_size' | 'custom';
    expression: string;
    parameters: Record<string, unknown>;
}

export interface AutomationAction {
    type: 'validate' | 'organize' | 'move' | 'rename' | 'delete' | 'custom';
    config: Record<string, unknown>;
}

// =============================================================================
// [FILE_WATCHER_TYPES] - 2025-11-19
// =============================================================================

export interface FileWatcher {
    active: boolean;
    watchedPaths: string[];
    ignorePatterns: string[];
    events: FileWatchEvent[];
    handlers: Map<string, FileWatchHandler>;
}

export interface FileWatchEvent {
    type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
    path: string;
    timestamp: Date;
    stats?: FileStats;
}

export interface FileStats {
    size: number;
    mtime: Date;
    atime: Date;
    ctime: Date;
    isFile: boolean;
    isDirectory: boolean;
}

export interface FileWatchHandler {
    id: string;
    eventType: FileWatchEvent['type'];
    pattern?: string;
    handler: (event: FileWatchEvent) => Promise<void> | void;
    enabled: boolean;
}

// =============================================================================
// [ORGANIZATION_TYPES] - 2025-11-19
// =============================================================================

export interface OrganizationEngine {
    rules: OrganizationRule[];
    strategies: OrganizationStrategy[];
    history: OrganizationHistory[];
}

export interface OrganizationRule {
    id: string;
    name: string;
    description: string;
    pattern: string;
    action: OrganizationAction;
    priority: number;
    enabled: boolean;
}

export interface OrganizationAction {
    type: 'move' | 'rename' | 'copy' | 'tag' | 'metadata';
    target: string;
    template?: string;
    overwrite: boolean;
}

export interface OrganizationStrategy {
    name: string;
    description: string;
    rules: string[];
    conditions: OrganizationCondition[];
}

export interface OrganizationCondition {
    type: 'file_name' | 'file_path' | 'file_content' | 'file_metadata' | 'custom';
    expression: string;
    parameters: Record<string, unknown>;
}

export interface OrganizationHistory {
    timestamp: Date;
    action: string;
    source: string;
    target?: string;
    success: boolean;
    error?: string;
}

// =============================================================================
// [TASK_PROCESSING_TYPES] - 2025-11-19
// =============================================================================

export interface TaskProcessor {
    queue: TaskQueue;
    workers: TaskWorker[];
    config: TaskProcessorConfig;
}

export interface TaskQueue {
    pending: QueuedTask[];
    running: RunningTask[];
    completed: CompletedTask[];
    failed: FailedTask[];
}

export interface QueuedTask {
    id: string;
    type: AutomationTaskType;
    priority: number;
    createdAt: Date;
    scheduledAt?: Date;
    payload: Record<string, unknown>;
}

export interface RunningTask {
    id: string;
    type: AutomationTaskType;
    startedAt: Date;
    workerId: string;
    progress: number; // 0-100
    payload: Record<string, unknown>;
}

export interface CompletedTask {
    id: string;
    type: AutomationTaskType;
    startedAt: Date;
    completedAt: Date;
    duration: number;
    result: TaskResult;
}

export interface FailedTask {
    id: string;
    type: AutomationTaskType;
    startedAt: Date;
    failedAt: Date;
    error: TaskError;
    retryCount: number;
}

export interface TaskResult {
    success: boolean;
    data: Record<string, unknown>;
    metrics: TaskMetrics;
}

export interface TaskError {
    message: string;
    stack?: string;
    code?: string;
    retryable: boolean;
}

export interface TaskMetrics {
    filesProcessed: number;
    errors: number;
    warnings: number;
    duration: number;
    memoryUsage: number;
}

export interface TaskProcessorConfig {
    maxWorkers: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    priorityMode: 'fifo' | 'priority' | 'deadline';
}

export interface TaskWorker {
    id: string;
    status: 'idle' | 'busy' | 'error';
    currentTask?: string;
    tasksCompleted: number;
    lastActivity: Date;
}
