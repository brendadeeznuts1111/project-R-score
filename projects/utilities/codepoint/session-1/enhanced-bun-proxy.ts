#!/usr/bin/env bun

// 🔧 Enhanced Bun Proxy API - Fixed TypeScript & Improved Naming
import type {
  BufferConfiguration,
  CustomMetricDefinition,
  HealthCheckConfiguration,
  HealthStatus,
  StatisticsConfiguration,
  TLSCertificateConfiguration,
  ValidationResult,
  ValidationRule,
} from "./enhanced-proxy-types";

// Enhanced type definitions with better naming
interface EnhancedProxyServerConfiguration {
  // Server Configuration
  listenHost: string;
  listenPort: number;
  targetEndpointUrl: string;
  serverName: string;
  environment: "development" | "staging" | "production";

  // Connection Management
  maximumConnections: number;
  idleConnectionTimeout: number;
  heartbeatInterval: number;
  enableConnectionCompression: boolean;

  // Buffer Configuration
  enableMessageBuffering: boolean;
  bufferConfiguration?: BufferConfiguration;

  // Health Check Configuration
  healthCheckConfiguration: HealthCheckConfiguration;

  // Statistics Configuration
  statisticsConfiguration: StatisticsConfiguration;

  // TLS/SSL Configuration
  tlsConfiguration?: TLSCertificateConfiguration;

  // Performance Tuning
  maximumPayloadSizeBytes: number;
  backpressureThreshold: number;
  reconnectAttemptCount: number;
  reconnectDelayMilliseconds: number;

  // Security Configuration
  enableCors: boolean;
  corsConfiguration?: CorsConfiguration;
  authenticationConfiguration?: AuthenticationConfiguration;
  rateLimitingConfiguration?: RateLimitConfiguration;
}

interface EnhancedConnectionStatistics {
  activeConnections: number;
  totalConnections: number;
  messagesProcessed: number;
  averageLatency: number;
  errorCount: number;
  uptimeMilliseconds: number;
  memoryUsageBytes: number;
  cpuUsagePercentage: number;
  requestRatePerSecond: number;
  errorRatePercentage: number;
  bufferSize: number;
  bufferOverflowCount: number;
}

interface EnhancedBufferConfiguration {
  maximumBufferSize: number;
  maximumMessageAgeMilliseconds: number;
  enableMessageReplay: boolean;
  maximumReplayAgeMilliseconds: number;
  enablePersistentStorage: boolean;
  storageDirectoryPath: string;
  messageTransformationFunction?: (message: any) => any;
  overflowHandlingStrategy: "dropOldest" | "dropNewest" | "throwError";
  enableCompression: boolean;
  enableEncryption: boolean;
  partitionKey?: string;
  messageFilterFunction?: (message: any) => boolean;
}

interface EnhancedHealthCheckConfiguration {
  isEnabled: boolean;
  healthEndpointPath: string;
  checkIntervalMilliseconds: number;
  checkTimeoutMilliseconds: number;
  unhealthyThresholdCount: number;
  healthyThresholdCount: number;
  pingIntervalMilliseconds: number;
  pingMessageContent: string;
  customHealthChecks: Array<EnhancedHealthCheckFunction>;
  externalDependencyUrls: string[];
  onStatusChangeCallback?: (status: HealthStatus) => void;
  exposeDetailedInformation: boolean;
}

interface EnhancedStatisticsConfiguration {
  collectionIntervalMilliseconds: number;
  dataRetentionPeriodMilliseconds: number;
  maximumSampleCount: number;
  enableLatencyHistogram: boolean;
  enablePerTopicStatistics: boolean;
  enableConnectionStatistics: boolean;
  enableResourceStatistics: boolean;
  exportFormat: "json" | "prometheus" | "csv";
  exportDirectoryPath: string;
  customMetricDefinitions: Array<CustomMetricDefinition>;
  anonymizeData: boolean;
  enableRealTimeUpdates: boolean;
}

interface CorsConfiguration {
  allowedOrigins: string | string[] | boolean | RegExp;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  allowCredentials: boolean;
  maxAgeSeconds: number;
  continuePreflightRequests: boolean;
  optionsSuccessStatusCode: number;
}

interface AuthenticationConfiguration {
  authenticationType: "bearer" | "basic" | "api-key" | "jwt";
  tokenValue?: string;
  username?: string;
  password?: string;
  jwtSecret?: string;
}

