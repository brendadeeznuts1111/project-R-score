# 🧠 Bun Test Memory Usage Complete Guide v2.8

## 📋 Understanding Memory Usage in Bun Tests

Bun's test runner is designed for efficient memory usage, but understanding memory patterns is crucial for large test suites and memory-constrained environments.

---

## 🧩 Memory Components

### Process Memory Structure

```typescript
interface MemoryUsage {
  rss: number;        // Resident Set Size - total memory allocated
  heapUsed: number;   // Used heap memory for JavaScript objects
  heapTotal: number;  // Total heap size allocated
  external: number;   // Memory used by C++ objects
  arrayBuffers: number; // Memory used by ArrayBuffer objects
}
```

### Memory Monitoring

```typescript
import { test, beforeAll, afterAll } from 'bun:test';

describe('Memory Monitoring', () => {
  let initialMemory: any;

  beforeAll(() => {
    initialMemory = process.memoryUsage();
    console.log('Initial memory:', formatMemory(initialMemory.heapUsed));
  });

  afterAll(() => {
    const finalMemory = process.memoryUsage();
    const growth = finalMemory.heapUsed - initialMemory.heapUsed;
    console.log('Memory growth:', formatMemory(growth));
  });

  test('monitor memory during test', () => {
    const beforeMemory = process.memoryUsage();
    
    // Perform memory-intensive operations
    const largeArray = new Array(100000).fill('test');
    
    const afterMemory = process.memoryUsage();
    const used = afterMemory.heapUsed - beforeMemory.heapUsed;
    
    console.log('Memory used by array:', formatMemory(used));
    expect(largeArray.length).toBe(100000);
  });
});

function formatMemory(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
```

---

## 🚀 Memory Optimization Strategies

### 1. Use `--smol` Flag

```bash
# Reduce memory footprint for memory-constrained environments
bun test --smol

# Combine with other flags
bun test --smol --bail --coverage
```

**Benefits:**
- Reduces memory usage by ~30-50%
- Slower execution but lower memory footprint
- Ideal for CI/CD runners with limited resources

### 2. Proper Cleanup Patterns

```typescript
import { test, afterEach } from 'bun:test';

describe('Memory Cleanup', () => {
  let largeData: any[] = [];

  afterEach(() => {
    // Clean up after each test
    largeData.length = 0;
    largeData = [];
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  test('test with temporary large data', () => {
    largeData = new Array(100000).fill('temporary');
    expect(largeData.length).toBe(100000);
    // Will be cleaned up in afterEach
  });
});
```

### 3. Scoped Variable Usage

```typescript
test('scoped memory management', () => {
  // Variables scoped to test block
  {
    const largeObject = {
      data: new Array(10000).fill('scoped'),
      metadata: new Map()
    };
    
    // Use largeObject
    expect(largeObject.data.length).toBe(10000);
    
  } // largeObject eligible for garbage collection here
  
  // Memory is freed when test completes
});
```

### 4. Explicit Null Assignment

```typescript
test('explicit cleanup', () => {
  let expensiveResource: any = {
    buffer: new ArrayBuffer(1024 * 1024),
    data: new Array(50000).fill('expensive')
  };
  
  // Use the resource
  expect(expensiveResource.buffer.byteLength).toBe(1024 * 1024);
  
  // Explicit cleanup
  expensiveResource.buffer = null;
  expensiveResource.data = null;
  expensiveResource = null;
});
```

---

## 📊 Memory Leak Detection

### Common Leak Patterns

#### 1. Global Arrays

```typescript
// ❌ Leaky pattern
const globalArray: any[] = [];

test('leaky global array', () => {
  for (let i = 0; i < 10000; i++) {
    globalArray.push({ id: i, data: new Array(100).fill(i) });
  }
  // globalArray never gets cleaned up
});

// ✅ Fixed pattern
test('non-leaky local array', () => {
  const localArray: any[] = [];
  for (let i = 0; i < 10000; i++) {
    localArray.push({ id: i, data: new Array(100).fill(i) });
  }
  expect(localArray.length).toBe(10000);
  // localArray will be cleaned up automatically
});
```

#### 2. Event Listener Leaks

```typescript
// ❌ Leaky pattern
test('leaky event listeners', () => {
  const events = new Map();
  
  for (let i = 0; i < 1000; i++) {
    events.set(`event-${i}`, () => {
      console.log('Event', i);
    });
  }
  // events Map never cleaned up
});

// ✅ Fixed pattern
test('non-leaky event listeners', () => {
  const events = new Map();
  
  for (let i = 0; i < 1000; i++) {
    events.set(`event-${i}`, () => {
      console.log('Event', i);
    });
  }
  
  expect(events.size).toBe(1000);
  
  // Explicit cleanup
  events.clear();
});
```

