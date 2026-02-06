---
name: analyze
description: "Code analysis and refactoring patterns. Use when exploring codebases, searching for patterns, or reading large files efficiently."
user-invocable: true

version: 1.3.0

profile:
  title: "Code Analysis & Refactoring"
  level: "Expert"

expertise:
  code_exploration:
    proficiency: 95
    specialties:
      - "Efficient file reading patterns"
      - "Pattern-based code search"
      - "Codebase navigation"

  refactoring:
    proficiency: 90
    areas:
      - "Performance optimization"
      - "Code structure analysis"
      - "Dependency tracking"

metrics:
  patterns_covered: 12
  examples_included: 24
  cli_commands: 11
---

# Code Analysis & Refactoring

Patterns for efficiently exploring codebases and reading files without hitting token limits.

---

## CLI Commands

Run code analysis from the command line:

```bash
bun ~/.claude/core/analysis/cli.ts <command> [path] [options]
```

### Quick Reference

| Command | Path | Default | Formats | Key Options |
| ------- | ---- | ------- | ------- | ----------- |
| `complexity [path]` | optional | `.` | table json | `-l 20` `-r` `--export-markdown` `--export-csv` `-o` |
| `types [path]` | optional | `.` | table json tree | `-k <kind>` `-l 50` |
| `deps [path]` | optional | `.` | table json | `-r` `--export-markdown` `--export-csv` `-o` |
| `classes [path]` | optional | `.` | tree table dot | |
| `strength [path]` | optional | `.` | table json | `-r` `--export-markdown` `--export-csv` `-o` |
| `rename <path> <old> <new>` | **required** | — | — | `--no-dry-run` (default: dry-run) |
| `polish [path]` | optional | `.` | — | report-only (auto-apply v1.4) |
| `scan <file>` | **required** | — | — | |
| `ddd <file> [ctx] [root]` | **required** | — | — | ctx=`AccountManagement` root=`AccountAgent` |
| `benchmark` | none | — | — | |
| `validate <profile>` | **required** | — | — | |

### Global Options

| Flag | Short | Default | Description |
| ---- | ----- | ------- | ----------- |
| `--format` | `-f` | `table` | Output format: `table`, `json`, `tree` |
| `--limit` | `-l` | `20` | Max results shown (types default: `50`) |
| `--kind` | `-k` | all | Filter types: `interface`, `type`, `enum`, `class` |
| `--report` | `-r` | off | Generate HTML dashboard |
| `--export-markdown` | — | off | Export Markdown report |
| `--export-csv` | — | off | Export CSV report |
| `--output` | `-o` | auto | Custom output path for reports |
| `--depth` | — | — | Filter files by directory depth |
| `--threshold` | — | — | Filter results by minimum value |
| `--help` | `-h` | — | Show help for a command |

### Command Details

**`complexity`** — Cyclomatic complexity analysis. Supports all report exports (`-r`, `--export-markdown`, `--export-csv`).

```bash
bun ~/.claude/core/analysis/cli.ts complexity src/
bun ~/.claude/core/analysis/cli.ts complexity . --limit 50
bun ~/.claude/core/analysis/cli.ts complexity src/ -f json
bun ~/.claude/core/analysis/cli.ts complexity src/ -r -o report.html
```

**`types`** — TypeScript type extraction. Filter with `-k` (kind), display as tree with `-f tree`.

```bash
bun ~/.claude/core/analysis/cli.ts types src/
bun ~/.claude/core/analysis/cli.ts types . -k interface
bun ~/.claude/core/analysis/cli.ts types src/ -f tree
```

**`deps`** — Dependency graph and cycle detection. Supports all report exports.

```bash
bun ~/.claude/core/analysis/cli.ts deps src/
bun ~/.claude/core/analysis/cli.ts deps . -f json
bun ~/.claude/core/analysis/cli.ts deps src/ -r
```

**`classes`** — Class inheritance hierarchy. Outputs: ASCII tree (default), table, or DOT (Graphviz).

- **Detects**: extends, implements, methods, properties
- **Metrics**: Total classes, abstract classes, max depth, avg methods

```bash
bun ~/.claude/core/analysis/cli.ts classes src/
bun ~/.claude/core/analysis/cli.ts classes . -f table
bun ~/.claude/core/analysis/cli.ts classes src/ -f dot | dot -Tpng -o classes.png
```

