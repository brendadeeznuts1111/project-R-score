# [CODE.ANALYSIS.TOOLS.RG] Code Analysis Tools

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-CODE-ANALYSIS@0.1.0;instance-id=CODE-ANALYSIS-001;version=0.1.0}][PROPERTIES:{tools={value:"code-analysis";@root:"ROOT-DEV";@chain:["BP-AST","BP-SECURITY","BP-PATTERNS"];@version:"0.1.0"}}][CLASS:CodeAnalysisTools][#REF:v-0.1.0.BP.CODE.ANALYSIS.1.0.A.1.1.DEV.1.1]]`

## 1. Overview

Advanced code analysis and pattern matching tools for security, performance, and code quality.

**Code Reference**: `#REF:v-0.1.0.BP.CODE.ANALYSIS.1.0.A.1.1.DEV.1.1`

---

## 2. [TOOLS.WEAVE.RG] Pattern Weaving

### 2.1. [WEAVE.DESCRIPTION.RG] Description
Find and fix security patterns in codebase using AST-aware pattern matching.

### 2.2. [WEAVE.USAGE.RG] Usage
```bash
# Find and fix eval() calls
bun weave --pattern='$BAD($ARG)' --where='$BAD in ["eval","Function"]' --fix='safe($ARG)' --backup --test

# Options:
#   --pattern    Pattern to find (e.g., '$BAD($ARG)')
#   --where      Condition (e.g., '$BAD in ["eval","Function"]')
#   --fix        Fix pattern (e.g., 'safe($ARG)')
#   --backup     Create backup files
#   --test       Test mode (dry run)
#   --ast        Use AST parsing (future)
```

### 2.3. [WEAVE.EXAMPLES.RG] Examples
```bash
# Find unsafe database queries
bun weave --pattern='db.query($SQL)' --where='$SQL contains "userInput"' --fix='db.query(sanitize($SQL))' --test

# Find eval usage
bun weave --pattern='$FUNC($CODE)' --where='$FUNC in ["eval","Function","setTimeout"]' --fix='safeEval($CODE)' --backup
```

**Reference**: `#REF:scripts/weave.ts`

---

## 3. [TOOLS.TRACE.RG] Deep Code Traversal

### 3.1. [TRACE.DESCRIPTION.RG] Description
Generate call graphs and analyze code flow with hotspot detection.

### 3.2. [TRACE.USAGE.RG] Usage
```bash
# Generate call graph from entry point
bun trace --entry=src/index.ts --depth=inf --visualize --hotspots --export=call-graph.gv

# Options:
#   --entry      Entry point file
#   --depth      Max depth (number or "inf")
#   --visualize Show visualization
#   --hotspots   Find hotspots (most called functions)
#   --export     Export to Graphviz format
```

### 3.3. [TRACE.EXAMPLES.RG] Examples
```bash
# Trace API routes
bun trace --entry=src/api/routes.ts --depth=5 --hotspots

# Export full call graph
bun trace --entry=src/index.ts --depth=inf --export=call-graph.gv
```

**Reference**: `#REF:scripts/trace.ts`

---

## 4. [TOOLS.SGREP.RG] Semantic Grep

### 4.1. [SGREP.DESCRIPTION.RG] Description
Semantic code search with context awareness and confidence scoring.

### 4.2. [SGREP.USAGE.RG] Usage
```bash
# Semantic search with high confidence
bun sgrep --pattern='security.*vulnerability' --semantic --confidence=0.95 --context=3 --transform='security.fixed()'

# Options:
#   --pattern      Search pattern
#   --semantic     Enable semantic matching
#   --confidence   Minimum confidence (0.0-1.0)
#   --context      Context lines to show
#   --transform    Transform pattern (optional)
```

### 4.3. [SGREP.EXAMPLES.RG] Examples
```bash
# Find security issues
bun sgrep --pattern='security vulnerability' --semantic --confidence=0.8 --context=5

# Find and fix patterns
bun sgrep --pattern='eval(' --semantic --transform='safeEval('
```

**Reference**: `#REF:scripts/sgrep.ts`

---

## 5. [TOOLS.CORRELATE.RG] Cross-Pattern Correlation

### 5.1. [CORRELATE.DESCRIPTION.RG] Description
Find related patterns and assess security risk.

### 5.2. [CORRELATE.USAGE.RG] Usage
```bash
# Correlate database queries with user input
bun correlate --pattern-a='db.query($SQL)' --pattern-b='userInput($VAR)' --distance=3 --risk-score --auto-fix

# Options:
#   --pattern-a   First pattern
#   --pattern-b   Second pattern
#   --distance    Max line distance
#   --risk-score  Calculate risk scores
#   --auto-fix    Automatically fix high-risk correlations
```

### 5.3. [CORRELATE.EXAMPLES.RG] Examples
```bash
# Find SQL injection risks
bun correlate --pattern-a='db.query($SQL)' --pattern-b='req.body' --distance=5 --risk-score

# Auto-fix high-risk patterns
bun correlate --pattern-a='eval(' --pattern-b='userInput' --distance=3 --risk-score --auto-fix
```

**Reference**: `#REF:scripts/correlate.ts`

---

## 6. [TOOLS.EVOLVE.RG] Pattern Evolution Tracking

### 6.1. [EVOLVE.DESCRIPTION.RG] Description
Track patterns across git history and predict future usage.

### 6.2. [EVOLVE.USAGE.RG] Usage
```bash
# Track pattern evolution
bun evolve --git-history --frequency --predict-next --hotspots --visualize --export=pattern-evolution.json

# Options:
#   --git-history   Analyze git history
#   --frequency     Show frequency statistics
#   --predict-next  Predict next occurrence
#   --hotspots      Show hotspot files
#   --visualize     Visualize trends
#   --export        Export to JSON
```

### 6.3. [EVOLVE.EXAMPLES.RG] Examples
```bash
# Track Bun.serve usage
bun evolve Bun.serve --git-history --frequency --hotspots

# Predict pattern evolution
bun evolve 'db.query' --git-history --predict-next --export=evolution.json
```

**Reference**: `#REF:scripts/evolve.ts`

---

## 7. [TOOLS.INTEGRATION.RG] Integration

### 7.1. [INTEGRATION.SCRIPTS.RG] NPM Scripts
All tools are available as npm scripts:
```bash
bun run weave --pattern='...' --where='...' --fix='...'
bun run trace --entry=src/index.ts --hotspots
bun run sgrep --pattern='...' --semantic
bun run correlate --pattern-a='...' --pattern-b='...'
bun run evolve --git-history --frequency
```

### 7.2. [INTEGRATION.CI.RG] CI Integration
Use in CI/CD pipelines:
```yaml
# .github/workflows/security.yml
- name: Security scan
  run: |
    bun run weave --pattern='eval(' --where='$BAD in ["eval"]' --test
    bun run correlate --pattern-a='db.query' --pattern-b='req.body' --risk-score
```

---

## 8. [TOOLS.BEST_PRACTICES.RG] Best Practices

### 8.1. [PRACTICES.SECURITY.RG] Security
- Run `weave` before commits to catch security issues
- Use `correlate` to find SQL injection risks
- Set up CI checks with `weave --test`

### 8.2. [PRACTICES.PERFORMANCE.RG] Performance
- Use `trace` to find performance hotspots
- Track pattern evolution to identify tech debt
- Use `sgrep` to find performance anti-patterns

### 8.3. [PRACTICES.MAINTENANCE.RG] Maintenance
- Regularly run `evolve` to track code patterns
- Use `correlate` to find code smells
- Set up automated pattern tracking

---

## 9. Status

**Status**: ✅ Code analysis tools implemented

**Tools**:
- ✅ Pattern weaving (weave.ts)
- ✅ Code traversal (trace.ts)
- ✅ Semantic grep (sgrep.ts)
- ✅ Pattern correlation (correlate.ts)
- ✅ Pattern evolution (evolve.ts)

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0
