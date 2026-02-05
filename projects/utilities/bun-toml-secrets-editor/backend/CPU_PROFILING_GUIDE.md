# 🔥 Bun v1.3.7 CPU Profiling Guide

## Overview

Bun v1.3.7 introduces powerful built-in CPU profiling capabilities that generate detailed performance analysis in both Chrome DevTools JSON format and human-readable markdown format.

---

## 🎯 What is CPU Profiling?

CPU profiling captures the execution flow of your application, showing:
- **Function call stacks** and execution time
- **Hot paths** and performance bottlenecks
- **Optimization opportunities** with specific metrics
- **Memory usage patterns** during CPU-intensive operations

---

## 🚀 Quick Start

### Generate Markdown Profile Only
```bash
cd backend
bun --cpu-prof-md cpu-profiling-demo.js
```

### Generate Both Chrome DevTools JSON and Markdown Formats
```bash
cd backend
bun --cpu-prof --cpu-prof-md cpu-profiling-demo.js
```

### Using Package Scripts
```bash
# Markdown only
bun run features:cpu-profiling-md

# JSON only  
bun run features:cpu-profiling-json

# Both formats
bun run features:cpu-profiling
```

---

## 📊 Generated Files

### Chrome DevTools Format (`.cpuprofile`)
- **File**: `bun-<timestamp>.cpuprofile`
- **Format**: JSON
- **Usage**: Open in Chrome DevTools > Performance tab
- **Benefits**: Interactive flame graphs, detailed call stacks

### Markdown Format (`.md`)
- **File**: `bun-<timestamp>.md`
- **Format**: Human-readable markdown
- **Usage**: Quick performance insights without tools
- **Benefits**: Easy sharing, documentation, CI/CD integration

---

## 🔧 Command Line Options

### Basic Options
```bash
# Generate Chrome DevTools profile
bun --cpu-prof script.js

# Generate markdown profile
bun --cpu-prof-md script.js

# Generate both formats
bun --cpu-prof --cpu-prof-md script.js
```

### Advanced Options
```bash
# Custom output directory
bun --cpu-prof-dir ./profiles script.js

# Combined with heap profiling
bun --cpu-prof --heap-prof script.js

# All profiling options
bun --cpu-prof --cpu-prof-md --heap-prof --cpu-prof-dir ./profiles script.js
```

---

## 📈 Understanding the Output

### Chrome DevTools Profile
1. **Open Chrome DevTools** (F12)
2. **Go to Performance tab**
3. **Click Load** and select `.cpuprofile` file
4. **Analyze**:
   - **Flame Graph**: Visual representation of function calls
   - **Call Tree**: Hierarchical view of execution
   - **Bottom-Up**: Functions consuming most CPU time

### Markdown Profile
The markdown profile includes:
- **Performance Summary**: Overall execution metrics
- **Hot Functions**: Most CPU-intensive functions
- **Call Graph**: Execution flow visualization
- **Optimization Suggestions**: Specific recommendations

---

## 🎯 Practical Examples

### Example 1: Profile Buffer Operations
```javascript
// buffer-profile.js
const BufferOptimizer = require('./src/utils/bufferOptimizer');

// Standard vs optimized buffer operations
function profileBuffers() {
  const data = Array.from({ length: 10000 }, (_, i) => i);
  
  // This will show up in the profile
  for (let i = 0; i < 1000; i++) {
    const optimized = BufferOptimizer.createOptimizedBuffer(data);
    const encoded = BufferOptimizer.base64(optimized);
  }
}

profileBuffers();
```

**Run:**
```bash
bun --cpu-prof --cpu-prof-md buffer-profile.js
```

### Example 2: Profile Array Operations
```javascript
// array-profile.js
const ArrayOptimizer = require('./src/utils/arrayOptimizer');

function profileArrays() {
  const data = Array.from({ length: 5000 }, (_, i) => ({ id: i, value: i * 2 }));
  
  // Profile array transformations
  const optimized = ArrayOptimizer.fastArrayFrom(data, item => ({
    ...item,
    processed: true
  }));
  
  const flattened = ArrayOptimizer.fastFlat([optimized, optimized]);
}

profileArrays();
```

**Run:**
```bash
bun --cpu-prof-md array-profile.js
```

### Example 3: Profile Web Service
```javascript
// service-profile.js
const WebhookService = require('./src/services/webhookService');

async function profileService() {
  const service = new WebhookService();
  
  // Profile webhook processing
  for (let i = 0; i < 100; i++) {
    await service.processWebhook({
      id: i,
      type: 'test',
      data: { message: 'test webhook' }
    });
  }
}

profileService();
```

**Run:**
```bash
bun --cpu-prof --cpu-prof-md service-profile.js
```

---

## 📊 Analyzing Profile Results

### Key Metrics to Watch

#### 1. **CPU Time Distribution**
```markdown
## CPU Time by Function
- BufferOptimizer.createOptimizedBuffer: 45.2ms (23%)
- ArrayOptimizer.fastArrayFrom: 32.1ms (16%)
- StringOptimizer.fastPadStart: 18.7ms (9%)
```

#### 2. **Hot Path Identification**
```markdown
## Hot Functions (>10% CPU time)
1. processLargeDataset() - 25.3% of total CPU time
2. optimizeFeatureProcessing() - 18.7% of total CPU time
3. verifyWebhookSignature() - 12.1% of total CPU time
```

#### 3. **Optimization Impact**
```markdown
## Performance Improvements
- Buffer operations: 50% faster than baseline
- Array operations: 2.3x faster than baseline
- String operations: 89% faster than baseline
```

---

## 🔍 Performance Optimization Workflow

