# 🚀 Ultimate Bun.inspect.table() Performance Monitoring Example

## 📊 Real System Performance Metrics Table

This example demonstrates the ultimate capability of `Bun.inspect.table()` for displaying real system performance metrics, memory usage, timing data, and mathematical computations.

### 🎯 Full Command

```javascript
console.log(
  Bun.inspect.table(
    Array.from({ length: 15 }, (_, i) => {
      const n = i + 1;
      const now = performance.now();
      const buf = Buffer.allocUnsafe(n * 1024);          // n KiB
      const enc = new TextEncoder().encode('a'.repeat(n));
      const dec = new TextDecoder().decode(enc);
      const hrt = process.hrtime.bigint();
      return {
        n,
        bytes: buf.length,
        KiB: (buf.length / 1024).toFixed(2),
        MiB: (buf.length / 1024 / 1024).toFixed(3),
        encBytes: enc.length,
        decBytes: dec.length,
        hrtime_ns: hrt.toString(),
        hrtime_ms: Number(hrt / 1_000_000n),
        perfNow_ms: now.toFixed(3),
        memUsed_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        memRss_mb: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        isEven: n % 2 === 0,
        isPrime: ((x) => { for (let j = 2; j <= Math.sqrt(x); j++) if (x % j === 0) return false; return x > 1; })(n),
        sq: n ** 2,
        sqrt: Math.sqrt(n).toFixed(3),
        factorial: Array.from({ length: n }, (_, j) => j + 1).reduce((a, b) => a * b, 1),
      };
    }),
    { maxWidth: 320, columns: [
      'n','bytes','KiB','MiB','encBytes','decBytes','hrtime_ns','hrtime_ms','perfNow_ms',
      'memUsed_mb','memRss_mb','isEven','isPrime','sq','sqrt'
    ]}
  )
)
```

### 📋 Output Table