**`strength`** — Code quality scoring (A-F grade). Supports all report exports. Exits code 1 if grade is F (CI-friendly).

- **Complexity** (30%) — Cyclomatic complexity of functions
- **Test Coverage** (25%) — Ratio of test files to source files
- **Documentation** (20%) — Files with JSDoc comments
- **Dependencies** (25%) — Cycles, orphans, avg dependencies

```bash
bun ~/.claude/core/analysis/cli.ts strength src/
bun ~/.claude/core/analysis/cli.ts strength . -f json
bun ~/.claude/core/analysis/cli.ts strength src/ -r --export-markdown
```

**`rename`** — Symbol renaming across files. Dry-run by default for safety.

```bash
bun ~/.claude/core/analysis/cli.ts rename src/ getUserById fetchUserById
bun ~/.claude/core/analysis/cli.ts rename src/ oldName newName --no-dry-run
```

**`polish`** — Code quality checker: naming conventions, unused imports, missing type annotations. Report-only in v1.3 (`--auto-apply` planned for v1.4).

```bash
bun ~/.claude/core/analysis/cli.ts polish src/
bun ~/.claude/core/analysis/cli.ts polish .
```

**`scan`** — Variable naming conflict detection within scopes (requires file path).

```bash
bun ~/.claude/core/analysis/cli.ts scan src/models/ResourceBundle.ts
```

**`ddd`** — DDD-aware semantic analysis. Positional args: `<file> [context] [root]`.

```bash
bun ~/.claude/core/analysis/cli.ts ddd src/models/ResourceBundle.ts ResourceManagement ResourceBundle
```

**`validate`** — Phone profile JSON validation (requires profile path).

```bash
bun ~/.claude/core/analysis/cli.ts validate profiles/device-a.json
```

---

## Large File Reading Strategy

**Rule:** Use `Grep` with context parameters for files >4000 tokens. Only use `Read` with offset/limit for sequential scanning.

### Pattern 1: Find Specific Functions

**When to use**: Looking for function definitions or implementations

```typescript
// Find async functions with 10 lines of context
Grep({
  pattern: "async function benchmark",
  path: "benchmarks/perf.ts",
  output_mode: "content",
  "-B": 2,   // 2 lines before
  "-A": 10   // 10 lines after
})

// Find class methods
Grep({
  pattern: "^  (async )?\\w+\\(",
  path: "src/service.ts",
  output_mode: "content",
  "-A": 5
})
```

---

### Pattern 2: Find Test Blocks

**When to use**: Understanding test structure or finding specific tests

```typescript
// All describe/it blocks
Grep({
  pattern: "it\\(|describe\\(",
  path: "tests/",
  output_mode: "content",
  "-A": 3
})

// Specific test by name
Grep({
  pattern: "it\\(.*should validate",
  path: "tests/",
  output_mode: "content",
  "-A": 15
})
```

---

### Pattern 3: Find Class Definitions

**When to use**: Understanding class structure

```typescript
// Find exported classes with full interface
Grep({
  pattern: "^export class \\w+",
  path: "src/",
  output_mode: "content",
  "-A": 30
})

// Find class with specific parent
Grep({
  pattern: "class \\w+ extends BaseService",
  path: "src/",
  output_mode: "content",
  "-A": 20
})
```

---

### Pattern 4: Find Imports and Dependencies

**When to use**: Tracing dependencies or understanding module structure

```typescript
// All imports from a file
Grep({
  pattern: "^import",
  path: "src/index.ts",
  output_mode: "content"
})

// Find where a module is used
Grep({
  pattern: "from ['\"]@company/auth",
  path: "src/",
  output_mode: "files_with_matches"
})
```

---

### Pattern 5: Find Configuration Patterns

**When to use**: Understanding config structure or finding specific settings

```typescript
// Find EXPECTATIONS or config objects
Grep({
  pattern: "EXPECTATIONS|CONFIG|SETTINGS",
  path: "src/",
  output_mode: "content",
  "-A": 15
})
```

---

## Grep Pattern Cheatsheet

