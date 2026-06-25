# /analyze - Code Analysis & Refactoring

Pure Bun code analysis, type extraction, and intelligent refactoring with Bun-native APIs.

## Quick Reference

### 🔍 Structure Analysis
| Command | Flag | Description |
|---------|------|-------------|
| `/analyze scan src/` | | Deep code structure |
| `/analyze scan` | `--depth=5` | Limit recursion depth |
| `/analyze scan` | `--metrics` | Include complexity metrics |
| `/analyze scan` | `--format=json` | Export to JSON |

### 📐 Type Extraction
| Command | Flag | Description |
|---------|------|-------------|
| `/analyze types` | | All types/interfaces |
| `/analyze types` | `--exported-only` | Public API only |
| `/analyze types` | `--with-jsdoc` | Include documentation |
| `/analyze types` | `--format=tree` | Tree visualization |

### 🏗️ Class Analysis
| Command | Flag | Description |
|---------|------|-------------|
| `/analyze classes` | | Class hierarchy |
| `/analyze classes` | `--inheritance` | Inheritance tree |
| `/analyze classes` | `--mixins` | Mixin detection |
| `/analyze classes` | `--format=dot` | Graphviz output |

### ✏️ Symbol Operations
| Command | Args | Description |
|---------|------|-------------|
| `/analyze rename` | `Old New` | Rename symbol |
| `/analyze rename` | `--auto --dry-run` | Preview auto-renames |
| `/analyze deps` | `--circular` | Find circular imports |

### 📊 Code Quality
| Command | Flag | Description |
|---------|------|-------------|
| `/analyze strength` | | Component strength scores |
| `/analyze polish` | | Check naming, imports, types |
| `/analyze complexity` | `--threshold=10` | Flag high complexity |
| `/analyze complexity` | `--depth=2` | Filter by directory depth |

### 🎛️ Operation Modes
| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes only (rename default) |

### 📤 Output Formats
| Flag | Output | Best For |
|------|--------|----------|
| `--format=table` | `Bun.inspect.table()` | Terminal |
| `--format=json` | JSON | Pipelines |
| `--format=tree` | ASCII tree | Hierarchy |
| `--format=dot` | Graphviz DOT | Diagrams |

### ⚡ Quick Combos
```bash
/analyze scan src/ --metrics --format=json > analysis.json
/analyze types --exported-only --with-jsdoc
/analyze rename src/ oldName newName  # Safe preview (dry-run default)
/analyze complexity src/ --threshold=10 --depth=2
```

## Commands

| Command | Description | Bun APIs Used |
|---------|-------------|---------------|
| `scan` | Deep code structure analysis | `Bun.Glob`, `Bun.file` |
| `types` | Extract TypeScript types/interfaces | `Bun.Transpiler` |
| `classes` | Class hierarchy analysis | `Bun.file().text()` |
| `rename` | Intelligent symbol renaming | `Bun.file`, `Bun.write` |
| `polish` | Code enhancement and fixes | `Bun.Transpiler` |
| `strength` | Identify strong/weak components | `Bun.nanoseconds` |
| `deps` | Import/dependency analysis | `Bun.Glob`, `import.meta` |
| `complexity` | Cyclomatic complexity report | `Bun.file().text()` |

## Feature Flags

```bash
# Output control
--format=json     # JSON output
--format=table    # Bun.inspect.table() output
--format=tree     # Tree visualization
--format=dot      # DOT for Graphviz (classes command)

# Filtering
--limit=20        # Max results shown
--depth=<n>       # Filter files by directory depth
--threshold=<n>   # Filter by minimum value (e.g., complexity)

# Operation modes
--dry-run         # Preview changes (rename default)
--no-dry-run      # Apply rename changes
```

## Output Formats

```bash
--format=table    # Bun.inspect.table() (default)
--format=json     # Machine-readable JSON
--format=tree     # ASCII tree structure
--format=dot      # Graphviz DOT format
--format=markdown # GitHub-flavored markdown
```

## Workflow Examples

### Deep Scan with Metrics

```bash
/analyze scan src/ --depth=5 --metrics --format=table
```

