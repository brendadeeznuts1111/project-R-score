import { FeatureRegistry } from "./FeatureRegistry";
import { FeatureFlag, LogEntry, LogLevel, LogType } from "../config/types";

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private featureRegistry: FeatureRegistry;
  private externalServices: Map<string, (entry: LogEntry) => Promise<void>> =
    new Map();
  private level: LogLevel = LogLevel.INFO;
  private retention: number = 30;

  constructor(
    options: {
      featureRegistry?: FeatureRegistry;
      level?: LogLevel;
      externalServices?: string[];
      retention?: number;
    } = {}
  ) {
    this.featureRegistry = options.featureRegistry || new FeatureRegistry({});
    this.level = options.level || LogLevel.INFO;
    this.retention = options.retention || 30;

    // Initialize external logging services
    this.initializeExternalServices();
  }

  private initializeExternalServices(): void {
    // Elasticsearch integration
    this.externalServices.set("elasticsearch", async (entry: LogEntry) => {
      if (this.featureRegistry.isEnabled(FeatureFlag.FEAT_EXTENDED_LOGGING)) {
        // Simulate Elasticsearch logging
        console.log(`[ES] ${entry.level}: ${entry.message}`);
      }
    });

    // Splunk integration
    this.externalServices.set("splunk", async (entry: LogEntry) => {
      if (entry.type === LogType.SECURITY_EVENT) {
        // Simulate Splunk logging for security events
        console.log(`[SPLUNK] ${entry.level}: ${entry.message}`);
      }
    });

    // Datadog integration
    this.externalServices.set("datadog", async (entry: LogEntry) => {
      if (entry.type === LogType.INTEGRATION_EVENT) {
        // Simulate Datadog logging for integration events
        console.log(`[DD] ${entry.level}: ${entry.message}`);
      }
    });

    // Prometheus integration
    this.externalServices.set("prometheus", async (entry: LogEntry) => {
      if (entry.type === LogType.PERFORMANCE_METRIC) {
        // Simulate Prometheus metrics
        console.log(`[PROM] ${entry.level}: ${entry.message}`);
      }
    });

    // Sentry integration
    this.externalServices.set("sentry", async (entry: LogEntry) => {
      if (entry.type === LogType.ERROR_OCCURRED) {
        // Simulate Sentry error reporting
        console.log(`[SENTRY] ${entry.level}: ${entry.message}`);
      }
    });

    // CloudWatch integration
    this.externalServices.set("cloudwatch", async (entry: LogEntry) => {
      if (entry.type === LogType.HEALTH_CHECK) {
        // Simulate CloudWatch logging
        console.log(`[CW] ${entry.level}: ${entry.message}`);
      }
    });
  }

  private getLogPrefix(type: LogType): string {
    const prefixes: Record<LogType, string> = {
      [LogType.FEATURE_CHANGE]: "🔄 [FEATURE]",
      [LogType.SECURITY_EVENT]: "🔒 [SECURITY]",
      [LogType.INTEGRATION_EVENT]: "🔌 [INTEGRATION]",
      [LogType.PERFORMANCE_METRIC]: "📊 [PERFORMANCE]",
      [LogType.ERROR_OCCURRED]: "❌ [ERROR]",
      [LogType.AUDIT_TRAIL]: "📋 [AUDIT]",
      [LogType.HEALTH_CHECK]: "❤️ [HEALTH]",
    };
    return /*@__PURE__*/ prefixes[type] || "[UNKNOWN]";
  }

  private getRetentionDays(type: LogType): number {
    const retention: Record<LogType, number> = {
      [LogType.FEATURE_CHANGE]: 7,
      [LogType.SECURITY_EVENT]: 90,
      [LogType.INTEGRATION_EVENT]: 30,
      [LogType.PERFORMANCE_METRIC]: 30,
      [LogType.ERROR_OCCURRED]: 30,
      [LogType.AUDIT_TRAIL]: 365,
      [LogType.HEALTH_CHECK]: 7,
    };
    return retention[type] || 30;
  }

  async log(
    type: LogType,
    level: LogLevel,
    message: string,
    data?: any
  ): Promise<void> {
    // Filter by configured log level (only log if level >= this.level)
    if (this.getLevelValue(level) < this.getLevelValue(this.level)) {
      return; // Skip logging below configured level
    }

    const entry: LogEntry = {
      type,
      level,
      message,
      timestamp: new Date(),
      data,
      prefix: this.getLogPrefix(type),
    };

    // Add to internal log buffer
    this.logs.push(entry);

    // Maintain max log buffer size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with formatting
    const consoleMessage = `${entry.prefix} ${entry.message}`;
    this.consoleOutput(entry.level, consoleMessage);

    // Send to external services
    await this.sendToExternalServices(entry);

    // Trigger feature change logging if applicable
    if (type === LogType.FEATURE_CHANGE) {
      this.featureRegistry.onChange((flag, enabled) => {
        this.log(
          LogType.FEATURE_CHANGE,
          LogLevel.INFO,
          `Feature ${flag} ${enabled ? "enabled" : "disabled"}`,
          { flag, enabled }
        );
      });
    }
  }

  private consoleOutput(level: LogLevel, message: string): void {
    const timestamp = new Date().toISOString();

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] ${message}`);
        break;
      case LogLevel.INFO:
        console.info(`[${timestamp}] ${message}`);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] ${message}`);
        break;
      case LogLevel.ERROR:
        console.error(`[${timestamp}] ${message}`);
        break;
      case LogLevel.CRITICAL:
        console.error(`[${timestamp}] 🚨 CRITICAL: ${message}`);
        break;
    }
  }

  private async sendToExternalServices(entry: LogEntry): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [serviceName, service] of this.externalServices) {
      promises.push(
        service(entry).catch((err) => {
          console.error(`Failed to send log to ${serviceName}:`, err);
        })
      );
    }

    await Promise.allSettled(promises);
  }

  // Convenience methods for different log types
  async featureChange(message: string, data?: any): Promise<void> {
    await this.log(LogType.FEATURE_CHANGE, LogLevel.INFO, message, data);
  }

  async securityEvent(message: string, data?: any): Promise<void> {
    await this.log(LogType.SECURITY_EVENT, LogLevel.CRITICAL, message, data);
  }

  async integrationEvent(message: string, data?: any): Promise<void> {
    await this.log(LogType.INTEGRATION_EVENT, LogLevel.INFO, message, data);
  }

  async performanceMetric(message: string, data?: any): Promise<void> {
    await this.log(LogType.PERFORMANCE_METRIC, LogLevel.DEBUG, message, data);
  }

  async error(message: string, data?: any): Promise<void> {
    await this.log(LogType.ERROR_OCCURRED, LogLevel.ERROR, message, data);
  }

  async audit(message: string, data?: any): Promise<void> {
    await this.log(LogType.AUDIT_TRAIL, LogLevel.INFO, message, data);
  }

  async healthCheck(message: string, data?: any): Promise<void> {
    await this.log(LogType.HEALTH_CHECK, LogLevel.INFO, message, data);
  }

  // Use specific type methods instead: featureChange(), error(), audit(), healthCheck(), etc.

  // Query methods
  getLogs(type?: LogType, level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.logs;

    if (type) {
      filtered = filtered.filter((log) => log.type === type);
    }

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  getRecentLogs(minutes: number = 60): LogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter((log) => log.timestamp >= cutoff);
  }

  getLogsByFeature(flag: FeatureFlag): LogEntry[] {
    return this.logs.filter(
      (log) => log.data?.flag === flag || log.message.includes(flag)
    );
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(logs: LogEntry[], format: "json" | "csv" | "text" = "json"): string {
    switch (format) {
      case "json":
        return JSON.stringify(logs, null, 2);
      case "csv":
        const headers = ["timestamp", "type", "level", "message", "prefix"];
        const rows = logs.map((log) => [
          log.timestamp.toISOString(),
          log.type,
          log.level,
          log.message,
          log.prefix,
        ]);
        return [headers, ...rows].map((row) => row.join(",")).join("\n");
      case "text":
        return logs
          .map(
            (log) =>
              `${log.timestamp.toISOString()} ${log.prefix} ${log.message}`
          )
          .join("\n");
      default:
        return "";
    }
  }

  getLogStats(): {
    total: number;
    byType: Record<LogType, number>;
    byLevel: Record<LogLevel, number>;
    oldest: Date | null;
    newest: Date | null;
  } {
    const byType: Record<LogType, number> = {} as Record<LogType, number>;
    const byLevel: Record<LogLevel, number> = {} as Record<LogLevel, number>;

    Object.values(LogType).forEach((type) => (byType[type] = 0));
    Object.values(LogLevel).forEach((level) => (byLevel[level] = 0));

    this.logs.forEach((log) => {
      byType[log.type]++;
      byLevel[log.level]++;
    });

    return {
      total: this.logs.length,
      byType,
      byLevel,
      oldest: this.logs.length > 0 ? this.logs[0].timestamp : null,
      newest:
        this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
    };
  }

  tailLogs(): void {
    console.log("📋 Tailing logs (Press Ctrl+C to stop)...");

    const interval = setInterval(() => {
      const recentLogs = this.getRecentLogs(1);
      if (recentLogs.length > 0) {
        recentLogs.forEach((log) => {
          console.log(`${log.prefix} ${log.message}`);
        });
      }
    }, 1000);

    // Handle graceful shutdown
    if (typeof process !== "undefined") {
      process.on("SIGINT", () => {
        clearInterval(interval);
        console.log("\n📋 Log tailing stopped");
      });
    }
  }

  displayLogs(logs: LogEntry[]): void {
    console.log(`📋 Displaying ${logs.length} logs:`);
    console.log("=".repeat(80));

    logs.forEach((log) => {
      const timestamp = log.timestamp.toISOString();
      const color = this.getLevelColor(log.level);
      const reset = "\x1b[0m";
      console.log(
        `${color}[${timestamp}] ${log.prefix} ${log.message}${reset}`
      );
    });

    console.log("=".repeat(80));
  }

  async exportLogsToFormat(logs: LogEntry[], format: string): Promise<void> {
    let output: string;

    switch (format.toLowerCase()) {
      case "json":
        output = JSON.stringify(logs, null, 2);
        break;
      case "csv":
        const headers = ["timestamp", "type", "level", "message", "prefix"];
        const rows = logs.map((log) => [
          log.timestamp.toISOString(),
          log.type,
          log.level,
          log.message,
          log.prefix,
        ]);
        output = [headers, ...rows].map((row) => row.join(",")).join("\n");
        break;
      default:
        console.error(`❌ Unsupported export format: ${format}`);
        return;
    }

    console.log(output);
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "\x1b[36m"; // cyan
      case LogLevel.INFO:
        return "\x1b[32m"; // green
      case LogLevel.WARN:
        return "\x1b[33m"; // yellow
      case LogLevel.ERROR:
        return "\x1b[31m"; // red
      case LogLevel.CRITICAL:
        return "\x1b[35m"; // magenta
      default:
        return "\x1b[0m"; // reset
    }
  }

  private getLevelValue(level: LogLevel): number {
    const levelOrder: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.CRITICAL]: 4,
    };
    return levelOrder[level] || 0;
  }
}
