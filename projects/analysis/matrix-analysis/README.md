# Matrix Analysis

URLPattern performance analysis matrix with 197 columns. Built for Bun 1.3.6+.

## Features

- **URLPattern Analysis** - Compile-time caching with `Bun.peek()` for sync access
- **Performance Tiers** - Elite (>900K ops/s), Strong, Medium, Caution classifications
- **Security Scanning** - Path traversal, SSRF, XSS, SQL injection, credential exposure detection
- **DNS Prefetch** - Hardware-accelerated lookups with 150x faster cached resolution
- **Color Palette** - HSL-based tier visualization using `Bun.color()`

> **Development Roadmap**: See [ROADMAP.md](./docs/ROADMAP.md) for planned features and progress tracking.

## Quick Start

```bash
bun install
bun run matrix           # Run analysis
bun run matrix:audit     # Security audit mode
bun run matrix:benchmark # Performance benchmarks
bun run matrix:ci        # CI mode with threshold
```

## Default Patterns (15)

These patterns are analyzed when no custom input is provided:

| # | Pattern | Type | Params | RegExp | Host | Protocol | Segments | Wildcard | Alternation | Complexity | Use Case |
|---|---------|------|--------|--------|------|----------|----------|----------|-------------|------------|----------|
| 0 | `https://shop.example.com/items/:id` | named | `:id` | ❌ | `shop.example.com` | `https` | 3 | ❌ | ❌ | low | Product detail |
| 1 | `https://shop.example.com/items/(\\d+)` | regex | `0` | ✅ | `shop.example.com` | `https` | 3 | ❌ | ❌ | medium | Numeric ID |
| 2 | `https://shop.example.com/items/:id(\\d+)` | hybrid | `:id` | ✅ | `shop.example.com` | `https` | 3 | ❌ | ❌ | medium | Validated ID |
| 3 | `https://:subdomain.example.com/:path*` | wildcard | `:subdomain,:path` | ❌ | `:subdomain.example.com` | `https` | 1 | ✅ | ❌ | high | Multi-tenant |
| 4 | `/items/:id` | named | `:id` | ❌ | — | — | 2 | ❌ | ❌ | low | Simple route |
| 5 | `/items/:id/details` | named | `:id` | ❌ | — | — | 3 | ❌ | ❌ | low | Nested route |
| 6 | `https://shop.example.com/items/:id?*` | query | `:id` | ❌ | `shop.example.com` | `https` | 3 | ✅ | ❌ | medium | Query wildcard |
| 7 | `/api/v1/users/(\\w+)` | regex | `0` | ✅ | — | — | 4 | ❌ | ❌ | medium | Word chars |
| 8 | `/api/v1/users/:id` | named | `:id` | ❌ | — | — | 4 | ❌ | ❌ | low | API endpoint |
| 9 | `/files/*/:name.:ext` | multi | `:name,:ext` | ❌ | — | — | 3 | ✅ | ❌ | high | File path |
| 10 | `/blog/:year(\\d{4})/:month(\\d{2})` | regex | `:year,:month` | ✅ | — | — | 3 | ❌ | ❌ | medium | Date route |
| 11 | `/items/(\\d+)` | regex | `0` | ✅ | — | — | 2 | ❌ | ❌ | medium | Numeric only |
| 12 | `/:category/:id` | named | `:category,:id` | ❌ | — | — | 2 | ❌ | ❌ | low | Dynamic |
| 13 | `/:category/:id/:slug` | named | `:category,:id,:slug` | ❌ | — | — | 3 | ❌ | ❌ | low | SEO friendly |
| 14 | `/(items\|products)/:id` | alternation | `:id` | ✅ | — | — | 2 | ❌ | ✅ | medium | Multi-path |

### Pattern Features Coverage

| Feature | Count | Patterns | Complexity Impact | Security Impact | Cache Impact |
|---------|-------|----------|-------------------|-----------------|--------------|
| Named params (`:id`) | 12 | 0,2,3,4,5,6,8,9,10,12,13,14 | low | low | high |
| RegExp groups `(\\d+)` | 6 | 1,2,7,10,11,14 | medium | medium | medium |
| Wildcard `*` | 3 | 3,6,9 | high | high | low |
| Full URL | 4 | 0,1,2,3,6 | low | low | high |
| Pathname only | 11 | 4,5,7,8,9,10,11,12,13,14 | low | low | high |
| Alternation `(a\|b)` | 1 | 14 | medium | low | medium |
| Multi-segment | 6 | 3,5,8,10,13,14 | medium | low | medium |
| Query matching | 1 | 6 | medium | medium | low |

