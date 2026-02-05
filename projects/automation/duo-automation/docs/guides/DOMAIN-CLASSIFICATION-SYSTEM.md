# 🏗️ Domain Classification System in Bun Native Metrics

## 📋 Overview

The **domain classification system** in Bun Native Metrics categorizes all 130+ tracked Bun APIs into **18 functional domains** to enable organized analysis, filtering, and reporting of API usage patterns and performance characteristics.

## 🎯 Classification Architecture

### **🔍 Core Classification Function**

```typescript
private classifyDomain(apiName: string): BunNativeAPIMetrics['domain'] {
  const domain = apiName.toLowerCase();
  
  // Pattern-based classification using string matching
  if (domain.includes('file') || domain.includes('write') || domain.includes('read')) {
    return 'filesystem';
  }
  // ... 17 more domain classifications
}
```

### **📊 Domain Breakdown Generation**

```typescript
// From native-api-tracker.ts
getMetricsByDomain(): Record<NativeAPIMetrics['domain'], NativeAPIMetrics[]> {
  const allMetrics = this.getAllMetrics();
  const grouped: Record<NativeAPIMetrics['domain'], NativeAPIMetrics[]> = {
    filesystem: [], networking: [], crypto: [], cookies: [],
    streams: [], binary: [], system: [], runtime: [],
    database: [], build: [], web: [], workers: [],
    utilities: [], events: [], timing: [], text: [],
    nodejs: [], javascript: []
  };
  
  allMetrics.forEach(metric => {
    grouped[metric.domain].push(metric);
  });
  
  return grouped;
}
```

## 🌐 The 18 Domain Categories

### **1. 📁 Filesystem Domain**
```typescript
// Classification Logic
if (domain.includes('file') || domain.includes('write') || domain.includes('read') || 
    domain.includes('stdin') || domain.includes('stdout') || domain.includes('stderr')) {
  return 'filesystem';
}

// Tracked APIs
- Bun.file()
- Bun.write()
- Bun.read()
- process.stdin
- process.stdout
- process.stderr
```

### **2. 🌐 Networking Domain**
```typescript
// Classification Logic
if (domain.includes('fetch') || domain.includes('request') || domain.includes('response') ||
    domain.includes('serve') || domain.includes('listen') || domain.includes('connect') ||
    domain.includes('udpsocket') || domain.includes('dns') || domain.includes('websocket') ||
    domain.includes('headers') || domain.includes('url') || domain.includes('blob')) {
  return 'networking';
}

// Tracked APIs
- fetch()
- Bun.serve()
- Bun.connect()
- UDPSocket
- Headers
- URL
- Blob
- WebSocket
```

### **3. 🔐 Crypto Domain**
```typescript
// Classification Logic
if (domain.includes('crypto') || domain.includes('hash') || domain.includes('encrypt') ||
    domain.includes('password') || domain.includes('sha') || domain.includes('cryptohasher')) {
  return 'crypto';
}

// Tracked APIs
- Bun.hash()
- Bun.password()
- Bun.CryptoHasher
- crypto.subtle
- CryptoKey
```

### **4. 🍪 Cookies Domain**
```typescript
// Classification Logic
if (domain.includes('cookie') || domain.includes('session')) {
  return 'cookies';
}

// Tracked APIs
- Bun.Cookie
- CookieStore
- CookieChangeEvent
```

### **5. 🌊 Streams Domain**
```typescript
// Classification Logic
if (domain.includes('stream') || domain.includes('readable') || domain.includes('writable')) {
  return 'streams';
}

// Tracked APIs
- ReadableStream
- WritableStream
- TransformStream
- ReadableByteStreamController
```

### **6. 🔢 Binary Domain**
```typescript
// Classification Logic
if (domain.includes('buffer') || domain.includes('binary') || domain.includes('array') ||
    domain.includes('gzip') || domain.includes('deflate') || domain.includes('zstd')) {
  return 'binary';
}

// Tracked APIs
- Bun.gzipSync()
- Bun.gunzipSync()
- Bun.deflateSync()
- Bun.inflateSync()
- Uint8Array
```

### **7. ⚙️ System Domain**
```typescript
// Classification Logic
if (domain.includes('process') || domain.includes('system') || domain.includes('env') ||
    domain.includes('spawn') || domain.includes('sleep') || domain.includes('nanoseconds')) {
  return 'system';
}

// Tracked APIs
- process.env
- Bun.spawn()
- Bun.sleep()
- Bun.nanoseconds()
- process.exit()
```

