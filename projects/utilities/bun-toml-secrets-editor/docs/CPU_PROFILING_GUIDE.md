# CPU Profiling Guide - Bun v1.3.7

## Overview

Bun v1.3.7 introduces powerful CPU profiling capabilities that help you identify performance bottlenecks in your Golden Template configuration loading.

## 🚀 Quick Start

### Profile Configuration Loading

```bash
# Generate CPU profile in Markdown format
bun --cpu-prof-md run src/templates/golden-init.ts instantiate config/golden.toml production

# Output:
# - profiles/CPU.xxx.cpuprofile (Chrome DevTools format)
# - profiles/CPU.xxx.md (Human-readable Markdown)
```

### Profile Any Script

```bash
# Profile your application
bun --cpu-prof-md run your-app.ts

# Profile with custom name
bun --cpu-prof-md --cpu-prof-name=myapp run your-app.ts
```

## 📊 Profile Formats

### 1. Markdown Format (Human-Readable)

Generated automatically with `--cpu-prof-md`:

```markdown
# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 3.4ms | 3 | 1.0ms | 13 |

**Top 10:** `fetch` 34.2%, `requestFetch` 33.6%, `serve` 32.0%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 34.2% | 1.1ms | 34.2% | 1.1ms | `fetch` | `[native code]` |
| 33.6% | 1.1ms | 67.9% | 2.3ms | `requestFetch` | `[native code]` |
```

**Key Metrics:**
- **Self%**: Time spent in function itself
- **Total%**: Time including child calls
- **Hot Functions**: Functions consuming most CPU
- **Call Tree**: Parent/child relationships

### 2. Chrome DevTools Format

Open `.cpuprofile` files in Chrome DevTools:

```bash
# Open Chrome DevTools
# 1. Go to Performance tab
# 2. Click "Load Profile"
# 3. Select profiles/CPU.xxx.cpuprofile
```

**Visual Analysis:**
- Flame charts showing call stacks
- Timeline view of execution
- Interactive zoom and filtering

## 🎯 Profiling the Golden Template

### Performance Budgets

The v1.3.7 template includes performance budgets:

```toml
[profiling.budgets]
template_resolution = 500    # Max ms for config loading
rss_fetch = 1000             # Max ms for RSS fetch
secret_resolution = 100      # Max ms per secret
```

### Built-in Profiling Commands

```bash
# Profile configuration loading
bun run golden:init:profile

# Output:
# 📊 Profiling configuration loading...
# 
# ⏱️  Performance Results (10 iterations):
#    Average: 0.65ms
#    Min: 0.34ms
#    Max: 2.54ms
#    StdDev: 0.64ms
#
# 📈 v1.3.7 Performance Targets:
#    Expected: ~293ms for 500 secrets (35% faster)
#    Actual avg: 0.65ms
#    ✅ Excellent performance
```

## 📈 Interpreting Results

### Example: Template Resolution

```
⏱️  Instantiation time: 3.12ms
✅ Within performance budget (500ms)

📈 v1.3.7 Optimizations:
   • async/await: 35% faster ✓
   • array.flat(): 3x faster ✓
```

**Analysis:**
- ✅ Well within 500ms budget
- ✅ v1.3.7 optimizations active
- 🎯 Excellent performance

### Example: RSS Feed Loading

```markdown
## Hot Functions (Self Time)

| Self% | Self | Function |
|------:|-----:|----------|
| 34.2% | 1.1ms | `fetch` |
| 33.6% | 1.1ms | `requestFetch` |
| 32.0% | 1.1ms | `serve` |
```

**Analysis:**
- Most time spent in network operations (`fetch`)
- Consider caching if RSS feeds are static
- DNS prefetching may help

## 🔧 Advanced Usage

### Custom Profiling Script

```typescript
// profile-config.ts
import { loadGoldenTemplate } from "./src/config/golden-template-loader.js";

const start = performance.now();
await loadGoldenTemplate("./config/golden.toml", { profile: "production" });
const duration = performance.now() - start;

console.log(`Config loaded in ${duration.toFixed(2)}ms`);
```

```bash
# Profile it
bun --cpu-prof-md run profile-config.ts
```

### Profiling Specific Operations

```typescript
// Profile secret resolution
const secretStart = performance.now();
const secret = await getWithFallback("api", "key", "production");
console.log(`Secret resolved in ${performance.now() - secretStart}ms`);

// Profile template parsing
const parseStart = performance.now();
const config = Bun.TOML.parse(template);
console.log(`TOML parsed in ${performance.now() - parseStart}ms`);
```

## 📊 Performance Targets

Based on Bun v1.3.7 benchmarks:

| Operation | Target | Excellent | Good | Needs Work |
|-----------|--------|-----------|------|------------|
| Template Resolution | 500ms | <350ms | <500ms | >500ms |
| RSS Fetch | 1000ms | <500ms | <1000ms | >1000ms |
| Secret Resolution | 100ms | <50ms | <100ms | >100ms |

## 🎓 Best Practices

### 1. Profile in Production Mode

```bash
# Use production profile for realistic results
bun --cpu-prof-md run app.ts --profile production
```

### 2. Multiple Iterations

```bash
# Run multiple times to get average
for i in {1..5}; do
  bun --cpu-prof-md run app.ts
done
```

### 3. Compare Versions

```bash
# Before optimization
bun --cpu-prof-md --cpu-prof-name=baseline run app.ts

# After optimization
bun --cpu-prof-md --cpu-prof-name=optimized run app.ts
```

### 4. Focus on Hot Functions

From the profile, focus on functions with:
- High **Self%** (actual work done)
- High **Total%** (including children)
- Called frequently

## 🔍 Common Bottlenecks

### RSS Feed Loading

```markdown
| 34.2% | fetch | Network request
| 15.3% | parseFeed | XML parsing
| 8.7%  | dns.lookup | DNS resolution
```

**Solutions:**
- Enable DNS prefetching
- Use feed caching
- Parallel fetch with `Promise.all()`

### Secret Resolution

```markdown
| 45.2% | readFile | File I/O
| 23.1% | JSON.parse | Parsing
| 12.4% | path.resolve | Path resolution
```

**Solutions:**
- Cache resolved secrets
- Use in-memory store for frequently accessed secrets

### Template Parsing

```markdown
| 52.3% | Bun.TOML.parse | TOML parsing
| 28.7% | regex.match | Secret pattern matching
| 11.2% | string.replace | Template substitution
```

**Solutions:**
- Cache parsed templates
- Pre-compile secret patterns

## 📁 Output Files

```
profiles/
├── CPU.xxx.cpuprofile      # Chrome DevTools format
├── CPU.xxx.md              # Markdown format
├── heap-xxx.heapprofile    # Heap snapshots (if using --heap-prof)
└── rss-profile-xxx.md      # RSS-specific profiles
```

## 🎯 Summary

```bash
# Quick performance check
bun run golden:init:profile

# Full CPU profiling
bun --cpu-prof-md run golden-init.ts instantiate config.toml production

# View results
cat profiles/CPU.xxx.md
```

**Key Takeaways:**
- ✅ Bun v1.3.7 makes profiling effortless
- ✅ Markdown format is human-readable
- ✅ Chrome DevTools format for deep analysis
- ✅ Built into the Golden Template

---

**Next:** Check `docs/BUN_V1.3.7_INTEGRATION.md` for complete feature overview.
