---
description: "Run performance benchmarks for 2048 game and quantum toolkit"
---

# Benchmark Workflow

## Overview
Run comprehensive performance tests for the 2048 game and quantum toolkit components.

## Bun Configuration System

### Project Configuration Versions
- **New projects**: Default to `configVersion = 1` (v1)
- **Existing Bun projects**: If lockfile doesn't have version, sets `configVersion = 0` (v0)
- **Migrations from other package managers**:
  - From pnpm: `configVersion = 1` (v1)
  - From npm or yarn: `configVersion = 0` (v0)

### bun.lock Configuration
```json
// New projects:
"configVersion": 1,

// Existing projects without version (after running `bun install`):
"configVersion": 0,
```

### Linker Behavior
- **v1 (isolated linker)**: Used by default in workspaces
- **v0 (hoisted linker)**: Used for existing projects without version
- **Performance**: Projects with popular libraries (esbuild, sharp) install faster with v1

## Steps

### 1. Game Performance Benchmarks
```bash
# Test game initialization and rendering performance
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run test:deep test/spawn-perf-gate.test.ts

# Measure game loop performance
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun --console-depth 5 -e "
const game = new Game2048();
const start = performance.now();
for(let i = 0; i < 1000; i++) game.move('left');
console.log('1000 moves in', performance.now() - start, 'ms');
"
```

### 2. Quantum Toolkit Benchmarks
```bash
# Test quantum toolkit performance
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run toolkit

# Benchmark color generation
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun --console-depth 3 -e "
import { colourKit } from './quantum-toolkit-patch.ts';
const start = performance.now();
for(let i = 0; i < 10000; i++) colourKit(Math.random());
console.log('10k color kits in', performance.now() - start, 'ms');
"
```

### 2.1. Enhanced stdin Quantum Analysis
```bash
# Test enhanced stdin analyzer performance
echo -e "Hello world\nThis is a test line with more content\nShort" | BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts

# Benchmark stdin processing with larger datasets
for i in {1..5}; do
  echo "Line $i: $(head -c $((RANDOM % 100 + 20)) /dev/urandom | tr -dc 'a-zA-Z0-9 ')" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts
done

# Performance comparison with different input sizes
echo "Testing with 100 lines..."
seq 1 100 | while read i; do echo "Line $i with some additional content to make it longer"; done | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts

echo "Testing with 1000 lines..."
seq 1 1000 | while read i; do echo "Line $i"; done | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts
```

### 2.2. Advanced Analytics Performance Metrics
```bash
# Run comprehensive performance analysis
echo -e "Test line 1\nTest line 2\nTest line 3" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts 2>&1 | grep -E "(Entropy|Information Density|Redundancy|Vocabulary)"

# Measure processing time overhead
time echo -e "Line 1\nLine 2\nLine 3" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts > /dev/null
```

### 2.3. Export Format Performance
```bash
# Test JSON export performance
echo -e "Hello world\nThis is a test" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts 2>&1 | grep "JSON"

# Test CSV export performance
echo -e "Hello world\nThis is a test" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts 2>&1 | grep "CSV"
```

### 3. Server Performance
```bash
# Test server response time
curl -w '@curl-format.txt' -o /dev/null -s http://localhost:8000

# Load test with multiple connections
for i in {1..10}; do curl -s http://localhost:8000 > /dev/null & done; wait
```

### 4. Memory Usage Analysis
```bash
# Run with memory profiling
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun --cpu-prof --cpu-prof-name=bench-profile --cpu-prof-dir=profiles run serve:smol

# Analyze memory footprint
ps aux | grep 'serve.js'
```

### 4.1. CPU Profiling with Bun
```bash
# Enable detailed CPU profiling for performance analysis
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun --cpu-prof --cpu-prof-name=game-profile --cpu-prof-dir=profiles -e "
const game = new Game2048();
const start = performance.now();
for(let i = 0; i < 10000; i++) game.move('left');
console.log('10k moves completed');
"

# Profile quantum toolkit operations
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun --cpu-prof --cpu-prof-name=toolkit-profile --cpu-prof-dir=profiles -e "
import { colourKit } from './quantum-toolkit-patch.ts';
const start = performance.now();
for(let i = 0; i < 5000; i++) colourKit(Math.random());
console.log('5k color kits completed');
"
```