interface RateLimitConfiguration {
  requestsPerWindow: number;
  windowDurationMilliseconds: number;
  delayMilliseconds: number;
  excludeFailedRequests: boolean;
  excludeSuccessfulRequests: boolean;
  keyGeneratorFunction?: (request: any) => string;
  rateLimitHandler?: (request: any, response: any) => void;
  onRateLimitExceededCallback?: (request: any, response: any) => void;
  trustProxyHeaders: boolean;
  storageBackend: RateLimitStorage;
}

interface RateLimitStorage {
  type: "memory" | "redis" | "database";
  connection?: any;
  cleanupIntervalMilliseconds: number;
}

interface EnhancedHealthCheckFunction {
  (): Promise<EnhancedHealthCheckResult>;
}

interface EnhancedHealthCheckResult {
  status: HealthStatus;
  latencyMilliseconds: number;
  timestamp: Date;
  details?: Record<string, any>;
}

// Enhanced Proxy Server Class with better naming
export class EnhancedProxyServer {
  private connectionManager: EnhancedConnectionManager;
  private healthChecker: EnhancedHealthChecker;
  private statisticsCollector: EnhancedStatisticsCollector;
  private messageBuffer?: EnhancedMessageBuffer;
  private isServerRunning: boolean = false;

  constructor(private serverConfiguration: EnhancedProxyServerConfiguration) {
    this.validateServerConfiguration(serverConfiguration);
    this.connectionManager = new EnhancedConnectionManager(
      serverConfiguration.maximumConnections,
      serverConfiguration.idleConnectionTimeout
    );

    this.healthChecker = new EnhancedHealthChecker(
      serverConfiguration.healthCheckConfiguration
    );

    this.statisticsCollector = new EnhancedStatisticsCollector(
      serverConfiguration.statisticsConfiguration
    );

    if (serverConfiguration.enableMessageBuffering) {
      this.messageBuffer = new EnhancedMessageBuffer(
        serverConfiguration.bufferConfiguration!
      );
    }
  }

  private validateServerConfiguration(
    config: EnhancedProxyServerConfiguration
  ): void {
    if (!config.targetEndpointUrl) {
      throw new EnhancedProxyError(
        "Target endpoint URL is required",
        undefined,
        "MISSING_ENDPOINT_URL"
      );
    }

    if (config.maximumConnections <= 0) {
      throw new EnhancedProxyError(
        "Maximum connections must be greater than 0",
        undefined,
        "INVALID_CONNECTION_LIMIT"
      );
    }

    if (config.idleConnectionTimeout < 1000) {
      throw new EnhancedProxyError(
        "Idle connection timeout must be at least 1000ms",
        undefined,
        "INVALID_TIMEOUT"
      );
    }

    if (config.listenPort < 1 || config.listenPort > 65535) {
      throw new EnhancedProxyError(
        "Listen port must be between 1 and 65535",
        undefined,
        "INVALID_PORT"
      );
    }
  }

  async startProxyServer(): Promise<void> {
    if (this.isServerRunning) {
      throw new EnhancedProxyError(
        "Proxy server is already running",
        undefined,
        "SERVER_ALREADY_RUNNING"
      );
    }

    try {
      await this.healthChecker.initializeHealthChecker();
      await this.statisticsCollector.startStatisticsCollection();
      this.isServerRunning = true;

      console.log(
        `✅ Enhanced proxy server started on ${this.serverConfiguration.listenHost}:${this.serverConfiguration.listenPort}`
      );
      console.log(
        `🎯 Target endpoint: ${this.serverConfiguration.targetEndpointUrl}`
      );
      console.log(`📊 Server name: ${this.serverConfiguration.serverName}`);
      console.log(`🌍 Environment: ${this.serverConfiguration.environment}`);
    } catch (startError) {
      throw new EnhancedProxyError(
        "Failed to start enhanced proxy server",
        startError as Error,
        "SERVER_START_FAILED"
      );
    }
  }

  async stopProxyServer(): Promise<void> {
    if (!this.isServerRunning) {
      return;
    }

    try {
      await this.connectionManager.closeAllActiveConnections();
      await this.healthChecker.terminateHealthChecker();
      await this.statisticsCollector.stopStatisticsCollection();
      this.isServerRunning = false;

      console.log("🛑 Enhanced proxy server stopped successfully");
    } catch (stopError) {
      throw new EnhancedProxyError(
        "Failed to stop enhanced proxy server gracefully",
        stopError as Error,
        "SERVER_STOP_FAILED"
      );
    }
  }

