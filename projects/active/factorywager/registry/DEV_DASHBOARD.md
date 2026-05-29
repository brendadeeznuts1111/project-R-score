# 🎛️ Dev Dashboard

A simple development dashboard to view tests, benchmarks, and quick wins reports.

## 🚀 Quick Start

```bash
cd /Users/nolarose/Projects/factorywager/registry

# Start the dev dashboard
bun run dev-dashboard

# Or use the simple version
bun run packages/dev-dashboard/src/simple-dashboard.ts
```

Then open: **http://localhost:3008**

## 📊 What It Shows

1. **Quick Wins Status** - All 17 quick wins and their completion status
2. **Test Results** - Real-time test execution results
3. **Benchmark Reports** - Performance metrics with targets
4. **Performance Score** - Overall performance rating

## 🔄 Auto-Refresh

The dashboard auto-refreshes every 5 seconds to show latest results.

## 🧪 Running Tests & Benchmarks

The dashboard automatically runs:
- Input validation tests
- Error handling tests  
- Serialization tests
- Logger tests
- Profile operation benchmarks
- JSON serialization benchmarks

## 📈 API Endpoint

```bash
# Get raw JSON data
curl http://localhost:3008/api/dashboard
```

## 🎯 Features

- ✅ Real-time test results
- ✅ Performance benchmarks
- ✅ Quick wins tracking
- ✅ Auto-refresh
- ✅ Clean, readable UI
