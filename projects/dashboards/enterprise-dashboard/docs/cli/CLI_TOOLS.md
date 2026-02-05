# CLI Tools Quick Reference

Three powerful command-line tools for code analysis, health monitoring, and quick actions.

## 🎯 Quick Start

```bash
# Code Analysis
bun run analyze scan src/ --depth=3

# Health Check
bun run diagnose health --quick

# Quick Actions
bun run ! h          # Health check
bun run ! pp          # Painpoints
bun run ! list        # List all actions
```

---

## 📊 `/analyze` - Code Analysis & Refactoring

Deep code structure analysis, type extraction, and intelligent refactoring.

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `scan` | Deep code structure analysis | `bun run analyze scan src/ --depth=3` |
| `types` | Extract TypeScript types/interfaces | `bun run analyze types --exported-only` |
| `classes` | Class hierarchy analysis | `bun run analyze classes --inheritance` |
| `strength` | Identify strong/weak components | `bun run analyze strength --by-complexity` |
| `deps` | Import/dependency analysis | `bun run analyze deps --circular` |

### Options

```bash
--depth=<n>         # Scan depth (default: 3)
--exported-only     # Only exported symbols
--inheritance       # Show inheritance tree
--by-complexity     # Sort by complexity
--circular          # Find circular dependencies
--format=json       # Output format (json|table|text)
```

### Examples

```bash
# Scan codebase structure
bun run analyze scan src/ --depth=2

# Extract all exported types
bun run analyze types --exported-only

# Analyze class hierarchies
bun run analyze classes --inheritance

# Find strongest/weakest files
bun run analyze strength --by-complexity

# Check for circular dependencies
bun run analyze deps --circular

# JSON output for scripting
bun run analyze types --format=json
```

---

## 🏥 `/diagnose` - Project Health & Painpoint Detection

Comprehensive project health analysis with feature flags and multiple visualizations.

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `health` | Overall project health analysis | `bun run diagnose health --quick` |
| `painpoints` | Find worst issues across projects | `bun run diagnose painpoints --top=5` |
| `grade` | Grading matrix with nanodecimal precision | `bun run diagnose grade` |
| `benchmark` | Performance benchmarking | `bun run diagnose benchmark` |

### Modes

```bash
--quick              # Fast analysis (git + basic stats)
--deep               # Full analysis (+ benchmarks + deps)
--top=<n>            # Top N painpoints (default: 10)
--critical-only      # Only show critical painpoints
```

### Output Formats

```bash
--format=box         # Unicode tables (default)
--format=table       # ASCII tables
--format=json        # Machine-readable
--format=markdown    # GitHub-flavored
```

### Scoring

**Overall = (Git x 25%) + (Code x 35%) + (Performance x 25%) + (Deps x 15%)**

| Grade | Score | Status |
|-------|-------|--------|
| A+ | 9.5-10.0 | Excellent |
| A | 9.0-9.5 | Great |
| B | 7.0-9.0 | Good |
| C | 5.0-7.0 | Needs work |
| D | 4.0-5.0 | Poor |
| F | < 4.0 | Critical |

### Examples

```bash
# Quick daily check
bun run diagnose health --quick

# Full analysis with all metrics
bun run diagnose health --deep

# Find top 5 painpoints
bun run diagnose painpoints --top=5

# Get detailed grade breakdown
bun run diagnose grade

# JSON output for CI/CD
bun run diagnose health --deep --format=json > report.json
```

---

## ⚡ `/!` - Quick Actions & Shortcuts

Execute common commands with short aliases and smart matching.

### Usage

```bash
bun run ! <action> [args...]
bun run ! list [category]
bun run ! help
```

### Available Actions

**Analysis:**
- `health` / `h` - Quick health check
- `painpoints` / `pp` - Show top painpoints
- `grade` / `g` - Get project grade
- `analyze` / `a` - Code analysis
- `types` / `t` - Extract TypeScript types

**Development:**
- `dev` / `d` - Start dev server
- `test` / `t` - Run tests
- `lint` / `l` - Run linter
- `format` / `f` - Format code
- `typecheck` / `tc` - Type check

**Git:**
- `git:status` / `gs` - Show git status
- `git:diff` / `gd` - Show git diff
- `git:log` / `gl` - Show recent commits

**KYC:**
- `kyc:metrics` / `km` - Show KYC metrics
- `kyc:queue` / `kq` - Process review queue

**Config:**
- `config:lint` / `cl` - Lint configuration
- `shortcuts` / `s` - Show keyboard shortcuts
- `topology` / `top` - Show route topology

### Examples

```bash
# Quick health check
bun run ! h

# Show painpoints
bun run ! pp

# List all actions
bun run ! list

# List by category
bun run ! list dev

# Run with additional args
bun run ! test --watch

# Start dev server
bun run ! dev
```

### Features

