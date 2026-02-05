// Core Configuration Types
export interface BunWebSocketProxyConfiguration {
  listenHost?: string;
  listenPort?: number;
  targetUrl: string;
  maxConnections?: number;
  idleTimeout?: number;
  heartbeatInterval?: number;
  compression?: boolean | CompressionConfig;
  buffer?: WebSocketMessageBufferConfiguration;
  health?: ProxyHealthMonitoringConfiguration;
  stats?: ProxyStatisticsCollectionConfiguration;
  tls?: TLSConfig;
  debug?: boolean;
  maxPayloadSize?: number;
  backpressureLimit?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  cors?: CorsConfig;
  authentication?: AuthConfig;
  rateLimiting?: RateLimitConfig;
}

export interface WebSocketMessageBufferConfiguration {
  maxSize?: number;
  maxAge?: number;
  replayEnabled?: boolean;
  replayMaxAge?: number;
  persistent?: boolean;
  storagePath?: string;
  transform?: (msg: any) => any;
  onOverflow?: "drop_oldest" | "drop_newest" | "error";
  compress?: boolean;
  encrypt?: boolean;
  partitionBy?: string;
  filter?: (msg: any) => boolean;
}

export interface ProxyHealthMonitoringConfiguration {
  enabled?: boolean;
  endpoint?: string;
  interval?: number;
  timeout?: number;
  unhealthyThreshold?: number;
  healthyThreshold?: number;
  pingInterval?: number;
  pingMessage?: string;
  customChecks?: Array<HealthCheck>;
  externalDependencies?: Array<string>;
  onStatusChange?: (status: HealthStatus) => void;
  exposeDetails?: boolean;
}

export interface ProxyStatisticsCollectionConfiguration {
  collectionInterval?: number;
  retentionPeriod?: number;
  maxSamples?: number;
  enableLatencyHistogram?: boolean;
  enablePerTopicStats?: boolean;
  enableConnectionStats?: boolean;
  enableResourceStats?: boolean;
  exportFormat?: "json" | "prometheus" | "csv";
  exportPath?: string;
  customMetrics?: Array<CustomMetric>;
  anonymize?: boolean;
  realTimeUpdates?: boolean;
}

export interface TLSConfig {
  cert?: string | Buffer;
  key?: string | Buffer;
  ca?: string | Buffer | Array<string | Buffer>;
  passphrase?: string;
  pfx?: string | Buffer;
  ciphers?: string;
  secureProtocol?: string;
  secureOptions?: number;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
  servername?: string;
  sessionTimeout?: number;
  ticketKeys?: Buffer;
}

export interface CorsConfig {
  origin?: string | Array<string> | boolean | RegExp;
  methods?: Array<string>;
  allowedHeaders?: Array<string>;
  exposedHeaders?: Array<string>;
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export interface AuthConfig {
  type?: "bearer" | "basic" | "api_key" | "jwt" | "custom";
  token?: string;
  username?: string;
  password?: string;
  jwtSecret?: string;
  jwtAlgorithm?: string;
  customValidator?: (req: Request) => Promise<boolean>;
  requiredScopes?: Array<string>;
  tokenHeader?: string;
  tokenQueryParam?: string;
  tokenCookie?: string;
  rateLimitPerUser?: number;
}

export interface RateLimitConfig {
  enabled?: boolean;
  windowMs?: number;
  maxRequests?: number;
  delayMs?: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  onRateLimited?: (req: Request, res: Response) => void;
  trustProxy?: boolean;
  store?: RateLimitStore;
}

// Supporting Types
export interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  timeout?: number;
}

export type HealthStatus = "healthy" | "unhealthy" | "degraded";

export interface CustomMetric {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  help: string;
  labels?: Array<string>;
  buckets?: Array<number>;
  percentiles?: Array<number>;
  collect?: () => number | Promise<number>;
}

export interface RateLimitStore {
  get: (key: string) => Promise<number | null>;
  set: (key: string, value: number, ttl: number) => Promise<void>;
  increment: (key: string, ttl: number) => Promise<number>;
  delete: (key: string) => Promise<void>;
}

