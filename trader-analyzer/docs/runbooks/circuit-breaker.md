# Circuit Breaker Runbook

**Version**: 15.1.2.2.6.0.0.0  
**Last Updated**: 2024-12-XX  
**P0 Critical Feature** - Deploy Monday

---

## **Overview**

The Production Circuit Breaker protects bookmaker API calls from cascading failures. When a bookmaker API fails repeatedly, the circuit breaker **trips** and halts all traffic to that bookmaker until **manual intervention**.

**Key Principle**: A tripped circuit breaker is **not a bug—it's the system working correctly**. Intentional message loss is better than building graphs with corrupted data.

---

## **Quick Reference**

### **Check Status**
```bash
# In bun-console.ts
breaker.statusAll()                    # Show all bookmakers
breaker.status('draftkings')           # Show specific bookmaker
```

### **Reset Circuit Breaker**
```bash
breaker.reset('draftkings', 'API team cleared incident', false)
breaker.reset('draftkings', 'Emergency override', true)  # Force reset (bypasses cooldown)
```

### **Manually Trip (Maintenance)**
```bash
breaker.trip('draftkings', 'Scheduled maintenance window')
```

### **Check Metrics**
```bash
curl http://localhost:3000/api/metrics | grep circuit_breaker
```

---

## **Alerting**

### **Prometheus Metrics**

The circuit breaker exposes these metrics at `/api/metrics`:

- `circuit_breaker_tripped{bookmaker="draftkings"}` - `1` if tripped, `0` if closed
- `circuit_breaker_failures_1m{bookmaker="draftkings"}` - Current failure count
- `circuit_breaker_trip_count{bookmaker="draftkings"}` - Total trips (lifetime)
- `circuit_breaker_latency_ms{bookmaker="draftkings"}` - Average latency (ms)
- `circuit_breaker_rejected{bookmaker="draftkings",reason="tripped"}` - Rejected calls
- `circuit_breaker_rejected{bookmaker="draftkings",reason="load_shed"}` - Load shedding rejections

### **Alert Rules**

**PagerDuty Alert**: `circuit_breaker_tripped == 1` for >5 minutes

```promql
circuit_breaker_tripped{bookmaker=~".+"} == 1
```

**Alert Message**:
```
🚨 Circuit Breaker Tripped: {{ $labels.bookmaker }}
Failures: {{ $value }}
Action Required: Manual reset via bun-console.ts
```

---

## **Common Scenarios**

### **Scenario 1: Bookmaker API Down**

**Symptoms**:
- `circuit_breaker_tripped{bookmaker="draftkings"} == 1`
- `circuit_breaker_failures_1m{bookmaker="draftkings"} >= 10`
- API calls failing with timeout/5xx errors

**Investigation**:
```bash
# Check status
breaker.status('draftkings')

# Check last error
# Output shows: "Last Error: TIMEOUT" or "Last Error: 500 Internal Server Error"
```

**Action**:
1. **DO NOT** reset immediately—verify bookmaker API is actually down
2. Check bookmaker status page / Twitter / Slack
3. If confirmed down: **Wait for bookmaker to resolve**
4. If resolved: Reset with reason
   ```bash
   breaker.reset('draftkings', 'Bookmaker API restored - confirmed via status page')
   ```

---

### **Scenario 2: Super Bowl Traffic Spike**

**Symptoms**:
- Multiple bookmakers tripped simultaneously
- `circuit_breaker_rejected{reason="load_shed"}` increasing
- System load > 85%

**Investigation**:
```bash
breaker.statusAll()
# Shows multiple bookmakers tripped
```

**Action**:
1. **DO NOT** reset all breakers—this is load shedding protecting the system
2. Check system metrics: CPU, memory, active requests
3. If system load normalizes (< 85%), breakers will auto-retry after timeout
4. If system remains overloaded: **Reduce traffic** (e.g., disable non-critical probes)

---

### **Scenario 3: Thundering Herd Reset**

**Symptoms**:
- Multiple engineers reset breaker simultaneously
- Breaker trips again immediately after reset
- Error: "Reset denied: draftkings tripped <60s ago"

**Investigation**:
```bash
breaker.status('draftkings')
# Shows: "Last Reset: 2024-12-XX 14:23:45" (recent)
```

**Action**:
1. **Wait for cooldown** (60 seconds default)
2. **OR** use force reset (only if bookmaker confirmed healthy):
   ```bash
   breaker.reset('draftkings', 'Force reset - confirmed API healthy', true)
   ```
3. **Coordinate** with team—only one person should reset

---

### **Scenario 4: Scheduled Maintenance**

**Symptoms**:
- Planned maintenance window
- Need to prevent API calls during maintenance

**Action**:
```bash
# Trip breaker before maintenance
breaker.trip('draftkings', 'Scheduled maintenance: 2 AM - 4 AM EST')

# After maintenance completes
breaker.reset('draftkings', 'Maintenance complete - API verified healthy')
```

---

## **Database Schema**

Circuit breaker state is persisted in SQLite: `./data/circuit_breaker.db`

