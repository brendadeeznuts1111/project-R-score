# @bun/proxy - Enhanced Proxy Server for Bun

Enhanced proxy server implementation for Bun with improved naming conventions, better type safety, and comprehensive documentation.

## 🚀 Enhanced Quick Start

```typescript
import {
  createProxyServer,
  ProtocolFactory,
  PatternFactory,
  MonitoringFactory
} from '@bun/proxy';

// Enhanced configuration with descriptive property names
const enhancedConfiguration = {
  listenHost: '0.0.0.0',
  listenPort: 8080,
  targetEndpointUrl: 'wss://backend.example.com/websocket',
  serverName: 'EnhancedWebSocketProxy',
  environment: 'production',

  // Connection management with clear naming
  maximumConnections: 10000,
  idleConnectionTimeout: 60000,
  heartbeatInterval: 30000,
  enableConnectionCompression: true,

  // Enhanced health check configuration
  healthCheckConfiguration: {
    isEnabled: true,
    healthEndpointPath: '/health',
    checkIntervalMilliseconds: 30000,
    checkTimeoutMilliseconds: 5000,
    unhealthyThresholdCount: 3,
    healthyThresholdCount: 2
  }
};

// Create enhanced proxy server
const proxyServer = createProxyServer(enhancedConfiguration);

// Start server with enhanced error handling
async function initializeProxyServer() {
  try {
    await proxyServer.startServer();
    console.log('✅ Enhanced proxy server initialized successfully');
  } catch (initializationError) {
    console.error('❌ Server initialization failed:', initializationError);
    process.exit(1);
  }
}

initializeProxyServer();
```

## 🔧 Enhanced Configuration Examples

### Enhanced HTTP Proxy Configuration
```typescript
import { ProtocolFactory } from '@bun/proxy';

const httpProxy = ProtocolFactory.createHTTPProxy({
  protocolType: 'http',
  endpointUrl: 'https://api.example.com',
  connectionTimeoutMilliseconds: 30000,
  maximumRetryAttempts: 3,
  retryDelayMilliseconds: 1000,
  enableCompression: true,
  authentication: {
    authenticationType: 'bearer',
    tokenValue: 'your-token-here'
  }
});

// Enhanced method call with descriptive parameters
const response = await httpProxy.forwardRequest(
  'GET',
  '/api/users',
  undefined,
  { 'X-Custom-Header': 'value' }
);
```

### Enhanced Circuit Breaker Pattern
```typescript
import { PatternFactory } from '@bun/proxy';

const circuitBreaker = PatternFactory.createCircuitBreaker({
  failureThresholdCount: 5,
  successThresholdCount: 3,
  resetTimeoutMilliseconds: 30000,
  maximumHalfOpenAttempts: 3,
  failureWindowMilliseconds: 60000,
  enableMonitoring: true,

  // Enhanced fallback function
  fallbackFunction: (error: Error) => ({
    status: 'fallback',
    message: 'Service temporarily unavailable',
    timestamp: new Date().toISOString(),
    originalError: error.message
  })
});

// Execute operation with enhanced circuit breaker
const result = await circuitBreaker.executeOperation(async () => {
  return await fetchRemoteData();
});
```

## 📊 Enhanced Monitoring Setup

```typescript
import { MonitoringFactory } from '@bun/proxy';

// Enhanced metrics collector
const metricsCollector = MonitoringFactory.createMetricsCollector({
  isEnabled: true,
  metricsEndpointPath: '/metrics',
  outputFormat: 'prometheus',
  collectionIntervalMilliseconds: 15000,
  latencyBuckets: [0.1, 0.5, 1, 2, 5, 10],
  defaultLabels: {
    environment: 'production',
    service: 'proxy-server'
  },
  metricNamePrefix: 'enhanced_proxy_',
  includeDefaultMetrics: true
});

// Enhanced health monitor
const healthMonitor = MonitoringFactory.createHealthMonitor({
  checkIntervalMilliseconds: 30000,
  timeoutMilliseconds: 5000,
  failureThreshold: 3,
  successThreshold: 2,
  healthEndpointPath: '/health',
  readinessEndpointPath: '/ready',
  livenessEndpointPath: '/live',

  // Enhanced custom health checks
  customChecks: [
    {
      name: 'database-connection',
      checkFunction: async () => {
        const startTime = Date.now();
        const isConnected = await checkDatabaseConnection();
        const latency = Date.now() - startTime;

        return {
          status: isConnected ? 'healthy' : 'unhealthy',
          latencyMilliseconds: latency,
          timestamp: new Date(),
          details: {
            database: 'postgresql',
            connectionPool: 'active'
          }
        };
      },
      timeoutMilliseconds: 3000,
      failureThreshold: 2,
      successThreshold: 1
    }
  ]
});
```