#### 3. Closure Leaks

```typescript
// ❌ Leaky pattern
test('leaky closures', () => {
  const closures: Function[] = [];
  
  for (let i = 0; i < 1000; i++) {
    closures.push(() => {
      return new Array(1000).fill(i); // Captures i in closure
    });
  }
  // closures array never cleaned up
});

// ✅ Fixed pattern
test('non-leaky closures', () => {
  const closures: Function[] = [];
  
  for (let i = 0; i < 1000; i++) {
    closures.push(() => {
      return new Array(1000).fill(i);
    });
  }
  
  expect(closures.length).toBe(1000);
  
  // Explicit cleanup
  closures.length = 0;
});
```

---

## 🔍 Memory Monitoring Tools

### 1. Real-time Memory Tracking

```typescript
import { test, describe, beforeAll, afterAll } from 'bun:test';

describe('Memory Monitoring Suite', () => {
  const memorySnapshots: Array<{ time: number; memory: any }> = [];
  let monitorInterval: NodeJS.Timeout;

  beforeAll(() => {
    // Start memory monitoring
    monitorInterval = setInterval(() => {
      memorySnapshots.push({
        time: performance.now(),
        memory: process.memoryUsage()
      });
    }, 100);
  });

  afterAll(() => {
    // Stop monitoring and analyze
    clearInterval(monitorInterval);
    analyzeMemoryUsage();
  });

  test('memory-intensive operation', () => {
    const largeData = new Array(100000).fill('monitoring');
    expect(largeData.length).toBe(100000);
  });

  function analyzeMemoryUsage() {
    if (memorySnapshots.length === 0) return;

    const heapUsages = memorySnapshots.map(s => s.memory.heapUsed);
    const peakMemory = Math.max(...heapUsages);
    const initialMemory = heapUsages[0];
    const finalMemory = heapUsages[heapUsages.length - 1];
    const growth = finalMemory - initialMemory;

    console.log(`Peak memory: ${formatMemory(peakMemory)}`);
    console.log(`Memory growth: ${formatMemory(growth)}`);
    
    // Check for continuous growth (potential leak)
    let consecutiveGrowth = 0;
    for (let i = 1; i < heapUsages.length; i++) {
      if (heapUsages[i] > heapUsages[i - 1]) {
        consecutiveGrowth++;
      } else {
        consecutiveGrowth = 0;
      }
      
      if (consecutiveGrowth > 5) {
        console.warn('⚠️ Potential memory leak detected');
        break;
      }
    }
  }
});
```

### 2. Memory Threshold Testing

```typescript
import { test, describe } from 'bun:test';

describe('Memory Threshold Tests', () => {
  const MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB

  test('should not exceed memory threshold', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform memory-intensive operations
    const operations = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      data: new Array(1000).fill(i),
      metadata: new Map([
        ['type', 'test'],
        ['timestamp', Date.now()]
      ])
    }));
    
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryUsed = currentMemory - initialMemory;
    
    console.log(`Memory used: ${formatMemory(memoryUsed)}`);
    
    expect(memoryUsed).toBeLessThan(MEMORY_THRESHOLD);
    expect(operations.length).toBe(1000);
  });
});
```

---

## ⚙️ Configuration for Memory Management

### Test Configuration

```typescript
// bun-test.config.ts
export default {
  // Memory-conscious settings
  concurrency: 2, // Reduce concurrency for memory efficiency
  timeout: 10000, // Reasonable timeout to prevent hanging
  
  // Coverage settings
  coverage: {
    reporter: ['text'],
    exclude: [
      '**/*.test.ts',
      '**/node_modules/**',
      '**/dist/**'
    ]
  },
  
  // Setup files for global memory management
  setupFiles: ['./test-setup.ts']
};
```

### Global Setup for Memory Management

```typescript
// test-setup.ts
import { beforeAll, afterAll, afterEach } from 'bun:test';

// Global memory tracking
let globalInitialMemory: any;

beforeAll(() => {
  globalInitialMemory = process.memoryUsage();
  console.log('🧠 Test suite initial memory:', 
    formatMemory(globalInitialMemory.heapUsed));
});

afterAll(() => {
  const finalMemory = process.memoryUsage();
  const totalGrowth = finalMemory.heapUsed - globalInitialMemory.heapUsed;
  console.log('🧠 Test suite total memory growth:', 
    formatMemory(totalGrowth));
});

afterEach(() => {
  // Optional: Force garbage collection after each test
  if (global.gc) {
    global.gc();
  }
});

function formatMemory(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
```

---

## 🚀 Performance Optimization

### 1. Memory-Efficient Test Patterns