### **Tables**

**`circuit_breaker_state`**:
- `bookmaker` (TEXT PRIMARY KEY)
- `failure_count` (INTEGER)
- `last_failure_at` (INTEGER - Unix timestamp ms)
- `tripped` (INTEGER - 0 or 1)
- `trip_count` (INTEGER)
- `last_error` (TEXT)
- `avg_latency` (REAL - ms)
- `last_reset_at` (INTEGER)
- `last_reset_by` (TEXT)
- `last_reset_reason` (TEXT)

**`circuit_breaker_audit`**:
- `id` (INTEGER PRIMARY KEY)
- `bookmaker` (TEXT)
- `action` (TEXT - 'TRIP' or 'RESET')
- `reason` (TEXT)
- `user` (TEXT)
- `timestamp` (INTEGER)

### **Query Examples**

```sql
-- Check all tripped breakers
SELECT bookmaker, failure_count, last_error, last_failure_at
FROM circuit_breaker_state
WHERE tripped = 1;

-- Audit log for last 24 hours
SELECT bookmaker, action, reason, user, datetime(timestamp/1000, 'unixepoch') as time
FROM circuit_breaker_audit
WHERE timestamp > strftime('%s', 'now', '-1 day') * 1000
ORDER BY timestamp DESC;
```

---

## **Configuration**

### **Default Settings**

- **Failure Threshold**: 10 failures
- **Reset Timeout**: 60 seconds (after trip, allow retry)
- **Cooldown**: 60 seconds (prevent thundering herd on reset)
- **Load Shedding**: Reject if system load > 85% AND operation load > 100

### **Failure Weighting**

- **Hard failures** (5xx, network errors): Weight = 1.0
- **Timeouts**: Weight = 0.5 (less severe, more common under load)

---

## **Troubleshooting**

### **Breaker Not Tripping When It Should**

**Check**:
1. Is the breaker actually being used? Check code paths
2. Are failures being recorded? Check `circuit_breaker_failures_1m` metric
3. Is threshold too high? Default is 10 failures

**Fix**:
- Verify `breaker.callApi()` is being called with correct context
- Check database: `SELECT * FROM circuit_breaker_state WHERE bookmaker = 'draftkings'`

### **Breaker Tripping Too Often**

**Check**:
1. Is bookmaker API actually down?
2. Are we hammering the API? Check request rate
3. Is system overloaded? Check `circuit_breaker_rejected{reason="load_shed"}`

**Fix**:
- Reduce request rate
- Increase failure threshold (requires code change)
- Investigate bookmaker API stability

### **Metrics Not Appearing**

**Check**:
1. Is breaker initialized? Check `/api/metrics` endpoint
2. Are there any bookmakers with state? `breaker.statusAll()`
3. Is database accessible? Check `./data/circuit_breaker.db` exists

**Fix**:
- Initialize breaker: `getCircuitBreaker()` must be called
- Check database permissions
- Verify metrics endpoint is working: `curl http://localhost:3000/api/metrics`

---

## **Best Practices**

1. **Never auto-reset**: No `setTimeout(() => breaker.reset(), 60000)` anywhere
2. **Always log resets**: Use `breaker.reset(bookmaker, reason, force)` with descriptive reason
3. **Coordinate resets**: Only one person should reset per bookmaker
4. **Verify before reset**: Confirm bookmaker API is actually healthy
5. **Monitor metrics**: Set up alerts for `circuit_breaker_tripped == 1`
6. **Document incidents**: Add reason to reset call for audit trail

---

## **Emergency Procedures**

### **Complete System Shutdown (All Bookmakers Tripped)**

**If all bookmakers are tripped**:

1. **DO NOT** reset all breakers—investigate root cause
2. Check system load: `curl http://localhost:3000/api/metrics | grep system_load`
3. Check bookmaker status pages
4. If system overloaded: Reduce traffic, wait for load to normalize
5. If bookmakers down: Wait for resolution, then reset individually

### **False Positive (Breaker Tripped But API Healthy)**

**If breaker tripped but bookmaker API is confirmed healthy**:

1. Verify API health: `curl https://api.draftkings.com/health` (or equivalent)
2. Check breaker status: `breaker.status('draftkings')`
3. Force reset with reason:
   ```bash
   breaker.reset('draftkings', 'False positive - API confirmed healthy via health check', true)
   ```
4. Monitor for re-trip—if it trips again, investigate further

---

## **Related Documentation**

- `docs/12.0.0.0.0.0.0-FUTURE-ENHANCEMENTS.md` - Circuit breaker implementation details
- `src/utils/production-circuit-breaker.ts` - Source code
- `src/utils/circuit-breaker-instance.ts` - Singleton instance
- `scripts/bun-console.ts` - Console commands

---

## **Changelog**

- **15.1.2.2.0.0.0** (2024-12-XX): Initial production-grade implementation
  - SQLite persistence
  - Prometheus metrics integration
  - Load shedding
  - Weighted failures
  - Cooldown enforcement
  - Audit logging