| What you're looking for        | Pattern                         | Useful grep flags        | Typical context / notes                    | Example command                           |
| ------------------------------ | ------------------------------- | ------------------------ | ------------------------------------------ | ----------------------------------------- |
| **Async function definitions** | `async function \w+`            | `-A 15`                  | Usually want body + closing brace          | `grep -A 15 "async function \w+" file.js` |
| **Class definitions**          | `^export class \w+`             | `-A 30`                  | Classes are usually long                   | `grep -A 30 "^export class" src/*.ts`     |
| **Test cases / suites**        | `it\(\|describe\(`              | `-A 5` or `-B 2 -A 8`   | Quick view of test + assertions            | `grep -A 5 "it(" __tests__/*.test.ts`     |
| **All import statements**      | `^import`                       | `-n` or just plain       | Shows line numbers or full list            | `grep "^import" *.js`                     |
| **All export statements**      | `^export`                       | `-A 3`                   | Usually want the thing being exported      | `grep -A 3 "^export" index.ts`            |
| **Type aliases**               | `^(export )?type \w+`           | `-A 10`                  | Often multi-line with = { ... }            | `grep -A 10 "type \w+" types.ts`          |
| **Interfaces**                 | `^(export )?interface \w+`      | `-A 20`                  | Interfaces tend to be longer               | `grep -A 20 "interface" models.ts`        |
| **Constants (SCREAMING_SNAKE)**| `^const [A-Z_][A-Z0-9_]*\b`    | `-A 5`                   | Catches only UPPER_CASE constants          | `grep -A 5 "^const [A-Z_]" config.js`    |
| **React function components**  | `const \w+ *= *\(.*\): *JSX`   | `-A 12`                  | Arrow function components with return type | `grep -A 12 "): JSX" components/*.tsx`    |
| **console.log / debug lines**  | `console\.log`                  | `-n`                     | Find debugging leftovers                   | `grep -n "console\.log" src/`             |
| **TODO / FIXME comments**      | `//.*TODO\|FIXME`               | `--color=always`         | Quick audit of technical debt              | `grep -r "//.*TODO" .`                    |

### Bonus Quick Tips

- Add line numbers → `-n`
- Show filename + line → `-H` or just use with recursive grep (`-r`)
- Case insensitive → `-i`
- Show before + after → `-B 3 -A 3`
- Only show matching part → `-o`
- Recursive search → `grep -r "pattern" .`
- Exclude node_modules → `grep -r "pattern" . --exclude-dir=node_modules`

---

## When to Use Read vs Grep

- **Find specific pattern**: Grep — Targeted results, context
- **File structure overview**: Grep `^##\|^###` — Headers only
- **Sequential scan**: Read + offset — Need continuous blocks
- **Small file (<1000 lines)**: Read — Fast, no pattern needed
- **Unknown structure**: Grep `^export\|^class\|^function` — Discover shape
- **Benchmark/test results**: Grep pattern + `-A 20` — Get full block

---

## Best Practices

1. **Start with Grep for discovery** - Find the right section before reading
2. **Use `-A` liberally** - Better to get too much context than too little
3. **Use `output_mode: "files_with_matches"` first** - Find which files, then dig in
4. **Combine patterns with `|`** - `pattern: "class|interface"` for related items
5. **Use `^` anchor** - Find definitions, not usages: `^export function`

---

## Error Handling

### Pattern 6: Handle No Results

**When to use**: When search may return empty results

```typescript
// Check files exist first with Glob
const files = Glob({ pattern: "src/**/*.ts" });
if (files.length === 0) {
  // No TypeScript files - check for .js instead
  Glob({ pattern: "src/**/*.js" });
}

// Grep returns empty? Broaden the search
Grep({ pattern: "handleError", path: "src/" });  // No results?
Grep({ pattern: "error|Error|ERROR", path: "src/", "-i": true });  // Try case-insensitive
```

### Pattern 7: Fallback Chain

**When to use**: Trying multiple patterns until one works

```typescript
// Try specific → general pattern chain
// 1. Exact match first
Grep({ pattern: "^export function validateUser", path: "src/" });

// 2. If empty, try partial match
Grep({ pattern: "function.*validate.*user", path: "src/", "-i": true });

// 3. If still empty, find all validators
Grep({ pattern: "validate", path: "src/", output_mode: "files_with_matches" });
```

### Pattern 8: Handle Large Result Sets

**When to use**: Pattern matches too many lines

