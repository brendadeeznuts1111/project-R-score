# Bun v1.3.9 Performance Benchmarks

This directory contains benchmarks demonstrating the performance improvements in Bun v1.3.9.

## 📊 Available Benchmarks

### 1. RegExp JIT Benchmark (`regex-jit-benchmark.ts`)

Demonstrates the **3.9x speedup** for fixed-count regex patterns:

- **JIT-optimized patterns:**
  - `/(?:abc){3}/` - Fixed-count non-capturing groups
  - `/(a+){2}b/` - Fixed-count with captures
  - `/aaaa|bbbb/` - Alternatives with known prefixes (SIMD)

- **Interpreter patterns (no JIT):**
  - `/(?:abc)+/` - Variable count
  - `/(a+)*b/` - Zero-or-more quantifiers

**Run:**
```bash
bun run benchmarks/regex-jit-benchmark.ts
```

### 2. Markdown Performance (`markdown-performance.ts`)

Demonstrates improvements in `Bun.Markdown`:

- **3-15% faster** Markdown-to-HTML rendering (SIMD-accelerated HTML escaping)
- **28% faster** `Bun.markdown.react()` for small documents
- **7% faster** for medium documents
- **7.4% faster** for large documents
- **40% reduction** in string object allocations
- **6% smaller** heap size during rendering

**Run:**
```bash
bun run benchmarks/markdown-performance.ts
```

### 3. String Optimizations (`string-optimizations.ts`)

Demonstrates JavaScriptCore optimizations:

- **String#startsWith:** 1.42x faster (5.76x with constant folding)
- **String#trim:** 1.17x faster
- **String#trimStart:** 1.10x faster
- **String#trimEnd:** 1.42x faster
- **String#replace:** Returns ropes (lazy concatenation)
- **Set#size:** 2.24x faster
- **Map#size:** 2.74x faster
- **AbortSignal.abort():** ~6% faster with no listeners

**Run:**
```bash
bun run benchmarks/string-optimizations.ts
```

## 🚀 Running All Benchmarks

```bash
# Run all benchmarks
bun run benchmarks/regex-jit-benchmark.ts
bun run benchmarks/markdown-performance.ts
bun run benchmarks/string-optimizations.ts

# Or run them in parallel (Bun v1.3.9 feature!)
bun run --parallel "benchmarks:*"
```

## 📈 Expected Results

| Feature | Improvement | Notes |
|---------|-------------|-------|
| Fixed-count regex | **3.9x faster** | JIT-compiled patterns |
| SIMD regex prefix | **16 bytes/scan** | ARM64 & x86_64 |
| Markdown (small) | **28% faster** | React renderer |
| Markdown (medium) | **7% faster** | React renderer |
| Markdown (large) | **7.4% faster** | React renderer |
| HTML escaping | **3-15% faster** | SIMD acceleration |
| String#startsWith | **1.42x faster** | DFG/FTL intrinsic |
| String#startsWith (const) | **5.76x faster** | Constant folding |
| String#trim | **1.17x faster** | Direct pointer access |
| String#trimEnd | **1.42x faster** | Direct pointer access |
| Set#size | **2.24x faster** | Intrinsic optimization |
| Map#size | **2.74x faster** | Intrinsic optimization |
| AbortSignal.abort() | **~6% faster** | No listener optimization |

## 🔍 Understanding the Results

### RegExp JIT

The JIT compiler optimizes patterns with fixed-count quantifiers. Patterns with variable quantifiers (`+`, `*`) remain in the interpreter.

**Optimization tip:** Use `{n}` instead of `+` when the count is known.

### Markdown Performance

SIMD acceleration is most noticeable with documents containing many special characters (`&`, `<`, `>`, `"`). The React renderer benefits from cached tag strings.

**Optimization tip:** Larger documents with fewer special characters see the biggest gains.

### String Optimizations

All string optimizations are automatic and require no code changes. The improvements come from JavaScriptCore's DFG/FTL JIT tiers.

**Optimization tip:** Constant folding provides the biggest gains - use string literals when possible.

### Collection Size

The `.size` getter is now an intrinsic, eliminating generic getter call overhead.

**Optimization tip:** No changes needed - just upgrade to Bun v1.3.9!

## 📚 References

- [Bun v1.3.9 Release Notes](https://bun.com/blog/bun-v1.3.9)
- [JavaScriptCore Documentation](https://webkit.org/docs/)
- [Performance Best Practices](../README.md)
