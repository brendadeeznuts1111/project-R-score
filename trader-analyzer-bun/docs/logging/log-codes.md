# Hyper-Bun Log Code Registry

Complete registry of all log codes used throughout Hyper-Bun.

**Format**: `YYYY-MM-DD HH:MM:SS.ms | LEVEL | CODE | SOURCE | MESSAGE`

---

## Anomaly Prediction Subsystem (HBAP)

### HBAP-001
- **Expected Level**: INFO
- **Summary**: Anomaly prediction evaluated with actual results
- **Context**: Emitted when prediction accuracy is evaluated
- **Common Causes**:
  - Prediction evaluation cycle
- **Resolution Steps**:
  1. Review prediction error to improve model accuracy
- **Cross-Reference**: `12.2.1.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "INFO",
  "code": "HBAP-001",
  "source": "Anomaly PredictionService",
  "message": "Anomaly prediction evaluated with actual results.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production"
  }
}
```

---

## Circuit Breaker Subsystem (HBCB)

### HBCB-001
- **Expected Level**: INFO
- **Summary**: Circuit breaker successfully recovered from tripped state
- **Context**: Emitted when recordSuccess() is called after a circuit breaker was previously tripped
- **Common Causes**:
  - Bookmaker API recovered
  - Manual reset followed by successful call
- **Resolution Steps**:
  1. Verify bookmaker API is responding normally
  1. Check circuit_breaker_tripped metric returns to 0
  1. Monitor for recurring trips
- **Cross-Reference**: `12.2.4.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "INFO",
  "code": "HBCB-001",
  "source": "Circuit BreakerService",
  "message": "Circuit breaker successfully recovered from tripped state.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "fanduel",
    "operation": "fetchOdds"
  }
}
```

---

### HBCB-002
- **Expected Level**: ERROR
- **Summary**: Circuit breaker tripped after threshold exceeded
- **Context**: Emitted when failureCount >= failureThreshold in recordFailure()
- **Common Causes**:
  - Bookmaker API experiencing outages
  - Network connectivity issues
  - Rate limiting from bookmaker
- **Resolution Steps**:
  1. Check bookmaker status page/API health
  1. Verify network connectivity
  1. Review recent failures: breaker.status('bookmaker')
  1. Consider manual reset if issue resolved
- **Cross-Reference**: `12.2.2.0.0.0.0`
- **Runbook**: [HBCB-002 Resolution Guide](docs/runbooks/HBCB-002-resolution.md)
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "ERROR",
  "code": "HBCB-002",
  "source": "Circuit BreakerService",
  "message": "Circuit breaker tripped after threshold exceeded.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "fanduel",
    "operation": "fetchOdds"
  },
  "errorStack": "Error: Network timeout\n    at fetchMarketData (market-offering-service.ts:68:15)\n    at processMarketOfferings (market-offering-service.ts:45:10)"
}
```

---

### HBCB-003
- **Expected Level**: WARN
- **Summary**: Request rejected due to tripped circuit breaker
- **Context**: Emitted in callApi() when circuit breaker is tripped
- **Common Causes**:
  - Circuit breaker is in tripped state
- **Resolution Steps**:
  1. Check circuit breaker status: breaker.status('bookmaker')
  1. Wait for reset timeout or manually reset if appropriate
  1. Investigate root cause of original trip
- **Cross-Reference**: `12.1.2.1.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "WARN",
  "code": "HBCB-003",
  "source": "Circuit BreakerService",
  "message": "Request rejected due to tripped circuit breaker.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "fanduel",
    "operation": "fetchOdds"
  }
}
```

---

### HBCB-004
- **Expected Level**: WARN
- **Summary**: Request rejected due to load shedding
- **Context**: Emitted in callApi() when system load exceeds threshold
- **Common Causes**:
  - System under extreme load
  - High concurrent request volume
  - Resource exhaustion
- **Resolution Steps**:
  1. Check system metrics
  1. Review active requests
  1. Scale horizontally if load is legitimate
- **Cross-Reference**: `12.1.2.2.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "WARN",
  "code": "HBCB-004",
  "source": "Circuit BreakerService",
  "message": "Request rejected due to load shedding.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "fanduel",
    "operation": "fetchOdds"
  }
}
```

---

### HBCB-005
- **Expected Level**: INFO
- **Summary**: Circuit breaker manually reset
- **Context**: Emitted in reset() method after successful reset
- **Common Causes**:
  - Manual operator intervention
- **Resolution Steps**:
  1. Monitor for recurring trips after reset
- **Cross-Reference**: `12.4.1.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "INFO",
  "code": "HBCB-005",
  "source": "Circuit BreakerService",
  "message": "Circuit breaker manually reset.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "fanduel",
    "operation": "fetchOdds"
  }
}
```

---

### HBCB-006
- **Expected Level**: WARN
- **Summary**: Circuit breaker manually tripped
- **Context**: Emitted in trip() method for scheduled maintenance
- **Common Causes**:
  - Scheduled maintenance
  - Emergency bookmaker API shutdown
- **Resolution Steps**:
  1. Verify maintenance window completion
  1. Reset when ready: breaker.reset('bookmaker')
- **Cross-Reference**: `12.4.2.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "WARN",
  "code": "HBCB-006",
  "source": "Circuit BreakerService",
  "message": "Circuit breaker manually tripped.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "fanduel",
    "operation": "fetchOdds"
  }
}
```

---

### HBCB-007
- **Expected Level**: ERROR
- **Summary**: Failed to send circuit breaker alert
- **Context**: Emitted when alert callback fails
- **Common Causes**:
  - Alert service unavailable
  - Network issues
- **Resolution Steps**:
  1. Check alert service connectivity
  1. Review alert callback configuration
- **Cross-Reference**: `12.2.2.0.0.0.0`
- **Runbook**: [HBCB-007 Resolution Guide](docs/runbooks/HBCB-007-resolution.md)
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "ERROR",
  "code": "HBCB-007",
  "source": "Circuit BreakerService",
  "message": "Failed to send circuit breaker alert.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "fanduel",
    "operation": "fetchOdds"
  },
  "errorStack": "Error: Network timeout\n    at fetchMarketData (market-offering-service.ts:68:15)\n    at processMarketOfferings (market-offering-service.ts:45:10)"
}
```

