# Syndicate Analysis System - Integration Guide

## Architecture Overview

The enhanced syndicate analysis system consists of multiple integrated components:

```text
┌─────────────────────────────────────────────────────────────┐
│                   Syndicate Analysis System                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Database   │  │  Event Bus   │  │   WebSocket  │    │
│  │   (SQLite)   │  │  (Events)    │  │   (Real-time)│    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                                │
│                   ┌────────▼────────┐                      │
│                   │  Cache Manager  │                      │
│                   └────────┬────────┘                      │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         │                  │                  │            │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐     │
│  │  Anomaly    │  │  Correlation  │  │   Metrics    │     │
│  │  Detector   │  │   Analyzer    │  │  Collector   │     │
│  └─────────────┘  └───────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Integration

### 1. Database + Cache Integration

```typescript
import { SyndicateDatabase } from './database';
import { cacheManager } from './cache/cache-manager';

const db = new SyndicateDatabase('syndicates.db');

// Check cache first, then database
async function getPatternsWithCache(syndicateId: string) {
  // Try cache first
  let patterns = cacheManager.getPatterns(syndicateId);
  
  if (!patterns) {
    // Cache miss - fetch from database
    patterns = db.getSyndicatePatterns(syndicateId);
    
    // Store in cache
    if (patterns) {
      cacheManager.setPatterns(syndicateId, patterns);
    }
  }
  
  return patterns;
}
```

### 2. Event Bus + WebSocket Integration

```typescript
import { eventBus } from './events/event-bus';
import { SyndicateWebSocketServer } from './real-time/websocket-server';

const wsServer = new SyndicateWebSocketServer(3001);

// Listen to events and broadcast via WebSocket
eventBus.on('pattern.detected', (event) => {
  wsServer.broadcastPatternDetected(event.pattern, {
    grading: event.pattern.grading,
    priority: event.pattern.priority,
    category: event.pattern.category
  });
});

eventBus.on('bet.recorded', (event) => {
  // Analyze bet and detect patterns
  const patternsTriggered = detectPatterns(event.bet);
  wsServer.broadcastBetRecorded(event.bet, patternsTriggered);
});
```

### 3. Anomaly Detection Integration

```typescript
import { anomalyDetector } from './analytics/anomaly-detector';
import { eventBus } from './events/event-bus';

// Detect anomalies when patterns are detected
eventBus.on('pattern.detected', async (event) => {
  // Get historical patterns for comparison
  const historical = await db.getSyndicatePatterns(
    event.syndicateId,
    event.pattern.patternType
  );
  
  if (historical.length >= 10) {
    const strengths = historical.map(p => p.strength);
    const anomaly = anomalyDetector.detectPatternStrengthAnomaly(
      event.pattern.strength,
      strengths
    );
    
    if (anomaly.isAnomaly) {
      eventBus.emitAlert(
        anomaly.severity,
        `Anomaly detected: ${anomaly.reason}`,
        event.syndicateId,
        event.pattern.patternType
      );
    }
  }
});
```

### 4. Correlation Analysis Integration

```typescript
import { correlationAnalyzer } from './analytics/correlation-analyzer';

// Analyze correlations periodically
setInterval(async () => {
  const allPatterns = await db.getAllPatterns();
  const correlations = correlationAnalyzer.analyzePatternCorrelations(
    allPatterns.map(p => ({ type: p.patternType, strength: p.strength }))
  );
  
  // Store strong correlations as emerging patterns
  correlations
    .filter(c => c.strength === 'strong' && Math.abs(c.correlation) > 0.7)
    .forEach(correlation => {
      // Create emerging pattern from correlation
      // ...
    });
}, 60000); // Every minute
```

### 5. Metrics Collection Integration

```typescript
import { metricsCollector } from './monitoring/metrics';

// Record metrics for all operations
const startTime = performance.now();
const patterns = await db.getSyndicatePatterns(syndicateId);
const duration = performance.now() - startTime;