// WebSocket Specific Types
export interface WebSocketProxyConfig {
  protocols?: Array<string>;
  perMessageDeflate?: boolean | PerMessageDeflateOptions;
  maxPayload?: number;
  followRedirects?: boolean;
  handshakeTimeout?: number;
  protocolVersion?: number;
  origin?: string;
  headers?: Record<string, string>;
  auth?: string;
  localAddress?: string;
  family?: 4 | 6;
  checkServerIdentity?: (host: string, cert: object) => Error | undefined;
}

export interface PerMessageDeflateOptions {
  serverNoContextTakeover?: boolean;
  clientNoContextTakeover?: boolean;
  serverMaxWindowBits?: number;
  clientMaxWindowBits?: number;
  zlibDeflateOptions?: any;
}

// Connection Management Types
export interface WebSocketConnectionInformation {
  connectionUniqueId: string;
  clientRemoteAddress: string;
  clientUserAgent?: string;
  connectionEstablishedTimestamp: number;
  lastActivityTimestamp: number;
  outboundMessageCount: number;
  inboundMessageCount: number;
  inboundByteCount: number;
  outboundByteCount: number;
  targetWebSocketUrl: string;
}

export interface WebSocketProxyPerformanceMetrics {
  totalConnectionCount: number;
  activeConnectionCount: number;
  totalMessageCount: number;
  totalByteCount: number;
  averageLatencyMilliseconds: number;
  totalErrorCount: number;
  serverUptimeMilliseconds: number;
  systemMemoryUsage: NodeJS.MemoryUsage;
  systemCpuUsage: NodeJS.CpuUsage;
}

// Advanced Configuration Types

// Load Balancing Types
export interface LoadBalancerConfig {
  strategy?:
    | "round-robin"
    | "least-connections"
    | "ip-hash"
    | "weighted"
    | "random";
  targets: Array<LoadBalancerTarget>;
  healthCheck?: HealthCheckConfig;
  failover?: boolean;
  stickySessions?: StickySessionConfig;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  circuitBreaker?: CircuitBreakerConfig;
  weightedDistribution?: Record<string, number>;
  sessionAffinity?: SessionAffinityConfig;
}

export interface LoadBalancerTarget {
  url: string;
  weight?: number;
  healthCheckEndpoint?: string;
  maxConnections?: number;
  timeout?: number;
  tags?: Array<string>;
  metadata?: Record<string, any>;
  enabled?: boolean;
  backup?: boolean;
  priority?: number;
}

export interface HealthCheckConfig {
  enabled?: boolean;
  endpoint?: string;
  interval?: number;
  timeout?: number;
  unhealthyThreshold?: number;
  healthyThreshold?: number;
}

export interface StickySessionConfig {
  enabled?: boolean;
  cookieName?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number;
  };
}

export interface CircuitBreakerConfig {
  enabled?: boolean;
  failureThreshold?: number;
  successThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxAttempts?: number;
  failureWindow?: number;
  excludeErrors?: Array<string | number>;
  onStateChange?: (state: "closed" | "open" | "half-open") => void;
  fallback?: (error: Error) => any;
  monitor?: boolean;
}

export interface SessionAffinityConfig {
  enabled?: boolean;
  timeout?: number;
  keyGenerator?: (req: Request) => string;
}

// Caching Types
export interface CacheConfig {
  enabled?: boolean;
  type?: "memory" | "redis" | "file" | "database";
  ttl?: number;
  maxSize?: number;
  maxMemory?: number;
  policy?: "lru" | "lfu" | "fifo" | "random";
  staleWhileRevalidate?: boolean;
  staleIfError?: boolean;
  compression?: boolean;
  encryption?: boolean;
  version?: string;
  namespace?: string;
  connection?: CacheConnectionConfig;
}

export interface CacheConnectionConfig {
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  tls?: boolean | TLSConfig;
  retryStrategy?: (times: number) => number | null;
  maxRetriesPerRequest?: number;
  connectTimeout?: number;
  readOnly?: boolean;
  keyPrefix?: string;
  serializer?: "json" | "msgpack" | "custom";
}