**CPU Profiling Options:**
- `--cpu-prof`: Enables profiling
- `--cpu-prof-name <filename>`: Sets output filename
- `--cpu-prof-dir <dir>`: Sets output directory
- Profiles saved in Chrome DevTools-compatible .cpuprofile format
- Can be opened in Chrome DevTools (Performance tab) or VS Code's CPU profiler
- Sampling runs at 1ms for fine-grained insights

### 5. Build Performance
```bash
# Time the build process
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 time bun run build

# Compare build sizes
ls -la dist/
du -sh dist/
```

### 6. Bundle Analysis
```bash
# Analyze bundle composition
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun build script.js --metafile=meta.json --outdir=dist
cat meta.json | jq '.inputs'

# Test compression ratios
gzip -c dist/script.js | wc -c
```

## Expected Results

### Performance Targets
- **spawnSync**: ≤ 0.5ms on ARM64
- **Game moves**: ≤ 1ms per move
- **Color generation**: ≤ 0.1ms per kit
- **Server response**: ≤ 10ms
- **Build time**: ≤ 100ms
- **Bundle size**: ≤ 5KB minified

### Memory Targets
- **Server memory**: ≤ 50MB (smol mode)
- **Game runtime**: ≤ 20MB
- **Toolkit overhead**: ≤ 1MB

## Automation

### CI/CD Integration
```yaml
# .github/workflows/bench.yml
name: Benchmark
on: [push, pull_request]
jobs:
  bench:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun install
      - run: BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run bench
```

### Local Monitoring
```bash
# Continuous monitoring
watch -n 5 'curl -s http://localhost:8000 | wc -c'

# Performance regression testing
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun test --coverage
```

## Reporting

Results are automatically saved to:
- `bench-results.json` - Machine-readable metrics
- `bench-report.md` - Human-readable summary
- `cpu-profile.json` - CPU profiling data

Use `bun run bench` to execute the full benchmark suite.

## Advanced Performance Metrics

### 7. Performance Regression Detection
```bash
# Run baseline performance test
echo "Running baseline..."
echo -e "Baseline test line\nAnother baseline line" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts > baseline_output.txt

# Compare with current performance
echo "Running current test..."
echo -e "Baseline test line\nAnother baseline line" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts > current_output.txt

# Generate diff report
diff -u baseline_output.txt current_output.txt || echo "Performance changes detected"
```

### 8. Detailed Performance Benchmarks
| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| stdin processing (3 lines) | < 5ms | < 10ms | < 20ms |
| 18-column table generation | < 2ms | < 5ms | < 10ms |
| Compression ratio | > 50% | > 40% | > 30% |
| Memory usage | < 5MB | < 10MB | < 20MB |
| Lines per second | > 10000 | > 5000 | > 1000 |
| Entropy calculation | < 1ms | < 2ms | < 5ms |
| Export formats | < 1ms | < 2ms | < 5ms |

### 9. Advanced Analytics Performance
```bash
# Run comprehensive performance analysis
echo -e "Test line 1\nTest line 2\nTest line 3" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts 2>&1 | grep -E "(Entropy|Information Density|Redundancy|Vocabulary)"

# Measure processing time overhead
time echo -e "Line 1\nLine 2\nLine 3" | \
  BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts > /dev/null
```

## Troubleshooting

### Common Issues

1. **Slow Performance**
   - Check memory usage: `top -pid $(pgrep -f "bun run")`
   - Verify no memory leaks in long-running processes
   - Consider increasing heap size for large inputs

2. **High Memory Usage**
   - Monitor with `bun --inspect` and Chrome DevTools
   - Check for unclosed file handles
   - Verify snapshot cleanup is working

3. **Compression Issues**
   - Verify gzipSync is using level 9
   - Check input data size vs compressed output
   - Test with different input patterns

4. **Table Rendering Problems**
   - Verify terminal supports Unicode box characters
   - Check table padding constants are reasonable
   - Test with smaller datasets first

### Debug Commands
```bash
# Enable verbose logging
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun run stdin-quantum-enhanced-v2.ts 2>&1 | tee debug.log

# Profile specific operations
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1 bun --cpu-prof --cpu-prof-name=stdin-profile -e "
const { calculateEntropy } = await import('./stdin-quantum-enhanced-v2.ts');
const start = performance.now();
for(let i = 0; i < 1000; i++) calculateEntropy('test'.repeat(100));
console.log('1000 entropy calculations in', performance.now() - start, 'ms');
"
```