  getEnhancedServerStatistics(): EnhancedConnectionStatistics {
    const baseStatistics = this.connectionManager.getConnectionStatistics();
    const performanceStatistics =
      this.statisticsCollector.getPerformanceStatistics();

    return {
      activeConnections: baseStatistics.activeConnections,
      totalConnections: baseStatistics.totalConnections,
      messagesProcessed: performanceStatistics.messagesProcessed,
      averageLatency: performanceStatistics.averageLatency,
      errorCount: performanceStatistics.errorCount,
      uptimeMilliseconds: performanceStatistics.uptimeMilliseconds,
      memoryUsageBytes: performanceStatistics.memoryUsageBytes,
      cpuUsagePercentage: performanceStatistics.cpuUsagePercentage,
      requestRatePerSecond: performanceStatistics.requestRatePerSecond,
      errorRatePercentage: performanceStatistics.errorRatePercentage,
      bufferSize: this.messageBuffer?.getCurrentBufferSize() || 0,
      bufferOverflowCount: this.messageBuffer?.getOverflowCount() || 0,
    };
  }

  updateServerConfiguration(
    newConfiguration: Partial<EnhancedProxyServerConfiguration>
  ): void {
    this.serverConfiguration = {
      ...this.serverConfiguration,
      ...newConfiguration,
    };
    this.validateServerConfiguration(this.serverConfiguration);

    console.log("🔧 Server configuration updated successfully");
  }

  getServerHealthStatus(): HealthStatus {
    return this.healthChecker.getCurrentHealthStatus();
  }

  async performHealthCheck(): Promise<EnhancedHealthCheckResult> {
    return await this.healthChecker.executeHealthCheck();
  }
}

// Enhanced Connection Manager
class EnhancedConnectionManager {
  private activeConnectionCount: number = 0;
  private totalConnectionCount: number = 0;
  private connectionRegistry: Map<string, EnhancedConnectionData> = new Map();

  constructor(
    private maximumConnections: number,
    private idleConnectionTimeout: number
  ) {}

  registerNewConnection(connectionId: string): boolean {
    if (this.activeConnectionCount >= this.maximumConnections) {
      return false;
    }

    const connectionData: EnhancedConnectionData = {
      connectionId,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      requestCount: 0,
      isActive: true,
    };

    this.connectionRegistry.set(connectionId, connectionData);
    this.activeConnectionCount++;
    this.totalConnectionCount++;

    return true;
  }

  closeConnection(connectionId: string): void {
    const connection = this.connectionRegistry.get(connectionId);
    if (connection) {
      connection.isActive = false;
      connection.closedAt = new Date();
      this.activeConnectionCount--;
    }
  }

  async closeAllActiveConnections(): Promise<void> {
    const activeConnections = Array.from(
      this.connectionRegistry.values()
    ).filter((conn) => conn.isActive);

    for (const connection of activeConnections) {
      this.closeConnection(connection.connectionId);
    }

    console.log(`🔌 Closed ${activeConnections.length} active connections`);
  }

  getConnectionStatistics(): EnhancedConnectionStatistics {
    return {
      activeConnections: this.activeConnectionCount,
      totalConnections: this.totalConnectionCount,
      messagesProcessed: 0,
      averageLatency: 0,
      errorCount: 0,
      uptimeMilliseconds: 0,
      memoryUsageBytes: 0,
      cpuUsagePercentage: 0,
      requestRatePerSecond: 0,
      errorRatePercentage: 0,
      bufferSize: 0,
      bufferOverflowCount: 0,
    };
  }

  getActiveConnectionCount(): number {
    return this.activeConnectionCount;
  }

  getTotalConnectionCount(): number {
    return this.totalConnectionCount;
  }
}

interface EnhancedConnectionData {
  connectionId: string;
  createdAt: Date;
  lastUsedAt: Date;
  requestCount: number;
  isActive: boolean;
  closedAt?: Date;
}

// Enhanced Health Checker
class EnhancedHealthChecker {
  private currentHealthStatus: HealthStatus = "healthy";
  private healthCheckInterval?: ReturnType<typeof setInterval>;

  constructor(
    private healthCheckConfiguration: EnhancedHealthCheckConfiguration
  ) {}

  async initializeHealthChecker(): Promise<void> {
    if (this.healthCheckConfiguration.isEnabled) {
      this.healthCheckInterval = setInterval(
        () => this.performPeriodicHealthCheck(),
        this.healthCheckConfiguration.checkIntervalMilliseconds
      );

      console.log("🏥 Enhanced health checker initialized");
    }
  }

