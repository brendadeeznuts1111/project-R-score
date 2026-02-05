// Enhanced Bun Proxy Type Definitions

export interface ProxyServerConfiguration {
  listenHost: string;
  listenPort: number;
  targetEndpointUrl: string;
  serverName: string;
  environment: "development" | "staging" | "production";
  maximumConnections: number;
  idleConnectionTimeout: number;
  heartbeatInterval: number;
  enableConnectionCompression: boolean;
  enableMessageBuffering: boolean;
  bufferConfiguration?: BufferConfiguration;
  healthCheckConfiguration: HealthCheckConfiguration;
  statisticsConfiguration: StatisticsConfiguration;
  tlsConfiguration?: TLSCertificateConfiguration;
  maximumPayloadSizeBytes: number;
  backpressureThreshold: number;
  reconnectAttemptCount: number;
  reconnectDelayMilliseconds: number;
  enableCors: boolean;
  corsConfiguration?: CorsConfiguration;
  authenticationConfiguration?: AuthenticationConfiguration;
  rateLimitingConfiguration?: RateLimitConfiguration;
}

export interface ConnectionStatistics {
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

export interface BufferConfiguration {
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

export interface HealthCheckConfiguration {
  isEnabled: boolean;
  healthEndpointPath: string;
  checkIntervalMilliseconds: number;
  checkTimeoutMilliseconds: number;
  unhealthyThresholdCount: number;
  healthyThresholdCount: number;
  pingIntervalMilliseconds: number;
  pingMessageContent: string;
  customHealthChecks: Array<HealthCheckFunction>;
  externalDependencyUrls: string[];
  onStatusChangeCallback?: (status: HealthStatus) => void;
  exposeDetailedInformation: boolean;
}

export interface StatisticsConfiguration {
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

export interface TLSCertificateConfiguration {
  certificateData: string | Buffer;
  privateKeyData: string | Buffer;
  certificateAuthorityChain?: string | Buffer | Array<string | Buffer>;
  passphrase?: string;
  pfxData?: string | Buffer;
  cipherSuites?: string;
  secureProtocol?: string;
  secureOptions?: number;
  requestClientCertificate: boolean;
  rejectUnauthorizedConnections: boolean;
  serverName?: string;
  sessionTimeoutSeconds: number;
  ticketKeys?: Buffer;
}

export interface CorsConfiguration {
  allowedOrigins: string | string[] | boolean | RegExp;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  allowCredentials: boolean;
  maxAgeSeconds: number;
  continuePreflightRequests: boolean;
  optionsSuccessStatusCode: number;
}

export interface AuthenticationConfiguration {
  authenticationType: "bearer" | "basic" | "api-key" | "jwt";
  tokenValue?: string;
  username?: string;
  password?: string;
  jwtSecret?: string;
}

export interface RateLimitConfiguration {
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

export interface RateLimitStorage {
  type: "memory" | "redis" | "database";
  connection?: any;
  cleanupIntervalMilliseconds: number;
}

export interface HealthCheckFunction {
  (): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  latencyMilliseconds: number;
  timestamp: Date;
  details?: Record<string, any>;
}

export type HealthStatus = "healthy" | "unhealthy" | "degraded";

export interface CustomMetricDefinition {
  metricName: string;
  metricType: "counter" | "gauge" | "histogram" | "summary";
  description: string;
  labelNames: string[];
  buckets?: number[];
  percentiles?: number[];
  maxAgeSeconds?: number;
  ageBuckets?: number;
  collectionFunction?: () => number | Promise<number>;
  aggregationMethod: "sum" | "average" | "minimum" | "maximum" | "latest";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ValidationRule {
  fieldName: string;
  validate: (value: any) => ValidationRuleResult;
  severity: "error" | "warning";
}

export interface ValidationRuleResult {
  isValid: boolean;
  message: string;
  code?: string;
}

export interface TableOptions {
  columns?: Array<{
    key: string;
    header: string;
    type: string;
    width?: number;
    align?: "left" | "center" | "right";
    format?: (value: any) => string;
  }>;
  caption?: string;
  theme?: "dark" | "light";
  showBorder?: boolean;
  compact?: boolean;
  zebra?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
