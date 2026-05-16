# @bun-tools/markdown-constants

Enterprise-grade markdown constants and presets for Bun's built-in Markdown parser. Optimized for **Bun v1.3.7+** with SIMD acceleration and comprehensive performance improvements.

## Features

- 🔒 **Security Presets** - STRICT, MODERATE, DEVELOPER for different trust levels
- ⚡ **Feature Presets** - GFM, CommonMark, Docs, Blog, Terminal, Academic
- 🎯 **Domain-Specific** - React Apps, Static Sites, API Docs, Wikis, Email
- 🎨 **Renderer Templates** - Tailwind, Bootstrap, Semantic HTML
- ⚛️ **React Components** - Tailwind Typography, Chakra UI, MUI
- 🏭 **Factory Functions** - Easy renderer creation with caching
- ✅ **Input Validation** - Security and performance protections
- 🚀 **Production Ready** - Type-safe with comprehensive error handling
- 📊 **Performance Verified** - Benchmarks and regression tests included

## Bun v1.3.7+ Performance Optimizations

This package is fully optimized for Bun v1.3.7+ and leverages these performance improvements:

| Feature | Improvement | Description |
|---------|-------------|-------------|
| **SIMD Markdown Rendering** | 3-15% faster | SIMD-accelerated HTML escaping for `&`, `<`, `>`, `"` |
| **Cached React Tags** | 28% (small inputs) | Avoids repeated string allocations for common HTML tags |
| **String.replace Ropes** | Reduced allocations | Lazy concatenation instead of eager copying |
| **AbortSignal.abort()** | ~6% faster | Skips Event creation when no listeners |
| **RegExp SIMD** | ~3.9x faster | 16-byte SIMD prefix search, fixed-count JIT |
| **String.startsWith** | 1.42x - 5.76x | DFG/FTL intrinsic with constant folding |
| **Set/Map.size** | 2.24x / 2.74x | Eliminates generic getter call overhead |
| **String.trim** | 1.10x - 1.42x | Direct pointer access via span8/span16 |
| **Thai/Lao stringWidth** | Fixed | Correct width for spacing vowels |

## Installation

```bash
# For development (using bun link)
cd bun-markdown-constants
bun link
cd ../your-project
bun link @bun-tools/markdown-constants

# For production (when published)
bun add @bun-tools/markdown-constants
```

## Quick Start

```typescript
import { MarkdownPresets, MARKDOWN_SECURITY, MARKDOWN_FEATURES } from '@bun-tools/markdown-constants';

// Safe HTML for user content (uses SIMD-accelerated rendering)
const renderUserContent = MarkdownPresets.html('BLOG', 'STRICT');
const html = renderUserContent('# Hello\n\n**Bold** text');

// React component with Tailwind (uses cached tag strings)
const MarkdownComponent = ({ content }) => 
  MarkdownPresets.react('TAILWIND_TYPOGRAPHY')(content);

// CLI output
const renderForTerminal = MarkdownPresets.render('COLOR', MARKDOWN_FEATURES.TERMINAL);
```

## Scripts

```bash
# Run all tests
bun test

# Run performance benchmarks
bun run benchmark

# Run interactive demo
bun run demo

# Run verification suite
bun run verify

# Run performance regression tests
bun test test/regression.test.ts
```

## Testing & Benchmarks

### Unit Tests
```bash
bun test
# 15 tests pass - covers all Bun v1.3.7 optimizations
```

### Performance Benchmarks
```bash
bun run benchmark
```

Sample output:
```
📊 Bun.markdown.html() - SIMD Accelerated
  small (121 chars): 411.21K ops/sec
  medium (~500 chars): 220.41K ops/sec
  large (~15KB): 30.80K ops/sec

📊 String.startsWith - DFG/FTL Intrinsic
  runtime startsWith: 503.89M ops/sec
  constant fold startsWith: 422.20M ops/sec
```

### Interactive Demo
```bash
bun run demo
```

Shows live demonstrations of all Bun v1.3.7 optimizations with performance metrics.

### Performance Regression Tests
```bash
bun test test/regression.test.ts
```

Ensures performance doesn't degrade below expected thresholds:
- Markdown rendering: >20K ops/sec
- String.startsWith: <10ns/op
- Set/Map.size: <20ns/op
- RegExp fixed-count: >50M ops/sec

## Project Structure

```
bun-markdown-constants/
├── src/
│   └── index.ts              # Main exports (MarkdownPresets, constants)
├── test/
│   ├── bun-137-features.test.ts   # Bun v1.3.7 feature verification (15 tests)
│   ├── regression.test.ts         # Performance regression tests
│   └── verify.ts                  # Standalone verification script
├── benchmark/
│   └── performance.bench.ts       # Comprehensive benchmarks
├── demo/
│   └── demo.ts                    # Interactive demo
├── BUN_137_INTEGRATION.md    # Detailed integration documentation
└── package.json
```

## API Reference

### MarkdownPresets

Factory functions for creating optimized markdown renderers:

```typescript
// HTML renderer with SIMD-accelerated escaping
const renderHtml = MarkdownPresets.html('GFM', 'MODERATE');

// React renderer with cached tag strings
const renderReact = MarkdownPresets.react('TAILWIND_TYPOGRAPHY');

// Custom renderer
const renderCustom = MarkdownPresets.render('TAILWIND', MARKDOWN_FEATURES.DOCS);
```

### Constants

```typescript
// Security presets
MARKDOWN_SECURITY.STRICT    // Maximum security for untrusted content
MARKDOWN_SECURITY.MODERATE  // Balanced security
MARKDOWN_SECURITY.DEVELOPER // Internal/trusted content

// Feature presets
MARKDOWN_FEATURES.GFM        // GitHub Flavored Markdown
MARKDOWN_FEATURES.COMMONMARK // CommonMark standard
MARKDOWN_FEATURES.DOCS       // Documentation sites
MARKDOWN_FEATURES.BLOG       // Blog/CMS content
MARKDOWN_FEATURES.TERMINAL   // CLI output
```

See [BUN_137_INTEGRATION.md](./BUN_137_INTEGRATION.md) for detailed API documentation.

## Verification Results

All Bun v1.3.7 features verified with **Bun v1.3.10**:

```
✅ SIMD-Accelerated Markdown Rendering
✅ Cached HTML Tags in React Renderer
✅ String.prototype.replace Rope Optimization
✅ AbortSignal.abort() Optimization
✅ RegExp SIMD Acceleration
✅ String.startsWith DFG/FTL Intrinsic
✅ Set/Map.size DFG/FTL Intrinsics
✅ String.trim Direct Pointer Access
✅ Thai/Lao stringWidth Fix
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run benchmarks
bun run benchmark

# Run demo
bun run demo

# Build for production
bun run build
```

## Requirements

- **Bun v1.3.7+** (required for performance optimizations)
- TypeScript 5.0+
- React 18+ (optional, for React components)

## License

MIT

## References

- [Bun Documentation](https://bun.sh/docs)
- [Bun v1.3.7 Release Notes](https://bun.sh/blog)
- [JavaScriptCore DFG/FTL JIT](https://trac.webkit.org/wiki/JavaScriptCore)