---

## Logger System Subsystem (HBLOG)

### HBLOG-001
- **Expected Level**: WARN
- **Summary**: Timer was never started
- **Context**: Emitted when endTimer() is called without corresponding startTimer()
- **Common Causes**:
  - Timer label mismatch
  - Timer not initialized
- **Resolution Steps**:
  1. Ensure startTimer() is called before endTimer()
- **Cross-Reference**: `16.1.1.1.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "WARN",
  "code": "HBLOG-001",
  "source": "Logger SystemService",
  "message": "Timer was never started.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production"
  }
}
```

---

## Market Offerings Subsystem (HBMO)

### HBMO-001
- **Expected Level**: INFO
- **Summary**: Processing market offerings for bookmaker
- **Context**: Emitted when starting to process market offerings for a specific bookmaker
- **Common Causes**:
  - Normal operation
  - Scheduled market data refresh
- **Resolution Steps**:
  1. Normal operation, no action needed
- **Cross-Reference**: `1.3.3.1.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "INFO",
  "code": "HBMO-001",
  "source": "Market OfferingsService",
  "message": "Processing market offerings for bookmaker.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "draftkings",
    "eventId": "nfl-2024-001"
  }
}
```

---

### HBMO-002
- **Expected Level**: ERROR
- **Summary**: Failed to process market offerings from bookmaker
- **Context**: Emitted when market offering processing fails
- **Common Causes**:
  - Bookmaker API unavailable
  - Network connectivity issues
  - Invalid bookmaker configuration
  - Rate limiting from bookmaker
- **Resolution Steps**:
  1. Check bookmaker API status
  1. Verify network connectivity
  1. Review bookmaker configuration
  1. Check rate limit status
  1. Review circuit breaker status