### **8. 🗄️ Database Domain**
```typescript
// Classification Logic
if (domain.includes('sql') || domain.includes('sqlite') || domain.includes('redis')) {
  return 'database';
}

// Tracked APIs
- Database connections
- SQL query functions
- Redis client operations
```

### **9. 🔨 Build Domain**
```typescript
// Classification Logic
if (domain.includes('build') || domain.includes('plugin') || domain.includes('glob') ||
    domain.includes('transpiler') || domain.includes('test') || domain.includes('ffi')) {
  return 'build';
}

// Tracked APIs
- Bun.build()
- Bun.plugin()
- Glob patterns
- FFI operations
```

### **10. 🌐 Web Domain**
```typescript
// Classification Logic
if (domain.includes('html') || domain.includes('rewriter') || domain.includes('router')) {
  return 'web';
}

// Tracked APIs
- Bun.HTMLRewriter
- Router APIs
- Web processing functions
```

### **11. 👥 Workers Domain**
```typescript
// Classification Logic
if (domain.includes('worker')) {
  return 'workers';
}

// Tracked APIs
- Worker()
- Worker.postMessage()
- SharedWorker
```

### **12. 🛠️ Utilities Domain**
```typescript
// Classification Logic
if (domain.includes('version') || domain.includes('revision') || domain.includes('main') ||
    domain.includes('uuid') || domain.includes('which') || domain.includes('peek') ||
    domain.includes('deepequals') || domain.includes('deepmatch') || domain.includes('inspect') ||
    domain.includes('escapehtml') || domain.includes('stringwidth') || domain.includes('indexofline') ||
    domain.includes('fileurltopath') || domain.includes('pathtofileurl')) {
  return 'utilities';
}

// Tracked APIs
- Bun.version
- Bun.revision
- Bun.which()
- Bun.peek()
- Bun.deepEquals()
- Bun.inspect()
```

### **13. 📡 Events Domain**
```typescript
// Classification Logic
if (domain.includes('event') || domain.includes('customevent') || domain.includes('errorevent') ||
    domain.includes('closeevent') || domain.includes('messageevent') || domain.includes('eventtarget')) {
  return 'events';
}

// Tracked APIs
- Event
- CustomEvent
- EventTarget
- ErrorEvent
```

### **14. ⏱️ Timing Domain**
```typescript
// Classification Logic
if (domain.includes('settimeout') || domain.includes('cleartimeout') || domain.includes('setinterval') ||
    domain.includes('clearinterval') || domain.includes('setimmediate') || domain.includes('clearimmediate') ||
    domain.includes('queuemicrotask') || domain.includes('performance')) {
  return 'timing';
}

// Tracked APIs
- setTimeout()
- clearInterval()
- setInterval()
- setImmediate()
- queueMicrotask()
- performance.now()
```

### **15. 📝 Text Domain**
```typescript
// Classification Logic
if (domain.includes('textdecoder') || domain.includes('textencoder')) {
  return 'text';
}

// Tracked APIs
- TextDecoder
- TextEncoder
```

### **16. 🟢 Node.js Domain**
```typescript
// Classification Logic
if (domain.includes('buffer') || domain.includes('process') || domain.includes('import.meta.dir') ||
    domain.includes('import.meta.file') || domain.includes('exports') || domain.includes('module') ||
    domain.includes('require') || domain.includes('global')) {
  return 'nodejs';
}

// Tracked APIs
- Buffer
- process
- import.meta.dir
- import.meta.file
- require()
- global
```

### **17. 💻 JavaScript Domain**
```typescript
// Classification Logic
if (domain.includes('globalthis') || domain.includes('json') || domain.includes('console') ||
    domain.includes('webassembly') || domain.includes('shadowrealm') || domain.includes('domexception') ||
    domain.includes('reporterror')) {
  return 'javascript';
}

// Tracked APIs
- globalThis
- JSON
- console
- WebAssembly
- ShadowRealm
```

### **18. 🚀 Runtime Domain**
```typescript
// Default fallback
return 'runtime';

// Tracked APIs
- Any other Bun runtime APIs
- Fallback for uncategorized functions
```

## 🎨 Domain Color Mapping

```typescript
const domainColors = {
  'filesystem': '#3B82F6',    // Blue
  'networking': '#10B981',    // Green
  'crypto': '#8B5CF6',        // Purple
  'cookies': '#F97316',       // Orange
  'streams': '#06B6D4',       // Cyan
  'binary': '#EC4899',        // Pink
  'system': '#EF4444',        // Red
  'runtime': '#EAB308',       // Yellow
  'database': '#6366F1',      // Indigo
  'build': '#14B8A6',         // Teal
  'web': '#84CC16',           // Lime
  'workers': '#10B981',       // Emerald
  'utilities': '#8B5CF6',     // Violet
  'events': '#A855F7',        // Fuchsia
  'timing': '#F43F5E',        // Rose
  'text': '#0EA5E9',          // Sky
  'nodejs': '#F59E0B',        // Amber
  'javascript': '#64748B'     // Slate
};
```

