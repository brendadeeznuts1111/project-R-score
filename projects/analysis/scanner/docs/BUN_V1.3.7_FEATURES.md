# Bun v1.3.7+ New Features

This document covers the latest Bun features relevant to the scanner project.

## Bun.wrapAnsi() - ANSI-Aware Text Wrapping

Bun now includes `Bun.wrapAnsi()`, a native implementation that wraps text to a specified column width while preserving
ANSI escape codes. Perfect for CLI tools that need to handle colored or styled output.

### API

```typescript
Bun.wrapAnsi(
  text: string,
  columns: number,
  options?: {
    hard?: boolean;              // Break words longer than columns (default: false)
    wordWrap?: boolean;          // Wrap at word boundaries (default: true)
    trim?: boolean;              // Trim leading/trailing whitespace (default: true)
    ambiguousIsNarrow?: boolean; // Treat ambiguous-width chars as narrow (default: true)
  }
): string
```

### Features

- ✅ Preserves ANSI escape codes (SGR colors/styles)
- ✅ Supports OSC 8 hyperlinks
- ✅ Respects Unicode display widths (full-width characters, emoji)
- ✅ Normalizes carriage return newline to newline

### Example Usage

```typescript
const text = '\x1b[31mThis is a long red text that needs wrapping\x1b[0m';
const wrapped = Bun.wrapAnsi(text, 20);
// Wraps at 20 columns, preserving the red color across line breaks
```

### Performance

`Bun.wrapAnsi` is **33–88x faster** than the `wrap-ansi` npm package:

| Benchmark               | npm      | Bun      | Speedup |
| ----------------------- | -------- | -------- | ------- |
| Short text (45 chars)   | 25.81 µs | 685 ns   | **37x** |
| Medium text (810 chars) | 568 µs   | 11.22 µs | **50x** |
| Long text (8100 chars)  | 7.66 ms  | 112 µs   | **68x** |
| Hard wrap colored       | 8.82 ms  | 174 µs   | **50x** |
| No trim long            | 8.32 ms  | 93.92 µs | **88x** |

### Demo

Run the demo script to see examples:

```bash
bun scripts/demo-wrap-ansi.ts [columns]
```

## CPU Profiling - Markdown Output

Bun's built-in CPU profiler now supports a `--cpu-prof-md` flag that generates profiling data in Markdown format, making
it easy to share profiles on GitHub or analyze them with LLMs.

### Usage

```bash
# Generate markdown profile only
bun --cpu-prof-md script.js

# Generate both Chrome DevTools JSON and markdown formats
bun --cpu-prof --cpu-prof-md script.js
```

### Markdown Output Includes

- Summary table with duration, sample count, and interval
- Hot functions ranked by self-time percentage
- Call tree showing total time including children
- Function details with caller/callee relationships
- File breakdown showing time spent per source file

### Scanner Project Scripts

The scanner project includes pre-configured profiling scripts:

```bash
# CPU profiling (Chrome DevTools format)
bun run profile:cpu

# CPU profiling (Markdown format)
bun run profile:cpu:md

# Both formats
bun run --cpu-prof --cpu-prof-md scan.ts --audit
```

## Heap Profiling

Bun now supports heap profiling via new CLI flags, making it easier to diagnose memory leaks and analyze memory usage.

### Usage

```bash
# Generate V8-compatible heap snapshot (opens in Chrome DevTools)
bun --heap-prof script.js

# Generate markdown heap profile (for CLI analysis)
bun --heap-prof-md script.js

# Specify output location
bun --heap-prof --heap-prof-dir ./profiles --heap-prof-name my-snapshot.heapsnapshot script.js
```

### Output Formats

#### Chrome DevTools Format (`.heapsnapshot`)

- Opens directly in Chrome DevTools Memory tab
- Visual analysis with interactive graphs
- Best for detailed memory leak investigation

#### Markdown Format (`.md`)

Optimized for command-line analysis:

```markdown
## Summary

| Metric          |    Value |
| --------------- | -------: |
| Total Heap Size | 208.2 KB |
| Total Objects   |     2651 |
| GC Roots        |      426 |

## Top 50 Types by Retained Size

| Rank | Type        | Count | Self Size | Retained Size |
| ---: | ----------- | ----: | --------: | ------------: |
|    1 | `Function`  |   568 |   18.7 KB |        5.4 MB |
|    2 | `Structure` |   247 |   27.0 KB |        2.0 MB |
```

### Scanner Project Scripts

```bash
# Heap profiling (Chrome DevTools format)
bun run profile:heap

# Heap profiling (Markdown format)
bun run profile:heap:md
```

### Markdown Analysis Commands

The markdown format includes searchable object listings:

```bash
# Find all Function objects
grep 'type=Function' profile.md

# Find objects >= 10KB
grep 'size=[0-9]\{5,\}' profile.md

# Find all GC roots
grep 'gcroot=1' profile.md
```

## Integration with Scanner Project

### Current Implementation

The scanner project already uses these features:

1. **Profiling Scripts** (`package.json`):
    - `profile:cpu` - CPU profiling with Chrome DevTools format
    - `profile:cpu:md` - CPU profiling with Markdown format
    - `profile:heap` - Heap profiling with Chrome DevTools format
    - `profile:heap:md` - Heap profiling with Markdown format

2. **CLI Renderers**:
    - Uses `Bun.color()` for ANSI colors
    - Uses `Bun.stripANSI()` for width calculations
    - Could benefit from `Bun.wrapAnsi()` for long colored text

### Potential Improvements

1. **Add `Bun.wrapAnsi()` to CLI renderers**:
    - Wrap long error messages
    - Format help text with colors preserved
    - Display wrapped table cells with ANSI codes

2. **Enhanced profiling workflows**:
    - Automatically generate both formats
    - Add profiling analysis scripts
    - Integrate with CI/CD for performance regression detection

## See Also

- [Bun Profiling Documentation](https://bun.com/docs/runtime/profiling)
- [Code Quality Automation](./CODE_QUALITY_AUTOMATION.md)
- [Custom ESLint Rules](./CUSTOM_ESLINT_RULES.md)
