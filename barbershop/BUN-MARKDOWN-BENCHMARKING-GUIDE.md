# 🔍 Bun Markdown Output Benchmarking Guide

## Overview

Bun's markdown output feature for profiling provides a revolutionary way to analyze CPU and heap performance data in a human-readable, version-control-friendly format. This guide demonstrates how to leverage this powerful feature for performance analysis and documentation.

## 🚀 Quick Start

### CPU Profiling with Markdown Output

```bash
# Generate CPU profile in markdown format
bun --cpu-prof-md script.js

# With custom filename
bun --cpu-prof-md --cpu-prof-name my-cpu-profile.md script.js

# With custom output directory
bun --cpu-prof-md --cpu-prof-dir ./profiles script.js

# Generate both binary and markdown formats
bun --cpu-prof --cpu-prof-md script.js
```

### Heap Profiling with Markdown Output

```bash
# Generate heap snapshot in markdown format
bun --heap-prof-md script.js

# With custom filename
bun --heap-prof-md --heap-prof-name my-heap-snapshot.md script.js

# With custom output directory
bun --heap-prof-md --heap-prof-dir ./profiles script.js

# Generate both binary and markdown formats
bun --heap-prof --heap-prof-md script.js
```

### Environment Variable Usage

```bash
# Set profiling options via environment
BUN_OPTIONS="--cpu-prof-md" bun script.js
BUN_OPTIONS="--heap-prof-md" bun script.js
```

## 📊 Understanding the Output

### CPU Profile Markdown Structure

The CPU profile markdown provides comprehensive performance analysis:

```markdown
# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 381.0ms | 271 | 1.0ms | 19 |

**Top 10:** `fibonacci` 94.8%, `stringify` 2.5%, `requestSatisfyUtil` 0.7%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 94.8% | 361.2ms | 100.0% | 8.68s | `fibonacci` | `/path/to/file:25` |
```

### Heap Profile Markdown Structure

The heap profile markdown provides detailed memory analysis:

```markdown
# Bun Heap Profile

## Summary

| Metric | Value |
|--------|------:|
| Total Heap Size | 256.6 KB (262850 bytes) |
| Total Objects | 2951 |
| Total Edges | 8195 |
| Unique Types | 76 |
| GC Roots | 445 |

## Top 50 Types by Retained Size

| Rank | Type | Count | Self Size | Retained Size | Largest Instance |
|-----:|------|------:|----------:|--------------:|-----------------:|
| 1 | `<root>` | 1 | 0 B | 256.6 KB | 256.6 KB |
| 2 | `GlobalObject` | 1 | 10.0 KB | 168.1 KB | 168.1 KB |
```

## 🎯 Practical Examples

### Example 1: Performance Analysis of Fibonacci

```typescript
// fibonacci-benchmark.ts
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function cpuIntensiveTask() {
  const start = performance.now();
  let result = 0;
  
  for (let i = 30; i <= 35; i++) {
    result += fibonacci(i);
  }
  
  const end = performance.now();
  console.log(`CPU task completed in ${(end - start).toFixed(2)}ms`);
  return result;
}

cpuIntensiveTask();
```

**Command:**
```bash
bun --cpu-prof-md --cpu-prof-name fibonacci-analysis.md fibonacci-benchmark.ts
```

**Result Analysis:**
- `fibonacci` function consumes 94.8% of CPU time
- Recursive calls create deep call stacks
- Total execution time: 361ms
- Optimization opportunity: Use memoization

### Example 2: Memory Usage Analysis

```typescript
// memory-analysis.ts
function memoryIntensiveTask() {
  const arrays: number[][] = [];
  const objects: any[] = [];
  
  // Create memory pressure
  for (let i = 0; i < 100; i++) {
    arrays.push(new Array(1000).fill(Math.random()));
  }
  
  for (let i = 0; i < 1000; i++) {
    objects.push({
      id: i,
      data: new Array(100).fill(Math.random()),
      timestamp: Date.now()
    });
  }
  
  // Clean up some memory
  arrays.splice(0, 50);
  objects.splice(0, 500);
  
  return { arrays, objects };
}

memoryIntensiveTask();
```