// Monitoring & Metrics Types
export interface MetricsCollector {
  enabled?: boolean;
  endpoint?: string;
  format?: "prometheus" | "json" | "influx";
  interval?: number;
  timeout?: number;
  buckets?: Array<number>;
  labels?: Record<string, string>;
  prefix?: string;
  includeDefaultMetrics?: boolean;
  customMetrics?: Array<MetricDefinition>;
  onError?: (error: Error) => void;
  persistence?: PersistenceConfig;
}

export interface MetricDefinition {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  help: string;
  labels?: Array<string>;
  buckets?: Array<number>;
  percentiles?: Array<number>;
  maxAgeSeconds?: number;
  ageBuckets?: number;
  collect?: () => number | Promise<number>;
  aggregation?: "sum" | "avg" | "min" | "max" | "last";
}

export interface PersistenceConfig {
  enabled?: boolean;
  type?: "file" | "database" | "redis" | "influxdb";
  path?: string;
  interval?: number;
  retention?: number;
  compress?: boolean;
  encrypt?: boolean;
  batchSize?: number;
  connection?: DatabaseConnectionConfig;
}

export interface DatabaseConnectionConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  ssl?: boolean | TLSConfig;
  pool?: ConnectionPool;
}

// Performance Types
export interface ConnectionPool {
  enabled?: boolean;
  minSize?: number;
  maxSize?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  createRetryInterval?: number;
  destroyTimeout?: number;
  testOnBorrow?: boolean;
  testOnReturn?: boolean;
  testWhileIdle?: boolean;
  evictionRunInterval?: number;
  priorityRange?: number;
  fifo?: boolean;
}

export interface CompressionConfig {
  enabled?: boolean;
  algorithm?: "gzip" | "deflate" | "brotli" | "zstd";
  level?: number;
  threshold?: number;
  windowBits?: number;
  memLevel?: number;
  strategy?: number;
  chunkSize?: number;
  contentTypes?: Array<string>;
  excludeContentTypes?: Array<string>;
  varyHeader?: boolean;
  cacheCompressed?: boolean;
}

// Security Types
export interface MITMConfig {
  enabled?: boolean;
  sslInspect?: boolean;
  interceptPatterns?: Array<string | RegExp>;
  caCert?: string | Buffer;
  caKey?: string | Buffer;
  generateCerts?: boolean;
  cacheCerts?: boolean;
  validityDays?: number;
  onRequest?: (req: Request) => Request | null;
  onResponse?: (res: Response) => Response | null;
  logTraffic?: boolean;
  excludeSites?: Array<string>;
}

export interface FirewallConfig {
  rules?: Array<FirewallRule>;
  defaultAction?: "allow" | "deny";
  logBlocked?: boolean;
  rateLimit?: RateLimitConfig;
  geoBlocking?: GeoBlockConfig;
  ipWhitelist?: Array<string>;
  ipBlacklist?: Array<string>;
  userAgentFilter?: Array<string | RegExp>;
  contentFilter?: Array<string | RegExp>;
}

export interface FirewallRule {
  id?: string;
  name?: string;
  action: "allow" | "deny" | "redirect";
  protocol?: "http" | "https" | "ws" | "wss" | "tcp" | "udp" | "*";
  source?: string | Array<string>;
  destination?: string | Array<string>;
  port?: number | Array<number> | string;
  method?: string | Array<string>;
  path?: string | RegExp | Array<string>;
  headers?: Record<string, string | RegExp>;
  schedule?: ScheduleConfig;
  priority?: number;
  enabled?: boolean;
}

export interface GeoBlockConfig {
  enabled?: boolean;
  allowedCountries?: Array<string>;
  blockedCountries?: Array<string>;
  databasePath?: string;
  updateInterval?: number;
}

export interface ScheduleConfig {
  enabled?: boolean;
  timezone?: string;
  days?: Array<string>;
  startTime?: string;
  endTime?: string;
}

// Protocol-Specific Types
export interface HTTPProxyConfig {
  proxy?: string | ProxyConfig;
  maxRedirects?: number;
  followRedirects?: boolean;
  decompress?: boolean;
  keepAlive?: boolean;
  http2?: boolean;
}

export interface ProxyConfig {
  url: string;
  credentials?: { username: string; password: string };
  timeout?: number;
  headers?: Record<string, string>;
  rejectUnauthorized?: boolean;
}

