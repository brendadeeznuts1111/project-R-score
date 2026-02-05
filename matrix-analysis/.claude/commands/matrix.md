# /matrix - Lockfile Health Matrix

Scan projects and display lockfile health matrix with Bun-native diagnostics.

## Quick Reference

### 📍 Scan Commands
| Command | Args | Description |
|---------|------|-------------|
| `/matrix` | | Scan default directories |
| `/matrix` | `~/Projects` | Scan specific directory |
| `/matrix` | `. ~/other` | Scan multiple directories |

### 🏷️ Filtering
| Flag | Description |
|------|-------------|
| `--bun-only` | Only show projects with bun.lock |
| `--no-lock` | Only show projects missing lockfiles |
| `--workspace` | Only show workspace projects |
| `--filter <pattern>` | Filter by project name glob |

### 📊 Output Formats
| Flag | Output | Best For |
|------|--------|----------|
| (default) | `Bun.inspect.table()` | Terminal |
| `--json` | JSON | Pipelines, CI |
| `--summary` | Stats only | Quick checks |

### 🔢 Health Indicators
| Icon | Score | Priority | Action |
|------|-------|----------|--------|
| ✅ | 90-100 | OK | None needed |
| 📭 | 70-89 | LOW | No deps (acceptable) |
| ⚠️ | 50-69 | MED | Missing lockfile |
| ❌ | 0-49 | HIGH | Critical issues |

### 🔒 Lockfile Icons
| Icon | Type | Format |
|------|------|--------|
| 🥟 | bun | bun.lock / bun.lockb |
| 📦 | npm | package-lock.json |
| 🧶 | yarn | yarn.lock |
| 📀 | pnpm | pnpm-lock.yaml |

### ⚡ Quick Combos
```bash
/matrix --bun-only --summary          # Bun projects quick count
/matrix --no-lock ~/Projects          # Find missing lockfiles
/matrix . --json > health.json        # Export for CI
```

## Implementation

Run the lockfile-matrix scanner:

```bash
bun ~/.claude/scripts/lockfile-matrix.ts [directories...]
```

### Default Scan Directories
- `$HOME`
- `$HOME/Projects`
- `$HOME/CascadeProjects`

### Scan Depth
- MAX_DEPTH: 2 levels
- Ignores: `node_modules`, `.git`, `dist`, `build`, `.cache`

## Health Scoring

| Score | Priority | Description |
|-------|----------|-------------|
| 90-100 | OK | Healthy project with lockfile |
| 70-89 | LOW | Minor issues (no deps, workspace pkg) |
| 50-69 | MED | Missing lockfile with dependencies |
| 0-49 | HIGH | Critical lockfile issues |

## Status Icons

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | ok | Healthy with lockfile |
| 📭 | no-deps | No dependencies (acceptable) |
| ⚠️ | mixed | Multiple lockfile formats |
| 📦 | npm-only | Only package-lock.json |
| 🧶 | yarn-only | Only yarn.lock |
| ❌ | no-lock | Missing lockfile (needs fix) |

## Lockfile Icons

| Icon | Type | Notes |
|------|------|-------|
| 🥟 | bun | bun.lock (text) or bun.lockb (binary) |
| 📦 | npm | package-lock.json |
| 🧶 | yarn | yarn.lock |
| 📀 | pnpm | pnpm-lock.yaml |

## Output Columns

| Column | Description |
|--------|-------------|
| Project | Package name from package.json |
| Ver | Package version |
| Deps | Production dependency count |
| Dev | Dev dependency count |
| Lock | Lockfile type icon |
| Size | Lockfile size (KB/MB) |
| Disk | Total project disk usage |
| WS | 📦 if workspace project |
| Git | ✓ if git repo, ✗ if not |
| Health | Visual health bar (8 blocks) |
| Score | Numeric health score (0-100) |
| Priority | OK / LOW / MED / HIGH |

## Integration with /diagnose

The matrix scanner complements `/diagnose painpoints` by providing:
- **Matrix view**: Bird's-eye view across multiple projects
- **Lockfile focus**: Specialized lockfile health analysis
- **Bun v1.2+ aware**: Detects text vs binary lockfile formats

### Lockfile States Detected

| State | Severity | Action |
|-------|----------|--------|
| Text-only (bun.lock) | Ideal | None needed |
| Binary-only (bun.lockb) | Medium | Migrate to text format |
| Dual (both files) | Low | Remove bun.lockb |
| Missing entirely | High | Run `bun install` |

## Examples

### Scan workspace projects
```bash
/matrix ~/enterprise-dashboard
```

### Find projects needing lockfile fixes
```bash
/matrix --no-lock ~/Projects
```

### Quick health check before deploy
```bash
/matrix . --summary
```

## Bun APIs Used

| API | Purpose |
|-----|---------|
| `Bun.file().exists()` | Check lockfile presence |
| `Bun.file().size` | Measure lockfile size |
| `Bun.Glob` | Scan for package.json files |
| `Bun.$` | Shell commands for disk usage |
| `Bun.inspect.table()` | Formatted output tables |

## Related Commands

- `/diagnose painpoints` - Detailed painpoint analysis
- `/diagnose deps` - Dependency health
- `/pm audit` - Security audit
