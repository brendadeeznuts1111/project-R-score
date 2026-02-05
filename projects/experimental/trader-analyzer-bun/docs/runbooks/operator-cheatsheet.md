# Hyper-Bun Operator Commands Cheatsheet

**Version**: 1.0.0  
**Last Updated**: 2025-01-XX  
**Status**: Production Ready

## [DoD][OPS:CheatSheet][SCOPE:TmuxCommands]

This document provides quick reference commands for Hyper-Bun operators managing production systems.

---

## Emergency Procedures

### Tmux Key Bindings

```bash
Ctrl-Space + Ctrl-h      # Show help (all key bindings)
Ctrl-Space + L           # Open live logs (JSON formatted)
Ctrl-Space + E           # Show only ERRORS/CRITICAL
Ctrl-Space + W           # Show only WARNINGS
Ctrl-Space + Ctrl-l      # Lookup log code resolution
```

### Quick Diagnostics

```bash
# Show layer health status
hb-diagnose layers

# Real-time RPS per operation
hb-metrics throughput

# Check if failsafe mode active
hb-failover status

# Circuit breaker status
bun run console -e "mlgs.breaker.statusAll()"

# Performance dashboard
bun run console -e "mlgs.perf.dashboard()"
```

---

## Log Analysis

### Log Code Lookup

```bash
# Lookup specific log code documentation
bun run console -e "mlgs.logging.lookup('HBCB-002')"

# Search for log code in codebase
rg "HBCB-002" src/

# Search for log code in logs
rg "HBCB-002" logs/
```

### Log Statistics

```bash
# Count errors in last hour
sqlite3 correlations.db "
  SELECT code, COUNT(*) 
  FROM audit_log 
  WHERE timestamp > strftime('%s', 'now', '-1 hour')*1000 
  AND level = 'ERROR'
  GROUP BY code 
  ORDER BY COUNT(*) DESC;
"

# Count warnings by source
rg -c '"level":"WARN"' logs/*.log | awk -F: '{sum+=$2} END {print sum+0}'

# Most common error codes today
rg '"level":"ERROR"' logs/hyper-bun-$(date +%Y-%m-%d).log | \
  jq -r '.code' | sort | uniq -c | sort -rn | head -10
```

### Real-Time Log Monitoring

```bash
# Live JSON logs (filtered)
tail -f logs/hyper-bun-$(date +%Y-%m-%d).log | jq -c 'select(.level != "DEBUG")'

# Errors only
tail -f logs/hyper-bun-$(date +%Y-%m-%d).log | \
  jq -r 'select(.level == "ERROR" or .level == "FATAL") | "\(.timestamp) | \(.code) | \(.source) | \(.message)"'

# Warnings only
tail -f logs/hyper-bun-$(date +%Y-%m-%d).log | \
  jq -r 'select(.level == "WARN") | "\(.timestamp) | \(.code) | \(.source) | \(.message)"'
```

---

## Circuit Breaker Management

### Status Commands

```bash
# View all circuit breaker statuses
bun run console -e "mlgs.breaker.statusAll()"

# Check specific bookmaker
bun run console -e "mlgs.breaker.getStatus('draftkings')"

# View metrics
curl http://localhost:3000/metrics | grep circuit_breaker
```

### Manual Intervention

```bash
# Trip a circuit breaker (maintenance)
bun run console -e "mlgs.breaker.trip('draftkings', 'Scheduled maintenance', 'operator')"

# Reset a circuit breaker
bun run console -e "mlgs.breaker.reset('draftkings', { reason: 'Issue resolved', user: 'operator' })"

# Force reset (bypass cooldown)
bun run console -e "mlgs.breaker.reset('draftkings', { force: true, reason: 'Emergency', user: 'operator' })"
```

---

## Performance Monitoring

### Performance Dashboard

