# 🎭 Demo Mode Guide - AI Risk Analysis Dashboard

## Quick Start

### Using CLI (Recommended)
```bash
bun cli/dashboard/dashboard-cli.ts serve
```

Then open:
```
http://localhost:8080/dashboard.html?demo=ai-risk-analysis
```

### Manual Start
```bash
bun pages/dev-server.ts
```

Then open:
```
http://localhost:8080/dashboard.html?demo=ai-risk-analysis
```

**Note:** Cannot use `file://` protocol due to ES module restrictions. Must use HTTP server.

## Demo Mode Features

### ✅ Active Features

1. **Phased Scenarios**
   - 🚀 **Startup** (0-10s): System initializing, lower risk
   - ✅ **Normal** (10-45s): Baseline operation
   - ⚠️ **Attack Surge** (45-75s): Coordinated fraud attacks
   - 🔄 **Recovery** (75-100s): System stabilizing
   - Cycles automatically

2. **Interactive Controls**
   - **Pause/Resume**: Pause demo at any time
   - **Speed Control**: 0.5x, 1x, 2x, 4x speed
   - **Phase Indicator**: Shows current phase with color coding

3. **Real-Time Data Generation**
   - Realistic fraud events (85% normal, 10% high-risk, 5% critical)
   - Merchant risk profiles (50 merchants with varying risk levels)
   - Geographic distribution (18 countries)
   - Transaction amounts (risk-based pricing)
   - Feature vectors (root detection, VPN, thermal, biometric, proxy)

4. **Visualizations**
   - Risk heatmap with live updates
   - Risk distribution chart (doughnut)
   - Feature contributions chart (bar)
   - Activity timeline feed
   - Geographic risk distribution

5. **Metrics & Analytics**
   - Key metrics (active sessions, blocked sessions, avg risk score, detection rate)
   - Performance metrics (latency, throughput, memory)
   - Transaction analytics (volume, avg transaction, blocked amount, savings rate)
   - System status indicators

## Demo Mode Controls

### Header Controls
- **🎭 DEMO MODE** badge
- **Phase Indicator** (color-coded by phase)
- **⏸ Pause** button
- **⚡ Speed** button (cycles through speeds)

### Interactive Elements
- **Alerts**: Click any alert to see full details
- **Clear Button**: Appears when alerts exist
- **Fraud Alert Modal**: Auto-shows for critical alerts (>0.95 score)

## Performance Optimizations Active

All PerfMaster Pablo optimizations are active in demo mode:

- ✅ **Element Caching**: All DOM elements cached
- ✅ **Coalesced Updates**: Batched via requestAnimationFrame
- ✅ **Response Buffering**: Zero-copy operations
- ✅ **Aria-Live Throttling**: Screen reader friendly
- ✅ **Element Pooling**: Reusable alert elements

## Troubleshooting

### Demo Mode Not Starting?

1. **Check URL Parameter**: Must be `?demo=ai-risk-analysis` exactly
2. **Check Console**: Open DevTools → Console for errors
3. **Check Network**: Verify Chart.js loads (check Network tab)
4. **Check Heatmap**: Verify `risk-heatmap.ts` is accessible

### Heatmap Not Loading?

If you see import errors for `risk-heatmap.js`:
- The file is `risk-heatmap.ts` (TypeScript)
- For browser use, you may need to compile it first
- Or use a bundler/build tool

### No Data Appearing?

- Wait 1-2 seconds for initialization
- Check console for errors
- Verify demo mode badge appears in header
- Try refreshing the page

## Expected Behavior

### Initial Load (0-2 seconds)
- Demo mode badge appears
- Baseline metrics populate
- Charts initialize with mock data
- Connection status shows "Connected"

### Startup Phase (0-10 seconds)
- Lower risk events
- Gradual metric increases
- Phase indicator shows "🚀 Startup"

### Normal Phase (10-45 seconds)
- Steady event generation
- Realistic risk distribution
- Phase indicator shows "✅ Normal"

### Attack Surge (45-75 seconds)
- Increased fraud events
- Multiple critical alerts
- Phase indicator pulses red "⚠️ Attack Surge"
- Higher blocked session count

### Recovery Phase (75-100 seconds)
- Decreasing fraud events
- System stabilizing
- Phase indicator shows "🔄 Recovery"

## Performance Metrics

In demo mode, you should see:
- **Inference Latency**: 0.3-0.6ms
- **WebSocket Latency**: 25-55ms (simulated)
- **Sessions/sec**: 3500-5500 (simulated)
- **Memory Usage**: 40-70MB (simulated)

All metrics update smoothly without jank thanks to PerfMaster Pablo optimizations!