  async terminateHealthChecker(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    console.log("🏥 Enhanced health checker terminated");
  }

  getCurrentHealthStatus(): HealthStatus {
    return this.currentHealthStatus;
  }

  async executeHealthCheck(): Promise<EnhancedHealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simulate health check logic
      const isHealthy = await this.performHealthCheckValidation();
      const latency = Date.now() - startTime;

      const newStatus = isHealthy ? "healthy" : "unhealthy";

      if (newStatus !== this.currentHealthStatus) {
        const previousStatus = this.currentHealthStatus;
        this.currentHealthStatus = newStatus;

        this.healthCheckConfiguration.onStatusChangeCallback?.(newStatus);

        console.log(
          `🏥 Health status changed: ${previousStatus} → ${newStatus}`
        );
      }

      return {
        status: this.currentHealthStatus,
        latencyMilliseconds: latency,
        timestamp: new Date(),
        details: {
          checksPerformed:
            this.healthCheckConfiguration.customHealthChecks.length,
          lastCheckTime: new Date().toISOString(),
        },
      };
    } catch (healthCheckError) {
      return {
        status: "unhealthy",
        latencyMilliseconds: Date.now() - startTime,
        timestamp: new Date(),
        details: {
          error: (healthCheckError as Error).message,
        },
      };
    }
  }

  private async performPeriodicHealthCheck(): Promise<void> {
    await this.executeHealthCheck();
  }

  private async performHealthCheckValidation(): Promise<boolean> {
    // Simulate health check validation
    return true;
  }
}

// Enhanced Statistics Collector
class EnhancedStatisticsCollector {
  private statisticsStartTime: Date = new Date();
  private messagesProcessedCount: number = 0;
  private totalErrorCount: number = 0;
  private latencyMeasurements: number[] = [];

  constructor(
    private statisticsConfiguration: EnhancedStatisticsConfiguration
  ) {}

  async startStatisticsCollection(): Promise<void> {
    console.log("📊 Enhanced statistics collector started");
  }

  async stopStatisticsCollection(): Promise<void> {
    console.log("📊 Enhanced statistics collector stopped");
  }

  getPerformanceStatistics(): EnhancedPerformanceStatistics {
    const uptime = Date.now() - this.statisticsStartTime.getTime();
    const averageLatency =
      this.latencyMeasurements.length > 0
        ? this.latencyMeasurements.reduce((sum, latency) => sum + latency, 0) /
          this.latencyMeasurements.length
        : 0;

    return {
      messagesProcessed: this.messagesProcessedCount,
      averageLatency,
      errorCount: this.totalErrorCount,
      uptimeMilliseconds: uptime,
      memoryUsageBytes: process.memoryUsage().heapUsed,
      cpuUsagePercentage: 0, // Would need actual CPU monitoring
      requestRatePerSecond: this.messagesProcessedCount / (uptime / 1000),
      errorRatePercentage:
        this.messagesProcessedCount > 0
          ? (this.totalErrorCount / this.messagesProcessedCount) * 100
          : 0,
    };
  }

  recordMessageProcessed(latency?: number): void {
    this.messagesProcessedCount++;
    if (latency) {
      this.latencyMeasurements.push(latency);
    }
  }

  recordError(): void {
    this.totalErrorCount++;
  }
}

interface EnhancedPerformanceStatistics {
  messagesProcessed: number;
  averageLatency: number;
  errorCount: number;
  uptimeMilliseconds: number;
  memoryUsageBytes: number;
  cpuUsagePercentage: number;
  requestRatePerSecond: number;
  errorRatePercentage: number;
}

// Enhanced Message Buffer
class EnhancedMessageBuffer {
  private messageQueue: any[] = [];
  private overflowCounter: number = 0;

  constructor(private bufferConfiguration: EnhancedBufferConfiguration) {
    console.log("📦 Enhanced message buffer initialized");
  }

  addMessageToBuffer(message: any): boolean {
    if (
      this.messageQueue.length >= this.bufferConfiguration.maximumBufferSize
    ) {
      this.handleBufferOverflow();
      return false;
    }

    this.messageQueue.push({
      message,
      timestamp: new Date(),
      id: this.generateMessageId(),
    });

    return true;
  }

  getMessagesFromBuffer(count?: number): any[] {
    if (count) {
      return this.messageQueue.splice(0, count);
    }
    return this.messageQueue.splice(0);
  }

  getCurrentBufferSize(): number {
    return this.messageQueue.length;
  }