Output using `Bun.inspect.table()`:
```
┌───┬─────────────────────────┬───────┬────────────┬───────────┬──────────┐
│   │ File                    │ Lines │ Complexity │ Functions │ Classes  │
├───┼─────────────────────────┼───────┼────────────┼───────────┼──────────┤
│ 0 │ src/server/index.ts     │   245 │          8 │        12 │        2 │
│ 1 │ src/api/routes.ts       │   189 │         15 │        23 │        0 │
│ 2 │ src/utils/parser.ts     │   412 │         32 │        18 │        1 │
│ 3 │ src/legacy/handler.ts   │   523 │         47 │        31 │        3 │
└───┴─────────────────────────┴───────┴────────────┴───────────┴──────────┘
```

### Type Extraction

```bash
/analyze types --exported-only --with-jsdoc
```

Output:
```
📦 Exported Types (23)

Interfaces:
  IUserService        src/api/user.ts:15
    /** User management service */

  APIResponse<T>      src/api/response.ts:12
    /** Generic API response wrapper */

Type Aliases:
  UserID = string     src/types/user.ts:3
  RequestHandler      src/types/http.ts:8

Enums:
  LogLevel            src/logger/types.ts:5
    DEBUG, INFO, WARN, ERROR
```

### Class Hierarchy

```bash
/analyze classes --inheritance --format=tree
```

Output:
```
📊 Class Hierarchy

BaseService
├── UserService
│   └── AdminUserService
├── AuthService
│   ├── JWTAuthService
│   └── OAuth2Service
└── CacheService
    └── RedisCacheService

Standalone:
  Logger (no inheritance)
  ConfigManager (no inheritance)
```

### Circular Dependency Detection

```bash
/analyze deps --circular
```

Output:
```
🔄 Circular Dependencies Found (2)

1. src/api/user.ts
   → src/services/auth.ts
   → src/api/user.ts

   Suggestion: Extract shared types to src/types/

2. src/utils/parser.ts
   → src/utils/validator.ts
   → src/utils/parser.ts

   Suggestion: Use dependency injection
```

### Component Strength Analysis

```bash
/analyze strength
```

Output:
```
💪 Component Strength Analysis

Strongest:
┌───┬─────────────────────┬───────┬────────────┬───────────────────────┐
│   │ Component           │ Score │ Complexity │ Reason                │
├───┼─────────────────────┼───────┼────────────┼───────────────────────┤
│ 0 │ urlpattern-spy.ts   │  9.2  │          3 │ Low complexity, typed │
│ 1 │ cookie-middleware   │  8.8  │          5 │ Well-tested, focused  │
│ 2 │ router.ts           │  8.5  │          7 │ Clean API, documented │
└───┴─────────────────────┴───────┴────────────┴───────────────────────┘

Weakest:
┌───┬─────────────────────┬───────┬────────────┬───────────────────────┐
│   │ Component           │ Score │ Complexity │ Reason                │
├───┼─────────────────────┼───────┼────────────┼───────────────────────┤
│ 0 │ legacy-parser.ts    │  4.1  │         47 │ High complexity       │
│ 1 │ data-transformer    │  5.2  │         28 │ Circular deps, no test│
│ 2 │ old-handler.ts      │  5.8  │         22 │ Mixed concerns        │
└───┴─────────────────────┴───────┴────────────┴───────────────────────┘
```

### Intelligent Rename

```bash
/analyze rename getUserById fetchUserById --dry-run
```

Output:
```
🔄 Rename Preview: getUserById → fetchUserById

Files affected (5):
  src/api/user.ts:23       - function definition
  src/api/user.ts:45       - internal call
  src/services/admin.ts:12 - import
  src/services/admin.ts:34 - call site
  test/user.test.ts:18     - test call

Symbol references: 8 total
Type safety: ✅ All references typed

Run without --dry-run to apply changes
```

### Code Polish (Report)

```bash
/analyze polish src/
```

Output:
```
✨ Code Polish Report

┌───┬──────────────────┬───────┐
│   │ Metric           │ Value │
├───┼──────────────────┼───────┤
│ 0 │ Files scanned    │    12 │
│ 1 │ Total issues     │     8 │
│ 2 │ Naming issues    │     3 │
│ 3 │ Unused imports   │     3 │
│ 4 │ Missing types    │     2 │
└───┴──────────────────┴───────┘

Note: --auto-apply planned for v1.4
```

