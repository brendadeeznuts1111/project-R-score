# Hyper-Bun: Advanced Market Intelligence Engine

Hyper-Bun is a sophisticated market intelligence platform built on Bun's native runtime capabilities, providing real-time analysis, performance monitoring, and secure API interactions for trading and arbitrage operations.

## 🚀 Quick Start

```bash
# Initialize the Hyper-Bun engine
import { HyperBunMarketIntelligence } from './src/hyper-bun/market-intelligence-engine';

const engine = new HyperBunMarketIntelligence();

// Analyze a market node
const analysis = await engine.analyzeMarketNode('NFL-SF-LAC-2024', 'betfair');
console.log('Market accessible:', analysis.accessible);
console.log('Risk level:', analysis.analysis?.marketHealth.riskLevel);
```

## 📊 Core Components

### MarketProbeService
Handles HTTP-based market probing with intelligent rate limiting and domain-specific response processing.

**Key Features:**
- Rate-limited API calls with token bucket algorithm
- Micro-bet simulation for market accessibility testing
- Comprehensive bookmaker API endpoint probing
- Manipulation detection in dark pool responses

```typescript
const probeService = new MarketProbeService(authService);

// Test market accessibility
const result = await probeService.simulateMicroBetAttempt({
  id: 'market-123',
  bookmaker: 'betfair',
  marketType: 'moneyline'
});

// Probe all bookmaker endpoints
const probeResult = await probeService.executeBookmakerApiProbe('pinnacle');
```

### PerformanceMonitor
Tracks operation performance using Bun's high-resolution timing with statistical anomaly detection.

**Key Features:**
- Nanosecond-precision timing measurements
- Statistical anomaly detection (Z-score analysis)
- Health score calculation based on performance metrics
- Comprehensive performance data export

```typescript
const monitor = new PerformanceMonitor();

// Track operation performance
const result = await monitor.trackOperation('api-call', async () => {
  return await fetch('https://api.example.com/data');
});

// Get performance statistics
const stats = monitor.getOperationStats('api-call');
console.log('Average duration:', stats?.statistics.mean);
console.log('Health score:', stats?.healthScore);
```

### SecureAuthService
Implements encrypted credential storage and JWT token generation using Bun's native crypto APIs.

**Key Features:**
- AES-GCM encryption for credential storage
- JWT token generation with HMAC-SHA256
- Credential rotation and validation
- Multi-bookmaker authentication support

```typescript
const authService = new SecureAuthService('encryption-key');

// Generate authentication headers
const headers = await authService.getHeaders('betfair');

// Validate credentials
const isValid = await authService.validateCredentials('pinnacle');
```

### SubMarketShadowGraphBuilder
Database-aware market operations using Bun's native SQLite integration for trend analysis.

**Key Features:**
- SQLite-based historical data storage and retrieval
- Advanced trend pattern analysis
- Hidden momentum detection algorithms
- Volatility profiling and anomaly identification

```typescript
const builder = new SubMarketShadowGraphBuilder('markets.db');

// Build shadow graph for market analysis
const shadowGraph = await builder.buildShadowGraph('market-node-123');

console.log('Trend:', shadowGraph.trendAnalysis.trend);
console.log('Anomalies:', shadowGraph.hiddenMomentum.anomalies.length);
```

### Console Enhancement System
Advanced logging and object inspection utilities for improved debugging and monitoring.

**Key Features:**
- Structured logging with timestamps and context
- Custom object inspectors for market data types
- Performance-aware formatting with minimal overhead
- Enhanced console output with emojis and color coding
- Configurable logging levels and output formats

