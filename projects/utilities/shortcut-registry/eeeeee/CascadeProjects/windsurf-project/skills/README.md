# Bun-Native Mastery Curriculum

## 🎯 Overview

Master Bun.js performance patterns through hands-on exercises, automated annotations, and real-time feedback. This curriculum transforms your Node.js habits into Bun-native expertise.

## 📚 Learning Path

### Module 1: File I/O Mastery (`01-file-io`)
**Goal**: Replace blocking Node.js I/O with Bun's async patterns

**Learning Objectives:**
- ✅ Use `Bun.file()` instead of `fs.readFileSync()`
- ✅ Implement async directory operations
- ✅ Stream large files efficiently
- ✅ Use `Bun.glob()` for pattern matching
- ✅ Set up file watching with `Bun.watch()`

**Exercises:**
1. **Configuration Management** - Fix synchronous config loading
2. **User Data Storage** - Implement async file operations
3. **Log Processing** - Batch process files with `Promise.all()`
4. **Large File Analysis** - Stream processing without memory overload
5. **File Watching** - Event-driven configuration updates

**Success Criteria:**
- [ ] No `[PERF][SYNC_IO]` annotations remain
- [ ] 5x+ performance improvement on benchmarks
- [ ] Memory usage reduced by 80% for large files
- [ ] All async operations properly handled

---

### Module 2: Concurrency Patterns (`02-concurrency`)
**Goal**: Master async/await and promise handling

**Learning Objectives:**
- ✅ Fix dangling promises
- ✅ Implement proper error handling
- ✅ Use `AbortSignal` for timeouts
- ✅ Manage concurrent operations safely
- ✅ Clean up resources properly

**Exercises:**
1. **API Client** - Handle network requests properly
2. **Worker Management** - Spawn and cleanup processes
3. **Batch Processing** - Concurrent data processing
4. **Timeout Handling** - Graceful cancellation
5. **Resource Management** - Proper cleanup patterns

---

### Module 3: Performance Optimization (`03-performance`)
**Goal**: Leverage Bun's built-in performance features

**Learning Objectives:**
- ✅ Use `Bun.hash.xxHash3()` for fast hashing
- ✅ Replace Node.js crypto with Bun alternatives
- ✅ Optimize memory usage with TypedArrays
- ✅ Implement efficient compression
- ✅ Use built-in benchmarking tools

**Exercises:**
1. **Hashing Optimization** - Replace slow crypto functions
2. **Memory Management** - Eliminate Buffer usage
3. **Compression** - Use built-in gzip support
4. **Caching** - Implement efficient caching patterns
5. **Benchmarking** - Measure and compare performance

---

### Module 4: Security Best Practices (`04-security`)
**Goal**: Implement secure coding patterns with Bun

**Learning Objectives:**
- ✅ Use `Bun.password` for secure hashing
- ✅ Implement proper input validation
- ✅ Handle secrets securely
- ✅ Prevent timing attacks
- ✅ Secure file operations

**Exercises:**
1. **Password Security** - Replace insecure hashing
2. **Input Validation** - Prevent injection attacks
3. **Secret Management** - Handle credentials safely
4. **File Security** - Secure file operations
5. **API Security** - Implement proper authentication

---

### Module 5: Testing with bun:test (`05-testing`)
**Goal**: Master Bun's built-in testing framework

**Learning Objectives:**
- ✅ Use `bun:test` for unit testing
- ✅ Implement mocking and stubbing
- ✅ Test async operations properly
- ✅ Set up integration tests
- ✅ Measure test coverage

**Exercises:**
1. **Unit Testing** - Test individual functions
2. **Async Testing** - Test promises and timeouts
3. **Mocking** - Replace external dependencies
4. **Integration Testing** - Test complete workflows
5. **Performance Testing** - Benchmark critical paths

## 🛠️ Getting Started

### Prerequisites
- Bun 1.0+ installed
- Basic TypeScript knowledge
- Node.js experience (helpful for comparison)

### Installation
```bash
# Clone the repository
git clone https://github.com/skills/bun-native-mastery
cd bun-native-mastery

# Install dependencies
bun install

# Initialize workspace
bun run skills init
```

### Quick Start
```bash
# Start first exercise
bun run skills exercise 1

# Scan for issues
bun run skills scan --exercise 1

# Benchmark performance
bun run skills benchmark --exercise 1 --compare

# View progress
bun run skills dashboard
```

## 🏷️ Annotation System

The curriculum uses an automated annotation system to identify anti-patterns:

### Annotation Format
```typescript
// [DOMAIN][SCOPE][TYPE][META:{fix:"...",severity:"..."}][Component][Interface][Function][#REF:skills-module][BUN-NATIVE]
```

### Domains
- **PERF**: Performance issues
- **ERROR**: Error handling problems  
- **SECURITY**: Security vulnerabilities
- **BUN_NATIVE**: Bun-specific optimizations

### Severity Levels
- **critical**: Must fix for production
- **high**: Significant impact
- **medium**: Moderate improvement
- **low**: Minor optimization

## 📊 Progress Tracking

### Metrics
- **Annotations Fixed**: Number of issues resolved
- **Performance Gains**: Speed improvements achieved
- **Modules Completed**: Finished exercises
- **Badges Earned**: Achievement milestones

### Badges
- ⚡ **speed-demon**: Fix 10 [PERF] annotations
- 🛡️ **error-slayer**: Fix 10 [ERROR] annotations  
- 🔒 **security-guard**: Fix 5 [SECURITY] annotations
- 🥇 **bun-master**: Complete all modules

### Dashboard
Track your progress with the interactive dashboard:
```bash
bun run skills dashboard --open
```

## 🎓 Certification

### Completion Requirements
1. **Fix all annotations** in each exercise
2. **Pass performance benchmarks** with 5x+ improvement
3. **Achieve 90%+ test coverage**
4. **Complete final project** using all learned patterns

### Final Project
Build a production-ready application that demonstrates:
- Async file operations
- Concurrent processing
- Performance optimization
- Security best practices
- Comprehensive testing

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Areas for Contribution
- New exercise modules
- Additional annotation patterns
- Performance benchmarks
- Documentation improvements
- Translation support

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/skills/bun-native-mastery/issues)
- **Discussions**: [GitHub Discussions](https://github.com/skills/bun-native-mastery/discussions)
- **Discord**: [Bun Discord](https://discord.bun.sh)

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🚀 Ready to Master Bun?

**Start your journey:**
```bash
bun run skills exercise 1
```

**Transform your Node.js habits into Bun-native expertise!** 🎯