export interface SOCKS5Config {
  host: string;
  port?: number;
  type?: 4 | 5;
  userId?: string;
  password?: string;
  timeout?: number;
  command?: "connect" | "bind" | "associate";
  localDNS?: boolean;
  strictLocalDNS?: boolean;
  proxyHostname?: boolean;
}

// Logging Types
export interface LoggerConfig {
  level?: "debug" | "info" | "warn" | "error" | "fatal";
  format?: "json" | "text" | "pretty";
  timestamp?: boolean;
  colors?: boolean;
  destination?: "console" | "file" | "http" | "stream";
  file?: string;
  rotation?: "daily" | "hourly" | "size" | false;
  maxSize?: string;
  maxFiles?: number;
  filters?: Array<LogFilter>;
  transports?: Array<LogTransport>;
  context?: Record<string, any>;
  sampling?: LogSamplingConfig;
}

export interface LogFilter {
  level?: string;
  pattern?: string | RegExp;
  include?: boolean;
}

export interface LogTransport {
  type: "file" | "http" | "stream" | "syslog" | "datadog" | "sentry";
  level?: string;
  format?: string;
  options?: Record<string, any>;
  enabled?: boolean;
  async?: boolean;
  silent?: boolean;
  handleExceptions?: boolean;
  handleRejections?: boolean;
}

export interface LogSamplingConfig {
  enabled?: boolean;
  rate?: number;
  perSecond?: number;
  burst?: number;
}

// Advanced Features Types
export interface ClusterConfig {
  enabled?: boolean;
  instances?: number | "auto";
  strategy?: "round-robin" | "least-busy" | "ip-hash";
  port?: number;
  workerPath?: string;
  workerArgs?: Array<string>;
  exec?: string;
  silent?: boolean;
  stdio?: Array<string>;
  cwd?: string;
  env?: Record<string, string>;
  uid?: number;
  gid?: number;
  inspectPort?: number;
}

export interface GracefulShutdownConfig {
  enabled?: boolean;
  timeout?: number;
  signals?: Array<string>;
  drainConnections?: boolean;
  drainTimeout?: number;
  closeTimeout?: number;
  onShutdownStart?: () => Promise<void> | void;
  onShutdownEnd?: () => Promise<void> | void;
  forceExit?: boolean;
  exitCode?: number;
}

// Extended ProxyServerConfig with all advanced features
export interface ExtendedBunWebSocketProxyConfiguration
  extends BunWebSocketProxyConfiguration {
  // Load Balancing
  loadBalancing?: LoadBalancerConfig;

  // Caching
  caching?: CacheConfig;

  // Monitoring
  metrics?: MetricsCollector;

  // Performance
  connectionPool?: ConnectionPool;
  compression?: CompressionConfig;

  // Security
  mitm?: MITMConfig;
  firewall?: FirewallConfig;

  // Protocol-specific
  http?: HTTPProxyConfig;
  socks5?: SOCKS5Config;

  // Logging
  logging?: LoggerConfig;

  // Advanced Features
  cluster?: ClusterConfig;
  gracefulShutdown?: GracefulShutdownConfig;
}

// Error Types
export class WebSocketProxyOperationalError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "ProxyError";
  }
}

export class WebSocketProxyConnectionError extends WebSocketProxyOperationalError {
  constructor(message: string, public connectionId: string) {
    super(message, "CONNECTION_ERROR");
    this.name = "WebSocketProxyConnectionError";
  }
}

export class WebSocketProxyConfigurationError extends WebSocketProxyOperationalError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR", 400);
    this.name = "WebSocketProxyConfigurationError";
  }
}

export class WebSocketProxyRateLimitError extends WebSocketProxyOperationalError {
  constructor(message: string) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "WebSocketProxyRateLimitError";
  }
}

export class WebSocketProxyAuthenticationError extends WebSocketProxyOperationalError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "WebSocketProxyAuthenticationError";
  }
}

export class WebSocketProxyFirewallError extends WebSocketProxyOperationalError {
  constructor(message: string) {
    super(message, "FIREWALL_ERROR", 403);
    this.name = "WebSocketProxyFirewallError";
  }
}