```bash
# Live performance dashboard
bun run console -e "mlgs.perf.dashboard()"

# SPC chart for specific metric
bun run console -e "mlgs.perf.spc('api_response_time')"

# Time series trends
bun run console -e "mlgs.perf.trends('api_response_time', '24')"

# Anomaly prediction
bun run console -e "mlgs.perf.predict('nfl-2024-001', 6)"
```

### Metrics Endpoints

```bash
# Prometheus metrics
curl http://localhost:3000/metrics

# Health check
curl http://localhost:3000/health

# Logging metrics
curl http://localhost:3000/metrics | grep hyperbun_log
```

---

## Database Operations

### SQLite Queries

```bash
# Check recent errors
sqlite3 correlations.db "
  SELECT timestamp, code, source, message 
  FROM audit_log 
  WHERE level = 'ERROR' 
  ORDER BY timestamp DESC 
  LIMIT 20;
"

# Circuit breaker audit log
sqlite3 circuit_breaker.db "
  SELECT bookmaker, action, reason, user, timestamp 
  FROM circuit_breaker_audit 
  ORDER BY timestamp DESC 
  LIMIT 20;
"

# Performance samples
sqlite3 performance.db "
  SELECT metric_name, AVG(value) as avg_value, COUNT(*) as samples
  FROM performance_samples 
  WHERE timestamp > strftime('%s', 'now', '-1 hour')*1000
  GROUP BY metric_name;
"
```

---

## Troubleshooting

### Common Issues

#### High Error Rate

```bash
# 1. Check error logs
rg '"level":"ERROR"' logs/*.log | jq -r '.code' | sort | uniq -c | sort -rn

# 2. Check circuit breaker status
bun run console -e "mlgs.breaker.statusAll()"

# 3. Check system load
top -bn1 | grep Cpu

# 4. Check memory usage
free -m
```

#### Slow Performance

```bash
# 1. Check performance metrics
bun run console -e "mlgs.perf.dashboard()"

# 2. Check query timeouts
rg "QUERY_TIMEOUT" logs/*.log

# 3. Check rate limiting
curl http://localhost:3000/metrics | grep rate_limit
```

#### Circuit Breaker Tripped

```bash
# 1. Check why it tripped
sqlite3 circuit_breaker.db "
  SELECT bookmaker, failure_count, last_error, tripped_until 
  FROM circuit_breaker_state 
  WHERE tripped = 1;
"

# 2. Check recent failures
sqlite3 circuit_breaker.db "
  SELECT bookmaker, action, reason, timestamp 
  FROM circuit_breaker_audit 
  WHERE action = 'TRIP' 
  ORDER BY timestamp DESC 
  LIMIT 10;
"

# 3. Reset if appropriate
bun run console -e "mlgs.breaker.reset('bookmaker', { reason: 'Issue resolved', user: 'operator' })"
```

---

## Runbook Links

### Critical Error Codes

- **HBCB-002**: Circuit breaker tripped → `docs/runbooks/circuit-breaker.md#HBCB-002`
- **HBCB-005**: Load shedding activated → `docs/runbooks/circuit-breaker.md#HBCB-005`
- **HBMO-002**: Market offering service failure → `docs/runbooks/market-offering.md#HBMO-002`
- **HBPD-001**: Performance drift detected → `docs/runbooks/performance.md#HBPD-001`

### Log Code Registry

Full log code documentation: `docs/logging/log-codes.md`

---

## Quick Reference

### Environment Variables

```bash
export NODE_ENV=production
export LOG_LEVEL=INFO
export METRICS_PORT=3000
```

### Service Management

```bash
# Start service
bun run start

# Start with console
bun run console

# Run tests
bun test

# Run benchmarks
bun run bench
```

---

## Contact & Escalation

- **On-Call Engineer**: Check PagerDuty
- **Slack Channel**: `#hyperbun-ops`
- **Documentation**: `docs/runbooks/`
- **Emergency Runbook**: `docs/runbooks/emergency.md`

---

**Last Updated**: 2025-01-XX  
**Maintained By**: Hyper-Bun Operations Team
