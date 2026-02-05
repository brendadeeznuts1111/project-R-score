# Canary Deployment Guide

**Version**: 1.0.0  
**Last Updated**: 2025-01-XX  
**Status**: Production Ready

## [DoD][OPS:Deployment][SCOPE:Canary]

This guide provides step-by-step instructions for deploying Hyper-Bun to production using a canary deployment strategy (5% traffic for 24h validation).

---

## Pre-Deployment Checklist

### ✅ Run Production Hardening Checklist

```bash
bun run scripts/production-hardening-checklist.ts
```

**Expected Result**: All critical checks pass ✅

### ✅ Run Circuit Breaker Tests

```bash
bun run scripts/test-circuit-breaker.ts
```

**Expected Result**: All tests pass ✅

### ✅ Verify Build

```bash
bun run build
bun test
```

---

## Canary Deployment Steps

### Step 1: Prepare Canary Environment

```bash
# Set environment variables
export NODE_ENV=production
export CANARY_PERCENTAGE=5
export METRICS_PORT=3000
export LOG_LEVEL=INFO

# Verify configuration
cat config/production.yaml
```

### Step 2: Deploy Canary Instance

```bash
# Start canary instance on separate port
PORT=3001 bun run start &

# Verify health check
curl http://localhost:3001/health

# Verify metrics endpoint
curl http://localhost:3001/metrics | head -20
```

### Step 3: Configure Load Balancer

Configure your load balancer (nginx, HAProxy, AWS ALB) to route 5% of traffic to the canary instance:

**Nginx Example**:
```nginx
upstream hyperbun {
    server localhost:3000 weight=95;
    server localhost:3001 weight=5;
}
```

**AWS ALB Example**:
- Create target group for canary (port 3001)
- Configure weighted routing: 95% to production, 5% to canary

### Step 4: Enable Monitoring

```bash
# Start monitoring dashboard
bun run console -e "mlgs.perf.dashboard()"

# Monitor logs in tmux
# Ctrl-Space + L (live logs)
# Ctrl-Space + E (errors only)
```

---

## Monitoring During Canary Period

### Critical Metrics to Monitor

#### 1. Memory Usage

```bash
# Check memory metrics via Prometheus
curl http://localhost:3001/metrics | grep memory

# Or via console
bun run console -e "console.log(Bun.memoryUsage())"
```

**Alert Threshold**: Memory usage > 80% of limit

#### 2. Rate Limiting Metrics

```bash
# Check rate limit rejections
curl http://localhost:3001/metrics | grep rate_limit

# Expected: rate_limit_rejected_total should be minimal
```

**Alert Threshold**: Rate limit rejections > 10% of requests

#### 3. Error Rates

```bash
# Check error logs
rg '"level":"ERROR"' logs/hyper-bun-$(date +%Y-%m-%d).log | wc -l

# Check Prometheus error metrics
curl http://localhost:3001/metrics | grep hyperbun_log_errors_total
```

**Alert Threshold**: Error rate > 1% of total requests

#### 4. Circuit Breaker Status

```bash
# Check circuit breaker status
bun run console -e "mlgs.breaker.statusAll()"

# Check Prometheus metrics
curl http://localhost:3001/metrics | grep circuit_breaker
```

**Alert Threshold**: Any circuit breaker tripped for > 5 minutes

#### 5. Performance Metrics

```bash
# Check performance dashboard
bun run console -e "mlgs.perf.dashboard()"

# Check query timeouts
rg "QUERY_TIMEOUT" logs/*.log
```

**Alert Threshold**: 
- Graph build time > 5ms (p95)
- Query timeout rate > 0.1%

---

## Monitoring Commands

### Real-Time Monitoring Script

Create `scripts/monitor-canary.sh`:

```bash
#!/bin/bash

CANARY_PORT=${1:-3001}
INTERVAL=${2:-30}

while true; do
    echo "=== $(date) ==="
    
    # Memory
    echo "Memory:"
    curl -s http://localhost:$CANARY_PORT/metrics | grep memory_usage || echo "N/A"
    
    # Errors
    echo "Errors (last 5min):"
    curl -s http://localhost:$CANARY_PORT/metrics | grep hyperbun_log_errors_total || echo "0"
    
    # Rate limiting
    echo "Rate Limits:"
    curl -s http://localhost:$CANARY_PORT/metrics | grep rate_limit_rejected || echo "0"
    
    # Circuit breakers
    echo "Circuit Breakers:"
    curl -s http://localhost:$CANARY_PORT/metrics | grep circuit_breaker_tripped || echo "All OK"
    
    echo ""
    sleep $INTERVAL
done
```