## 🔒 Enhanced Security Configuration

```typescript
import {
  Authenticator,
  Firewall,
  type AuthenticationConfiguration,
  type FirewallRule
} from '@bun/proxy/security';

// Enhanced authentication configuration
const authenticationConfig: AuthenticationConfiguration = {
  authenticationType: 'jwt',
  jwtSecret: process.env.JWT_SECRET!,
  requiredClaims: {
    iss: 'your-issuer',
    aud: 'your-audience'
  },
  tokenHeader: 'Authorization',
  tokenQueryParam: 'token',
  tokenCookie: 'auth_token'
};

const authenticator = new Authenticator(authenticationConfig);

// Enhanced firewall rules with descriptive names
const firewallRules: FirewallRule[] = [
  {
    ruleIdentifier: 'allow-internal-api',
    ruleName: 'Allow Internal API Access',
    action: 'allow',
    protocol: 'http',
    source: ['10.0.0.0/8', '192.168.0.0/16'],
    destination: 'api.internal.example.com',
    port: [80, 443],
    method: ['GET', 'POST'],
    path: '/api/internal/*'
  },
  {
    ruleIdentifier: 'block-malicious-user-agents',
    ruleName: 'Block Malicious User Agents',
    action: 'deny',
    protocol: '*',
    source: '*',
    userAgentFilter: [
      /bad-bot/i,
      /malicious-scanner/i,
      /hacking-tool/i
    ],
    logBlockedRequests: true
  }
];

const firewall = new Firewall({
  rules: firewallRules,
  defaultAction: 'deny',
  logBlockedConnections: true
});
```

## 🛠️ Enhanced Utility Functions

```typescript
import {
  formatByteSize,
  formatTimeDuration,
  validateConfiguration,
  createConfigurationTable
} from '@bun/proxy/utils';

// Enhanced byte formatting
console.log(formatByteSize(1024)); // "1.00 KB"
console.log(formatByteSize(1048576)); // "1.00 MB"
console.log(formatByteSize(1073741824)); // "1.00 GB"

// Enhanced duration formatting
console.log(formatTimeDuration(3661000)); // "1h 1m 1s"
console.log(formatTimeDuration(3661000, true)); // "1h 1m 1s 0ms"

// Enhanced configuration table display
const configurationData = [
  {
    propertyName: 'maximumConnections',
    propertyType: 'number',
    isRequired: true,
    defaultValue: '10000',
    description: 'Maximum concurrent connections allowed'
  },
  {
    propertyName: 'idleConnectionTimeout',
    propertyType: 'number',
    isRequired: false,
    defaultValue: '60000',
    description: 'Timeout for idle connections in milliseconds'
  }
];

const tableOutput = createConfigurationTable(configurationData, {
  theme: 'dark',
  showBorder: true,
  zebra: true,
  caption: 'Enhanced Proxy Configuration Properties'
});

console.log(tableOutput);
```

## 📈 Enhanced Performance Monitoring