### 1. **Baseline Profiling**
```bash
# Profile current implementation
bun --cpu-prof --cpu-prof-md current-implementation.js
```

### 2. **Apply Optimizations**
```javascript
// Replace standard methods with Bun v1.3.7 optimizations
const BufferOptimizer = require('./src/utils/bufferOptimizer');
const ArrayOptimizer = require('./src/utils/arrayOptimizer');
```

### 3. **Compare Profiles**
```bash
# Profile optimized implementation
bun --cpu-prof --cpu-prof-md optimized-implementation.js

# Compare the markdown outputs
diff baseline-profile.md optimized-profile.md
```

### 4. **Validate Improvements**
- **CPU time reduction**: Target 20%+ improvement
- **Hot path elimination**: Reduce bottlenecks
- **Memory efficiency**: Better resource utilization

---

## 🎯 Real-World Use Cases

### 1. **API Endpoint Optimization**
```javascript
// Profile API request handling
app.post('/api/process', async (req, res) => {
  const startTime = performance.now();
  
  // Process with optimized operations
  const result = await processWithOptimizations(req.body);
  
  const endTime = performance.now();
  logger.info(`Request processed in ${endTime - startTime}ms`);
  
  res.json(result);
});
```

### 2. **Data Pipeline Performance**
```javascript
// Profile ETL operations
async function profileETL() {
  const rawData = await fetchData();
  
  // Optimized transformations
  const processed = ArrayOptimizer.fastArrayFrom(rawData, transformItem);
  const flattened = ArrayOptimizer.fastFlat(processed);
  const formatted = StringOptimizer.formatTable(headers, flattened);
  
  return formatted;
}
```

### 3. **Background Job Processing**
```javascript
// Profile worker performance
async function profileWorker() {
  const jobs = await getPendingJobs();
  
  // Parallel processing with optimizations
  const results = await Promise.all(
    jobs.map(job => processJobOptimized(job))
  );
  
  return results;
}
```

---

## 📊 Integration with CI/CD

### GitHub Actions Example
```yaml
name: CPU Profiling
on: [push, pull_request]

jobs:
  profile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Generate CPU Profile
        run: |
          bun --cpu-prof-md cpu-profiling-demo.js
          
      - name: Upload Profile
        uses: actions/upload-artifact@v3
        with:
          name: cpu-profile
          path: bun-*.md
```

### Performance Regression Detection
```bash
#!/bin/bash
# ci-profile-check.sh

# Generate profile
bun --cpu-prof-md cpu-profiling-demo.js

# Check for performance regressions
if grep -q "CPU time increased" bun-*.md; then
  echo "❌ Performance regression detected!"
  exit 1
else
  echo "✅ Performance profile looks good"
fi
```

---

## 🔧 Advanced Techniques

### 1. **Custom Profiling Points**
```javascript
const { performance } = require('perf_hooks');

class CustomProfiler {
  static profile(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${name}: ${end - start}ms`);
    return result;
  }
}

// Usage
CustomProfiler.profile('buffer-ops', () => {
  return BufferOptimizer.createOptimizedBuffer(data);
});
```

### 2. **Memory-Aware Profiling**
```javascript
// Profile with memory tracking
function profileWithMemory() {
  const startMemory = process.memoryUsage();
  
  // Your code here
  const result = performOptimizedOperations();
  
  const endMemory = process.memoryUsage();
  
  console.log('Memory delta:', {
    heapUsed: endMemory.heapUsed - startMemory.heapUsed,
    heapTotal: endMemory.heapTotal - startMemory.heapTotal
  });
  
  return result;
}
```

### 3. **Conditional Profiling**
```javascript
// Only profile in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Development mode - CPU profiling enabled');
  // Add profiling hooks
}
```

---

## 📈 Best Practices

### 1. **Profile Regularly**
- **Before optimization**: Establish baseline
- **After changes**: Validate improvements
- **In production**: Monitor performance trends

### 2. **Profile Realistic Workloads**
- **Use real data**: Not synthetic benchmarks
- **Include I/O**: Network and database operations
- **Simulate load**: Concurrent requests and processing

### 3. **Analyze Systematically**
- **Start with hot paths**: Focus on high-impact areas
- **Look for patterns**: Repeated optimization opportunities
- **Measure impact**: Quantify performance gains

### 4. **Document Findings**
- **Save profiles**: For historical comparison
- **Note optimizations**: What worked and why
- **Share insights**: With team and stakeholders

---

## 🎯 Troubleshooting

### Common Issues

#### 1. **Large Profile Files**
```bash
# Limit profiling duration
timeout 30s bun --cpu-prof script.js

# Filter specific functions
bun --cpu-prof script.js | grep "FunctionName"
```

#### 2. **Missing Optimization Data**
```javascript
// Ensure functions are not optimized away
function preventOptimization() {
  // Add side effects to prevent optimization
  console.log('Profiling checkpoint');
  return yourFunction();
}
```

#### 3. **Profile Analysis Issues**
- **Chrome DevTools**: Use latest Chrome version
- **Markdown format**: Check for encoding issues
- **File permissions**: Ensure write access to output directory

---

## 🌟 Conclusion

Bun v1.3.7's CPU profiling provides powerful insights into application performance. By combining Chrome DevTools compatibility with human-readable markdown output, it offers both detailed analysis and quick insights.

**Key Benefits:**
- 🔍 **Identify bottlenecks** with precise metrics
- 📈 **Validate optimizations** with before/after comparisons
- 📚 **Document performance** with shareable reports
- 🚀 **Guide development** with data-driven decisions

**Start profiling today and unlock the full performance potential of your Bun applications!** 🔥⚡