- **Cross-Reference**: `1.3.3.1.0.0.0`
- **Runbook**: [HBMO-002 Resolution Guide](docs/runbooks/HBMO-002-resolution.md)
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "ERROR",
  "code": "HBMO-002",
  "source": "Market OfferingsService",
  "message": "Failed to process market offerings from bookmaker.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "draftkings",
    "eventId": "nfl-2024-001"
  },
  "errorStack": "Error: Network timeout\n    at fetchMarketData (market-offering-service.ts:68:15)\n    at processMarketOfferings (market-offering-service.ts:45:10)"
}
```

---

### HBMO-003
- **Expected Level**: INFO
- **Summary**: Successfully retrieved market data from bookmaker
- **Context**: Emitted when market data fetch completes successfully
- **Common Causes**:
  - Successful API call
- **Resolution Steps**:
  1. Normal operation, no action needed
- **Cross-Reference**: `1.3.3.1.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "INFO",
  "code": "HBMO-003",
  "source": "Market OfferingsService",
  "message": "Successfully retrieved market data from bookmaker.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "draftkings",
    "eventId": "nfl-2024-001"
  }
}
```

---

### HBMO-004
- **Expected Level**: DEBUG
- **Summary**: API call promise was already resolved when checked
- **Context**: Emitted when Bun.peek() detects promise is already fulfilled
- **Common Causes**:
  - Promise resolved before peek check
  - Cached response
- **Resolution Steps**:
  1. Normal operation, indicates performance optimization
- **Cross-Reference**: `1.3.3.1.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "DEBUG",
  "code": "HBMO-004",
  "source": "Market OfferingsService",
  "message": "API call promise was already resolved when checked.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "draftkings",
    "eventId": "nfl-2024-001"
  }
}
```

---

### HBMO-005
- **Expected Level**: DEBUG
- **Summary**: API call completed with high-precision timing
- **Context**: Emitted when API call finishes, includes nanosecond-precision timing
- **Common Causes**:
  - Normal API call completion
- **Resolution Steps**:
  1. Normal operation, used for performance monitoring
- **Cross-Reference**: `1.3.3.1.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "DEBUG",
  "code": "HBMO-005",
  "source": "Market OfferingsService",
  "message": "API call completed with high-precision timing.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production",
    "bookmaker": "draftkings",
    "eventId": "nfl-2024-001"
  }
}
```

---

## Performance & Anomaly Trend Analysis Subsystem (HBPD)

### HBPD-001
- **Expected Level**: WARN
- **Summary**: SPC Alert detected - performance metric exceeds control limits
- **Context**: Emitted when Statistical Process Control rules detect anomaly (severity >= 2)
- **Common Causes**:
  - Performance degradation
  - System resource exhaustion
  - External API slowdowns
- **Resolution Steps**:
  1. Check metric baseline: perf.spc('metric_name')
  1. Review recent samples: perf.trends('metric_name', 24)
  1. Investigate root cause
- **Cross-Reference**: `12.1.2.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "WARN",
  "code": "HBPD-001",
  "source": "Performance & Anomaly Trend AnalysisService",
  "message": "SPC Alert detected - performance metric exceeds control limits.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production"
  }
}
```

---

### HBPD-002
- **Expected Level**: INFO
- **Summary**: Performance data cleanup completed
- **Context**: Emitted when old performance samples are cleaned up
- **Common Causes**:
  - Scheduled maintenance
  - Retention policy
- **Resolution Steps**:
  1. Normal operation, no action needed
- **Cross-Reference**: `12.1.1.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "INFO",
  "code": "HBPD-002",
  "source": "Performance & Anomaly Trend AnalysisService",
  "message": "Performance data cleanup completed.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production"
  }
}
```

---

## Performance Monitoring Subsystem (HBPERF)

### HBPERF-001
- **Expected Level**: WARN
- **Summary**: Slow response detected from bookmaker API
- **Context**: Emitted when API response time exceeds threshold
- **Common Causes**:
  - Bookmaker API experiencing high load
  - Network latency issues
  - Large data payload
  - Rate limiting delays
- **Resolution Steps**:
  1. Check bookmaker API status page
  1. Review network connectivity
  1. Consider implementing request batching
  1. Monitor for recurring slow responses
- **Cross-Reference**: `12.0.0.0.0.0.0`
- **Example Structured Log (JSON)**:
```json
{
  "timestamp": "2025-12-07 09:35:30.000",
  "level": "WARN",
  "code": "HBPERF-001",
  "source": "Performance MonitoringService",
  "message": "Slow response detected from bookmaker API.",
  "context": {
    "pid": 12345,
    "nodeEnv": "production"
  }
}
```

---

## ripgrep Discovery

Use `ripgrep` to find log code usage:

```bash
# Find all occurrences of a log code
rg "HBMO-001"

# Find in source code
rg "HBMO-001" src/

# Find in log files
rg "HBMO-001" logs/
```