### Test URL

Default test URL: `https://shop.example.com/items/42?color=red&ref=abc`

## Analysis Columns (197 Total)

### URL Pattern Analysis (13 columns)

| idx | pattern | matches | groups | hasRegExpGroups | protocol | hostname | port | pathname | search | hash | testResult | execTime |
|-----|---------|---------|--------|-----------------|----------|----------|------|----------|--------|------|------------|----------|
| 0 | `/api/users/:id` | ✅ | `{id}` | ❌ | `https` | `example.com` | `443` | `/api/users/123` | `""` | `""` | `true` | `0.003ms` |
| 1 | `/blog/:year(\\d{4})/:slug` | ✅ | `{year,slug}` | ✅ | `https` | `example.com` | `443` | `/blog/2026/hello` | `""` | `""` | `true` | `0.002ms` |

### Performance Metrics (14 columns)

| idx | execTime | execNs | memDeltaKB | gcCount | patternComplexity | groupCount | segmentCount | charCount | specialChars | nestingDepth | avgSegmentLen | entropyScore | matchScore |
|-----|----------|--------|------------|---------|-------------------|------------|--------------|-----------|--------------|--------------|---------------|--------------|------------|
| 0 | `0.003ms` | `3,042ns` | `0.00KB` | 0 | 8 | 1 | 4 | 34 | 8 | 0 | 8.5 | 3.86 | 10 |
| 1 | `0.002ms` | `2,334ns` | `0.00KB` | 0 | 14 | 1 | 4 | 39 | 12 | 1 | 9.8 | 4.16 | 15 |

### Performance Deep Dive (7 columns)

| idx | testOpsPerSec | execOpsPerSec | cacheHitRate | deoptimizationRisk | inlineCacheStatus | jitTier |
|-----|---------------|---------------|--------------|--------------------|--------------------|---------|
| 0 | `1,032,706/s` | `593,620/s` | `100%` | low | mono | opt |
| 1 | `956,169/s` | `524,131/s` | `100%` | medium | mono | opt |

### Memory Layout (7 columns)

| idx | objectSize | propertyStorageSize | transitionChainLength | memoryAlignment | gcPressure | retainedSize |
|-----|------------|---------------------|----------------------|-----------------|------------|--------------|
| 0 | `260B` | `0B` | 1 | `8B` | med | `164B` |
| 1 | `398B` | `0B` | 1 | `8B` | med | `174B` |

### Security Analysis (19 columns)

| idx | secInjectionRisk | secPathTraversal | secOpenRedirect | secSsrfPotential | secRegexDoS | secWildcardDanger | secCredentialExposure | secBasicAuthInUrl | secPrivateDataLeak | secRiskScore | secRiskLevel | secSanitizationNeeded | secCspCompatible | secCorsImplication | secXssVector | secSqlInjection | secCommandInjection | secInputValidation |
|-----|------------------|------------------|-----------------|------------------|-------------|-------------------|-----------------------|-------------------|--------------------|--------------|--------------|-----------------------|------------------|--------------------|--------------|-----------------|--------------------|-------------------|
| 0 | low | ✅ | ✅ | ✅ | ✅ | none | ✅ | ✅ | ✅ | 0 | low | ❌ | ✅ | restrictive | ✅ | ✅ | ✅ | loose |
| 1 | low | ✅ | ✅ | ✅ | ✅ | none | ✅ | ✅ | ✅ | 0 | low | ❌ | ✅ | restrictive | ✅ | ✅ | ✅ | strict |

### Environment Variables (16 columns)

| idx | envNodeEnv | envBunEnv | envHasDebug | envHasVerbose | envPathSegments | envHomeSet | envShellType | envTermType | envLocale | envTZ | envCI | envPlatform | envArch | envVarCount | envVarRisk |
|-----|------------|-----------|-------------|---------------|-----------------|------------|--------------|-------------|-----------|-------|-------|-------------|---------|-------------|------------|
| 0 | `undefined` | `undefined` | ❌ | ❌ | 19 | ✅ | `zsh` | `xterm-ghostty` | `en_US.UTF-8` | `America/Chicago` | ❌ | `darwin` | `arm64` | 122 | medium |

### Encoding Analysis (15 columns)

