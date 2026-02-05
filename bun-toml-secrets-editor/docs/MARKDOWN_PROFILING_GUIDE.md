# Bun v1.3.7 Markdown Profiling Guide

## 🆕 New Features Overview

Bun v1.3.7 introduces **Markdown profiling output** that makes it easy to share profiles on GitHub and analyze them with LLMs.

## 📊 CPU Profiling with Markdown

### Basic Usage

```bash
# Generate markdown CPU profile only
bun --cpu-prof-md script.js

# Generate both Chrome DevTools JSON and markdown formats
bun --cpu-prof --cpu-prof-md script.js
```

### Advanced Options

```bash
# Custom filename and directory
bun --cpu-prof-md --cpu-prof-name=myapp --cpu-prof-dir ./profiles script.js

# Profile specific operations
bun --cpu-prof-md --cpu-prof-name=config-load src/config-loader.ts
```

### What's Included in CPU Markdown Output

- **Summary table** with duration, sample count, and interval
- **Hot functions** ranked by self-time percentage  
- **Call tree** showing total time including children
- **Function details** with caller/callee relationships
- **File breakdown** showing time spent per source file

### Example CPU Markdown Output

```markdown
# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 125.4ms | 1,254 | 100μs | 89 |

**Top 10:** `performCPUWork` 23.4%, `Math.sqrt` 18.2%, `Array.fill` 12.1%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 23.4% | 29.3ms | 23.4% | 29.3ms | `performCPUWork` | `demo.ts:15` |
| 18.2% | 22.8ms | 41.6% | 52.2ms | `Math.sqrt` | `[native code]` |
| 12.1% | 15.2ms | 12.1% | 15.2ms | `Array.fill` | `[native code]` |

## File Breakdown

| File | Time | Percentage |
|------|------|-----------:|
| demo.ts | 45.2ms | 36.0% |
| [native code] | 80.2ms | 64.0% |
```

## 💾 Heap Profiling with Markdown

### Basic Usage

```bash
# Generate markdown heap profile
bun --heap-prof-md script.js

# Generate both snapshot and markdown formats
bun --heap-prof --heap-prof-md script.js
```

### Advanced Options

```bash
# Custom output location
bun --heap-prof --heap-prof-dir ./profiles --heap-prof-name=my-snapshot.heapsnapshot script.js
```

### What's Included in Heap Markdown Output

- **Summary metrics** (total heap size, objects, GC roots)
- **Top 50 types** by retained size
- **Searchable object listings**
- **Retainer chains** showing how objects are kept alive
- **Quick grep commands** for finding memory issues

### Example Heap Markdown Output

```markdown
# Heap Profile

## Summary

| Metric | Value |
|--------|-------:|
| Total Heap Size | 2.4 MB |
| Total Objects | 15,234 |
| GC Roots | 426 |

## Top 50 Types by Retained Size

| Rank | Type | Count | Self Size | Retained Size |
|-----:|------|------:|---------:|--------------:|
| 1 | `Function` | 568 | 18.7 KB | 1.2 MB |
| 2 | `Structure` | 247 | 27.0 KB | 856.3 KB |
| 3 | `Array` | 1,234 | 45.2 KB | 234.1 KB |

## Quick Analysis Commands

```bash
grep 'type=Function' profile.md      # Find all Function objects
grep 'size=[0-9]\{5,\}' profile.md   # Find objects >= 10KB
grep 'gcroot=1' profile.md           # Find all GC roots
```

## 🚀 Demo Script

Run the included demo to see both profiling types in action:

```bash
# CPU profiling with markdown output
bun --cpu-prof-md examples/profiling/markdown-profile-demo.ts

# Heap profiling with markdown output  
bun --heap-prof-md examples/profiling/markdown-profile-demo.ts