## Naming Rules

| Element | Style | Example | Regex Pattern |
|---------|-------|---------|---------------|
| Classes | PascalCase | `UserService` | `^[A-Z][a-zA-Z0-9]*$` |
| Interfaces | IPascalCase | `IUserService` | `^I[A-Z][a-zA-Z0-9]*$` |
| Functions | camelCase | `getUserById` | `^[a-z][a-zA-Z0-9]*$` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` | `^[A-Z][A-Z0-9_]*$` |
| Types | PascalCase | `UserProfile` | `^[A-Z][a-zA-Z0-9]*$` |
| Private | _camelCase | `_internalState` | `^_[a-z][a-zA-Z0-9]*$` |

## Complexity Thresholds

| Level | Complexity | Action | Auto-fix |
|-------|------------|--------|----------|
| Low | 1-5 | None | - |
| Medium | 6-10 | Monitor | - |
| High | 11-20 | Refactor soon | Partial |
| Critical | 21+ | Immediate refactor | No |

## Bun-Native Integrations

### Using Bun.Transpiler for AST

```typescript
const transpiler = new Bun.Transpiler({
  loader: "tsx",
  target: "bun",
});

// Scan imports
const imports = transpiler.scanImports(code);
// [{ path: "./utils", kind: "import-statement" }, ...]

// Transform code
const transformed = transpiler.transformSync(code);
```

### Using Bun.Glob for File Discovery

```typescript
const glob = new Bun.Glob("**/*.{ts,tsx}");

for await (const file of glob.scan({ cwd: "src" })) {
  const content = await Bun.file(`src/${file}`).text();
  // Analyze content...
}
```

### Using Core Logger

```typescript
import { log } from "@dev-hq/core";

log.info("Analysis started", { files: fileCount });
log.warn("High complexity", { file, complexity });
log.error("Parse error", { file, error });
```

### Performance Timing

```typescript
const start = Bun.nanoseconds();
await analyzeFile(file);
const elapsed = (Bun.nanoseconds() - start) / 1_000_000;
log.debug("Analysis complete", { file, ms: elapsed.toFixed(2) });
```

## Configuration

### .analyze.json

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "thresholds": {
    "maxComplexity": 10,
    "maxFileLines": 500,
    "maxFunctionLines": 50,
    "maxParameters": 5
  },
  "naming": {
    "enforceInterfacePrefix": true,
    "enforcePrivateUnderscore": false
  },
  "polish": {
    "removeUnusedImports": true,
    "sortImports": true,
    "addTypeAnnotations": true
  },
  "output": {
    "format": "table",
    "colors": true
  }
}
```

### bunfig.toml Integration

```toml
[analyze]
# Analysis settings
maxComplexity = 10
maxFileLines = 500

# Naming conventions
enforceNaming = true
namingStyle = "camelCase"

# Auto-fix settings
autoPolish = false
backupFiles = true
```

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `/diagnose` | Complexity feeds into health score |
| `/pm` | Dependency analysis for unused packages |
| `/projects` | Multi-project code quality dashboard |

## Related Commands

```bash
/diagnose health       # Overall project health
/diagnose painpoints   # Find worst issues
/pm why <package>      # Why is package installed
/projects matrix       # Multi-project dashboard
```

## CLI Options Reference

```bash
# Global options
--format, -f <fmt>    # Output format: table, json, tree, dot
--limit, -l <n>       # Limit number of results (default: 20)
--depth=<n>           # Filter files by directory depth
--threshold=<n>       # Filter results by minimum value
--help, -h            # Show help for a command

# Type options
--kind, -k <kind>     # Filter: interface, type, enum, class

# Report options
--report, -r          # Generate HTML dashboard
--export-markdown     # Export Markdown report
--export-csv          # Export CSV report
--output, -o <path>   # Custom output path

# Rename options
--dry-run             # Preview only (default: on)
--no-dry-run          # Apply changes

# Polish (v1.3: report-only)
# --auto-apply        # Planned for v1.4
```
