# Table Enforcement Skill
<!-- version: 1.1.0 -->
<!-- triggers: table, validate, Bun.inspect.table, table-doctor, compliance -->

## Quick Reference

### CLI Usage
```
┌─────────────────────────────────────────────────────────────────────┐
│ bun table-doctor <file.json>      # Validate JSON table file       │
│ bun table-doctor --stdin          # Read from stdin                │
│ bun table-doctor data.json --fix  # Auto-fix issues                │
│ bun table-doctor data.json --json # Output as JSON                 │
│ bun table-doctor data.json -v     # Verbose output                 │
│ bun table-doctor --stats          # Show statistics                │
└─────────────────────────────────────────────────────────────────────┘
```

### Programmatic API
```typescript
┌─────────────────────────────────────────────────────────────────────┐
│ import { TableValidator } from "@core/utils/table-enforcement";    │
│                                                                     │
│ // Quick validation                                                 │
│ const result = TableValidator.validate(data);                       │
│ console.log(result.valid, result.score);                           │
│                                                                     │
│ // Enforce (throws on error)                                        │
│ const v = new TableValidator();                                     │
│ v.enforce(data);                                                    │
│                                                                     │
│ // With custom config                                               │
│ const v = new TableValidator({ minColumns: 3, minRows: 10 });      │
│ const result = v.validate(data);                                    │
│                                                                     │
│ // Check validity                                                   │
│ if (v.isValid(data)) { ... }                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Validation Rules
```
┌──────────────────┬────────────┬─────────────────────────────────────┐
│ Rule ID          │ Severity   │ Description                         │
├──────────────────┼────────────┼─────────────────────────────────────┤
│ min-columns      │ error      │ Minimum column count (default: 8)   │
│ min-rows         │ error      │ Minimum row count (default: 8)      │
│ max-columns      │ warning    │ Maximum column count (default: 50)  │
│ max-rows         │ warning    │ Maximum row count (default: 100000) │
│ require-headers  │ error      │ All columns must have names         │
│ unique-headers   │ error      │ No duplicate column names           │
│ no-empty-cells   │ warning    │ Warn on null/empty cells           │
│ consistent-types │ warning    │ Detect mixed types in columns       │
│ low-variance     │ info       │ Columns with mostly same value      │
└──────────────────┴────────────┴─────────────────────────────────────┘
```

### bunfig.toml Configuration
```toml
┌─────────────────────────────────────────────────────────────────────┐
│ [inspect.table]                                                     │
│ minColumns = 8                                                      │
│ minRows = 8                                                         │
│ maxColumns = 50                                                     │
│ maxRows = 100000                                                    │
│ requireHeaders = true                                               │
│ allowEmptyCells = true                                             │
│ warnOnLowVariance = true                                           │
│ lowVarianceThreshold = 0.95                                        │
│ # disabledRules = ["low-variance"]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### ValidationResult Structure
```typescript
┌─────────────────────────────────────────────────────────────────────┐
│ interface ValidationResult {                                        │
│   valid: boolean;            // Pass/fail                          │
│   score: number;             // 0-100 compliance score             │
│   errors: ValidationError[]; // Blocking issues                    │
│   warnings: ValidationError[];                                     │
│   info: ValidationError[];                                         │
│   stats: TableStats;         // Row/column counts, types           │
│   suggestions: Suggestion[]; // Auto-fix recommendations           │
│   performance: PerformanceMetrics;                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### TableStats Structure
```typescript
┌─────────────────────────────────────────────────────────────────────┐
│ interface TableStats {                                              │
│   rowCount: number;                                                 │
│   columnCount: number;                                              │
│   columns: ColumnInfo[];     // Per-column analysis                │
│   emptyCellCount: number;                                          │
│   emptyCellPercentage: number;                                     │
│   uniqueValuesPerColumn: Record<string, number>;                   │
│   typeDistribution: Record<string, TypeDistribution>;              │
│   memoryEstimate: number;    // Bytes                              │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Error Codes
```
┌──────────┬─────────────────────────────────────────────────────────┐
│ Code     │ Description                                             │
├──────────┼─────────────────────────────────────────────────────────┤
│ TABLE_001│ Columns below minimum                                   │
│ TABLE_002│ Columns above maximum                                   │
│ TABLE_003│ Missing column header                                   │
│ TABLE_004│ Duplicate column headers                                │
│ TABLE_005│ Empty cells detected                                    │
│ TABLE_006│ Mixed data types in column                              │
│ TABLE_007│ Low variance column (mostly same values)                │
│ TABLE_008│ Rows above maximum                                      │
│ TABLE_009│ Rows below minimum                                      │
└──────────┴─────────────────────────────────────────────────────────┘
```

### VS Code Integration
```
┌─────────────────────────────────────────────────────────────────────┐
│ Keyboard Shortcuts (when editing JSON):                            │
│   Ctrl+Shift+T  → Validate current table file                      │
│   Ctrl+Shift+F  → Fix table issues                                 │
│   Ctrl+Shift+S  → Show statistics                                  │
│                                                                     │
│ Tasks available:                                                    │
│   - Table Doctor: Validate Current File                            │
│   - Table Doctor: Validate All JSON                                │
│   - Table Doctor: Fix Current File                                 │
│   - Table Doctor: Show Stats                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### GitHub Actions
```yaml
# .github/workflows/validate-bun-tables.yml
# Automatically validates JSON table files on push/PR
# Generates validation report in PR summary
```

### Performance Targets
```
┌─────────────────────────────────────────────────────────────────────┐
│ 1,000 rows   → < 50ms                                              │
│ 10,000 rows  → < 500ms                                             │
│ 100,000 rows → < 5s                                                │
│ Memory       → < 100MB                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### File Locations
```
packages/@core/utils/table-enforcement/
├── index.ts        # Public API exports
├── types.ts        # TypeScript interfaces
├── validator.ts    # Core validation engine
├── analyzer.ts     # Data analysis & suggestions
├── rules/
│   └── index.ts    # Built-in validation rules
└── config/
    └── loader.ts   # bunfig.toml loader

packages/@tools/cli/commands/
└── table-doctor.ts # CLI entry point

tests/table-enforcement/
└── validator.test.ts
```

---

## Metafile Bundle Budget Gate

Integrate with `Bun.build` metafile for **bundle size enforcement** on every PR:

### CI Budget Gate

```typescript
// ci/budget-gate.ts
import { TableValidator } from "@core/utils/table-enforcement";

interface BundleBudget {
  maxBytes: number;
  maxImports: number;
  maxChunks?: number;
}

const DEFAULT_BUDGET: BundleBudget = {
  maxBytes: 250_000,  // 250KB
  maxImports: 30,
  maxChunks: 5,
};

async function enforceBundleBudget(budget = DEFAULT_BUDGET) {
  const { metafile, success } = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    metafile: true,
    minify: true,
  });

  if (!success) throw new Error("Build failed");

  const results: Array<{ path: string; score: number; violations: string[] }> = [];

  for (const [path, meta] of Object.entries(metafile.outputs)) {
    const violations: string[] = [];

    if (meta.bytes > budget.maxBytes) {
      violations.push(`Size ${meta.bytes} exceeds ${budget.maxBytes} bytes`);
    }
    if (meta.imports.length > budget.maxImports) {
      violations.push(`Imports ${meta.imports.length} exceeds ${budget.maxImports}`);
    }

    // Convert to table format for TableValidator
    const tableData = [{
      path,
      bytes: meta.bytes,
      imports: meta.imports.length,
      budget_bytes: budget.maxBytes,
      budget_imports: budget.maxImports,
    }];

    const validation = TableValidator.validate(tableData);
    const score = Math.max(0, 100 - violations.length * 25);

    results.push({ path, score, violations });

    if (score < 90) {
      console.error(`BUDGET FAIL: ${path} score=${score}`);
      violations.forEach(v => console.error(`  - ${v}`));
    }
  }

  const failed = results.filter(r => r.score < 90);
  if (failed.length > 0) {
    throw new Error(`${failed.length} bundles exceeded budget`);
  }

  console.log("All bundles within budget");
  return results;
}

// Run as CLI
await enforceBundleBudget();
```

### package.json Integration

```json
{
  "scripts": {
    "build": "bun run ci/build.ts",
    "budget": "bun run ci/budget-gate.ts",
    "ci": "bun run budget && bun test"
  }
}
```

### GitHub Actions

```yaml
# .github/workflows/budget.yml
name: Bundle Budget
on: [push, pull_request]

jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - run: bun install
      - run: bun run budget

      - name: Comment on PR
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Bundle budget exceeded. Run `bun run budget` locally to see details.'
            })
```

### Budget Report Output

```
┌─────────────────────────────────────────────────────────────────────┐
│ Bundle Budget Report                                                 │
├──────────────────────┬────────────┬─────────┬───────────────────────┤
│ Path                 │ Size       │ Imports │ Score                 │
├──────────────────────┼────────────┼─────────┼───────────────────────┤
│ dist/index.js        │ 142.3 KB   │ 18      │ 100/100               │
│ dist/worker.js       │ 89.1 KB    │ 12      │ 100/100               │
│ dist/vendor.js       │ 267.8 KB   │ 45      │ 50/100  OVER BUDGET   │
└──────────────────────┴────────────┴─────────┴───────────────────────┘
```
