// @bun/proxy/core/types.ts - Enhanced with better naming

export interface ProxyServerConfiguration {
  // Server Configuration
  listenHost: string;
  listenPort: number;
  targetEndpointUrl: string;
  serverName: string;
  environment: 'development' | 'staging' | 'production';

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

export interface BufferConfiguration {
  maximumBufferSize: number;
  maximumMessageAgeMilliseconds: number;
  enableMessageReplay: boolean;
  maximumReplayAgeMilliseconds: number;
  enablePersistentStorage: boolean;
  storageDirectoryPath: string;
  messageTransformationFunction?: (message: any) => any;
  overflowHandlingStrategy: 'dropOldest' | 'dropNewest' | 'throwError';
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
  exportFormat: 'json' | 'prometheus' | 'csv';
  exportDirectoryPath: string;
  customMetricDefinitions: Array<CustomMetricDefinition>;
  anonymizeData: boolean;
  enableRealTimeUpdates: boolean;
}

export interface TLSCertificateConfiguration {
  certificateData: string | Uint8Array;
  privateKeyData: string | Uint8Array;
  certificateAuthorityChain?: string | Uint8Array | Array<string | Uint8Array>;
  passphrase?: string;
  pfxData?: string | Uint8Array;
  cipherSuites?: string;
  secureProtocol?: string;
  secureOptions?: number;
  requestClientCertificate: boolean;
  rejectUnauthorizedConnections: boolean;
  serverName?: string;
  sessionTimeoutSeconds: number;
  ticketKeys?: Uint8Array;
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

export interface HealthCheckFunction {
  (): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  latencyMilliseconds: number;
  timestamp: Date;
  details?: Record<string, any>;
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface CustomMetricDefinition {
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labelNames: string[];
  buckets?: number[];
  percentiles?: number[];
  maxAgeSeconds?: number;
  ageBuckets?: number;
  collectionFunction?: () => number | Promise<number>;
  aggregationMethod: 'sum' | 'average' | 'minimum' | 'maximum' | 'latest';
}

export interface AuthenticationConfiguration {
  authenticationType: 'bearer' | 'basic' | 'api-key' | 'jwt';
  jwtSecret?: string;
  requiredClaims?: Record<string, any>;
  tokenHeader?: string;
  tokenQueryParam?: string;
  tokenCookie?: string;
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
}

export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted' | 'random';

export interface ConnectionMetadata {
  connectionId: string;
  establishedAt: Date;
  lastActivityAt: Date;
  remoteAddress: string;
  userAgent?: string;
  protocol: string;
  encrypted: boolean;
  metadata?: Record<string, any>;
}
