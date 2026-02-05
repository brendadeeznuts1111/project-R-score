// @bun/proxy/patterns/index.ts - Enhanced with better naming
import { CircuitBreaker } from './circuit-breaker.js';
import { LoadBalancer } from './load-balancer.js';
import { RateLimiter } from './rate-limiter.js';
import { RetryPolicy } from './retry-policy.js';

export interface CircuitBreakerConfiguration {
  failureThresholdCount: number;
  successThresholdCount: number;
  resetTimeoutMilliseconds: number;
  maximumHalfOpenAttempts: number;
  failureWindowMilliseconds: number;
  excludedErrorCodes: Array<string | number>;
  onStateChangeCallback?: (state: CircuitState) => void;
  fallbackFunction?: (error: Error) => any;
  enableMonitoring: boolean;
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

export interface LoadBalancerConfiguration {
  balancingStrategy: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted' | 'random';
  targetServers: LoadBalancerTarget[];
  healthCheckConfiguration: any; // Will be typed when core is complete
  enableAutomaticFailover: boolean;
  sessionStickinessConfiguration: SessionStickinessConfiguration;
  requestTimeoutMilliseconds: number;
  maximumRetryAttempts: number;
  retryDelayMilliseconds: number;
  circuitBreakerConfiguration?: CircuitBreakerConfiguration;
  weightDistribution?: Record<string, number>;
  sessionAffinityConfiguration?: SessionAffinityConfiguration;
}

export interface RetryPolicyConfiguration {
  maximumAttemptCount: number;
  backoffMultiplier: number;
  initialDelayMilliseconds: number;
  maximumDelayMilliseconds: number;
  retryableErrorPredicate?: (error: Error) => boolean;
  onRetryCallback?: (attempt: number, error: Error) => void;
  jitterFactor: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface LoadBalancerTarget {
  serverUrl: string;
  weight: number;
  healthCheckEndpoint: string;
  maximumConnections: number;
  timeoutMilliseconds: number;
  tags: string[];
  metadata: Record<string, any>;
  isEnabled: boolean;
  isBackupServer: boolean;
  priority: number;
}

export interface SessionStickinessConfiguration {
  sessionTimeoutMilliseconds: number;
  cookieName: string;
  useSecureCookie: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
}

export interface SessionAffinityConfiguration {
  enabled: boolean;
  timeoutMilliseconds: number;
  hashFunction?: (request: any) => string;
}

export interface RateLimitStorage {
  type: 'memory' | 'redis' | 'database';
  connection?: any;
  cleanupIntervalMilliseconds: number;
}

export class PatternFactory {
  static createCircuitBreaker(
    configuration: CircuitBreakerConfiguration
  ): CircuitBreaker {
    return new CircuitBreaker(configuration);
  }

  static createRateLimiter(
    configuration: RateLimitConfiguration
  ): RateLimiter {
    return new RateLimiter(configuration);
  }

  static createLoadBalancer(
    configuration: LoadBalancerConfiguration
  ): LoadBalancer {
    return new LoadBalancer(configuration);
  }

  static createRetryPolicy(
    configuration: RetryPolicyConfiguration
  ): RetryPolicy {
    return new RetryPolicy(configuration);
  }

  static createProxyChain(
    proxyServers: string[],
    configuration: Partial<LoadBalancerConfiguration> = {}
  ): LoadBalancer {
    const targets: LoadBalancerTarget[] = proxyServers.map((url, index) => ({
      serverUrl: url,
      weight: 1,
      healthCheckEndpoint: '/health',
      maximumConnections: 1000,
      timeoutMilliseconds: 30000,
      tags: [`proxy-${index + 1}`],
      metadata: {},
      isEnabled: true,
      isBackupServer: false,
      priority: index
    }));

    const loadBalancerConfig: LoadBalancerConfiguration = {
      balancingStrategy: 'round-robin',
      targetServers: targets,
      healthCheckConfiguration: {
        isEnabled: true,
        healthEndpointPath: '/health',
        checkIntervalMilliseconds: 30000,
        checkTimeoutMilliseconds: 5000,
        unhealthyThresholdCount: 3,
        healthyThresholdCount: 2,
        pingIntervalMilliseconds: 25000,
        pingMessageContent: 'ping',
        customHealthChecks: [],
        externalDependencyUrls: [],
        exposeDetailedInformation: false
      },
      enableAutomaticFailover: true,
      sessionStickinessConfiguration: {
        sessionTimeoutMilliseconds: 3600000,
        cookieName: 'session_id',
        useSecureCookie: true,
        sameSitePolicy: 'lax'
      },
      requestTimeoutMilliseconds: 30000,
      maximumRetryAttempts: 3,
      retryDelayMilliseconds: 1000,
      ...configuration
    };

    return new LoadBalancer(loadBalancerConfig);
  }
}

export {
    CircuitBreaker, LoadBalancer, RateLimiter, RetryPolicy
};