```typescript
describe('Memory-Efficient Patterns', () => {
  test('efficient array operations', () => {
    // ✅ Use typed arrays for better memory efficiency
    const typedArray = new Uint32Array(100000);
    for (let i = 0; i < typedArray.length; i++) {
      typedArray[i] = i;
    }
    expect(typedArray.length).toBe(100000);
  });

  test('efficient string operations', () => {
    // ✅ Reuse strings when possible
    const baseString = 'x'.repeat(100);
    const stringArray = Array(1000).fill(baseString);
    expect(stringArray.length).toBe(1000);
  });

  test('efficient object pooling', () => {
    // ✅ Object pooling for frequently created objects
    const pool: any[] = [];
    
    function getObject() {
      return pool.pop() || { data: '', timestamp: 0 };
    }
    
    function releaseObject(obj: any) {
      obj.data = '';
      obj.timestamp = 0;
      pool.push(obj);
    }
    
    const obj1 = getObject();
    obj1.data = 'test';
    expect(obj1.data).toBe('test');
    
    releaseObject(obj1);
    expect(pool.length).toBe(1);
  });
});
```

### 2. Concurrent Memory Management

```typescript
describe('Concurrent Memory Management', () => {
  test('controlled concurrent operations', async () => {
    // ✅ Limit concurrent operations to manage memory
    const CONCURRENT_LIMIT = 5;
    const operations = Array.from({ length: 20 }, async (_, i) => {
      const data = new Array(10000).fill(i);
      await new Promise(resolve => setTimeout(resolve, 10));
      return data.length;
    });
    
    // Process in batches
    const results: number[] = [];
    for (let i = 0; i < operations.length; i += CONCURRENT_LIMIT) {
      const batch = operations.slice(i, i + CONCURRENT_LIMIT);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    expect(results.length).toBe(20);
    expect(results.every(r => r === 10000)).toBe(true);
  });
});
```

---

## 📊 CI/CD Integration

### Memory Monitoring in CI

```yaml
# GitHub Actions
- name: Run Tests with Memory Monitoring
  run: |
    echo "🧠 Running memory-monitored tests..."
    bun test --smol --verbose --reporter json > test-results.json
    
    # Extract memory usage from results
    node -e "
    const results = JSON.parse(require('fs').readFileSync('test-results.json', 'utf8'));
    const memoryUsage = process.memoryUsage();
    console.log('Memory usage:', JSON.stringify(memoryUsage, null, 2));
    
    const heapMB = memoryUsage.heapUsed / 1024 / 1024;
    if (heapMB > 500) {
      console.error('❌ Memory usage too high:', heapMB.toFixed(2), 'MB');
      process.exit(1);
    }
    "

- name: Upload Memory Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: memory-report
    path: |
      test-results.json
      memory-usage-analysis-report.md
```

### Docker Memory Constraints

```dockerfile
# Dockerfile with memory constraints
FROM oven/bun:1.3.8

# Set memory limits
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy test files
COPY . /app
WORKDIR /app

# Install dependencies
RUN bun install

# Run memory-efficient tests
CMD ["bun", "test", "--smol", "--bail", "--coverage"]
```

---

## 💡 Best Practices Summary

### ✅ Do's

1. **Use `--smol`** in memory-constrained environments
2. **Clean up large objects** after use
3. **Use scoped variables** for automatic GC
4. **Monitor memory usage** in CI/CD
5. **Set memory thresholds** for tests
6. **Use typed arrays** for better efficiency
7. **Implement proper cleanup** in hooks

### ❌ Don'ts

1. **Don't use global variables** for temporary data
2. **Don't create large objects** unnecessarily
3. **Don't ignore memory growth** patterns
4. **Don't forget to clear** Maps and Sets
5. **Don't run unlimited concurrency** in memory-limited environments
6. **Don't ignore cleanup** in async operations
7. **Don't create closures** that capture large objects unnecessarily

---

## 🔧 Troubleshooting

### Common Memory Issues

#### High Memory Usage
```bash
# Check memory usage
bun test --smol --verbose

# Monitor with Node.js memory profiling
node --inspect --max-old-space-size=4096 $(which bun) test
```

#### Memory Leaks
```typescript
// Add leak detection to tests
afterEach(() => {
  if (global.gc) {
    global.gc();
  }
  
  const memory = process.memoryUsage();
  if (memory.heapUsed > 100 * 1024 * 1024) {
    console.warn('⚠️ High memory usage detected:', 
      (memory.heapUsed / 1024 / 1024).toFixed(2), 'MB');
  }
});
```

#### Out of Memory Errors
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" bun test

# Use memory-efficient flags
bun test --smol --concurrency 1
```

---

*Generated by Bun Test Memory Usage Guide v2.8*
