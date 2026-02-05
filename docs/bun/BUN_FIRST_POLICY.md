<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# 🦌 Bun-First Policy & Implementation Guide

## 🎯 Core Principle: **ALWAYS USE BUN FIRST!**

### 📋 Policy Statement

**All code must prioritize Bun's native APIs over Node.js compatibility APIs.** When a Bun equivalent exists, it MUST be used instead of the Node.js version.

---

## 🚨 Critical Replacements Required

### File System Operations
| ❌ Node.js API | ✅ Bun Equivalent | Performance Gain |
|---------------|------------------|------------------|
| `require("fs")` | `Bun.file()`, `Bun.write()` | **3x faster** |
| `fs.readFileSync()` | `await Bun.file().text()` | **Async, non-blocking** |
| `fs.writeFileSync()` | `await Bun.write()` | **2x faster writes** |
| `fs.existsSync()` | `await Bun.file().exists()` | **Async, reliable** |
| `fs.mkdirSync()` | `await Bun.write()` with dirs | **Built-in** |

### HTTP Operations
| ❌ Node.js API | ✅ Bun Equivalent | Performance Gain |
|---------------|------------------|------------------|
| `require("http")` | `Bun.serve()` | **2x faster server** |
| `http.createServer()` | `Bun.serve()` | **Native performance** |
| `https.createServer()` | `Bun.serve()` with TLS | **Built-in HTTPS** |
| `require("https")` | `Bun.serve()` | **Simplified API** |

### Process Operations
| ❌ Node.js API | ✅ Bun Equivalent | Performance Gain |
|---------------|------------------|------------------|
| `require("child_process")` | `Bun.spawn()` | **Native performance** |
| `child_process.spawn()` | `Bun.spawn()` | **Built-in optimization** |
| `child_process.execSync()` | `Bun.spawnSync()` | **2x faster** |
| `child_process.exec()` | `Bun.spawn()` | **Better error handling** |

### Path Operations
| ❌ Node.js API | ✅ Bun Equivalent | Benefits |
|---------------|------------------|----------|
| `require("path")` | `import.meta.path` | **Built-in path handling** |
| `path.join()` | Template literals with `import.meta.path` | **No external dependency** |
| `path.resolve()` | `new URL()` with `import.meta.path` | **Native URL handling** |
| `path.dirname()` | `import.meta.dir` | **Built-in directory detection** |

---

## 🚀 Implementation Examples

### File Operations - Bun First
```typescript
// ❌ WRONG - Node.js way
import { readFileSync, writeFileSync } from 'fs';
const content = readFileSync('input.txt', 'utf8');
writeFileSync('output.txt', content);

// ✅ CORRECT - Bun-first way
const content = await Bun.file('input.txt').text();
await Bun.write('output.txt', content);
```

### HTTP Server - Bun First
```typescript
// ❌ WRONG - Node.js way
import { createServer } from 'http';
const server = createServer((req, res) => {
  res.end('Hello');
});

// ✅ CORRECT - Bun-first way
const server = Bun.serve({
  fetch() {
    return new Response('Hello');
  }
});
```

### Process Spawning - Bun First
```typescript
// ❌ WRONG - Node.js way
import { spawn } from 'child_process';
const child = spawn('echo', ['hello']);

// ✅ CORRECT - Bun-first way
const child = Bun.spawn(['echo', 'hello']);
```

### Path Handling - Bun First
```typescript
// ❌ WRONG - Node.js way
import { join } from 'path';
const fullPath = join(__dirname, 'file.txt');

// ✅ CORRECT - Bun-first way
const fullPath = `${import.meta.dir}/file.txt`;
```

---

## 📊 Current Compliance Status

### ✅ Files Following Bun-First Principles:
- `lib/fixed-audit.ts` - Uses Bun.file() API
- `lib/url-pattern-fixer.ts` - Uses Bun.write() 
- `lib/silent-killer-detector.ts` - Uses Bun.file()

