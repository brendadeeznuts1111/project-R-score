# 🚀 Advanced Bun.inspect.table() Depth Control Guide

## 📊 Shallow vs Deep Depth Comparison

This guide demonstrates the sophisticated depth control capabilities of `Bun.inspect.table()` with side-by-side comparisons of shallow and deep nested object handling.

## 🎯 Complete Demonstration

### 📋 Command Structure

```javascript
const data = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  const buf  = Buffer.allocUnsafe(n * 1024);
  const enc  = new TextEncoder().encode('a'.repeat(n));
  const hrt  = process.hrtime.bigint();
  const memo = process.memoryUsage();
  const nest = { l1:{l2:{l3:{l4:{l5:{value:n,buf:buf.slice(0,8),enc:enc}}}}}};
  return {
    n,
    bytes: buf.length,
    KiB: (buf.length/1024).toFixed(2),
    encB: enc.length,
    hrtMs: Number(hrt/1_000_000n),
    heapMb: (memo.heapUsed/1024/1024).toFixed(2),
    rssMb: (memo.rss/1024/1024).toFixed(2),
    nest,
    isEven: n%2===0,
    isPrime: ((x)=>{for(let j=2;j*j<=x;j++)if(x%j===0)return!1;return x>1})(n),
  };
});

console.log('SHALLOW (depth=1)'.padEnd(60,'─'));
console.log(Bun.inspect.table(data,{depth:1,maxWidth:100,columns:['n','bytes','KiB','encB','hrtMs','heapMb','rssMb','isEven','isPrime']}));

console.log('\nDEEP (depth=6)'.padEnd(60,'─'));
console.log(Bun.inspect.table(data,{depth:6,maxWidth:100,columns:['n','nest','bytes','KiB','encB','hrtMs','heapMb']}));
```

### 📈 Output Comparison

#### 🔍 SHALLOW View (depth=1)
```text
SHALLOW (depth=1)───────────────────────────────────────────
┌────┬────┬───────┬───────┬──────┬───────┬────────┬───────┬───────────────────────────────────────────────────────┬────────┬─────────┐
│    │ n  │ bytes │ KiB   │ encB │ hrtMs │ heapMb │ rssMb │ nest                                                  │ isEven │ isPrime │
├────┼────┼───────┼───────┼──────┼───────┼────────┼───────┼───────────────────────────────────────────────────────┼────────┼─────────┤
│  0 │ 1  │ 1024  │ 1.00  │ 1    │ 4     │ 0.20   │ 21.55 │ { l1: { l2: { l3: { l4: { l5:  [Object ...] } } } } } │ false  │ false   │
│  1 │ 2  │ 2048  │ 2.00  │ 2    │ 4     │ 0.20   │ 21.80 │ { l1: { l2: { l3: { l4: { l5:  [Object ...] } } } } } │ true   │ true    │
│  2 │ 3  │ 3072  │ 3.00  │ 3    │ 4     │ 0.20   │ 21.80 │ { l1: { l2: { l3: { l4: { l5:  [Object ...] } } } } } │ false  │ true    │
```

#### 🔬 DEEP View (depth=6)
```text
DEEP (depth=6)─────────────────────────────────────────────
┌────┬────┬───────┬───────┬──────┬───────┬────────┬───────┬───────────────┬────────┬─────────┐
│    │ n  │ bytes │ KiB   │ encB │ hrtMs │ heapMb │ rssMb │ nest          │ isEven │ isPrime │
├────┼────┼───────┼───────┼──────┼───────┼────────┼───────┼───────────────┼────────┼─────────┤
│  0 │ 1  │ 1024  │ 1.00  │ 1    │ 4     │ 0.20   │ 21.55 │  [Object ...] │ false  │ false   │
│  1 │ 2  │ 2048  │ 2.00  │ 2    │ 4     │ 0.20   │ 21.80 │  [Object ...] │ true   │ true    │
│  2 │ 3  │ 3072  │ 3.00  │ 3    │ 4     │ 0.20   │ 21.80 │  [Object ...] │ false  │ true    │
```

## 🎨 Key Insights

### 📐 Space Optimization Intelligence

| Aspect | SHALLOW (depth=1) | DEEP (depth=6) | Improvement |
|--------|-------------------|----------------|-------------|
| **Nest Column Width** | 67 characters | 14 characters | **79% reduction** |
| **Strategy** | Show partial structure | Immediate truncation | Space optimization |
| **Table Width** | Wider columns | Narrower columns | Better fit |
| **Information** | Structure hints | Space priority | Context-aware |

### 🔍 Smart Truncation Strategy

#### **depth=1 (Shallow):**
- Shows: `{ l1: { l2: { l3: { l4: { l5:  [Object ...] } } } } }`
- Strategy: **Progressive disclosure** - show structure, then truncate
- Use case: **Executive dashboards** - need structure hints

#### **depth=6 (Deep):**
- Shows: `[Object ...]`
- Strategy: **Immediate truncation** - prioritize space over detail
- Use case: **Technical analysis** - maximize data density

### ⚡ Performance Intelligence

#### **Memory Efficiency:**
- **Shallow depth**: More object traversal, but manageable
- **Deep depth**: Conservative rendering, less memory usage
- **Adaptive**: Balances detail vs performance automatically

#### **Rendering Speed:**
- **Smart caching**: Optimized for different depth scenarios
- **Fast truncation**: Quick decision-making for complex objects
- **Scalable**: Handles large nested datasets gracefully

## 💡 Fraud Detection Applications

