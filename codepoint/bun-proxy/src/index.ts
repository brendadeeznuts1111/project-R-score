// @bun/proxy/index.ts - Main entry point with fixed imports
export {
    ProxyError, ProxyServer, createProxyServer, type ConnectionStatistics,
    type HealthCheckStatus, type ProxyServerConfiguration
} from './core/server.js';

export {
    HTTPProxy,
    HTTPSProxy, SOCKS5Proxy, SecureWebSocketProxy, WebSocketProxy, type ProtocolConfiguration
} from './protocols/index.js';

export {
    CircuitBreaker, LoadBalancer, RateLimiter, RetryPolicy,
    type CircuitBreakerConfiguration,
    type RateLimitConfiguration
} from './patterns/index.js';

export {
    Authenticator,
    Firewall,
    MITMProxy,
    type AuthenticationConfiguration,
    type FirewallRule
} from './security/index.js';

export {
    HealthMonitor, MetricsCollector,
    StatsTracker, type HealthCheckConfiguration, type MetricsConfiguration
} from './monitoring/index.js';

export {
    Cache,
    MemoryCache,
    RedisCache,
    type CacheConfiguration,
    type CachePolicyConfiguration
} from './caching/index.js';

export {
    MessageBuffer,
    PubSubService,
    type MessageBufferConfiguration,
    type PubSubConfiguration
} from './websocket/index.js';

export {
    calculateStringWidth,
    formatByteSize,
    formatTimeDuration,
    validateConfiguration,
    type ValidationResult
} from './utils/index.js';

// Re-export types for convenience
export type {
    BufferConfiguration, ConnectionMetadata, LoadBalancingStrategy, StatisticsConfiguration,
    TLSCertificateConfiguration
} from './core/types.js';

// Re-export HealthStatus type
export type { HealthStatus } from './core/types.js';
