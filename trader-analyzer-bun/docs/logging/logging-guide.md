# Hyper-Bun Logging Guide

## Quick Start

```typescript
import { HyperBunLogger } from '../src/logging';

// Create logger instance
const logger = new HyperBunLogger('MarketOfferingService', {
  enableConsole: true,
  enableFile: true
});

// Basic logging
logger.info('HBMO-001', 'Processing market offerings');

// With data
logger.info('HBMO-003', 'Retrieved market data', {
  bookmaker: 'pinnacle',
  eventCount: 42,
  responseTime: 145
});

// Error logging
try {
  // Some operation
} catch (error) {
  logger.error('HBMO-002', 'Failed to retrieve data', error, {
    bookmaker: 'bet365'
  });
}
```

## Performance Timing

```typescript
import { HyperBunLogger } from '../src/logging';

const logger = new HyperBunLogger('MarketAnalysis');

logger.startTimer('market_analysis');
// ... analysis code ...
const duration = logger.endTimer(
  'market_analysis',
  'HBPERF-001',
  'Completed market analysis'
);
```

## Child Loggers

```typescript
const parentLogger = new HyperBunLogger('ParentService');
const childLogger = parentLogger.child('SubService');

childLogger.info('HBMO-001', 'Child operation');
```

## Correlation IDs

```typescript
const logger = new HyperBunLogger('Service', {
  correlationId: 'req-12345'
});

// Or set dynamically
logger.setCorrelationId('req-67890');
```

## Best Practices

1. **Always use registered log codes** - Never use arbitrary strings
2. **Include relevant context** - Add data that helps debugging
3. **Use appropriate log levels** - DEBUG for development, INFO for normal ops
4. **Correlate logs** - Use correlationId for distributed tracing
5. **Monitor log volume** - Avoid excessive logging in production
6. **Use performance timing** - Track operation durations
7. **Create child loggers** - For nested service hierarchies

## Log Format

All logs follow this format:

```
YYYY-MM-DD HH:MM:SS.ms | LEVEL | CODE | SOURCE | MESSAGE
```

Example:

```
2025-12-07 09:35:30.000 | INFO | HBMO-001 | MarketOfferingService | Processing market offerings for draftkings.
```
