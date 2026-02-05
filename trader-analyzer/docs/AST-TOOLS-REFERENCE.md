# AST-Aware Analysis Tools Reference

**Comprehensive reference for AST-aware code analysis tools in NEXUS**

---

## Overview

NEXUS includes a suite of AST-aware code analysis tools for pattern matching, security detection, code smell analysis, and pattern evolution tracking. All tools use Bun-native APIs and support semantic pattern matching.

---

## Tools

### 1. AST Grep (`bun ast-grep`)

**AST-aware grep with semantic pattern matching and transformation**

#### Usage

```bash
# Basic pattern matching
bun ast-grep --pattern='eval($EXPR)' --context=50

# With transformation
bun ast-grep --pattern='eval($EXPR)' --context=50 --transform='safeEval($EXPR)'

# Query syntax for complex patterns
bun ast-grep --query='[CallExpr:has([Identifier[name="require"]])]' --rewrite='import'
```

#### Options

- `--pattern=<pattern>` - AST pattern to match (e.g., `eval($EXPR)`)
- `--query=<query>` - Complex query syntax for AST matching
- `--context=<lines>` - Number of context lines to show (default: 3)
- `--transform=<transform>` - Transformation pattern to apply
- `--rewrite=<rewrite>` - Rewrite pattern (used with --query)
- `--where=<condition>` - Additional condition filter
- `--language=<lang>` - Language (typescript|javascript, default: typescript)

#### Examples

```bash
# Find all eval() calls
bun ast-grep --pattern='eval($EXPR)'

# Find require() calls and rewrite to import
bun ast-grep --query='[CallExpr:has([Identifier[name="require"]])]' --rewrite='import'

# Find setTimeout with context
bun ast-grep --pattern='setTimeout($FUNC, $DELAY)' --context=10
```

---

### 2. Pattern Weave (`bun pattern-weave`)

**Cross-file pattern correlation with confidence scoring**

#### Usage

```bash
bun pattern-weave --across-files --min-confidence=0.85 --output=pattern-graph.json
```

#### Options

- `--patterns=<file>` - YAML config file with patterns (default: `./patterns.yaml`)
- `--across-files` - Enable cross-file pattern correlation
- `--min-confidence=<value>` - Minimum confidence threshold (default: 0.85)
- `--min-support=<value>` - Minimum support threshold (default: 0.7)
- `--output=<file>` - Output file (JSON or Graphviz format)

#### Example Config (`patterns.yaml`)

```yaml
patterns:
  - name: "eval-usage"
    pattern: "eval\\(.*\\)"
    description: "Direct eval() calls"
    severity: "high"
  - name: "require-usage"
    pattern: "require\\(.*\\)"
    description: "CommonJS require()"
    severity: "medium"
```

#### Output Format

```json
{
  "correlations": [
    {
      "patternA": "eval-usage",
      "patternB": "require-usage",
      "support": 0.75,
      "confidence": 0.90,
      "files": ["src/file1.ts", "src/file2.ts"]
    }
  ],
  "patterns": [
    {
      "name": "eval-usage",
      "matches": 5,
      "files": ["src/file1.ts"]
    }
  ]
}
```

---

### 3. Anti-Pattern Detection (`bun anti-pattern`)

**Security anti-pattern detection with automatic fixes**

#### Usage

```bash
bun anti-pattern --severity=high --autofix --backup --report=security-antipatterns.md
```

#### Options

- `--config=<file>` - Security rules config file (default: `./security-rules.yaml`)
- `--severity=<level>` - Filter by severity (low|medium|high|critical)
- `--autofix` - Automatically apply fixes
- `--backup` - Create backup files before fixing
- `--report=<file>` - Generate markdown report (default: `security-antipatterns.md`)

#### Example Config (`security-rules.yaml`)

