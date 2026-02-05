// =============================================================================
// VAULT MONITORING TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Monitoring type definitions extracted from monolithic file
// =============================================================================

// =============================================================================
// [MONITORING_TYPES] - 2025-11-19
// =============================================================================

export interface VaultMetrics {
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
    complianceScore: number;
    lastValidation: Date;
    issues: ValidationIssue[];
}

export interface ValidationIssue {
    id: string;
    type: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    filePath: string;
    lineNumber?: number;
    suggestion?: string;
    timestamp: Date;
}

export interface MonitorStatus {
    running: boolean;
    startTime: Date;
    eventsProcessed: number;
    lastEvent: Date;
    errors: number;
    warnings: number;
}

export interface OrganizationResult {
    moved: string[];
    renamed: string[];
    errors: string[];
    skipped: string[];
}

export interface DailyReport {
    validation: {
        passed: boolean;
        issues: number;
        errors: string[];
        warnings: string[];
    };
    organization: {
        organized: number;
        moved: string[];
        errors: string[];
    };
    performance: {
        loadTime: number;
        searchTime: number;
        memoryUsage: number;
    };
    summary: {
        totalFiles: number;
        complianceScore: number;
        activeTime: number;
    };
}

// =============================================================================
// [LOGGER_INTERFACE] - 2025-11-19
// =============================================================================

export interface Logger {
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
}

export interface LogEntry {
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    metadata?: Record<string, unknown>;
    source: string;
}

export interface LogConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    output: 'console' | 'file' | 'both';
    maxFileSize: number;
    maxFiles: number;
}

// =============================================================================
// [EVENT_SYSTEM_TYPES] - 2025-11-19
// =============================================================================

export interface VaultEvent {
    id: string;
    type: EventType;
    timestamp: Date;
    source: string;
    data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export enum EventType {
    FILE_CREATED = 'file_created',
    FILE_UPDATED = 'file_updated',
    FILE_DELETED = 'file_deleted',
    FILE_MOVED = 'file_moved',
    FOLDER_CREATED = 'folder_created',
    FOLDER_DELETED = 'folder_deleted',
    VALIDATION_COMPLETED = 'validation_completed',
    ORGANIZATION_COMPLETED = 'organization_completed',
    ERROR_OCCURRED = 'error_occurred'
}

export interface EventHandler {
    eventType: EventType;
    handler: (event: VaultEvent) => Promise<void> | void;
    priority: number;
    enabled: boolean;
}

export interface EventBus {
    subscribe(eventType: EventType, handler: EventHandler): string;
    unsubscribe(subscriptionId: string): void;
    publish(event: VaultEvent): void;
    getSubscriptions(eventType: EventType): EventHandler[];
}

// =============================================================================
// [ALERT_TYPES] - 2025-11-19
// =============================================================================

export interface Alert {
    id: string;
    type: AlertType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
    metadata?: Record<string, unknown>;
}

export enum AlertType {
    VAULT_HEALTH = 'vault_health',
    PERFORMANCE = 'performance',
    VALIDATION = 'validation',
    SYSTEM_ERROR = 'system_error',
    STORAGE = 'storage'
}

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    condition: string;
    alertType: AlertType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    cooldown: number; // minutes
}

// =============================================================================
// [NOTIFICATION_TYPES] - 2025-11-19
// =============================================================================

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    readAt?: Date;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}

export enum NotificationType {
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error'
}

export interface NotificationChannel {
    id: string;
    name: string;
    type: 'console' | 'file' | 'email' | 'webhook';
    enabled: boolean;
    config: Record<string, unknown>;
}
