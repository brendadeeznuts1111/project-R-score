// =============================================================================
// VAULT CONSTANTS - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-18T15:52:00Z
// DESCRIPTION: Centralized constants for vault system
// =============================================================================

// =============================================================================
// TIME CONSTANTS - 2025-11-18
// =============================================================================

export const TIME_CONSTANTS = {
    MILLISECONDS_PER_SECOND: 1000,
    SECONDS_PER_MINUTE: 60,
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,
    DAYS_PER_WEEK: 7,
    MILLISECONDS_PER_MINUTE: 60 * 1000,
    MILLISECONDS_PER_HOUR: 60 * 60 * 1000,
    MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
    FILE_CHANGE_DELAY: 1000,
    PERIODIC_VALIDATION_INTERVAL: 3600000, // 1 hour
    ONE_SECOND: 1000,
    ONE_MINUTE: 60 * 1000,
    FIVE_MINUTES: 5 * 60 * 1000,
    FIFTEEN_MINUTES: 15 * 60 * 1000,
    THIRTY_MINUTES: 30 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    TWO_HOURS: 2 * 60 * 60 * 1000,
    SIX_HOURS: 6 * 60 * 60 * 1000,
    TWELVE_HOURS: 12 * 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000,
    ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
    ONE_MONTH: 30 * 24 * 60 * 60 * 1000,

    // Monitoring intervals
    MONITOR_INTERVAL: 5000,
    CLEANUP_INTERVAL: 3600000,
    VALIDATION_INTERVAL: 86400000,
    FILE_CHANGE_DELAY: 1000,
    PERIODIC_VALIDATION_INTERVAL: 3600000,
} as const;

// ============================================================================
// SIZE CONSTANTS
// ============================================================================

export const SIZE_CONSTANTS = {
    BYTES_PER_KB: 1024,
    BYTES_PER_MB: 1024 * 1024,
    BYTES_PER_GB: 1024 * 1024 * 1024,

    MAX_FILE_SIZE: 10485760, // 10MB
    MAX_LINE_LENGTH: 100,
    MAX_FOLDER_DEPTH: 4,
    MAX_FILENAME_LENGTH: 100,

    LOG_MAX_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// =============================================================================
// PERFORMANCE CONSTANTS - 2025-11-18
// =============================================================================

export const PERFORMANCE_CONSTANTS = {
    MAX_TASKS_TO_SHOW: 100,
    MAX_AUTO_SUGGEST_ITEMS: 25,
    MIN_AUTO_SUGGEST_MATCH: 0,
    MAX_QUERY_TIME: 5000,
    MAX_PLUGIN_LOAD_TIME: 3000,

    CACHE_TTL: 300, // 5 minutes
    CACHE_MAX_SIZE: 1000,
    LAZY_LOADING_THRESHOLD: 100,
    BATCH_SIZE: 50,

    DEFAULT_URGENCY: '0',
    URGENCY_OFFSET: '3',
} as const;

// ============================================================================
// VAULT STRUCTURE CONSTANTS
// ============================================================================

export const VAULT_STRUCTURE = {
    REQUIRED_FOLDERS: [
        '00 - Dashboard',
        '01 - Daily Notes',
        '02 - Architecture',
        '03 - Development',
        '04 - Documentation',
        '05 - Assets',
        '06 - Templates',
        '07 - Archive'
    ],

    FILENAME_PATTERN: '^(\\d{2}) - (.+)\\.(md|canvas|excalidraw)$',
    FOLDER_PATTERN: '^(\\d{2}) - (.+)$',

    ALLOWED_FILENAME_CHARS: [
        'a-zA-Z0-9', ' ', '-', '_', '(', ')', '[', ']'
    ],

    FORBIDDEN_FILENAMES: [
        'README.md',
        'index.md',
        'main.md'
    ],

    REQUIRED_FRONTMATTER: [
        'type',
        'title',
        'section',
        'category',
        'priority',
        'status',
        'tags',
        'created',
        'updated',
        'author'
    ],
} as const;

// ============================================================================
// TASK STATUS CONSTANTS
// ============================================================================

export const TASK_STATUSES = {
    CORE: {
        TODO: { symbol: ' ', name: 'Todo', type: 'TODO' },
        DONE: { symbol: 'x', name: 'Done', type: 'DONE' },
    },

    CUSTOM: {
        IN_PROGRESS: { symbol: '/', name: 'In Progress', type: 'IN_PROGRESS' },
        CANCELLED: { symbol: '-', name: 'Cancelled', type: 'CANCELLED' },
        BLOCKED: { symbol: '>', name: 'Blocked', type: 'TODO' },
        QUESTION: { symbol: '?', name: 'Question', type: 'TODO' },
        IMPORTANT: { symbol: '!', name: 'Important', type: 'TODO' },
        STARRED: { symbol: '*', name: 'Starred', type: 'TODO' },
        IDEA: { symbol: 'i', name: 'Idea', type: 'TODO' },
        BACKLOG: { symbol: 'b', name: 'Backlog', type: 'TODO' },
        PLANNING: { symbol: 'p', name: 'Planning', type: 'TODO' },
        CODE_REVIEW: { symbol: 'c', name: 'Code Review', type: 'IN_PROGRESS' },
        DEPLOYED: { symbol: 'd', name: 'Deployed', type: 'DONE' },
    },
} as const;

// ============================================================================
// ERROR SEVERITY CONSTANTS
// ============================================================================

export const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
} as const;