metricsCollector.recordOperation('getPatterns', duration);
metricsCollector.recordPatternDetection(
  pattern.patternType,
  pattern.strength,
  pattern.confidence,
  pattern.syndicateId
);

// Record system metrics periodically
setInterval(() => {
  metricsCollector.recordSystemMetrics({
    patternsDetected: metricsCollector.getSummary().totalPatternDetections,
    cacheHitRate: cacheManager.getStats().hitRate,
    memoryUsage: process.memoryUsage()
  });
}, 30000); // Every 30 seconds
```

## Complete Integration Example

```typescript
import { SyndicateDatabase } from './database';
import { eventBus } from './events/event-bus';
import { cacheManager } from './cache/cache-manager';
import { SyndicateWebSocketServer } from './real-time/websocket-server';
import { anomalyDetector } from './analytics/anomaly-detector';
import { correlationAnalyzer } from './analytics/correlation-analyzer';
import { metricsCollector } from './monitoring/metrics';

class IntegratedSyndicateAnalyzer {
  private db: SyndicateDatabase;
  private wsServer: SyndicateWebSocketServer;
  
  constructor() {
    this.db = new SyndicateDatabase('syndicates.db');
    this.wsServer = new SyndicateWebSocketServer(3001);
    
    this.setupEventHandlers();
    this.startAutoCleanup();
  }
  
  private setupEventHandlers() {
    // Pattern detection → Cache → WebSocket → Metrics
    eventBus.on('pattern.detected', (event) => {
      // Update cache
      cacheManager.setPatterns(event.syndicateId, [event.pattern]);
      
      // Broadcast via WebSocket
      this.wsServer.broadcastPatternDetected(event.pattern, {
        grading: event.pattern.grading,
        priority: event.pattern.priority,
        category: event.pattern.category
      });
      
      // Record metrics
      metricsCollector.recordPatternDetection(
        event.pattern.patternType,
        event.pattern.strength,
        event.pattern.confidence,
        event.syndicateId
      );
      
      // Check for anomalies
      this.checkAnomalies(event);
    });
    
    // Bet recording → Pattern detection → Events
    eventBus.on('bet.recorded', async (event) => {
      const startTime = performance.now();
      
      // Detect patterns
      const patterns = await this.detectPatterns(event.bet);
      
      // Record performance
      metricsCollector.recordOperation(
        'detectPatterns',
        performance.now() - startTime
      );
      
      // Emit pattern events
      patterns.forEach(pattern => {
        eventBus.emitPatternDetected(event.bet.syndicateId, pattern);
      });
    });
  }
  
  private async checkAnomalies(event: PatternDetectedEvent) {
    const historical = this.db.getSyndicatePatterns(
      event.syndicateId,
      event.pattern.patternType
    );
    
    if (historical.length >= 10) {
      const strengths = historical.map(p => p.strength);
      const anomaly = anomalyDetector.detectPatternStrengthAnomaly(
        event.pattern.strength,
        strengths
      );
      
      if (anomaly.isAnomaly) {
        eventBus.emitAlert(
          anomaly.severity,
          anomaly.reason,
          event.syndicateId,
          event.pattern.patternType
        );
      }
    }
  }
  
  private async detectPatterns(bet: SyndicateBet): Promise<SyndicatePattern[]> {
    // Pattern detection logic
    return [];
  }
  
  private startAutoCleanup() {
    // Cleanup expired cache entries
    cacheManager.startAutoCleanup(60000);
    
    // Periodic correlation analysis
    setInterval(async () => {
      const correlations = await this.analyzeCorrelations();
      // Process correlations...
    }, 300000); // Every 5 minutes
  }
  
  private async analyzeCorrelations() {
    // Correlation analysis logic
    return [];
  }
}
```

## Next Steps

1. **Implement ML Integration**: Add machine learning models for predictive pattern detection
2. **Add External APIs**: Integrate with betting platform APIs
3. **Create Dashboard**: Build visualization dashboard for patterns
4. **Implement Security**: Add encryption and access control
5. **Add Monitoring**: Set up Prometheus/Grafana for system monitoring