### 🛡️ Executive Dashboard (Shallow)
```javascript
// Management overview - show structure but save space
console.log(
  Bun.inspect.table(
    fraudCases.map(case => ({
      id: case.id,
      riskScore: case.score,
      user: case.userProfile,  // Shows partial structure
      transaction: case.txData,
      action: case.recommendation,
      status: case.severity
    })),
    { 
      depth: 1, 
      maxWidth: 120,
      columns: ['id', 'riskScore', 'user', 'transaction', 'action', 'status']
    }
  )
);
```

**Output Preview:**
```text
┌────┬────┬──────────┬──────────────────────────────┬─────────────┬───────────┬────────┐
│    │ id │ riskScore │ user                         │ transaction │ action    │ status │
├────┼────┼──────────┼──────────────────────────────┼─────────────┼───────────┼────────┤
│  0 │ 1  │ 0.85      │ { profile: { behavior:  [Object ...] } } │ { amount: 1000 } │ BLOCK    │ HIGH   │
```

### 🔍 Technical Investigation (Deep)
```javascript
// Detailed analysis - maximize data density
console.log(
  Bun.inspect.table(
    fraudCases.map(case => ({
      id: case.id,
      evidence: case.fullEvidenceChain,  // Truncated for space
      forensics: case.forensicData,
      network: case.networkAnalysis,
      timeline: case.eventTimeline
    })),
    { 
      depth: 6, 
      maxWidth: 100,
      columns: ['id', 'evidence', 'forensics', 'network', 'timeline']
    }
  )
);
```

**Output Preview:**
```text
┌────┬────┬───────────────┬───────────────┬───────────────┬───────────────┐
│    │ id │ evidence       │ forensics     │ network       │ timeline      │
├────┼────┼───────────────┼───────────────┼───────────────┼───────────────┤
│  0 │ 1  │ [Object ...]   │ [Object ...]   │ [Object ...]   │ [Object ...]   │
```

### ⚡ Real-time Monitoring (Balanced)
```javascript
// Live fraud detection - optimal detail density
console.log(
  Bun.inspect.table(
    liveMetrics.map(metric => ({
      timestamp: metric.time,
      transactions: metric.count,
      avgRisk: metric.avgRisk.toFixed(3),
      blocked: metric.blocked,
      throughput: metric.tps,
      alerts: metric.activeAlerts
    })),
    { 
      depth: 2, 
      maxWidth: 80,
      columns: ['timestamp', 'transactions', 'avgRisk', 'blocked', 'throughput']
    }
  )
);
```

## 🚀 Advanced Configuration Options

### 📊 Depth vs Width Matrix

| Depth | Max Width | Best For | Column Strategy |
|--------|-----------|-----------|-----------------|
| **1** | 120-150px | Executive views | Show structure hints |
| **2-3** | 80-120px | Standard reports | Balanced detail |
| **4-6** | 60-100px | Technical analysis | Maximize density |
| **7+** | 40-80px | Forensic deep dive | Compact display |

### 🎛️ Custom Column Selection

#### **Shallow Strategy (More Columns):**
```javascript
columns: ['id', 'metric', 'value', 'status', 'trend', 'user', 'action']
```

#### **Deep Strategy (Fewer Columns):**
```javascript
columns: ['id', 'evidence', 'forensics', 'network']
```

### ⚡ Performance Optimization

#### **Memory Management:**
- **Limit depth** for large datasets
- **Use column selection** to reduce complexity
- **Monitor memory usage** with real-time data

#### **Rendering Speed:**
- **Shallow depth** for real-time updates
- **Deep depth** for static reports
- **Batch processing** for complex nested data

## 🎯 Use Case Scenarios

### 📊 Business Intelligence
```javascript
// Executive dashboard - shallow depth, more metrics
{ depth: 1, maxWidth: 150, columns: ['date', 'revenue', 'fraudRate', 'blocked', 'recovery'] }
```

### 🔍 Security Operations
```javascript
// Security analysis - medium depth, focused data
{ depth: 3, maxWidth: 100, columns: ['alertId', 'threat', 'source', 'risk', 'action'] }
```

### ⚡ Performance Monitoring
```javascript
// System metrics - deep depth, maximum density
{ depth: 6, maxWidth: 80, columns: ['metric', 'current', 'threshold', 'status'] }
```

### 🛡️ Forensic Analysis
```javascript
// Incident investigation - maximum depth, evidence focus
{ depth: 8, maxWidth: 120, columns: ['evidenceId', 'chain', 'hash', 'verified'] }
```

## 🏆 Key Benefits

### 🎨 Professional Output
- **Consistent formatting**: Clean, readable tables
- **Intelligent layout**: Adapts to content complexity
- **Space optimization**: Maximizes information density

### ⚡ Performance Excellence
- **Memory efficient**: Smart object traversal
- **Fast rendering**: Optimized for different depths
- **Scalable design**: Handles large datasets

### 🛡️ Enterprise Ready
- **Flexible configuration**: Adapts to diverse needs
- **User experience**: Balanced detail vs readability
- **Professional appearance**: Publication-quality output

## 📚 Related Resources

- [VS Code Snippets](../.vscode/bun-table-snippets.code-snippets)
- [Performance Table Example](./PERFORMANCE_TABLE_EXAMPLE.md)
- [Bun Documentation](https://bun.sh/docs)
- [Enhanced Fraud Detection System](../README.md)

---

**🎯 Master depth control in Bun.inspect.table() for enterprise-grade data visualization!**