// ============================================================================
// LOG LEVEL CONSTANTS
// ============================================================================

export const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
} as const;

// ============================================================================
// PLUGIN CONSTANTS
// ============================================================================

export const PLUGIN_CONSTANTS = {
    TASKS: {
        GLOBAL_QUERY: 'not done',
        GLOBAL_FILTER: '#task',
        TASK_FORMAT: 'tasksPluginEmoji',
        FILENAME_DATE_FORMAT: 'YYYY-MM-DD',
        FILENAME_DATE_FOLDERS: [
            '01 - Daily Notes',
            '02 - Projects',
            '03 - Development'
        ],
    },

    EXPORT: {
        SITE_NAME: 'Odds Protocol Knowledge Vault',
        EXPORT_PRESET: 'online',
    },

    TEMPLATER: {
        TEMPLATES_FOLDER: '06 - Templates',
        USER_SCRIPTS_FOLDER: 'scripts',
        SHELL_PATH: '/bin/bash',
    },

    DATAVIEW: {
        QUERY_TIMEOUT: 60,
        INLINE_FIELD_PREFIX: '$',
    },
} as const;

// ============================================================================
// AUTOMATION CONSTANTS
// ============================================================================

export const AUTOMATION_CONSTANTS = {
    CLEANUP_SCHEDULE: '0 2 * * 0', // 2 AM every Sunday

    ORGANIZATION_RULES: [
        {
            name: 'Daily Notes',
            pattern: '^\\d{4}-\\d{2}-\\d{2}',
            targetFolder: '01 - Daily Notes',
            priority: 1,
        },
        {
            name: 'Projects',
            pattern: '.*project.*',
            targetFolder: '02 - Projects',
            priority: 2,
        },
        {
            name: 'Development',
            pattern: '.*\\.(ts|js|py|java|cpp|c)$',
            targetFolder: '03 - Development',
            priority: 3,
        },
    ],

    VALIDATION_RULES: [
        {
            name: 'YAML Frontmatter',
            type: 'metadata',
            severity: 'error',
            enabled: true,
        },
        {
            name: 'File Naming',
            type: 'structure',
            severity: 'warning',
            enabled: true,
        },
        {
            name: 'Heading Structure',
            type: 'content',
            severity: 'error',
            enabled: true,
        },
    ],

    CLEANUP_RULES: [
        {
            name: 'Old Daily Notes',
            type: 'archive',
            condition: 'age > 365',
            age: 365,
            targetFolder: '07 - Archive/Daily Notes',
        },
        {
            name: 'Temp Files',
            type: 'delete',
            condition: 'age > 7',
            age: 7,
        },
    ],
} as const;

// ============================================================================
// DISPLAY CONSTANTS
// ============================================================================

export const DISPLAY_CONSTANTS = {
    SEPARATOR_LENGTH: 50,
    PROGRESS_BAR_LENGTH: 40,
    TABLE_COLUMN_WIDTHS: {
        NAME: 30,
        SIZE: 10,
        MODIFIED: 20,
        STATUS: 15,
    },

    COLORS: {
        SUCCESS: 'green',
        WARNING: 'yellow',
        ERROR: 'red',
        INFO: 'blue',
        GRAY: 'gray',
    },

    ICONS: {
        SUCCESS: '✅',
        ERROR: '❌',
        WARNING: '⚠️',
        INFO: 'ℹ️',
        LOADING: '⏳',
        FOLDER: '📁',
        FILE: '📄',
        CODE: '💻',
        CHART: '📊',
    },
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_CONSTANTS = {
    COMPLIANCE_THRESHOLDS: {
        EXCELLENT: 90,
        GOOD: 75,
        FAIR: 60,
        POOR: 40,
    },

    QUALITY_METRICS: {
        MAX_HEADING_DEPTH: 6,
        MIN_HEADING_GAP: 1,
        MAX_CONSECUTIVE_EMPTY_LINES: 2,
        MIN_CONTENT_LENGTH: 50,
    },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / TIME_CONSTANTS.MILLISECONDS_PER_SECOND);
    const minutes = Math.floor(seconds / TIME_CONSTANTS.SECONDS_PER_MINUTE);
    const hours = Math.floor(minutes / TIME_CONSTANTS.MINUTES_PER_HOUR);

    if (hours > 0) {
        return `${hours}h ${minutes % TIME_CONSTANTS.MINUTES_PER_HOUR}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % TIME_CONSTANTS.SECONDS_PER_MINUTE}s`;
    } else {
        return `${seconds}s`;
    }
};

