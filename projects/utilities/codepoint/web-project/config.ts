import type {
  AuthConfig,
  ExtendedBunWebSocketProxyConfiguration,
  RateLimitConfig,
  TLSConfig,
} from "./types";
import { WebSocketProxyConfigurationError } from "./types";

/**
 * Default configuration values for the proxy server
 */
export const DEFAULT_CONFIG = {
  listenHost: "0.0.0.0",
  listenPort: 0,
  maxConnections: 10000,
  idleTimeout: 60000,
  heartbeatInterval: 30000,
  debug: false,
  maxPayloadSize: 1048576, // 1MB
  backpressureLimit: 1024,
  reconnectAttempts: 3,
  reconnectDelay: 1000,
  buffer: {
    maxSize: 1000,
    maxAge: 60000,
    replayEnabled: false,
    replayMaxAge: 30000,
    persistent: false,
    storagePath: "./buffer-data",
    onOverflow: "drop_oldest" as const,
    compress: true,
    encrypt: false,
  },
  health: {
    enabled: true,
    endpoint: "/health",
    interval: 30000,
    timeout: 5000,
    unhealthyThreshold: 3,
    healthyThreshold: 2,
    pingInterval: 25000,
    pingMessage: "ping",
    exposeDetails: false,
  },
  stats: {
    collectionInterval: 5000,
    retentionPeriod: 3600000,
    maxSamples: 1000,
    enableLatencyHistogram: false,
    enablePerTopicStats: false,
    enableConnectionStats: true,
    enableResourceStats: true,
    exportFormat: "json" as const,
    exportPath: "./stats",
    anonymize: false,
    realTimeUpdates: true,
  },
  cors: {
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: [],
    exposedHeaders: [],
    credentials: false,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
  rateLimiting: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100,
    delayMs: 0,
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    trustProxy: false,
  },
  authentication: {
    type: "bearer" as const,
    jwtAlgorithm: "HS256",
    tokenHeader: "Authorization",
    rateLimitPerUser: 1000,
  },
  connectionPool: {
    enabled: true,
    minSize: 0,
    maxSize: 10,
    acquireTimeout: 30000,
    idleTimeout: 60000,
    createRetryInterval: 200,
    destroyTimeout: 5000,
    testOnBorrow: true,
    testOnReturn: false,
    testWhileIdle: true,
    evictionRunInterval: 30000,
    priorityRange: 1,
    fifo: true,
  },
  compression: {
    enabled: true,
    algorithm: "gzip" as const,
    level: 6,
    threshold: 1024,
    windowBits: 15,
    memLevel: 8,
    strategy: 0,
    chunkSize: 16384,
    contentTypes: ["text/*", "application/json", "application/javascript"],
    excludeContentTypes: ["image/*", "video/*", "audio/*"],
    varyHeader: true,
    cacheCompressed: true,
  } as any,
  logging: {
    level: "info" as const,
    format: "json" as const,
    timestamp: true,
    colors: true,
    destination: "console" as const,
    file: "./logs/proxy.log",
    rotation: "daily" as const,
    maxSize: "100MB",
    maxFiles: 30,
  },
  gracefulShutdown: {
    enabled: true,
    timeout: 30000,
    signals: ["SIGTERM", "SIGINT"],
    drainConnections: true,
    drainTimeout: 10000,
    closeTimeout: 5000,
    forceExit: true,
    exitCode: 0,
  },
} as const;

/**
 * ProxyServerConfig class with validation and default value merging
 */
