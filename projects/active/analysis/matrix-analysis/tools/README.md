# Tools Directory

Production-ready utilities for Bun development, performance analysis, and system validation.

---

## Performance Tools

### Spawn Monitor (`spawn-monitor.ts`)

Validates and monitors `Bun.spawnSync()` performance across different platforms.

**Quick Start:**

```bash
bun run spawn:check      # System capabilities
bun run spawn:monitor    # Full benchmark (100 iterations)
bun run spawn:bench      # Extended (500 iterations)
```

**Features:**

- Detects close_range() support (Linux)
- Statistical analysis (min/max/mean/median/P95/P99)
- Platform-specific performance expectations
- Color-coded status indicators

**Docs:** `/docs/SPAWN-OPTIMIZATION.md`

---

### Password Hash (`password-hash.ts`)

Production-ready Argon2id password hashing with OWASP-recommended settings.

**Quick Start:**

```bash
bun run password:hash "my-password"        # Hash with production config
bun run password:verify "pw" "$argon2id$"  # Verify password
bun run password:benchmark                 # Benchmark on your hardware
```

**Configurations:**

- **production**: 64 MiB, t=3, p=4 (~70ms) - Recommended
- **highSecurity**: 128 MiB, t=4, p=4 (~190ms) - Financial/admin
- **balanced**: 32 MiB, t=2, p=2 (~20ms) - Moderate security
- **development**: 16 MiB, t=1, p=1 (~4ms) - Testing only

**Docs:** `/docs/PASSWORD-HASHING.md`

---

## ARM64 Tools

### Guardian (`arm64/guardian.ts`)

ARM64 optimization utilities and benchmarking.

```bash
bun run guardian
```

### Wrap Migrator (`arm64/wrap-migrator.ts`)

Automated migration tool for wrap-ansi patterns.

```bash
bun run migrate              # Full migration
bun run migrate:dry          # Dry run
bun run migrate:verbose      # Verbose output
```

### Benchmarker (`arm64/benchmark-arm64.ts`)

ARM64-specific performance benchmarks.

```bash
bun run benchmark            # Run benchmarks
bun run benchmark:output     # With output
```

### Verifier (`arm64/verify-arm64.ts`)

Binary ARM64 verification utility.

```bash
bun run verify:arm64         # Verify binaries
bun run verify:arm64:output  # With output
```

### Demo (`arm64/arm64-demo.ts`)

Interactive ARM64 feature demonstrations.

```bash
bun run demo
```

---

## Performance Monitoring Tools

### Col-89 Gate (`col89-gate.ts`)

Universal Col-89 compliance checker with CI/CD integration.

```bash
bun run col89:check README.md    # Check specific file
bun run col89:gate src/          # CI gate (fails on violations)
```

**Features:**

- File-agnostic validation
- ANSI escape code handling
- Exit code 1 on violations
- Detailed line-by-line reporting

### Hardware Benchmark (`hardware-benchmark.ts`)

CRC32 hardware acceleration throughput testing.

```bash
bun run hardware:benchmark
```

**Output:**

- MB/s throughput calculation
- 100 iterations for statistical significance
- Hardware acceleration validation

### SQLite Violations (`sqlite-violations.ts`)

Query Col-89 violation database for metrics.

```bash
bun run sqlite:violations
```

**Metrics:**

- Total violations
- Last hour statistics
- Daily violation tracking

### LightningCSS Optimizer (`lightningcss-optimizer.ts`)

CSS minification with detailed size analysis.

```bash
bun run css:optimize styles.css
```

**Features:**

- Size reduction reporting
- Compression ratio calculation
- Minified file output
- Graceful fallback without LightningCSS

### RSS Parser (`rss-parser.ts`)

RSS feed parsing with Bun.xml experimental support.

```bash
bun run rss:parse https://bun.sh/rss.xml
```

**Features:**

- Bun.xml.parse (v1.3.7+) with regex fallback
- Feed size and item analysis
- Method detection and reporting

### Performance Suite (`performance-suite.ts`)

Complete system health monitoring with scoring.

```bash
bun run performance:suite    # Full audit
bun run perf                 # Quick check
bun run audit:full           # Comprehensive report
```

**Health Score:**

- Col-89 compliance (0-20 points)
- Hardware performance (0-20 points)
- Violation metrics (0-20 points)
- CSS optimization (0-20 points)
- RSS functionality (0-20 points)

---

## Search Tools

### Bun Search (`bun-search.ts`)

NPM registry search CLI for Bun packages.

```bash
bun tools/bun-search.ts <query>
```

### Tension Status (`tension-status.ts`)

Status monitoring utility.

```bash
bun run tension:status
```

---

## Usage Examples

All tools include:

- ✅ Type-safe TypeScript
- ✅ Error handling
- ✅ Colorized output
- ✅ Performance monitoring
- ✅ Production-ready patterns

See `/examples/spawn-usage-examples.ts` for practical patterns:

- Safe spawn wrapper with validation
- Batch processing with concurrency
- Command whitelist security
- Performance monitoring class
- Retry with exponential backoff

---

## Documentation

- **Spawn Optimization Guide:** `/docs/SPAWN-OPTIMIZATION.md`
- **Work Summary:** `/docs/SPAWN-WORK-SUMMARY.md`
- **Main Docs:** `/docs/ROADMAP.md`
- **Agent Guide:** `/AGENTS.md`

---

## Adding New Tools

1. Create `tools/your-tool.ts` with shebang:

   ```typescript
   #!/usr/bin/env bun
   ```

2. Make executable:

   ```bash
   chmod +x tools/your-tool.ts
   ```

3. Add to `package.json` scripts:

   ```json
   {
     "your-tool": "bun tools/your-tool.ts"
   }
   ```

4. Document in this README

5. Add tests if applicable

---

*Keep tools focused, tested, and production-ready.*