export const formatFileSize = (bytes: number): string => {
    if (bytes < SIZE_CONSTANTS.BYTES_PER_KB) {
        return `${bytes} B`;
    } else if (bytes < SIZE_CONSTANTS.BYTES_PER_MB) {
        return `${(bytes / SIZE_CONSTANTS.BYTES_PER_KB).toFixed(1)} KB`;
    } else {
        return `${(bytes / SIZE_CONSTANTS.BYTES_PER_MB).toFixed(1)} MB`;
    }
};

export const calculatePercentage = (value: number, total: number): number => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
};

// =============================================================================
// BUN NATIVE UTILITIES - 2025-11-18
// =============================================================================

/**
 * Format tabular data into a string using Bun.inspect.table
 * Like console.table, but returns a string for logging/storage
 */
export const formatTable = <T extends Record<string, unknown>>(
    data: T[],
    properties?: (keyof T)[],
    options?: { colors?: boolean }
): string => {
    return Bun.inspect.table(data, properties as string[], options);
};

/**
 * High-precision timing using Bun.nanoseconds()
 * Returns nanoseconds since process started
 */
export const getHighPrecisionTime = (): number => {
    return Bun.nanoseconds();
};

/**
 * Format nanoseconds into human-readable duration
 */
export const formatNanoseconds = (nanoseconds: number): string => {
    const microseconds = nanoseconds / 1000;
    const milliseconds = microseconds / 1000;
    const seconds = milliseconds / 1000;

    if (nanoseconds < 1000) {
        return `${nanoseconds}ns`;
    } else if (microseconds < 1000) {
        return `${microseconds.toFixed(1)}μs`;
    } else if (milliseconds < 1000) {
        return `${milliseconds.toFixed(1)}ms`;
    } else {
        return `${seconds.toFixed(2)}s`;
    }
};

/**
 * Performance measurement utility using Bun.nanoseconds()
 */
export class PerformanceTimer {
    private startTime: number;
    private endTime?: number;

    constructor() {
        this.startTime = getHighPrecisionTime();
    }

    stop(): number {
        this.endTime = getHighPrecisionTime();
        return this.duration;
    }

    get duration(): number {
        return (this.endTime || getHighPrecisionTime()) - this.startTime;
    }

    get formattedDuration(): string {
        return formatNanoseconds(this.duration);
    }

    reset(): void {
        this.startTime = getHighPrecisionTime();
        this.endTime = undefined;
    }
}

/**
 * Create a performance timer for measuring execution time
 */
export const createTimer = (): PerformanceTimer => {
    return new PerformanceTimer();
};

/**
 * Measure execution time of a function using Bun.nanoseconds()
 */
export const measureExecution = async <T>(
    fn: () => Promise<T> | T,
    label?: string
): Promise<{ result: T; duration: number; formattedDuration: string }> => {
    const timer = createTimer();

    try {
        const result = await fn();
        timer.stop();

        if (label) {
            console.log(`${label}: ${timer.formattedDuration}`);
        }

        return {
            result,
            duration: timer.duration,
            formattedDuration: timer.formattedDuration
        };
    } catch (error) {
        timer.stop();
        throw error;
    }
};

// =============================================================================
// EXPORT ALL CONSTANTS - 2025-11-18
// =============================================================================

export default {
    TIME_CONSTANTS,
    SIZE_CONSTANTS,
    PERFORMANCE_CONSTANTS,
    VAULT_STRUCTURE,
    TASK_STATUSES,
    ERROR_SEVERITY,
    LOG_LEVELS,
    PLUGIN_CONSTANTS,
    AUTOMATION_CONSTANTS,
    DISPLAY_CONSTANTS,
    VALIDATION_CONSTANTS,
    formatDuration,
    formatFileSize,
    calculatePercentage,
    // Bun-native utilities
    formatTable,
    getHighPrecisionTime,
    formatNanoseconds,
    PerformanceTimer,
    createTimer,
    measureExecution,
};
