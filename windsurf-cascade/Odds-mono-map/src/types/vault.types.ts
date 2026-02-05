/**
 * 🏛️ Vault Type Definitions
 * 
 * Core type definitions for the Odds-mono-map vault system.
 */

export interface VaultConfig {
    version: string;
    created: string;
    lastModified: string;
    settings: VaultSettings;
    paths: VaultPaths;
    standards: VaultStandards;
}

export interface VaultSettings {
    autoOrganize: boolean;
    validateOnSave: boolean;
    enableMonitoring: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface VaultPaths {
    templates: string;
    dailyNotes: string;
    archive: string;
    logs: string;
}

export interface VaultStandards {
    namingConvention: 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case';
    dateFormat: string;
    templateValidation: boolean;
}

export interface VaultStatus {
    health: 'healthy' | 'unhealthy' | 'unknown';
    lastValidation: string | null;
    lastOrganization: string | null;
    lastModified?: string;
    issues: string[];
    metrics: VaultMetrics;
}

export interface VaultMetrics {
    totalFiles: number;
    organizedFiles: number;
    validatedFiles: number;
    errorCount: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    summary: ValidationSummary;
}

export interface ValidationSummary {
    filesChecked: number;
    errorsFound: number;
    warningsFound: number;
}

export interface VaultIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    file?: string;
    line?: number;
    timestamp: string;
}

export interface OrganizationResult {
    success: boolean;
    filesMoved: number;
    filesRenamed: number;
    errors: string[];
    summary: OrganizationSummary;
}

export interface OrganizationSummary {
    totalFiles: number;
    processedFiles: number;
    skippedFiles: number;
    duration: number;
}

export interface TemplateMetadata {
    name: string;
    version: string;
    description: string;
    author?: string;
    tags: string[];
    variables: TemplateVariable[];
    validation: TemplateValidation;
}

export interface TemplateVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    required: boolean;
    defaultValue?: any;
    description?: string;
}

export interface TemplateValidation {
    required: string[];
    forbidden: string[];
    patterns: { [key: string]: string };
    customRules: ValidationRule[];
}

export interface ValidationRule {
    name: string;
    description: string;
    pattern: RegExp;
    message: string;
    severity: 'error' | 'warning';
}

export interface MonitoringConfig {
    enabled: boolean;
    interval: number;
    watchPaths: string[];
    ignorePatterns: string[];
    notifications: NotificationConfig;
}

export interface NotificationConfig {
    email?: EmailNotification;
    webhook?: WebhookNotification;
    console: ConsoleNotification;
}

export interface EmailNotification {
    enabled: boolean;
    recipients: string[];
    subject: string;
}

export interface WebhookNotification {
    enabled: boolean;
    url: string;
    headers?: { [key: string]: string };
}

export interface ConsoleNotification {
    enabled: boolean;
    colors: boolean;
    timestamps: boolean;
}

export interface FileOperation {
    type: 'create' | 'update' | 'delete' | 'move' | 'rename';
    path: string;
    oldPath?: string;
    timestamp: string;
    size?: number;
    checksum?: string;
}

export interface VaultEvent {
    id: string;
    type: 'file_operation' | 'validation' | 'organization' | 'error';
    timestamp: string;
    data: any;
    metadata: EventMetadata;
}

export interface EventMetadata {
    source: string;
    version: string;
    userId?: string;
    sessionId: string;
}

export interface DashboardConfig {
    title: string;
    layout: DashboardLayout;
    widgets: DashboardWidget[];
    refreshInterval: number;
    theme: DashboardTheme;
}

export interface DashboardLayout {
    columns: number;
    rows: number;
    gap: number;
}

export interface DashboardWidget {
    id: string;
    type: 'metric' | 'chart' | 'table' | 'list' | 'text';
    title: string;
    position: WidgetPosition;
    config: WidgetConfig;
    dataSource: string;
}

export interface WidgetPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WidgetConfig {
    [key: string]: any;
}

export interface DashboardTheme {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
}

export interface ColorScheme {
    name: string;
    colors: { [key: string]: string };
    ansi: { [key: string]: string };
}

export interface ProcessingMetadata {
    processed: boolean;
    timestamp: string;
    version: string;
    checksum?: string;
    errors?: string[];
    warnings?: string[];
}

export interface ExportOptions {
    format: 'json' | 'yaml' | 'markdown' | 'csv';
    includeMetadata: boolean;
    compression: boolean;
    encryption: boolean;
}

export interface ImportOptions {
    format: 'json' | 'yaml' | 'markdown' | 'csv';
    overwrite: boolean;
    validateBeforeImport: boolean;
    createBackup: boolean;
}

export interface BackupConfig {
    enabled: boolean;
    interval: number;
    retention: number;
    destination: string;
    compression: boolean;
    encryption: boolean;
}

export interface PluginConfig {
    name: string;
    version: string;
    enabled: boolean;
    config: { [key: string]: any };
    dependencies: string[];
}