| idx | encPercentEncoded | encInvalidPercent | encNonAscii | encNeedsPunycode | encUtf8Safe | encHasNullBytes | encHasControlChars | encDoubleEncoded | encMixedEncoding | encNormalizationForm | encByteLength | encCharLength | encEncodingRatio | encRecommendedEncoding |
|-----|-------------------|-------------------|-------------|------------------|-------------|-----------------|--------------------|-----------------|-----------------|-----------------------|---------------|---------------|------------------|------------------------|
| 0 | 0 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | NFC | 34 | 34 | 1.00 | utf-8 |

### Internationalization (13 columns)

| idx | i18nHasUnicode | i18nScriptTypes | i18nRtlChars | i18nEmojiCount | i18nZwjSequences | i18nCombiningMarks | i18nGraphemeCount | i18nDisplayWidth | i18nBidiLevel | i18nLocaleHint | i18nNormalized | i18nComplexity |
|-----|----------------|-----------------|--------------|----------------|------------------|--------------------|--------------------|------------------|---------------|----------------|----------------|----------------|
| 0 | ❌ | Latin | 0 | 0 | 0 | 0 | 34 | 34 | 0 | en | ✅ | low |

### Cache Analysis (13 columns)

| idx | cacheability | cacheSuggestedTTL | cacheKeyComplexity | cacheVaryFactors | cacheInvalidationRisk | cachePatternStability | cacheHitProbability | cacheMissImpact | cacheWarmupPriority | cacheEvictionRisk | cacheScore | cacheStrategy |
|-----|--------------|-------------------|--------------------|-----------------|-----------------------|-----------------------|---------------------|-----------------|---------------------|-------------------|------------|---------------|
| 0 | high | 3600s | low | none | low | stable | 95% | low | high | low | 92 | aggressive |

### Peek Cache (7 columns)

| idx | pattern | peekCacheHit | peekCompileTimeNs | peekCacheSize | peekSyncHitRate | peekCacheStatus |
|-----|---------|--------------|-------------------|---------------|-----------------|-----------------|
| 0 | `/api/users/:id` | SYNC | `64,792ns` | 15 | `100.0%` | fulfilled |
| 1 | `/blog/:year/:slug` | SYNC | `12,625ns` | 15 | `100.0%` | fulfilled |

### DNS Prefetch (10 columns)

| idx | pattern | dnsHostname | dnsAddress | dnsFamily | dnsLatencyMs | dnsCached | dnsPrefetchStatus | dnsCacheHits | dnsCacheMisses |
|-----|---------|-------------|------------|-----------|--------------|-----------|-------------------|--------------|----------------|
| 0 | `https://api.example.com/*` | `api.example.com` | `93.184.216.34` | 4 | `0.8ms` | ✅ | prefetched | 15 | 1 |

### Timezone Support (11 columns)

| idx | pattern | tzTimezone | tzAbbrev | tzUtcOffset | tzOffsetMinutes | tzIsDST | tzHasDST | tzLocalTime | tzIsoTime | tzEpochMs |
|-----|---------|------------|----------|-------------|-----------------|---------|----------|-------------|-----------|-----------|
| 0 | `/api/*` | `America/Chicago` | `CST` | `-06:00` | -360 | ❌ | ✅ | `23:44:02` | `2026-01-23T05:44:02.485Z` | `1769239442485` |

### Color Palette (8 columns)

| idx | pattern | colorSwatch | colorTier | colorHsl | colorHex | colorRgb | colorCssVar |
|-----|---------|-------------|-----------|----------|----------|----------|-------------|
| 0 | `/items/:id` | ■ | elite | `hsl(160, 85%, 52%)` | `#28af60` | `rgb(40, 175, 96)` | `--route-elite-0` |
| 1 | `/api/v1/users/:id` | ■ | strong | `hsl(180, 75%, 45%)` | `#1db3b3` | `rgb(29, 179, 179)` | `--route-strong-1` |

### Error Handling (11 columns)

| idx | errParseError | errRuntimeError | errEdgeCases | errNullHandling | errBoundaryConditions | errRecoverable | errFailureMode | errLoggingLevel | errMonitoringHint | errPotential |
|-----|---------------|-----------------|--------------|-----------------|----------------------|----------------|----------------|-----------------|-------------------|--------------|
| 0 | none | unlikely | none | optional | ok | full | hard-fail | info | metric | 0 |
| 1 | none | possible | empty-match | optional | ok | partial | soft-fail | info | metric | 2 |