- ✅ **Smart Matching** - Partial matches work (e.g., `git` matches `git:status`)
- ✅ **Aliases** - Short aliases for faster typing
- ✅ **Suggestions** - Shows similar actions on error
- ✅ **Category Filtering** - List actions by category
- ✅ **Help System** - Built-in help command

---

## 📝 Configuration

### `.analyze.json`

```json
{
  "ignore": [
    "node_modules",
    "dist",
    ".git",
    "__tests__",
    "build",
    ".bun",
    "coverage",
    "*.config.ts",
    "*.d.ts",
    "scripts/__mocks__",
    "**/*.spec.ts.snap",
    ".vinxi",
    ".output"
  ],
  "thresholds": {
    "maxComplexity": 8,
    "minCoverage": 85,
    "maxFileLines": 400,
    "maxFileLinesWarning": 800,
    "maxFunctionLines": 50,
    "maxParameters": 4,
    "maxNestedCallbacks": 3,
    "minTypeCoverage": 95,
    "maxDuplicateLines": 5,
    "maxDependencyDepth": 3
  },
  "overrides": [
    {
      "pattern": "scripts/__tests__/**/*.ts",
      "thresholds": {
        "maxComplexity": 15,
        "maxFileLines": 2000,
        "minCoverage": 0
      }
    },
    {
      "pattern": "**/*.types.test.ts",
      "thresholds": {
        "maxFileLines": 3000,
        "minTypeCoverage": 100
      }
    },
    {
      "pattern": "**/v8-bindings/**/*",
      "thresholds": {
        "maxComplexity": 12,
        "maxParameters": 6,
        "allowUnsafe": true
      }
    }
  ],
  "bun": {
    "ignoreTestFilesInCoverage": true,
    "checkLockfileIntegrity": true,
    "verifyNativeAddons": true
  },
  "v8": {
    "maxArrayBufferSize": 1073741824,
    "warnOnSlowTypes": true,
    "checkExternalReferences": true
  }
}
```

**Configuration Options:**

**Ignore Patterns:**
- Standard build/test artifacts: `node_modules`, `dist`, `.git`, `__tests__`, `build`, `.bun`, `coverage`
- TypeScript artifacts: `*.config.ts`, `*.d.ts`
- Test artifacts: `scripts/__mocks__`, `**/*.spec.ts.snap`
- Framework-specific: `.vinxi`, `.output`

**Thresholds:**
- `maxComplexity`: Maximum cyclomatic complexity (default: 8, used in `strength` command)
- `minCoverage`: Minimum test coverage percentage (default: 85, reserved for future use)
- `maxFileLines`: Maximum file lines for full score (default: 400)
- `maxFileLinesWarning`: File lines threshold for warning score (default: 800)
- `maxFunctionLines`: Maximum lines per function (default: 50, reserved for future use)
- `maxParameters`: Maximum function parameters (default: 4, reserved for future use)
- `maxNestedCallbacks`: Maximum nested callback depth (default: 3, reserved for future use)
- `minTypeCoverage`: Minimum TypeScript type coverage (default: 95, reserved for future use)
- `maxDuplicateLines`: Maximum duplicate code lines (default: 5, reserved for future use)
- `maxDependencyDepth`: Maximum dependency import depth (default: 3, reserved for future use)

**Overrides:**
Pattern-based threshold overrides allow different rules for specific file patterns. Patterns support glob syntax (`**`, `*`). Last matching override wins.

**Bun-Specific:**
- `ignoreTestFilesInCoverage`: Exclude test files from coverage calculations
- `checkLockfileIntegrity`: Verify `bun.lockb` integrity
- `verifyNativeAddons`: Ensure V8 native bindings compile correctly

**V8-Specific:**
- `maxArrayBufferSize`: Maximum ArrayBuffer size in bytes (default: 1GB)
- `warnOnSlowTypes`: Warn on types that may cause V8 deoptimization
- `checkExternalReferences`: Ensure V8 external memory is properly tracked

### `.diagnose.json`

```json
{
  "ignore": ["node_modules", "dist", ".git"],
  "thresholds": {
    "maxComplexity": 10,
    "minCoverage": 80
  }
}
```

---

## 🔗 Related Tools

- `/analyze` - Deep code analysis
- `/diagnose` - Project health monitoring
- `/!` - Quick action shortcuts

---

## 💡 Tips

1. **Daily Workflow:**
   ```bash
   bun run ! h        # Quick health check
   bun run ! pp       # Check painpoints
   bun run ! test     # Run tests
   ```

2. **Before Committing:**
   ```bash
   bun run diagnose health --deep
   bun run analyze deps --circular
   ```

3. **CI/CD Integration:**
   ```bash
   bun run diagnose health --all --format=json > health-report.json
   bun run analyze types --exported-only --format=json > types.json
   ```

4. **Quick Actions:**
   - Use aliases for speed (`h` instead of `health`)
   - Partial matches work (`git` for `git:status`)
   - List by category for discovery (`list dev`)

---

**All tools are Bun-native with zero external dependencies!** 🚀