**Command:**
```bash
bun --heap-prof-md --heap-prof-name memory-analysis.md memory-analysis.ts
```

**Result Analysis:**
- Total heap size: 256.6 KB
- Array objects: 3 instances consuming 5.6 KB
- Object instances: 10 consuming 4.5 KB
- Memory cleanup effectively reduces usage

## 🔍 Advanced Usage

### Custom Output Organization

```bash
# Organize profiles by date
mkdir -p profiles/$(date +%Y-%m-%d)
bun --cpu-prof-md --cpu-prof-dir profiles/$(date +%Y-%m-%d) script.js

# Organize by feature
bun --cpu-prof-md --cpu-prof-dir profiles/authentication auth-service.ts
bun --cpu-prof-md --cpu-prof-dir profiles/database db-service.ts
```

### Combined Profiling

```bash
# Generate both CPU and heap profiles
bun --cpu-prof-md --heap-prof-md script.js

# With custom names
bun --cpu-prof-md --cpu-prof-name cpu-profile.md \
    --heap-prof-md --heap-prof-name heap-profile.md \
    script.js
```

### CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Analysis
on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Run CPU profiling
        run: bun --cpu-prof-md --cpu-prof-name pr-cpu-profile.md src/main.ts
        
      - name: Run heap profiling
        run: bun --heap-prof-md --heap-prof-name pr-heap-profile.md src/main.ts
        
      - name: Upload profiles
        uses: actions/upload-artifact@v3
        with:
          name: performance-profiles
          path: "*.md"
```

## 📈 Performance Analysis Patterns

### 1. Bottleneck Identification

**What to look for:**
- Functions with high self-time percentage
- Deep call stacks with repeated calls
- Functions called frequently with small individual cost

**Example findings:**
```markdown
| Self% | Self | Function | Location |
|------:|-----:|----------|----------|
| 94.8% | 361.2ms | `fibonacci` | `benchmark.ts:25` |
| 2.5% | 9.8ms | `stringify` | `[native code]` |
```

**Recommendations:**
- Optimize `fibonacci` with memoization
- Consider iterative approach for large values
- Cache results for repeated calculations

### 2. Memory Leak Detection

**What to look for:**
- Growing object counts over time
- Large retained sizes for single objects
- Objects with many references

**Example findings:**
```markdown
| Type | Count | Retained Size |
|------|------:|--------------:|
| Array | 1,234 | 45.6 MB |
| Object | 5,678 | 23.4 MB |
```

**Recommendations:**
- Implement proper cleanup for large arrays
- Review object lifecycle management
- Use weak references where appropriate

### 3. Performance Regression Detection

**Workflow:**
1. Generate baseline profile
2. Generate comparison profile
3. Compare metrics manually or with scripts
4. Identify performance changes

**Example comparison:**
```bash
# Baseline
bun --cpu-prof-md --cpu-prof-name baseline.md app.ts

# After changes
bun --cpu-prof-md --cpu-prof-name after-changes.md app.ts

# Compare (manual or script)
diff baseline.md after-changes.md
```

## 🛠️ Tool Integration

### LLM Analysis

The markdown format is perfect for AI analysis:

```bash
# Analyze with LLM
cat cpu-profile.md | llm "Analyze this CPU profile and suggest optimizations"

# Get specific insights
cat heap-profile.md | llm "Identify potential memory leaks in this heap profile"
```

### Documentation Integration

Embed profiles in documentation:

```markdown
# Performance Analysis

## Authentication Service

### CPU Profile (Latest)
![CPU Profile](./profiles/auth-cpu-profile.md)

### Memory Usage (Latest)
![Heap Profile](./profiles/auth-heap-profile.md)

### Performance Trends
- Average response time: 45ms
- Memory usage: 12.3 MB
- Peak concurrent users: 1,000
```

### Monitoring Integration

Create automated monitoring:

```typescript
// performance-monitor.ts
import { writeFileSync } from 'fs';