## 📊 Usage in CLI and API

### **CLI Domain Filtering**
```bash
# Filter by specific domain
bun packages/cli/comprehensive-cli-system.ts --metrics --domains filesystem

# Multiple domains
bun packages/cli/comprehensive-cli-system.ts --metrics --domains crypto,networking
```

### **API Domain Breakdown**
```json
{
  "domainBreakdown": {
    "crypto": [
      {
        "apiName": "Bun.hash",
        "domain": "crypto",
        "callCount": 5,
        "implementation": "native"
      }
    ],
    "networking": [
      {
        "apiName": "fetch",
        "domain": "networking", 
        "callCount": 3,
        "implementation": "native"
      }
    ]
  }
}
```

### **Domain Performance Summary**
```typescript
// From test-cli-flags.ts
const domainBreakdown = tracker.getMetricsByDomain();
Object.entries(domainBreakdown).forEach(([domain, perf]) => {
  const totalCalls = perf.reduce((sum, m) => sum + m.callCount, 0);
  const nativeCount = perf.filter(m => m.implementation === 'native').length;
  console.log(`✅ ${domain}: ${perf.length} APIs, ${totalCalls} calls, ${((nativeCount/perf.length)*100).toFixed(1)}% native`);
});
```

## 🔍 Classification Algorithm

### **Pattern Matching Strategy**
1. **Lowercase Conversion**: `apiName.toLowerCase()`
2. **Keyword Matching**: `domain.includes('keyword')`
3. **Priority Order**: More specific patterns first
4. **Fallback**: Default to 'runtime' domain

### **Multi-keyword Support**
```typescript
// Example: Multiple keywords for networking
if (domain.includes('fetch') || domain.includes('request') || domain.includes('response') ||
    domain.includes('serve') || domain.includes('listen') || domain.includes('connect') ||
    domain.includes('udpsocket') || domain.includes('dns') || domain.includes('websocket') ||
    domain.includes('headers') || domain.includes('url') || domain.includes('blob')) {
  return 'networking';
}
```

### **Global API Handling**
```typescript
// Special handling for global functions and objects
if (domain.includes('settimeout') || domain.includes('cleartimeout')) {
  return 'timing';
}

if (domain.includes('import.meta.dir') || domain.includes('import.meta.file')) {
  return 'nodejs';
}
```

## 📈 Benefits of Domain Classification

### **1. 🎯 Organized Analysis**
- Group related APIs for performance analysis
- Identify domain-specific optimization opportunities
- Track adoption rates by functional area

### **2. 🌈 Visual Representation**
- Color-coded domains in dashboards
- Domain-specific performance indicators
- Hierarchical visualization of API usage

### **3. 🔍 Advanced Filtering**
- CLI filtering by domain: `--domains crypto,networking`
- API endpoint filtering: `?domains=filesystem,binary`
- Performance analysis by domain

### **4. 📊 Reporting Capabilities**
- Domain-wise performance metrics
- Native implementation rates by domain
- Error rate analysis per domain

## 🚀 Integration with Workspace & Catalog

### **Package.json Integration**
```json
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "commander": "^14.0.2",
      "elysia": "^1.4.21"
    },
    "catalogs": {
      "metrics": {
        "bun-native": "workspace:*"
      }
    }
  }
}
```

### **Version-Aware Classification**
```typescript
// Version-specific API handling
if (name.startsWith('bun.') || name.includes('native')) {
  return {
    source: 'bun-native',
    version: Bun.version,  // Dynamic version tracking
    performanceTier: 'ultra-fast',
    memoryEfficiency: 'optimal'
  };
}
```

## 🎯 Summary

The domain classification system provides:

✅ **18 Functional Domains** for comprehensive API categorization
✅ **Pattern-Based Classification** using keyword matching
✅ **Color-Coded Visualization** with hex color mapping
✅ **CLI Filtering Support** with `--domains` flag
✅ **API Integration** with domain breakdown endpoints
✅ **Performance Analysis** by domain grouping
✅ **Workspace Integration** with catalog system
✅ **Version-Aware Tracking** with dynamic version detection

This system enables organized analysis, filtering, and visualization of Bun Native API usage across all functional domains, making it easy to identify performance patterns, adoption rates, and optimization opportunities.