### Type Introspection (11 columns)

| idx | typeofPattern | typeofResult | instanceOfURL | constructorName | prototypeChain | isCallable | isIterable | symbolToString | jsonStringify | typeTag |
|-----|---------------|--------------|---------------|-----------------|----------------|------------|------------|----------------|---------------|---------|
| 0 | object | object | ❌ | URLPattern | URLPattern→Object | ❌ | ❌ | `[object URLPattern]` | `{}` | URLPattern |

### Web Standards (6 columns)

| idx | specCompliance | wptTestsEstimate | browserCompatibility | regexFeaturesUsed | canonicalPattern | specVersion |
|-----|----------------|------------------|----------------------|-------------------|------------------|-------------|
| 0 | full | 47 | Chrome,Safari,Firefox | named-groups | `/api/users/:id` | 2024-01 |

### Extra Utilities (28 columns)

| idx | uuidv7 | uuidv7Timestamp | fib | isPrime | memoryMB | patternHash | calcBinary | calcHex | calcSquare | calcCube | calcFactorial | calcReverse | calcDigitSum | calcDigitProduct | timestamp | randomInt | randomFloat | randomBool | generatedIP | generatedEmail | generatedPhone | processId | processUptime | bunVersion | bunPath | isMainEntry | memoryRSS |
|-----|--------|-----------------|-----|---------|----------|-------------|------------|---------|------------|----------|---------------|-------------|--------------|------------------|-----------|-----------|-------------|------------|-------------|----------------|----------------|-----------|---------------|------------|---------|-------------|-----------|
| 0 | `019be2f0-...` | `1769239442485` | 0 | ❌ | 45.2 | `a1b2c3d4` | `0` | `0x0` | 0 | 0 | 1 | `0` | 0 | 0 | `2026-01-23T05:44:02Z` | 42 | 0.73 | ✅ | `192.168.1.42` | `user0@test.com` | `555-0100` | 12345 | 1.23s | `1.3.6` | `/opt/bun` | ✅ | 89.4MB |

## Performance Tiers

| Tier | Ops/sec | Hue Range | RGB Example | Description | Deopt Risk | JIT Status |
|------|---------|-----------|-------------|-------------|------------|------------|
| Elite | >900K | 150-170° | `rgb(40, 175, 96)` | Simple matched patterns | low | optimized |
| Strong | 700-900K | 180-200° | `rgb(29, 179, 179)` | Fast exit patterns | low | optimized |
| Medium | 500-700K | 25-45° | `rgb(238, 179, 43)` | RegExp patterns | medium | optimized |
| Caution | <500K | 260-300° | `rgb(138, 92, 191)` | Wildcards, complex | high | baseline |

## Scripts

| Command | Description | Columns | Focus |
|---------|-------------|---------|-------|
| `bun run matrix` | Full 197-column analysis | 197 | All metrics |
| `bun run matrix:audit` | Security + env audit | 44 | Security, errors, env |
| `bun run matrix:benchmark` | Performance deep dive | 32 | Perf, memory, peek cache |
| `bun run matrix:fix` | Auto-fix issues | — | Remediation |
| `bun run matrix:ci` | CI threshold check | — | Pass/fail gates |
| `bun run test` | Test suite | — | 322 tests, 784 expects |
| `bun run typecheck` | TypeScript validation | — | Type safety |

## Bun APIs Used

| API | Category | Purpose | Performance |
|-----|----------|---------|-------------|
| `Bun.peek()` | Async | Sync promise inspection | 0-copy |
| `Bun.color()` | Utility | HSL/RGB/Hex conversion | Native |
| `Bun.hash.crc32()` | Crypto | Hardware-accelerated hash | ~9 GB/s |
| `Bun.dns.prefetch()` | Network | DNS cache warming | 150x faster |
| `Bun.nanoseconds()` | Timing | High-resolution clock | Native |
| `Bun.inspect.table()` | Output | Terminal table rendering | SIMD |
| `Bun.stringWidth()` | Unicode | Display width calculation | Grapheme-aware |
| `Bun.deepEquals()` | Comparison | Deep equality check | Native |
| `Bun.randomUUIDv7()` | Identity | Time-sortable UUIDs | Native |
| `URLPattern` | Routing | Route matching + RegExp | JIT compiled |

## Requirements

- Bun >= 1.3.6
- TypeScript 5.7+

## License

MIT