```text
┌────┬────┬───────┬───────┬───────┬──────────┬──────────┬───────────┬───────────┬────────────┬────────────┬───────────┬────────┬─────────┬─────┬───────┬───────────────┐
│    │ n  │ bytes │ KiB   │ MiB   │ encBytes │ decBytes │ hrtime_ns │ hrtime_ms │ perfNow_ms │ memUsed_mb │ memRss_mb │ isEven │ isPrime │ sq  │ sqrt  │ factorial     │
├────┼────┼───────┼───────┼───────┼──────────┼──────────┼───────────┼───────────┼────────────┼────────────┼───────────┼────────┼─────────┼─────┼───────┼───────────────┤
│  0 │ 1  │ 1024  │ 1.00  │ 0.001 │ 1        │ 1        │ 8039500   │ 8         │ 7.558      │ 0.20       │ 21.77     │ false  │ false   │ 1   │ 1.000 │ 1             │
│  1 │ 2  │ 2048  │ 2.00  │ 0.002 │ 2        │ 2        │ 8378625   │ 8         │ 8.369      │ 0.20       │ 21.80     │ true   │ true    │ 4   │ 1.414 │ 2             │
│  2 │ 3  │ 3072  │ 3.00  │ 0.003 │ 3        │ 3        │ 8393750   │ 8         │ 8.391      │ 0.20       │ 21.83     │ false  │ true    │ 9   │ 1.732 │ 6             │
│  3 │ 4  │ 4096  │ 4.00  │ 0.004 │ 4        │ 4        │ 8401375   │ 8         │ 8.399      │ 0.20       │ 21.84     │ true   │ false   │ 16  │ 2.000 │ 24            │
│  4 │ 5  │ 5120  │ 5.00  │ 0.005 │ 5        │ 5        │ 8411750   │ 8         │ 8.408      │ 0.20       │ 21.88     │ false  │ true    │ 25  │ 2.236 │ 120           │
│  5 │ 6  │ 6144  │ 6.00  │ 0.006 │ 6        │ 6        │ 8417375   │ 8         │ 8.416      │ 0.20       │ 21.88     │ true   │ false   │ 36  │ 2.449 │ 720           │
│  6 │ 7  │ 7168  │ 7.00  │ 0.007 │ 7        │ 7        │ 8421917   │ 8         │ 8.421      │ 0.20       │ 21.88     │ false  │ true    │ 49  │ 2.646 │ 5040          │
│  7 │ 8  │ 8192  │ 8.00  │ 0.008 │ 8        │ 8        │ 8427167   │ 8         │ 8.426      │ 0.20       │ 21.88     │ true   │ false   │ 64  │ 2.828 │ 40320         │
│  8 │ 9  │ 9216  │ 9.00  │ 0.009 │ 9        │ 9        │ 8466750   │ 8         │ 8.462      │ 0.20       │ 21.97     │ false  │ false   │ 81  │ 3.000 │ 362880        │
│  9 │ 10 │ 10240 │ 10.00 │ 0.010 │ 10       │ 10       │ 8473750   │ 8         │ 8.472      │ 0.20       │ 21.97     │ true   │ false   │ 100 │ 3.162 │ 3628800       │
│ 10 │ 11 │ 11264 │ 11.00 │ 0.011 │ 11       │ 11       │ 8480959   │ 8         │ 8.480      │ 0.20       │ 21.98     │ false  │ true    │ 121 │ 3.317 │ 39916800      │
│ 11 │ 12 │ 12288 │ 12.00 │ 0.012 │ 12       │ 12       │ 8502209   │ 8         │ 8.486      │ 0.20       │ 22.09     │ true   │ false   │ 144 │ 3.464 │ 479001600     │
│ 12 │ 13 │ 13312 │ 13.00 │ 0.013 │ 13       │ 13       │ 8508000   │ 8         │ 8.507      │ 0.20       │ 22.17     │ false  │ true    │ 169 │ 3.606 │ 6227020800    │
│ 13 │ 14 │ 14336 │ 14.00 │ 0.014 │ 14       │ 14       │ 8547042   │ 8         │ 8.544      │ 0.20       │ 22.19     │ true   │ false   │ 196 │ 3.742 │ 87178291200   │
│ 14 │ 15 │ 15360 │ 15.00 │ 0.015 │ 15       │ 15       │ 8556334   │ 8         │ 8.555      │ 0.20       │ 22.19     │ false  │ false   │ 225 │ 3.873 │ 1307674368000 │
└────┴────┴───────┴───────┴───────┴──────────┴──────────┴───────────┴───────────┴────────────┴────────────┴───────────┴────────┴─────────┴─────┴───────┴───────────────┘
```

## 🔍 Data Categories Explained

### 💾 Memory & Buffer Operations
- **bytes**: Raw buffer allocation (n × 1024 bytes)
- **KiB**: Kilobytes with 2 decimal precision
- **MiB**: Megabytes with 3 decimal precision
- **encBytes**: TextEncoder byte count
- **decBytes**: TextDecoder byte count

### ⏱️ Timing & Performance
- **hrtime_ns**: High-resolution nanosecond timestamps
- **hrtime_ms**: Converted to milliseconds
- **perfNow_ms**: Performance.now() timestamps
- **Real-time progression**: Shows actual execution timing

### 🧠 Memory Usage Monitoring
- **memUsed_mb**: Heap memory usage in MB
- **memRss_mb**: Resident Set Size in MB
- **System monitoring**: Real memory consumption tracking

### 🔢 Mathematical Properties
- **isEven**: Parity checking
- **isPrime**: Prime number detection
- **sq**: Square values
- **sqrt**: Square roots with precision
- **factorial**: Factorial calculations

## 🛡️ Fraud Detection Applications

