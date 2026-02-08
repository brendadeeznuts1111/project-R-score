# 🚀 FactoryWager Dashboard - Quick Reference

## 🎯 Essential Commands

### Health Checks

```bash
# General health
curl http://localhost:3008/api/health

# Webhook health (with DNS stats)
curl http://localhost:3008/api/health/webhook

# Cookie analytics
curl http://localhost:3008/api/fraud/cookie-telemetry
```

### Global Telemetry (Add to ~/.zshrc)

```bash
alias wag-health='curl -s http://localhost:3008/api/health/webhook | bun -e "const r = JSON.parse(await Bun.stdin.text()); console.log(\`🎯 DNS Hit Ratio: \${r.dns?.hitRatio?.toFixed(1) || \"N/A\"}%\n📊 Failure Rate: \${r.failureRate?.toFixed(1) || 0}%\n🚨 Circuit Breaker: \${r.circuitBreakerOpen ? \"OPEN\" : \"CLOSED\"}\n✅ Status: \${r.status}\`);"'
```

### Documentation Search

```bash
# Search for partitioned cookies (CHIPS)
bun-docs search "partitioned" --sh

# Search for CookieMap usage
bun-docs search "CookieMap" --app
```

## 📊 Key Metrics

### DNS Hit Ratio
- **90%+**: ✅ Direct-to-Wire (Optimal)
- **70-90%**: ⚠️ Occasional overhead (Acceptable)
- **<70%**: ❌ Performance degraded (Triggers adaptive warming)

### Webhook Failure Rate
- **<10%**: ✅ Healthy
- **10-25%**: ⚠️ Elevated (Monitor)
- **>25%**: ❌ Critical (Circuit breaker activates)

### Cookie Size
- **<2KB**: ✅ Optimal
- **2-4KB**: ⚠️ Acceptable
- **>4KB**: ❌ Bloat warning

### Cookie Count
- **<20**: ✅ Optimal
- **>20**: ⚠️ Too many cookies

## 🔐 Security Endpoints

### Create Fraud Session
```bash
curl -X POST http://localhost:3008/api/fraud/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "@username"}'
```

### Revoke Session (Nuclear Logout)
```bash
curl -X POST http://localhost:3008/api/fraud/revoke
```

### Record Fraud Event
```bash
curl -X POST http://localhost:3008/api/fraud/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "@username",
    "eventType": "transaction",
    "amountCents": 10000
  }'
```

## 🎨 Dashboard URLs

- **Main Dashboard**: http://localhost:3008/
- **Fraud Intelligence**: http://localhost:3008/#fraud
- **Webhook Pulse**: Auto-displays in Fraud tab
- **Cookie Analytics**: Auto-displays in Fraud tab

## 🔧 Configuration

### Environment Variables

```bash
# Enable verbose webhook debugging
WEBHOOK_VERBOSE=true

# Disable benchmark isolation
BENCHMARK_ISOLATION=false

# Cache TTL (milliseconds)
DASHBOARD_CACHE_TTL=30000
```

### Webhook Configuration (config.toml)

```toml
[alerts]
enabled = true
webhook_url = "https://hooks.example.com/alerts"
performance_threshold = 50
failing_tests_threshold = 0
slow_benchmarks_threshold = 3
```

## 📈 Monitoring

### Real-Time Widgets

1. **Webhook Pulse** (Fraud Intelligence tab)
   - DNS Hit Ratio bar
   - Webhook Failure Rate bar
   - Circuit Breaker status
   - Auto-refresh: 5 seconds

2. **Cookie Analytics** (Fraud Intelligence tab)
   - Cookie count
   - Total size (KB)
   - Security status
   - Fraud session status
   - Bloat warnings
   - Auto-refresh: 5 seconds

## 🚨 Alerts & Warnings

### Cookie Bloat Warnings
- **>4KB**: High cookie overhead detected
- **>20 cookies**: Too many cookies

### Circuit Breaker
- **OPEN**: Failure rate > 25%
- **CLOSED**: Failure rate < 12.5%

### DNS Performance
- **Hit ratio < 70%**: Triggers adaptive warming

## 🏗️ Architecture Quick View

```
┌─────────────────────────────────────────┐
│     FactoryWager Dashboard              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Predictive   │  │ Secure       │   │
│  │ Health       │  │ Cookie       │   │
│  │ Engine       │  │ Management   │   │
│  └──────┬───────┘  └──────┬───────┘   │
│         │                  │            │
│  ┌──────▼──────────────────▼──────┐   │
│  │     Live Pulse Widget          │   │
│  │  (Real-time Health Monitoring) │   │
│  └────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Bun Native APIs                │   │
│  │  - CookieMap (SIMD)              │   │
│  │  - DNS Prefetch                  │   │
│  │  - Connection Pooling           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 📚 Documentation Files

- `ARCHITECTURE_COMPLETE.md` - Complete system architecture
- `PREDICTIVE_HEALTH_ENGINE.md` - Health engine details
- `SECURE_COOKIE_SESSIONS.md` - Cookie security guide
- `COOKIE_ANALYTICS.md` - Cookie analytics docs
- `IMPLEMENTATION_COMPLETE.md` - Implementation status

## ✅ Verification Checklist

- [ ] Webhook health endpoint returns 200
- [ ] Cookie telemetry shows active session
- [ ] DNS hit ratio > 70%
- [ ] Circuit breaker is CLOSED
- [ ] Cookie size < 4KB
- [ ] Cookie count < 20
- [ ] Pulse widget auto-refreshes
- [ ] Fraud session cookies are httpOnly

## 🎯 Performance Targets

- **Cookie Parsing**: < 1ms (SIMD-optimized)
- **DNS Lookup**: 0ms (cached)
- **Webhook Delivery**: < 100ms (connection pooling)
- **Health Check**: < 10ms
- **Cookie Analytics**: < 5ms

---

**Quick Start**: Open http://localhost:3008/ and navigate to the Fraud Intelligence tab to see all monitoring widgets in action! 🚀