  getOverflowCount(): number {
    return this.overflowCounter;
  }

  private handleBufferOverflow(): void {
    switch (this.bufferConfiguration.overflowHandlingStrategy) {
      case "dropOldest":
        this.messageQueue.shift();
        break;
      case "dropNewest":
        return; // Don't add the new message
      case "throwError":
        throw new EnhancedProxyError(
          "Buffer overflow",
          undefined,
          "BUFFER_OVERFLOW"
        );
    }

    this.overflowCounter++;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Enhanced Proxy Error Class
export class EnhancedProxyError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
    public readonly errorCode: string = "ENHANCED_PROXY_ERROR"
  ) {
    super(message);
    this.name = "EnhancedProxyError";

    if (originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

// Enhanced Factory Function
export function createEnhancedProxyServer(
  configuration: EnhancedProxyServerConfiguration
): EnhancedProxyServer {
  return new EnhancedProxyServer(configuration);
}

// Enhanced Utility Functions
export function formatEnhancedByteSize(
  bytes: number,
  decimalPlaces: number = 2
): string {
  if (bytes === 0) return "0 Bytes";

  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;
  const terabyte = gigabyte * 1024;

  if (bytes < kilobyte) {
    return `${bytes} Bytes`;
  } else if (bytes < megabyte) {
    return `${(bytes / kilobyte).toFixed(decimalPlaces)} KB`;
  } else if (bytes < gigabyte) {
    return `${(bytes / megabyte).toFixed(decimalPlaces)} MB`;
  } else if (bytes < terabyte) {
    return `${(bytes / gigabyte).toFixed(decimalPlaces)} GB`;
  } else {
    return `${(bytes / terabyte).toFixed(decimalPlaces)} TB`;
  }
}

export function formatEnhancedTimeDuration(
  milliseconds: number,
  includeMilliseconds: boolean = false
): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingMilliseconds = milliseconds % 1000;
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;
  const remainingHours = hours % 24;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  if (includeMilliseconds && remainingMilliseconds > 0) {
    parts.push(`${remainingMilliseconds}ms`);
  }

  return parts.length > 0 ? parts.join(" ") : "0s";
}

export function validateEnhancedConfiguration(
  configuration: any,
  validationRules: ValidationRule[]
): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  for (const rule of validationRules) {
    try {
      const result = rule.validate(configuration);
      if (!result.isValid) {
        if (rule.severity === "error") {
          errors.push({
            field: rule.fieldName,
            message: result.message,
            code: result.code,
          });
        } else {
          warnings.push({
            field: rule.fieldName,
            message: result.message,
            code: result.code,
          });
        }
      }
    } catch (error) {
      errors.push({
        field: rule.fieldName,
        message: `Validation failed: ${(error as Error).message}`,
        code: "VALIDATION_ERROR",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date(),
  };
}

// Demo and Usage Examples
async function demonstrateEnhancedProxyServer() {
  console.log("🚀 Enhanced Bun Proxy Server Demo");
  console.log("================================\n");

  // Enhanced configuration with better naming
  const enhancedConfiguration: EnhancedProxyServerConfiguration = {
    listenHost: "0.0.0.0",
    listenPort: 8080,
    targetEndpointUrl: "wss://backend-service.example.com/websocket",
    serverName: "EnhancedProductionProxy",
    environment: "production",

    // Connection Management
    maximumConnections: 10000,
    idleConnectionTimeout: 60000,
    heartbeatInterval: 30000,
    enableConnectionCompression: true,

    // Buffer Configuration
    enableMessageBuffering: true,
    bufferConfiguration: {
      maximumBufferSize: 1000,
      maximumMessageAgeMilliseconds: 60000,
      enableMessageReplay: true,
      maximumReplayAgeMilliseconds: 30000,
      enablePersistentStorage: false,
      storageDirectoryPath: "./message-buffers",
      overflowHandlingStrategy: "dropOldest",
      enableCompression: true,
      enableEncryption: false,
    },

    // Health Check Configuration
    healthCheckConfiguration: {
      isEnabled: true,
      healthEndpointPath: "/health",
      checkIntervalMilliseconds: 30000,
      checkTimeoutMilliseconds: 5000,
      unhealthyThresholdCount: 3,
      healthyThresholdCount: 2,
      pingIntervalMilliseconds: 25000,
      pingMessageContent: "ping",
      customHealthChecks: [],
      externalDependencyUrls: [],
      exposeDetailedInformation: true,
    },

    // Statistics Configuration
    statisticsConfiguration: {
      collectionIntervalMilliseconds: 5000,
      dataRetentionPeriodMilliseconds: 3600000,
      maximumSampleCount: 1000,
      enableLatencyHistogram: true,
      enablePerTopicStatistics: false,
      enableConnectionStatistics: true,
      enableResourceStatistics: true,
      exportFormat: "json",
      exportDirectoryPath: "./statistics",
      customMetricDefinitions: [],
      anonymizeData: false,
      enableRealTimeUpdates: true,
    },

    // Performance Tuning
    maximumPayloadSizeBytes: 1048576,
    backpressureThreshold: 1024,
    reconnectAttemptCount: 3,
    reconnectDelayMilliseconds: 1000,

    // Security Configuration
    enableCors: true,
  };

  // Create enhanced proxy server
  const enhancedProxyServer = createEnhancedProxyServer(enhancedConfiguration);

  try {
    // Start the enhanced server
    await enhancedProxyServer.startProxyServer();

    // Demonstrate enhanced features
    console.log("\n📊 Enhanced Server Statistics:");
    const statistics = enhancedProxyServer.getEnhancedServerStatistics();
    console.log(
      `   Active Connections: ${statistics.activeConnections.toLocaleString()}`
    );
    console.log(
      `   Total Connections: ${statistics.totalConnections.toLocaleString()}`
    );
    console.log(
      `   Messages Processed: ${statistics.messagesProcessed.toLocaleString()}`
    );
    console.log(
      `   Average Latency: ${statistics.averageLatency.toFixed(2)}ms`
    );
    console.log(
      `   Memory Usage: ${formatEnhancedByteSize(statistics.memoryUsageBytes)}`
    );
    console.log(
      `   Uptime: ${formatEnhancedTimeDuration(statistics.uptimeMilliseconds)}`
    );

    console.log("\n🏥 Enhanced Health Check:");
    const healthResult = await enhancedProxyServer.performHealthCheck();
    console.log(`   Status: ${healthResult.status}`);
    console.log(`   Latency: ${healthResult.latencyMilliseconds}ms`);
    console.log(`   Timestamp: ${healthResult.timestamp.toISOString()}`);

    // Demonstrate enhanced utility functions
    console.log("\n🔧 Enhanced Utility Functions:");
    console.log(`   Byte Size: ${formatEnhancedByteSize(1048576)}`);
    console.log(`   Time Duration: ${formatEnhancedTimeDuration(3661000)}`);

    // Enhanced configuration validation
    console.log("\n✅ Enhanced Configuration Validation:");
    const validationRules: ValidationRule[] = [
      {
        fieldName: "listenPort",
        validate: (value: any) => {
          if (typeof value !== "number") {
            return {
              isValid: false,
              message: "Listen port must be a number",
              code: "INVALID_TYPE",
            };
          }
          if (value < 1 || value > 65535) {
            return {
              isValid: false,
              message: "Listen port must be between 1 and 65535",
              code: "OUT_OF_RANGE",
            };
          }
          return { isValid: true, message: "Valid" };
        },
        severity: "error",
      },
      {
        fieldName: "maximumConnections",
        validate: (value: any) => {
          if (typeof value !== "number") {
            return {
              isValid: false,
              message: "Maximum connections must be a number",
              code: "INVALID_TYPE",
            };
          }
          if (value <= 0) {
            return {
              isValid: false,
              message: "Maximum connections must be greater than 0",
              code: "INVALID_VALUE",
            };
          }
          return { isValid: true, message: "Valid" };
        },
        severity: "error",
      },
    ];

    const validationResult = validateEnhancedConfiguration(
      enhancedConfiguration,
      validationRules
    );

    if (validationResult.isValid) {
      console.log("   ✅ Configuration validation passed");
    } else {
      console.log("   ❌ Configuration validation failed:");
      validationResult.errors.forEach((error) => {
        console.log(`      - ${error.field}: ${error.message}`);
      });
    }

    // Stop the enhanced server
    await enhancedProxyServer.stopProxyServer();
  } catch (error: any) {
    console.error("❌ Enhanced proxy server demo failed:", error);

    if (error instanceof EnhancedProxyError) {
      console.error(`   Error Code: ${error.errorCode}`);
      console.error(`   Original Error: ${error.originalError?.message}`);
    }
  }

  console.log("\n✨ Enhanced Bun Proxy Server Demo Complete!");
}

// Run the demonstration
demonstrateEnhancedProxyServer();