**Usage**:
```bash
chmod +x scripts/monitor-canary.sh
./scripts/monitor-canary.sh 3001 30  # Monitor port 3001, update every 30s
```

---

## Alert Configuration

### Prometheus Alert Rules

Add to `config/prometheus-alerts.yml`:

```yaml
groups:
  - name: hyperbun_canary
    interval: 30s
    rules:
      - alert: CanaryHighErrorRate
        expr: rate(hyperbun_log_errors_total[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
          environment: canary
        annotations:
          summary: "Canary instance error rate exceeds 1%"
          description: "Error rate: {{ $value }} errors/sec"

      - alert: CanaryHighMemoryUsage
        expr: memory_usage_bytes / memory_limit_bytes > 0.8
        for: 5m
        labels:
          severity: warning
          environment: canary
        annotations:
          summary: "Canary instance memory usage > 80%"

      - alert: CanaryCircuitBreakerTripped
        expr: circuit_breaker_tripped == 1
        for: 5m
        labels:
          severity: critical
          environment: canary
        annotations:
          summary: "Circuit breaker tripped on canary instance"

      - alert: CanaryHighRateLimitRejections
        expr: rate(rate_limit_rejected_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
          environment: canary
        annotations:
          summary: "High rate limit rejections on canary"
```

---

## Rollback Procedure

### If Issues Detected

1. **Immediate Rollback**:
   ```bash
   # Remove canary from load balancer
   # (Update nginx/ALB config to route 100% to production)
   
   # Stop canary instance
   pkill -f "PORT=3001 bun run start"
   ```

2. **Investigate Issues**:
   ```bash
   # Collect logs
   tail -n 1000 logs/hyper-bun-$(date +%Y-%m-%d).log > canary-issues.log
   
   # Check metrics
   curl http://localhost:3001/metrics > canary-metrics.txt
   
   # Analyze errors
   rg '"level":"ERROR"' logs/*.log | jq -r '.code' | sort | uniq -c | sort -rn
   ```

3. **Document Findings**:
   - Create issue report in `docs/runbooks/incidents/`
   - Update deployment checklist with lessons learned

---

## Success Criteria (24h Validation)

After 24 hours, validate:

- ✅ **Error Rate**: < 0.5% of requests
- ✅ **Memory Usage**: Stable, no leaks detected
- ✅ **Performance**: P95 latency < 5ms
- ✅ **Circuit Breakers**: No unexpected trips
- ✅ **Rate Limiting**: < 1% rejections
- ✅ **No Critical Alerts**: Zero critical alerts during period

If all criteria met → **Proceed to Full Deployment**

---

## Full Deployment

Once canary validation succeeds:

1. **Deploy to Production**:
   ```bash
   # Update production instance
   git pull origin main
   bun run build
   systemctl restart hyperbun-production
   ```

2. **Monitor Production**:
   ```bash
   # Use same monitoring commands, but for production port (3000)
   ./scripts/monitor-canary.sh 3000 30
   ```

3. **Decommission Canary**:
   ```bash
   # After 48h of stable production
   pkill -f "PORT=3001"
   ```

---

## Post-Deployment Validation

### Week 1 Checklist

- [ ] Monitor error rates daily
- [ ] Review circuit breaker logs weekly
- [ ] Check memory usage trends
- [ ] Validate rate limiting effectiveness
- [ ] Review performance metrics

### Week 2-4 Checklist

- [ ] Compare metrics vs. pre-deployment baseline
- [ ] Validate memory leak fix (no growth)
- [ ] Confirm rate limiting prevents DoS
- [ ] Review operator feedback

---

## Contact & Escalation

- **On-Call Engineer**: Check PagerDuty
- **Slack Channel**: `#hyperbun-deployments`
- **Emergency Runbook**: `docs/runbooks/emergency.md`

---

**Last Updated**: 2025-01-XX  
**Maintained By**: Hyper-Bun Operations Team