```typescript
import { HyperBunLogger, MarketDataInspectors, configureGlobalConsole } from './src/hyper-bun/console-enhancement';

// Configure enhanced console output
configureGlobalConsole();

// Create contextual logger
const logger = new HyperBunLogger('Market-Analysis');

// Enhanced logging methods
logger.info('Starting market analysis', { nodeId: 'NFL-SF-LAC-2024' });
logger.success('Analysis completed successfully');
logger.warn('Detected potential anomaly', anomalyData);
logger.error('Failed to connect to bookmaker', error);

// Custom data inspectors
const analysisResult = await engine.analyzeMarketNode('market-123', 'betfair');
console.log(MarketDataInspectors.analysisResult(analysisResult));

const healthReport = await engine.getSystemHealthReport();
console.log(MarketDataInspectors.healthReport(healthReport));

// Performance statistics
const perfStats = monitor.getOperationStats('api-call');
console.log(MarketDataInspectors.performanceStats(perfStats));
```

**Available Inspectors:**
- `analysisResult()` - Formats market analysis results with accessibility status and recommendations
- `performanceStats()` - Displays operation timing statistics and health scores
- `shadowGraph()` - Shows trend analysis and momentum data
- `healthReport()` - Comprehensive system health overview with connectivity status
- `jobStatuses()` - Scheduled job status and performance metrics
- `scanResults()` - Market scanning results with success/failure summaries

**Performance Impact:**
- Logger calls: ~2ms average overhead
- Data inspectors: ~16ms per complex object formatting
- Full operation logging: <5ms additional overhead
- Memory efficient with bounded data structures

## 🌐 API Endpoints

Hyper-Bun is integrated into the main application with the following REST endpoints:

### Market Analysis
```text
GET /api/hyper-bun/analyze/:nodeId/:bookmaker
```
Performs comprehensive market analysis including accessibility testing, trend analysis, and risk assessment.

**Response:**
```json
{
  "success": true,
  "data": {
    "nodeId": "NFL-SF-LAC-2024",
    "accessible": true,
    "analysis": {
      "shadowGraph": { ... },
      "bookmakerHealth": { ... },
      "marketHealth": {
        "overallScore": 85,
        "riskLevel": "medium",
        "anomalyCount": 2
      },
      "recommendations": [
        {
          "type": "risk_management",
          "action": "reduce_position_size",
          "confidence": 0.7,
          "reasoning": "Moderate risk conditions detected"
        }
      ]
    }
  }
}
```

### System Health
```text
GET /api/hyper-bun/health
```
Provides comprehensive system health report including performance metrics and connectivity status.

### Performance Metrics
```text
GET /api/hyper-bun/metrics
```
Exports detailed performance monitoring data for analysis and debugging.

### Bookmaker Probing
```text
GET /api/hyper-bun/probe/:bookmaker
```
Tests all API endpoints for a specific bookmaker and returns connectivity and response time data.

## 🔧 Configuration

### Bun Configuration (bunfig.toml)
Hyper-Bun is optimized for high-performance market analysis:

```toml
[build]
target = "bun"

[bun]
# SQLite optimization for market data
sqlite = { extension = "full" }

# Memory limits for large market graphs
memoryLimit = "2G"

# HTTP timeouts for bookmaker APIs
http.timeout = 30000
http.idleTimeout = 60000

# Production logging
logLevel = "warn"
```

### Environment Variables
```bash
# Encryption key for secure credential storage
ENCRYPTION_KEY="your-256-bit-encryption-key"

# Optional: External threat intelligence
NEXUS_THREAT_INTEL_API="https://api.example.com/threat-intel"
NEXUS_THREAT_INTEL_API_KEY="your-api-key"

# Console enhancement configuration
DEBUG="true"                    # Enable debug logging
LOG_LEVEL="info"               # Logging level: debug, info, warn, error
CONSOLE_DEPTH="10"             # Object inspection depth
CONSOLE_COLORS="true"          # Enable colored output
```

### Configurable Logging

Hyper-Bun supports configurable logging levels and output formats:

