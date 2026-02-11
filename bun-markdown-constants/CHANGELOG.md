# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-08

### Added
- Bun v1.3.7+ performance optimizations integration
- SIMD-accelerated Markdown rendering (3-15% faster)
- Cached HTML tag strings in React renderer (28% faster for small inputs)
- Comprehensive benchmark suite (`bun run benchmark`)
- Performance regression tests (8 tests)
- Interactive demo script (`bun run demo`)
- GitHub Actions CI workflow
- Coverage reporting support

### Verified
- String.replace rope optimization
- AbortSignal.abort() optimization (~6% faster without listeners)
- RegExp SIMD acceleration (~3.9x faster fixed-count parentheses)
- String.startsWith DFG/FTL intrinsic (1.42x - 5.76x faster)
- Set/Map.size DFG/FTL intrinsics (2.24x / 2.74x faster)
- String.trim direct pointer access (1.10x - 1.42x faster)
- Thai/Lao stringWidth correctness fix

## [1.0.0] - 2024-02-06

### Added
- Initial release
- Security presets (STRICT, MODERATE, DEVELOPER)
- Feature presets (GFM, CommonMark, DOCS, BLOG, TERMINAL, ACADEMIC)
- Domain-specific presets (REACT_APP, STATIC_SITE, API_DOCS, WIKI, EMAIL)
- HTML renderers (Tailwind, Bootstrap, Semantic)
- Terminal renderers (Color, Monochrome)
- Text renderers (Plain, Markdown output, Slack)
- React components (Tailwind Typography)
- Factory functions (MarkdownPresets.html, .react, .render)
- Caching utilities (memory cache, LRU cache)
- Validation and sanitization functions
- Benchmarking utilities