### ⚠️ Files Needing Updates:
- Several files still using Node.js APIs
- Import statements with `require()`
- Missing Bun optimizations

### 🎯 Target Compliance: **100%**

---

## 🛡️ Enforcement Rules

### 1. Code Reviews
- **MUST** check for Node.js API usage
- **MUST** verify Bun equivalents are used
- **MUST** validate async patterns

### 2. Automated Testing
- **MUST** include Bun-first compliance checks
- **MUST** fail builds with Node.js APIs
- **MUST** enforce performance benchmarks

### 3. Documentation
- **MUST** document Bun-first patterns
- **MUST** provide migration examples
- **MUST** include performance comparisons

---

## 🔧 Migration Checklist

### Phase 1: Critical Replacements
- [ ] Replace all `require("fs")` with `Bun.file()`
- [ ] Replace `fs.readFileSync()` with `await Bun.file().text()`
- [ ] Replace `fs.writeFileSync()` with `await Bun.write()`
- [ ] Replace `require("http")` with `Bun.serve()`
- [ ] Replace `child_process.spawn()` with `Bun.spawn()`

### Phase 2: Optimizations
- [ ] Use `Bun.fetch()` instead of global `fetch()`
- [ ] Use `import.meta.main` for entry detection
- [ ] Use `import.meta.path` and `import.meta.dir` for paths
- [ ] Replace `require("path")` with built-in path handling

### Phase 3: Advanced Features
- [ ] Implement Bun's native SQLite
- [ ] Use Bun's built-in test runner
- [ ] Leverage Bun's file system watching
- [ ] Utilize Bun's native crypto APIs

---

## 📈 Performance Benefits

### Expected Improvements:
- 🚀 **3x faster** file operations
- 🌐 **2x faster** HTTP serving
- ⚡ **Native** process spawning
- 🔧 **Zero dependencies** for core operations
- 📦 **Smaller bundle sizes**

### Real-world Impact:
- Faster startup times
- Reduced memory usage
- Better throughput
- Simplified deployments
- Lower server costs

---

## 🎯 Success Metrics

### Technical Metrics:
- **100%** Bun API compliance
- **0** Node.js require statements
- **All** file operations using Bun.file()
- **All** HTTP servers using Bun.serve()

### Performance Metrics:
- **3x** improvement in file I/O
- **2x** improvement in HTTP serving
- **50%** reduction in memory usage
- **25%** faster startup times

---

## 🚨 Immediate Actions Required

### 1. Audit Existing Code
```bash
bun lib/bun-first-compliance.ts
```

### 2. Fix Critical Violations
- Replace Node.js imports
- Update file operations
- Migrate HTTP servers

### 3. Update Development Practices
- Use Bun-first patterns in new code
- Add compliance checks to CI/CD
- Train team on Bun APIs

---

## 🦌 Bun-First Manifesto

**We choose Bun first not just for performance, but for simplicity, reliability, and the future of JavaScript runtime optimization.**

**Every line of code should leverage Bun's native capabilities. Every API call should prioritize Bun's implementations. Every performance optimization should start with Bun's built-in features.**

**This is our commitment to excellence, our dedication to performance, and our investment in the future of web development.**

---

## 📞 Support & Resources

### Documentation:
- [Bun Documentation 🌐](https://bun.sh/docs)
- [Bun API Reference 🌐](https://bun.sh/docs/api)
- [Migration Guide](./BUN_FIRST_MIGRATION_GUIDE.md)

### Tools:
- `lib/bun-first-compliance.ts` - Compliance auditor
- `lib/silent-killer-detector.ts` - Pattern detector
- `BUN_FIRST_MIGRATION_GUIDE.md` - Step-by-step guide

### Getting Help:
- Check compliance reports
- Review migration examples
- Consult Bun documentation
- Ask for code review

---

**Remember: ALWAYS USE BUN FIRST! 🦌**