```yaml
rules:
  - id: "eval-usage"
    name: "Direct eval() usage"
    pattern: "eval\\(.*\\)"
    severity: "critical"
    description: "Direct eval() can execute arbitrary code"
    fix: "safeEval($EXPR)"
    cwe: "CWE-95"
  - id: "innerHTML-usage"
    name: "innerHTML XSS risk"
    pattern: "\\.innerHTML\\s*="
    severity: "high"
    description: "innerHTML can lead to XSS attacks"
    fix: ".textContent ="
    cwe: "CWE-79"
```

---

### 4. Code Smell Diffusion (`bun smell-diffuse`)

**Analyze code smell propagation with visualization**

#### Usage

```bash
bun smell-diffuse --source=bad-pattern.ts --radius=3 --visualize --hotspots
```

#### Options

- `--source=<file|dir>` - Source file or directory to analyze (default: `src`)
- `--radius=<number>` - Diffusion radius for smell propagation (default: 3)
- `--visualize` - Generate HTML visualization
- `--hotspots` - Show code smell hotspots
- `--export=<file>` - Export analysis results (JSON or HTML)

#### Detected Smells

- **Long Method** - Functions exceeding 100 characters
- **Large Class** - Classes exceeding 500 characters
- **Duplicate Code** - Repeated code patterns
- **Magic Numbers** - Hardcoded numeric values
- **Deep Nesting** - Excessive nesting levels

#### Output

```bash
🔥 Found 5 code smell hotspots:

📄 src/api/routes.ts
   Smells: 12
   Severity: 85%
   Affected Files: 8
```

---

### 5. Pattern Evolution (`bun pattern-evolve`)

**Track patterns across git history with frequency analysis and prediction**

#### Usage

```bash
bun pattern-evolve 'eval(' --git-history --frequency-analysis --predict-next
```

#### Options

- `--git-history` - Analyze git history for pattern evolution
- `--frequency-analysis` - Perform frequency analysis over time
- `--predict-next` - Predict next occurrence based on trends
- `--visualize` - Generate visualization (planned)
- `--export=<file>` - Export evolution data (JSON)

#### Output

```
📈 Pattern Evolution Report:

Pattern: eval(
  Frequency: 15 occurrences
  First seen: 2024-01-15
  Last seen: 2025-01-10
  Trend: decreasing
  Hotspots: src/api/routes.ts, src/utils/helpers.ts
  Predicted next: 2025-02-15 (30% probability)
```

---

## Integration

All tools are integrated into `package.json` scripts:

```json
{
  "scripts": {
    "ast-grep": "bun run scripts/ast-grep.ts",
    "pattern-weave": "bun run scripts/pattern-weave.ts",
    "anti-pattern": "bun run scripts/anti-pattern.ts",
    "smell-diffuse": "bun run scripts/smell-diffuse.ts",
    "pattern-evolve": "bun run scripts/pattern-evolve.ts"
  }
}
```

---

## Bun Native APIs Used

- `Bun.Glob` - File pattern matching
- `Bun.file()` / `Bun.write()` - File I/O
- `Bun.shell` (`$`) - Git command execution (pattern-evolve)
- TypeScript AST parsing (via regex patterns)

---

## Related Documentation

- [Constants Reference](./CONSTANTS-REFERENCE.md)
- [Development Workflow](./DEVELOPMENT-WORKFLOW.md)
- [Security Architecture](./SECURITY-ARCHITECTURE.md)

---

## Examples

### Complete Workflow

```bash
# 1. Find security issues
bun anti-pattern --severity=high --report=security-report.md

# 2. Analyze code smells
bun smell-diffuse --source=src --radius=3 --hotspots

# 3. Track pattern evolution
bun pattern-evolve 'eval(' --git-history --predict-next

# 4. Correlate patterns
bun pattern-weave --across-files --min-confidence=0.85 --output=patterns.json

# 5. Transform unsafe patterns
bun ast-grep --pattern='eval($EXPR)' --transform='safeEval($EXPR)' --backup
```