export class ProxyServerConfig
  implements ExtendedBunWebSocketProxyConfiguration
{
  // Core Properties
  listenHost: string = DEFAULT_CONFIG.listenHost;
  listenPort: number = DEFAULT_CONFIG.listenPort;
  targetUrl!: string;
  maxConnections: number = DEFAULT_CONFIG.maxConnections;
  idleTimeout: number = DEFAULT_CONFIG.idleTimeout;
  heartbeatInterval: number = DEFAULT_CONFIG.heartbeatInterval;
  debug: boolean = DEFAULT_CONFIG.debug;
  maxPayloadSize: number = DEFAULT_CONFIG.maxPayloadSize;
  backpressureLimit: number = DEFAULT_CONFIG.backpressureLimit;
  reconnectAttempts: number = DEFAULT_CONFIG.reconnectAttempts;
  reconnectDelay: number = DEFAULT_CONFIG.reconnectDelay;

  // Configuration Objects
  buffer = { ...DEFAULT_CONFIG.buffer };
  health = { ...DEFAULT_CONFIG.health };
  stats = { ...DEFAULT_CONFIG.stats };
  tls?: TLSConfig;
  cors = { ...DEFAULT_CONFIG.cors } as any;
  authentication?: AuthConfig;
  rateLimiting = { ...DEFAULT_CONFIG.rateLimiting };

  // Advanced Features
  loadBalancing?: any;
  caching?: any;
  metrics?: any;
  connectionPool = { ...DEFAULT_CONFIG.connectionPool };
  compressionConfig = { ...DEFAULT_CONFIG.compression } as any;
  mitm?: any;
  firewall?: any;
  http?: any;
  socks5?: any;
  logging = { ...DEFAULT_CONFIG.logging } as any;
  cluster?: any;
  gracefulShutdown = { ...DEFAULT_CONFIG.gracefulShutdown } as any;

  constructor(config: Partial<ExtendedBunWebSocketProxyConfiguration>) {
    this.validateAndMerge(config);
  }

  /**
   * Validate and merge configuration with defaults
   */
  private validateAndMerge(
    config: Partial<ExtendedBunWebSocketProxyConfiguration>
  ): void {
    // Required field validation
    if (!config.targetUrl) {
      throw new WebSocketProxyConfigurationError("targetUrl is required");
    }

    // URL validation
    if (config.targetUrl && !this.isValidWebSocketUrl(config.targetUrl)) {
      throw new WebSocketProxyConfigurationError(
        "targetUrl must be a valid WebSocket URL (ws:// or wss://)"
      );
    }

    // Port validation
    if (
      config.listenPort !== undefined &&
      !this.isValidPort(config.listenPort)
    ) {
      throw new WebSocketProxyConfigurationError(
        "listenPort must be between 0 and 65535"
      );
    }

    // TLS validation
    if (config.tls) {
      this.validateTLSConfig(config.tls);
    }

    // Authentication validation
    if (config.authentication) {
      this.validateAuthConfig(config.authentication);
    }

    // Rate limiting validation
    if (config.rateLimiting) {
      this.validateRateLimitConfig(config.rateLimiting);
    }

    // Load balancing validation
    if (config.loadBalancing) {
      this.validateLoadBalancerConfig(config.loadBalancing);
    }

    // Merge all configurations
    Object.assign(this, config);

    // Handle compression property compatibility
    if (typeof config.compression === "boolean") {
      this.compressionConfig.enabled = config.compression;
    } else if (config.compression && typeof config.compression === "object") {
      this.compressionConfig = {
        ...this.compressionConfig,
        ...config.compression,
      };
    }
  }

  /**
   * Validate WebSocket URL format
   */
  private isValidWebSocketUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "ws:" || parsed.protocol === "wss:";
    } catch {
      return false;
    }
  }

  /**
   * Validate port number
   */
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 0 && port <= 65535;
  }

  /**
   * Validate TLS configuration
   */
  private validateTLSConfig(tls: TLSConfig): void {
    if (tls.cert && !tls.key) {
      throw new WebSocketProxyConfigurationError(
        "TLS key is required when cert is provided"
      );
    }
    if (tls.key && !tls.cert) {
      throw new WebSocketProxyConfigurationError(
        "TLS cert is required when key is provided"
      );
    }
    if (tls.pfx && (tls.cert || tls.key)) {
      throw new WebSocketProxyConfigurationError(
        "Cannot specify both pfx and cert/key"
      );
    }
  }

  /**
   * Validate authentication configuration
   */
  private validateAuthConfig(auth: AuthConfig): void {
    if (auth.type === "basic" && (!auth.username || !auth.password)) {
      throw new WebSocketProxyConfigurationError(
        "Username and password are required for basic authentication"
      );
    }
    if (auth.type === "jwt" && !auth.jwtSecret) {
      throw new WebSocketProxyConfigurationError(
        "JWT secret is required for JWT authentication"
      );
    }
    if (auth.type === "api_key" && !auth.token) {
      throw new WebSocketProxyConfigurationError(
        "API key token is required for API key authentication"
      );
    }
    if (auth.type === "bearer" && !auth.token) {
      throw new WebSocketProxyConfigurationError(
        "Bearer token is required for bearer authentication"
      );
    }
  }

  /**
   * Validate rate limiting configuration
   */
  private validateRateLimitConfig(rateLimit: RateLimitConfig): void {
    if (rateLimit.windowMs !== undefined && rateLimit.windowMs <= 0) {
      throw new WebSocketProxyConfigurationError(
        "Rate limiting windowMs must be positive"
      );
    }
    if (rateLimit.maxRequests !== undefined && rateLimit.maxRequests <= 0) {
      throw new WebSocketProxyConfigurationError(
        "Rate limiting maxRequests must be positive"
      );
    }
    if (rateLimit.delayMs !== undefined && rateLimit.delayMs < 0) {
      throw new WebSocketProxyConfigurationError(
        "Rate limiting delayMs cannot be negative"
      );
    }
  }

  /**
   * Validate load balancer configuration
   */
  private validateLoadBalancerConfig(loadBalancer: any): void {
    if (
      !loadBalancer.targets ||
      !Array.isArray(loadBalancer.targets) ||
      loadBalancer.targets.length === 0
    ) {
      throw new WebSocketProxyConfigurationError(
        "Load balancer targets must be a non-empty array"
      );
    }

    for (const target of loadBalancer.targets) {
      if (!target.url || !this.isValidWebSocketUrl(target.url)) {
        throw new WebSocketProxyConfigurationError(
          `Invalid target URL: ${target.url}`
        );
      }
      if (
        target.weight !== undefined &&
        (target.weight <= 0 || !Number.isInteger(target.weight))
      ) {
        throw new WebSocketProxyConfigurationError(
          `Target weight must be a positive integer: ${target.weight}`
        );
      }
    }
  }

  /**
   * Get configuration as plain object
   */
  toObject(): ExtendedBunWebSocketProxyConfiguration {
    return { ...this } as unknown as ExtendedBunWebSocketProxyConfiguration;
  }

  /**
   * Get configuration as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  /**
   * Clone configuration
   */
  clone(): ProxyServerConfig {
    return new ProxyServerConfig(this.toObject());
  }

  /**
   * Update configuration with validation
   */
  update(updates: Partial<ExtendedBunWebSocketProxyConfiguration>): void {
    this.validateAndMerge({ ...this.toObject(), ...updates });
  }

  /**
   * Check if TLS is enabled
   */
  isTLSEnabled(): boolean {
    return !!(this.tls && (this.tls.cert || this.tls.pfx));
  }

  /**
   * Check if authentication is enabled
   */
  isAuthenticationEnabled(): boolean {
    return !!(this.authentication && this.authentication.type);
  }

  /**
   * Check if rate limiting is enabled
   */
  isRateLimitingEnabled(): boolean {
    return (this.rateLimiting?.enabled as boolean | undefined) !== false;
  }

  /**
   * Check if load balancing is enabled
   */
  isLoadBalancingEnabled(): boolean {
    return !!(
      this.loadBalancing &&
      this.loadBalancing.targets &&
      this.loadBalancing.targets.length > 1
    );
  }

  /**
   * Get effective server URL
   */
  getServerUrl(): string {
    const protocol = this.isTLSEnabled() ? "wss://" : "ws://";
    const host = this.listenHost === "0.0.0.0" ? "localhost" : this.listenHost;
    const port = this.listenPort || 0;
    return `${protocol}${host}:${port}`;
  }
}