export async function profileAndSave(scriptPath: string, outputDir: string) {
  const timestamp = new Date().toISOString().slice(0, 19);
  
  // Generate profiles
  const cpuProfile = `${outputDir}/cpu-${timestamp}.md`;
  const heapProfile = `${outputDir}/heap-${timestamp}.md`;
  
  await Bun.$`bun --cpu-prof-md --cpu-prof-name ${cpuProfile} ${scriptPath}`;
  await Bun.$`bun --heap-prof-md --heap-prof-name ${heapProfile} ${scriptPath}`;
  
  console.log(`Profiles saved: ${cpuProfile}, ${heapProfile}`);
}
```

## 🎯 Best Practices

### 1. Consistent Naming

```bash
# Good naming convention
bun --cpu-prof-md --cpu-prof-name auth-service-${ENV}-${DATE}.md auth-service.ts

# Example output
auth-service-prod-2024-02-07.md
auth-service-staging-2024-02-07.md
```

### 2. Regular Profiling

```bash
# Schedule regular profiling
0 */6 * * * cd /app && bun --cpu-prof-md --cpu-prof-name hourly-$(date +%H).md main.ts

# Weekly comprehensive profiling
0 2 * * 1 cd /app && bun --cpu-prof-md --heap-prof-md weekly-$(date +%Y-%m-%d).md main.ts
```

### 3. Version Control Strategy

```gitignore
# .gitignore
*.cpuprofile
*.heapsnapshot

# Include markdown profiles
*.md
```

### 4. Performance Budgets

```typescript
// performance-budget.ts
interface PerformanceBudget {
  maxCpuTime: number;      // ms
  maxHeapSize: number;     // bytes
  maxObjectCount: number;
}

const BUDGET: PerformanceBudget = {
  maxCpuTime: 1000,        // 1 second
  maxHeapSize: 50 * 1024 * 1024,  // 50MB
  maxObjectCount: 10000
};

export function validateProfile(profilePath: string): boolean {
  // Parse markdown profile and validate against budget
  // Implementation details...
  return true;
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Empty Profiles**
   ```bash
   # Ensure script actually runs long enough
   bun --cpu-prof-md script.ts
   ```

2. **Large File Sizes**
   ```bash
   # Use custom directory for organization
   mkdir -p profiles/large
   bun --cpu-prof-md --cpu-prof-dir profiles/large script.ts
   ```

3. **Permission Issues**
   ```bash
   # Check write permissions
   ls -la .
   chmod +w .
   ```

### Performance Tips

1. **Profile Specific Scenarios**
   ```typescript
   // Profile only specific operations
   async function profileOperation() {
     console.log('PROFILE_START');
     // ... operation to profile
     console.log('PROFILE_END');
   }
   ```

2. **Controlled Environment**
   ```bash
   # Use consistent environment
   NODE_ENV=production bun --cpu-prof-md script.ts
   ```

3. **Multiple Runs**
   ```bash
   # Run multiple times for consistency
   for i in {1..5}; do
     bun --cpu-prof-md --cpu-prof-name run-${i}.md script.ts
   done
   ```

## 📚 Resources

- **Official Documentation**: https://bun.com/docs/project/benchmarking
- **CPU Profiling**: `bun --cpu-prof --help`
- **Heap Profiling**: `bun --heap-prof --help`
- **Example Profiles**: See generated files in this repository

## 🎊 Conclusion

Bun's markdown output for profiling transforms performance analysis from a specialized task into an accessible, shareable, and documentable process. The human-readable format enables:

- **Collaborative Analysis**: Share profiles in pull requests
- **Documentation**: Embed performance data directly in docs
- **AI Integration**: Process profiles with LLMs for insights
- **Version Control**: Track performance changes over time
- **Accessibility**: No special tools required for viewing

This feature represents a significant step forward in making performance analysis accessible to all developers, not just performance specialists! 🚀