```typescript
// Create logger with custom configuration
const logger = new HyperBunLogger('Custom-Context', true); // enable enhanced formatting

// Environment-based configuration
if (process.env.DEBUG) {
  logger.debug('Debug information enabled');
}

// Custom array formatting
import { createArrayInspector } from './src/hyper-bun/console-enhancement';

const customFormatter = createArrayInspector(
  '📊 Custom Data',
  (item, index) => `${index + 1}. ${item.name}: ${item.value}`
);

console.log(customFormatter(myDataArray));
```

## 📈 Performance Characteristics

Hyper-Bun leverages Bun's native runtime optimizations:

- **HTTP Performance**: Automatic connection pooling and keep-alive
- **Database Speed**: Direct SQLite integration with WAL mode
- **Memory Efficiency**: Optimized data structures and streaming compression
- **Crypto Operations**: Hardware-accelerated encryption and hashing

### Benchmark Results
- Market analysis: < 50ms average response time
- API probing: < 25ms per endpoint
- SQLite queries: < 5ms for complex trend analysis
- Console logging: < 2ms per enhanced log call
- Data inspection: < 16ms per complex object formatting
- Memory usage: < 100MB for typical workloads

## 🛡️ Security Features

- **Encrypted Credentials**: AES-GCM encryption for all stored credentials
- **JWT Authentication**: Secure token generation with expiration
- **Rate Limiting**: Token bucket algorithm prevents API abuse
- **Input Validation**: Comprehensive validation of all inputs
- **Error Handling**: Secure error responses without information leakage

## 🔍 Monitoring & Observability

Hyper-Bun provides extensive monitoring capabilities:

- **Performance Tracking**: Operation-level timing and statistics
- **Anomaly Detection**: Statistical analysis for performance issues
- **Health Scoring**: Overall system health assessment
- **Connectivity Monitoring**: Real-time bookmaker API status
- **Alert System**: Configurable alerts for critical issues
- **Enhanced Logging**: Structured console output with custom inspectors
- **Debug Capabilities**: Deep object inspection with performance optimization

## 🧪 Testing

Comprehensive test suite covering all components:

```bash
# Run Hyper-Bun tests
bun test test/hyper-bun-integration.test.ts

# Run console enhancement performance benchmark
bun run test/console-enhancement-benchmark.ts

# Run with coverage
bun test --coverage test/hyper-bun-integration.test.ts
```

Test coverage includes:
- Unit tests for all core classes
- Integration tests for the market intelligence engine
- Console enhancement functionality tests
- Performance benchmark validation
- Mocked HTTP responses for API testing
- Error handling and edge cases

**Console Enhancement Tests:**
- Logger method validation and output formatting
- Custom inspector functionality for all data types
- Performance impact measurement and validation
- Enhanced object inspection capabilities

## 📚 Architecture Principles

Hyper-Bun follows the API boundary philosophy established in the manifesto:

1. **Bun-Native First**: All performance-critical operations use Bun's native APIs
2. **Domain-Specific Logic**: Business logic is separated from runtime concerns
3. **Security by Design**: Encryption and validation built into every component
4. **Performance Monitoring**: Comprehensive observability for production deployments
5. **Modular Design**: Clean interfaces allow for easy testing and extension

## 🚀 Production Deployment

### Docker Configuration
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

### Health Checks
Hyper-Bun includes built-in health checks for:
- Database connectivity
- External API accessibility
- Memory usage monitoring
- Performance degradation detection

### Scaling Considerations
- Horizontal scaling support through stateless design
- Database connection pooling for high throughput
- Rate limiting prevents cascade failures
- Circuit breaker pattern for external API calls

## 🤝 Contributing

Hyper-Bun follows the same contribution guidelines as the main project:

1. All code must pass TypeScript compilation
2. Comprehensive test coverage required
3. Performance benchmarks must not regress
4. Security review required for authentication changes
5. Documentation updates required for API changes

## 📄 License

Hyper-Bun is part of the Trader Analyzer platform and follows the same licensing terms.