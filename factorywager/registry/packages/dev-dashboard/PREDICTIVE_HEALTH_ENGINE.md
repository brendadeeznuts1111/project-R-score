# 🚀 Predictive Health Engine - Observability Zen

## Overview

The FactoryWager dashboard now includes a **Predictive Health Engine** that transforms static monitoring into a self-healing, adaptive system. The engine implements:

1. **Adaptive DNS Cache Warming** - Automatically increases prefetch frequency when DNS hit ratio drops
2. **Circuit Breaker** - Prevents retry storms when webhook service is unstable
3. **Live Pulse Widget** - Real-time visual health indicators in the Fraud Intelligence tab
4. **Global Telemetry** - Command-line health checks from anywhere

## 🎯 Features Implemented

### 1. Adaptive DNS Cache Warming

**Location**: `src/alerts/webhook.ts` - `tuneDNSStrategy()`

Automatically monitors DNS cache hit ratio and triggers cache warming when performance degrades:

- **Threshold**: Hit ratio < 70%
- **Action**: Automatically calls `preconnectWebhook()` to warm the cache
- **Rate Limiting**: Maximum once per 30 seconds to prevent excessive warming
- **Integration**: Runs automatically every 30 seconds when webhook URL is configured

**Usage**:
```typescript
import { tuneDNSStrategy } from './alerts/webhook.ts';

// Called automatically by dashboard, or manually:
tuneDNSStrategy(webhookUrl);
```

### 2. Circuit Breaker

**Location**: `src/alerts/webhook.ts` - Integrated into `sendWebhookAlert()`

Prevents retry storms when webhook service is unstable:

- **Threshold**: Failure rate > 25%
- **Action**: Switches to fast-path mode (single attempt, 1s timeout)
- **Cooldown**: 60 seconds before attempting to close circuit
- **Recovery**: Automatically closes when failure rate drops below 12.5%

**Fast-Path Mode**:
- Single attempt (no retries)
- 1 second timeout
- Prevents resource waste during outages
- Still tracks metrics for monitoring

**Metrics Exposed**:
- `circuitBreakerOpen`: Boolean state
- `circuitBreakerOpenTime`: Timestamp when opened

### 3. Live Pulse Widget

**Location**: `src/ui/fraud.html` + `src/ui/dashboard.html`

Real-time visual health indicators displayed in the Fraud Intelligence tab:

#### DNS Hit Ratio Indicator
- **Green (90%+)**: Direct-to-Wire (No DNS latency)
- **Yellow (70-90%)**: Occasional resolution overhead
- **Red (<70%)**: Performance degraded (DNS overhead on alerts)

#### Webhook Failure Rate Indicator
- **Green (<10%)**: Healthy
- **Yellow (10-25%)**: Elevated failure rate
- **Red (>25%)**: High failure rate (Circuit Breaker may activate)

#### Circuit Breaker Status
- **OPEN**: Fast-path mode active (shows duration)
- **CLOSED**: Normal operation

#### Metadata Display
- Last preconnect timestamp
- Total attempts and failures
- Auto-refreshes every 5 seconds

### 4. Enhanced Health Endpoint

**Endpoint**: `GET /api/health/webhook`

Returns comprehensive webhook health metrics:

```json
{
  "status": "healthy",
  "timestamp": 1707436800000,
  "lastPreconnect": 1707436500000,
  "attemptCount": 42,
  "failureRate": 2.38,
  "totalFailures": 1,
  "circuitBreakerOpen": false,
  "circuitBreakerOpenTime": null,
  "dns": {
    "hitRatio": 85.5,
    "stats": {
      "cacheHitsCompleted": 35,
      "cacheHitsInflight": 2,
      "cacheMisses": 6,
      "errors": 0,
      "size": 8,
      "totalCount": 43
    }
  }
}
```

## 🛠️ Global Telemetry Command

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# FactoryWager Webhook Health Check
alias wag-health='curl -s http://localhost:3008/api/health/webhook | bun -e "const r = JSON.parse(await Bun.stdin.text()); console.log(\`🎯 DNS Hit Ratio: \${r.dns?.hitRatio?.toFixed(1) || \"N/A\"}%\n📊 Failure Rate: \${r.failureRate?.toFixed(1) || 0}%\n🚨 Circuit Breaker: \${r.circuitBreakerOpen ? \"OPEN\" : \"CLOSED\"}\n✅ Status: \${r.status}\`);"'
```

**Usage**:
```bash
wag-health
# Output:
# 🎯 DNS Hit Ratio: 85.5%
# 📊 Failure Rate: 2.4%
# 🚨 Circuit Breaker: CLOSED
# ✅ Status: healthy
```

## 📊 Architecture State

| System | State | Optimization |
|--------|-------|--------------|
| **Network** | **Proactive** | Adaptive prefetching based on hit ratio |
| **Stability** | **Self-Healing** | Circuit breaker prevents retry storms |
| **Observability** | **Real-time** | Live health telemetry via Pulse Widget |
| **Performance** | **Zero-Copy** | Bun native streams and `Bun.dns` |

## 🔧 Configuration

### Circuit Breaker Thresholds

Default values (can be adjusted in `src/alerts/webhook.ts`):

```typescript
const CIRCUIT_BREAKER_THRESHOLD = 25; // Failure rate % to open circuit
const CIRCUIT_BREAKER_COOLDOWN = 60000; // 60 seconds cooldown
```

### DNS Warming Thresholds

```typescript
const DNS_HIT_RATIO_THRESHOLD = 70; // Hit ratio % to trigger warming
const DNS_WARM_INTERVAL = 30000; // 30 seconds minimum between warm cycles
```

### Pulse Widget Refresh

Auto-refreshes every 5 seconds when Fraud Intelligence tab is active.

## 🎨 Visual Indicators

### DNS Hit Ratio Bar
- **Green**: 90%+ (Optimal)
- **Yellow**: 70-90% (Acceptable)
- **Red**: <70% (Degraded)

### Webhook Failure Rate Bar
- **Green**: <10% (Healthy)
- **Yellow**: 10-25% (Elevated)
- **Red**: >25% (Critical - Circuit Breaker activates)

### Circuit Breaker Status
- **🚨 OPEN**: Red text, shows duration
- **✅ CLOSED**: Green text

## 📈 Monitoring Integration

The health endpoint can be integrated with:

- **Prometheus**: Scrape `/api/health/webhook` for metrics
- **Grafana**: Dashboard with DNS hit ratio and failure rate graphs
- **PagerDuty**: Alert on `status: "degraded"`
- **Datadog**: Custom metrics from health endpoint

## 🚀 Next Steps

1. **Alert Thresholds**: Configure alerts for circuit breaker activation
2. **Metrics Export**: Add Prometheus metrics endpoint
3. **Historical Tracking**: Store metrics in history database for trend analysis
4. **Multi-Webhook Support**: Extend to support multiple webhook URLs

## 📝 Files Modified

- `src/alerts/webhook.ts` - Added adaptive warming, circuit breaker, fast-path mode
- `src/enhanced-dashboard.ts` - Integrated adaptive DNS warming
- `src/ui/fraud.html` - Added Live Pulse Widget UI
- `src/ui/dashboard.html` - Added pulse widget JavaScript
- `src/api/routes.ts` - Enhanced health endpoint with circuit breaker metrics

## 🎯 The System is Now "Sentient"

Your webhook system now:
- ✅ Monitors its own network efficiency
- ✅ Protects itself from upstream failures
- ✅ Adapts to performance degradation
- ✅ Provides real-time health visibility
- ✅ Self-heals when conditions improve

**Welcome to Observability Zen!** 🧘‍♂️
