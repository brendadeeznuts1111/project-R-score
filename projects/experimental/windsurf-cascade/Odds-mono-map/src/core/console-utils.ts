/**
 * Safe Console Utilities
 * Provides safe console operations with error boundaries and environment awareness
 * 
 * @fileoverview Console utilities that prevent crashes and provide environment-based control
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// Console configuration interface
interface ConsoleConfig {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    throttle: boolean;
    maxLogsPerSecond: number;
}

// Console throttling class
class ConsoleThrottler {
    private static instance: ConsoleThrottler;
    private logs: Map<string, number[]> = new Map();
    private readonly maxLogsPerSecond: number;

    constructor(maxLogsPerSecond: number = 50) {
        this.maxLogsPerSecond = maxLogsPerSecond;
    }

    static getInstance(maxLogsPerSecond?: number): ConsoleThrottler {
        if (!ConsoleThrottler.instance) {
            ConsoleThrottler.instance = new ConsoleThrottler(maxLogsPerSecond);
        }
        return ConsoleThrottler.instance;
    }

    canLog(key: string = 'default'): boolean {
        const now = Date.now();
        const timestamps = this.logs.get(key) || [];

        // Clean old timestamps (older than 1 second)
        const recent = timestamps.filter(t => now - t < 1000);

        if (recent.length >= this.maxLogsPerSecond) {
            return false;
        }

        recent.push(now);
        this.logs.set(key, recent);
        return true;
    }

    reset(): void {
        this.logs.clear();
    }
}

// Main safe console class
export class SafeConsole {
    private static config: ConsoleConfig;
    private static throttler: ConsoleThrottler;

    static initialize(config: Partial<ConsoleConfig> = {}): void {
        this.config = {
            enabled: process.env.NODE_ENV !== 'production',
            level: process.env.LOG_LEVEL as any || 'info',
            throttle: process.env.NODE_ENV === 'production',
            maxLogsPerSecond: process.env.NODE_ENV === 'production' ? 10 : 100,
            ...config
        };

        this.throttler = ConsoleThrottler.getInstance(this.config.maxLogsPerSecond);
    }

    private static isInitialized(): boolean {
        return !!this.config;
    }

    private static shouldLog(level: string): boolean {
        if (!this.isInitialized()) {
            this.initialize(); // Auto-initialize with defaults
        }

        if (!this.config.enabled) return false;
        if (this.config.throttle && !this.throttler.canLog(level)) return false;

        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.config.level);
    }

    private static safeConsoleCall(
        method: 'log' | 'error' | 'warn' | 'info' | 'debug',
        message: string,
        ...args: any[]
    ): void {
        try {
            // Check if console is available
            if (typeof console === 'undefined') {
                return;
            }

            // Check if specific console method exists
            const consoleMethod = console[method];
            if (!consoleMethod || typeof consoleMethod !== 'function') {
                return;
            }

            // Call the console method
            consoleMethod(message, ...args);
        } catch (error) {
            // Prevent infinite loops - silent fallback
            // In a production environment, you might want to log this to a file
            // but never to console to avoid infinite loops
        }
    }

    /**
     * Safe console.log with environment and throttling control
     */
    static log(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            this.safeConsoleCall('log', message, ...args);
        }
    }

    /**
     * Safe console.error with environment and throttling control
     */
    static error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            this.safeConsoleCall('error', message, ...args);
        }
    }

    /**
     * Safe console.warn with environment and throttling control
     */
    static warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            this.safeConsoleCall('warn', message, ...args);
        }
    }

    /**
     * Safe console.info with environment and throttling control
     */
    static info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            this.safeConsoleCall('info', message, ...args);
        }
    }

    /**
     * Safe console.debug with environment and throttling control
     */
    static debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            this.safeConsoleCall('debug', message, ...args);
        }
    }

    /**
     * Safe console.trace with environment and throttling control
     */
    static trace(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            this.safeConsoleCall('trace', message, ...args);
        }
    }

    /**
     * Check if console is available and working
     */
    static isAvailable(): boolean {
        try {
            return typeof console !== 'undefined';
        } catch {
            return false;
        }
    }

    /**
     * Get current console configuration
     */
    static getConfig(): ConsoleConfig {
        return { ...this.config };
    }

    /**
     * Update console configuration
     */
    static updateConfig(config: Partial<ConsoleConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Reset console throttling counters
     */
    static resetThrottling(): void {
        if (this.throttler) {
            this.throttler.reset();
        }
    }

    /**
     * Get throttling statistics
     */
    static getThrottlingStats(): { [key: string]: number } {
        if (!this.throttler) {
            return {};
        }

        const stats: { [key: string]: number } = {};
        // Note: This would need to be implemented in ConsoleThrottler
        // to expose the current log counts
        return stats;
    }
}

// Auto-initialize with default configuration
SafeConsole.initialize();

// Export default instance for convenience
export const safeConsole = SafeConsole;

// Export individual methods for direct use
export const {
    log,
    error,
    warn,
    info,
    debug,
    trace,
    isAvailable,
    getConfig,
    updateConfig,
    resetThrottling,
    getThrottlingStats
} = SafeConsole;

// Export throttler for advanced usage
export { ConsoleThrottler };

// Default export
export default SafeConsole;