/**
 * Configuration builder for fluent API
 */
export class ProxyConfigBuilder {
  private config: Partial<ExtendedBunWebSocketProxyConfiguration> = {};

  /**
   * Set target URL
   */
  target(url: string): this {
    this.config.targetUrl = url;
    return this;
  }

  /**
   * Set listening port
   */
  port(port: number): this {
    this.config.listenPort = port;
    return this;
  }

  /**
   * Set listening host
   */
  host(host: string): this {
    this.config.listenHost = host;
    return this;
  }

  /**
   * Enable TLS
   */
  tls(tlsConfig: TLSConfig): this {
    this.config.tls = tlsConfig;
    return this;
  }

  /**
   * Enable authentication
   */
  auth(authConfig: AuthConfig): this {
    this.config.authentication = authConfig;
    return this;
  }

  /**
   * Enable rate limiting
   */
  rateLimit(rateLimitConfig: RateLimitConfig): this {
    this.config.rateLimiting = rateLimitConfig;
    return this;
  }

  /**
   * Enable load balancing
   */
  loadBalance(loadBalancerConfig: any): this {
    this.config.loadBalancing = loadBalancerConfig;
    return this;
  }

  /**
   * Enable debug mode
   */
  debug(enabled: boolean = true): this {
    this.config.debug = enabled;
    return this;
  }

  /**
   * Set maximum connections
   */
  maxConnections(max: number): this {
    this.config.maxConnections = max;
    return this;
  }

  /**
   * Set idle timeout
   */
  idleTimeout(timeout: number): this {
    this.config.idleTimeout = timeout;
    return this;
  }

  /**
   * Build and validate configuration
   */
  build(): ProxyServerConfig {
    return new ProxyServerConfig(this.config);
  }
}

// Export the enhanced error class
export { WebSocketProxyConfigurationError };

/**
 * Create a new configuration builder
 */
export function createProxyConfig(): ProxyConfigBuilder {
  return new ProxyConfigBuilder();
}