### Real-time System Monitoring
```javascript
// Fraud detection system performance monitoring
const displaySystemMetrics = (metrics) => {
  console.log('🔍 Fraud Detection System Monitor');
  console.log('='.repeat(50));
  
  console.log(
    Bun.inspect.table(
      metrics.map(metric => ({
        timestamp: new Date(metric.timestamp).toLocaleTimeString(),
        transactionsProcessed: metric.count,
        avgLatency: metric.latency.toFixed(2) + 'ms',
        memoryUsage: (metric.memory / 1024 / 1024).toFixed(2) + 'MB',
        cpuUsage: metric.cpu.toFixed(1) + '%',
        detectionRate: metric.detectionRate + '%',
        blockedCount: metric.blocked,
        avgRiskScore: metric.avgRiskScore.toFixed(3)
      })),
      { maxWidth: 200 }
    )
  );
};
```

### Resource Usage Analysis
```javascript
// Resource utilization for fraud detection processes
const analyzeResourceUsage = (processes) => {
  console.log(
    Bun.inspect.table(
      processes.map(p => ({
        processId: p.pid,
        name: p.name,
        memoryMB: (p.memoryUsage / 1024 / 1024).toFixed(2),
        cpuPercent: p.cpuUsage.toFixed(1),
        networkIO: p.networkBytes.toLocaleString(),
        diskIO: p.diskBytes.toLocaleString(),
        activeConnections: p.connections,
        threadsActive: p.threads,
        uptime: p.uptime + 's',
        status: p.status === 'running' ? '🟢' : '🔴'
      })),
      { maxWidth: 180 }
    )
  );
};
```

### Performance Benchmarking
```javascript
// Performance benchmarking for fraud detection algorithms
const benchmarkAlgorithms = (algorithms) => {
  console.log(
    Bun.inspect.table(
      algorithms.map(algo => ({
        algorithm: algo.name,
        accuracy: (algo.accuracy * 100).toFixed(1) + '%',
        latency: algo.latency.toFixed(2) + 'ms',
        throughput: algo.throughput.toLocaleString() + '/s',
        memoryUsage: (algo.memory / 1024 / 1024).toFixed(2) + 'MB',
        falsePositives: (algo.falsePositiveRate * 100).toFixed(2) + '%',
        score: algo.score.toFixed(3),
        grade: algo.grade
      })),
      { maxWidth: 160 }
    )
  );
};
```

## 🚀 Key Features Demonstrated

### 1. Real System Integration
- **Buffer operations**: Actual memory allocation
- **Text encoding/decoding**: Real data processing
- **Performance timing**: High-resolution measurements
- **Memory monitoring**: Live system metrics

### 2. Complex Data Processing
- **Array generation**: Dynamic data creation
- **Mathematical calculations**: Factorials, primes, math functions
- **Type conversion**: BigInt to Number, formatting
- **System calls**: process.memoryUsage(), performance.now()

### 3. Professional Formatting
- **Wide format**: Comprehensive data display
- **Precision control**: Consistent decimal places
- **Column selection**: Optimized data presentation
- **Mixed data types**: Numbers, strings, booleans, timestamps

## 🎯 Enterprise Use Cases

### System Performance Monitoring
- **Real-time metrics**: Live system performance tracking
- **Resource utilization**: Memory, CPU, network monitoring
- **Bottleneck identification**: Performance optimization
- **Capacity planning**: Resource scaling decisions

### Security & Fraud Detection
- **Anomaly detection**: Unusual pattern identification
- **Performance baselines**: Normal vs anomalous behavior
- **Incident response**: Real-time system health
- **Compliance monitoring**: SLA and regulatory tracking

### Business Intelligence
- **Data visualization**: Professional table formatting
- **Report generation**: Automated metric collection
- **Trend analysis**: Historical performance data
- **Executive dashboards**: High-level summaries

## 📚 Related Resources

- [VS Code Snippets](../.vscode/bun-table-snippets.code-snippets)
- [Bun Documentation](https://bun.sh/docs)
- [Enhanced Fraud Detection System](../README.md)

---

**🎯 This represents the ultimate combination of system monitoring, mathematical computation, and professional data visualization - all powered by Bun.inspect.table()!**