```typescript
import {
  StatisticsTracker,
  type ConnectionStatistics
} from '@bun/proxy/monitoring';

class EnhancedPerformanceMonitor {
  private statisticsTracker = new StatisticsTracker();
  private performanceThresholds = {
    maximumLatency: 100, // ms
    maximumErrorRate: 1, // %
    minimumSuccessRate: 99, // %
    maximumMemoryUsage: 80 // %
  };

  async monitorServerPerformance(
    statistics: ConnectionStatistics
  ): Promise<PerformanceReport> {
    const performanceMetrics = this.calculatePerformanceMetrics(statistics);
    const healthStatus = this.assessHealthStatus(performanceMetrics);

    return {
      timestamp: new Date(),
      performanceMetrics,
      healthStatus,
      recommendations: this.generateRecommendations(performanceMetrics),
      alerts: this.generateAlerts(performanceMetrics)
    };
  }

  private calculatePerformanceMetrics(
    stats: ConnectionStatistics
  ): PerformanceMetrics {
    return {
      connectionUtilization: (stats.activeConnections / stats.maximumConnections) * 100,
      requestSuccessRate: ((stats.totalRequests - stats.failedRequests) / stats.totalRequests) * 100,
      averageResponseTime: stats.averageLatency,
      memoryUtilization: (stats.memoryUsageBytes / stats.totalMemoryBytes) * 100,
      cpuUtilization: stats.cpuUsagePercentage,
      errorRate: (stats.errorCount / stats.totalRequests) * 100
    };
  }

  private assessHealthStatus(
    metrics: PerformanceMetrics
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (
      metrics.averageResponseTime > this.performanceThresholds.maximumLatency ||
      metrics.errorRate > this.performanceThresholds.maximumErrorRate ||
      metrics.requestSuccessRate < this.performanceThresholds.minimumSuccessRate
    ) {
      return 'unhealthy';
    }

    if (metrics.memoryUtilization > this.performanceThresholds.maximumMemoryUsage) {
      return 'degraded';
    }

    return 'healthy';
  }

  private generateRecommendations(
    metrics: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.averageResponseTime > 50) {
      recommendations.push('Consider implementing response caching');
    }

    if (metrics.memoryUtilization > 70) {
      recommendations.push('Increase memory allocation or optimize memory usage');
    }

    if (metrics.errorRate > 0.5) {
      recommendations.push('Review error logs and implement error handling improvements');
    }

    return recommendations;
  }
}

interface PerformanceMetrics {
  connectionUtilization: number;
  requestSuccessRate: number;
  averageResponseTime: number;
  memoryUtilization: number;
  cpuUtilization: number;
  errorRate: number;
}

interface PerformanceReport {
  timestamp: Date;
  performanceMetrics: PerformanceMetrics;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  recommendations: string[];
  alerts: string[];
}
```

## 📦 Installation

```bash
# Install the enhanced proxy package
bun add @bun/proxy

# Or install globally
bun add -g @bun/proxy
```

## 🔧 Development Scripts

```bash
# Build the package
bun run execute-build-process

# Run type checking
bun run run-type-check

# Run tests
bun run execute-test-suite

# Format code
bun run format-source-code

# Generate documentation
bun run generate-documentation
```

## 🏗️ Architecture

The enhanced @bun/proxy package follows a modular architecture with the following key components:

- **Core Server**: Main proxy server implementation with enhanced naming
- **Protocols**: HTTP, HTTPS, WebSocket, and SOCKS5 proxy implementations
- **Patterns**: Circuit breaker, rate limiter, load balancer, and retry policies
- **Security**: Authentication, firewall, and MITM proxy capabilities
- **Monitoring**: Metrics collection, health monitoring, and logging
- **Caching**: Memory and Redis-based caching solutions
- **WebSocket**: Message buffering and pub/sub services
- **Utils**: Enhanced utility functions for formatting and validation

## 📝 Enhanced Features

- ✅ **Fixed type errors** with proper TypeScript interfaces
- ✅ **Enhanced method names** for better descriptiveness
- ✅ **Improved variable and parameter naming**
- ✅ **Enhanced interface property names**
- ✅ **Updated documentation** with clear examples
- ✅ **Better error handling** with descriptive error messages
- ✅ **Comprehensive type safety** throughout the codebase

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/enhanced-naming`)
3. Commit your changes (`git commit -m 'Add enhanced naming conventions'`)
4. Push to the branch (`git push origin feature/enhanced-naming`)
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Proxy Server Best Practices](https://tools.ietf.org/html/rfc7230)

---

Built with ❤️ using [Bun](https://bun.sh) and enhanced TypeScript conventions.