```typescript
// Use head_limit to cap results
Grep({
  pattern: "import",
  path: "src/",
  output_mode: "content",
  head_limit: 50  // Only first 50 matches
});

// Or use files_with_matches first, then dig into specific files
Grep({ pattern: "TODO|FIXME", path: "src/", output_mode: "files_with_matches" });
// Then read specific files that need attention
```

---

## Search Tracking

### Pattern 9: Progressive Discovery

**When to use**: Building understanding of unfamiliar codebase

```markdown
## Search Log

### Step 1: Find entry points
- `Glob({ pattern: "**/index.{ts,js}" })` → Found 12 files
- Main entry: `src/index.ts`

### Step 2: Trace exports
- `Grep({ pattern: "^export", path: "src/index.ts" })` → 8 exports
- Key modules: Router, Logger, Config

### Step 3: Find Router implementation
- `Grep({ pattern: "class Router", path: "src/" })` → `src/core/router.ts:45`
- Dependencies: URLPattern, Request, Response

### Step 4: Understand routing
- `Grep({ pattern: "addRoute|match", path: "src/core/router.ts", "-A": 10 })`
- Uses LRU cache for route matching
```

### Pattern 10: Dependency Mapping

**When to use**: Understanding module relationships

```typescript
// Track import chains
// Step 1: What does this file import?
Grep({ pattern: "^import", path: "src/api/handler.ts" });
// → imports: ../core/router, ../utils/logger, ../config

// Step 2: What imports this file?
Grep({ pattern: "from ['\"].*handler", path: "src/", output_mode: "files_with_matches" });
// → imported by: src/index.ts, src/api/index.ts

// Step 3: Build dependency graph
// handler.ts → router.ts → urlpattern.ts
//           → logger.ts → file.ts
//           → config.ts
```

### Pattern 11: Change Impact Analysis

**When to use**: Before refactoring, understand blast radius

```typescript
// Find all usages of a function/class
const target = "validateRequest";

// Direct usages
Grep({ pattern: `${target}\\(`, path: "src/", output_mode: "files_with_matches" });

// Type references
Grep({ pattern: `${target}`, path: "src/**/*.d.ts", output_mode: "files_with_matches" });

// Test coverage
Grep({ pattern: target, path: "tests/", output_mode: "files_with_matches" });

// Document findings
// validateRequest used in: 5 source files, 3 test files, 1 type file
// Safe to modify: handler.ts (internal), validator.ts (internal)
// Needs review: api/public.ts (exported)
```

### Pattern 12: Search Session State

**When to use**: Maintaining context across multiple searches

```markdown
## Analysis Session: Auth Refactor

**Goal**: Replace JWT with session-based auth

**Files identified**:
- [ ] `src/auth/jwt.ts` - Current JWT implementation
- [ ] `src/middleware/auth.ts` - Auth middleware
- [ ] `src/api/login.ts` - Login endpoint
- [ ] `src/api/logout.ts` - Logout endpoint

**Patterns found**:
- JWT verification: 12 occurrences across 4 files
- Token refresh: 3 occurrences in jwt.ts
- Auth header parsing: 5 occurrences

**Dependencies**:
- jsonwebtoken package (to remove)
- crypto (keep for session IDs)

**Next steps**:
1. Create session store interface
2. Replace jwt.verify calls with session lookup
3. Update login/logout endpoints
4. Remove jsonwebtoken dependency
```

---

## Common Issues

- **Token limit exceeded**: Using Read on large file — Switch to Grep with context
- **Missing context**: `-A` too small — Increase to `-A 20` or `-A 30`
- **Too many results**: Pattern too broad — Add anchors: `^export class`
- **Can't find pattern**: Special chars not escaped — Escape: `\\(`, `\\{`, `\\.`
- **No results**: Wrong path or pattern — Check with `Glob` first, then adjust pattern
- **Partial matches**: Regex too greedy — Use word boundaries: `\\bfunc\\b`
- **Missing files**: Wrong glob pattern — Use `**/*.ts` not `*.ts` for recursive

---

## Version History

- **v1.3** (2026-02-02): Added rename/polish commands, --depth/--threshold flags, fixed classes dot format, Bun API modernization (stripANSI, stringWidth, Col-89)
- **v1.2** (2026-01-26): Added CLI commands section with classes and strength analyzers
- **v1.1** (2026-01-25): Added error handling, fallback chains, search tracking
- **v1.0** (2026-01-25): Initial release with Read/Grep patterns