# Both CPU and heap profiling
bun --cpu-prof-md --heap-prof-md examples/profiling/markdown-profile-demo.ts
```

## 📈 Benefits of Markdown Format

### 1. **Human-Readable**
- Easy to scan and understand without tools
- Tables and formatting for quick insights
- Perfect for code reviews and documentation

### 2. **Shareable**
- Paste directly into GitHub issues/PRs
- Include in documentation and READMEs
- Email to team members for review

### 3. **LLM-Friendly**
- Structured format that AI can analyze
- Easy to ask questions about performance
- Automated analysis and recommendations

### 4. **CLI-Friendly**
- Use with grep, sed, awk for analysis
- Scriptable for automated reporting
- CI/CD integration for performance tracking

## 🔍 Analysis Examples

### Finding Performance Bottlenecks

```bash
# Find functions using >10% of CPU time
grep -E "^\|\s*[1-9][0-9]\.\d%\s*\|" CPU.*.md

# Find largest memory allocations
grep -E "MB|KB" Heap.*.md | sort -k4 -nr

# Compare two profiles
diff CPU-before.md CPU-after.md
```

### Automated Reporting

```bash
# Generate performance summary
echo "# Performance Report $(date)" > report.md
echo "" >> report.md
echo "## CPU Profile" >> report.md
cat CPU.*.md >> report.md
echo "" >> report.md
echo "## Heap Profile" >> report.md  
cat Heap.*.md >> report.md
```

## 🎯 Best Practices

### 1. **Use Descriptive Names**
```bash
bun --cpu-prof-md --cpu-prof-name=api-endpoint-profile api.js
bun --heap-prof-md --heap-prof-name=memory-leak-check app.js
```

### 2. **Organize Output**
```bash
mkdir -p profiles/cpu profiles/heap
bun --cpu-prof-md --cpu-prof-dir=./profiles/cpu app.js
bun --heap-prof-md --heap-prof-dir=./profiles/heap app.js
```

### 3. **Combine Formats**
```bash
# Get both visual (Chrome DevTools) and shareable (Markdown) formats
bun --cpu-prof --cpu-prof-md --heap-prof --heap-prof-md app.js
```

### 4. **Version Control**
```bash
# Track performance over time
git add profiles/*.md
git commit -m "Performance profile: feature-x implementation"
```

## 📚 Integration Examples

### GitHub Actions
```yaml
- name: Profile Performance
  run: |
    bun --cpu-prof-md --cpu-prof-name=ci-profile src/main.ts
    cat profiles/CI-PROFILE.md >> $GITHUB_STEP_SUMMARY
```

### Performance Monitoring
```bash
# Daily performance check
0 9 * * * cd /app && bun --cpu-prof-md --cpu-prof-name=daily-$(date +%Y%m%d) src/main.ts
```

### Before/After Optimization
```bash
# Before
bun --cpu-prof-md --cpu-prof-name=before src/optimized-function.ts

# After optimization  
bun --cpu-prof-md --cpu-prof-name=after src/optimized-function.ts

# Compare
diff profiles/before.md profiles/after.md
```

## 🔧 Advanced Usage

### Custom Analysis Script
```typescript
// analyze-profile.ts
import { readFileSync } from 'fs';

const profile = readFileSync(process.argv[2], 'utf8');
const lines = profile.split('\n');

// Extract hot functions
const hotFunctions = lines
  .filter(line => line.match(/^\|\s*\d+\.\d%\s*\|/))
  .slice(0, 5);

console.log('🔥 Top 5 Hot Functions:');
hotFunctions.forEach(fn => console.log(fn));
```

### Memory Leak Detection
```bash
# Look for growing object counts over time
for run in {1..5}; do
  bun --heap-prof-md --heap-prof-name=run-$run app.js
  grep "Total Objects" profiles/RUN-$run.md
done
```

---

## 🎉 Summary

Bun v1.3.7's Markdown profiling makes performance analysis:

- ✅ **Accessible** - No tools required
- ✅ **Shareable** - Perfect for collaboration  
- ✅ **Analyzable** - LLM and CLI friendly
- ✅ **Trackable** - Version control ready

Start using `--cpu-prof-md` and `--heap-prof-md` today to make performance profiling a team sport! 🚀
