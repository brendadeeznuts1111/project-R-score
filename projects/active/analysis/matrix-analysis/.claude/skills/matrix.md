# /matrix - Lockfile Health Matrix

Scan projects and display lockfile health matrix with Bun-native diagnostics.

## Quick Reference

```bash
# Basic usage
/matrix                              # Scan default directories
/matrix ~/Projects                   # Scan specific directory
/matrix . ~/other-project            # Scan multiple directories

# Filtering
/matrix --bun-only                   # Only show projects with bun.lock
/matrix --no-lock                    # Only show projects missing lockfiles
/matrix --workspace                  # Only show workspace projects

# Output
/matrix --json                       # Machine-readable JSON
/matrix --summary                    # Summary stats only
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

- **90-100** (OK) — Healthy project with lockfile
- **70-89** (LOW) — Minor issues (no deps, workspace pkg)
- **50-69** (MED) — Missing lockfile with dependencies
- **0-49** (HIGH) — Critical lockfile issues

## Status Icons

- **✅** (ok) — Healthy with lockfile
- **📭** (no-deps) — No dependencies (acceptable)
- **⚠️** (mixed) — Multiple lockfile formats
- **📦** (npm-only) — Only package-lock.json
- **🧶** (yarn-only) — Only yarn.lock
- **❌** (no-lock) — Missing lockfile (needs fix)

## Lockfile Icons

- **🥟** (bun) — bun.lock (text) or bun.lockb (binary)
- **📦** (npm) — package-lock.json
- **🧶** (yarn) — yarn.lock
- **📀** (pnpm) — pnpm-lock.yaml

## Output Columns

- **Project** — Package name from package.json
- **Ver** — Package version
- **Deps** — Production dependency count
- **Dev** — Dev dependency count
- **Lock** — Lockfile type icon
- **Size** — Lockfile size (KB/MB)
- **Disk** — Total project disk usage
- **WS** — 📦 if workspace project
- **Git** — ✓ if git repo, ✗ if not
- **Health** — Visual health bar (8 blocks)
- **Score** — Numeric health score (0-100)
- **Priority** — OK / LOW / MED / HIGH

## Integration with /diagnose

The matrix scanner complements `/diagnose painpoints` by providing:
- **Matrix view**: Bird's-eye view across multiple projects
- **Lockfile focus**: Specialized lockfile health analysis
- **Bun v1.2+ aware**: Detects text vs binary lockfile formats

### Lockfile States Detected

- **Text-only (bun.lock)** (Ideal) — None needed
- **Binary-only (bun.lockb)** (Medium) — Migrate to text format
- **Dual (both files)** (Low) — Remove bun.lockb
- **Missing entirely** (High) — Run `bun install`

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

- **`Bun.file().exists()`** — Check lockfile presence
- **`Bun.file().size`** — Measure lockfile size
- **`Bun.Glob`** — Scan for package.json files
- **`Bun.$`** — Shell commands for disk usage
- **`Bun.inspect.table()`** — Formatted output tables

## Tier-1380 Protocol Integration

### Temporal Constants

- **SOVEREIGN_TZ** (America/New_York) — Business time operations
- **UTC_TZ** (UTC) — Deterministic operations

### Sync Commands

```bash
/matrix --tz-status    # Current temporal state
/matrix --tier1380     # Full protocol run with R2/RSS
/matrix --registry     # 60-column matrix status
```

### Status Indicators

- **NYC_SYNCED** (Green) — Aligned to Sovereign TZ
- **UTC_SYNCED** (Blue) — Deterministic mode
- **DRIFT_DETECTED** (Yellow) — TZ mismatch warning
- **SYNC_REQUIRED** (Red) — Needs re-alignment

### Matrix Column Policy

> **MIN_COLUMNS = 25** | Full schema = 60 columns | Sparse data supported via DEFAULT NULL

### Matrix Columns 1-10: Project Identity

- **Col 1: project_id** (TEXT, default: `UUIDv7()`) — UUIDv7 project identifier
- **Col 2: project_name** (TEXT, default: `"unnamed"`) — Package name from package.json
- **Col 3: project_path** (TEXT, NOT NULL) — Absolute filesystem path
- **Col 4: version** (TEXT, default: `"0.0.0"`) — Semantic version string
- **Col 5: version_major** (INT, default: `0`) — Major version number
- **Col 6: version_minor** (INT, default: `0`) — Minor version number
- **Col 7: version_patch** (INT, default: `0`) — Patch version number
- **Col 8: is_workspace** (BOOL, default: `false`) — Workspace root flag
- **Col 9: is_workspace_member** (BOOL, default: `false`) — Workspace member flag
- **Col 10: parent_workspace** (TEXT, default: `NULL`) — Parent workspace path

### Matrix Columns 11-20: Dependency Metrics

- **Col 11: deps_prod** (INT, default: `0`) — Production dependency count
- **Col 12: deps_dev** (INT, default: `0`) — Dev dependency count
- **Col 13: deps_peer** (INT, default: `0`) — Peer dependency count
- **Col 14: deps_optional** (INT, default: `0`) — Optional dependency count
- **Col 15: deps_total** (INT, default: `0`) — Total dependency count
- **Col 16: deps_direct** (INT, default: `0`) — Direct dependencies
- **Col 17: deps_transitive** (INT, default: `NULL`) — Transitive dependencies
- **Col 18: deps_duplicates** (INT, default: `0`) — Duplicate package count
- **Col 19: deps_outdated** (INT, default: `NULL`) — Outdated package count
- **Col 20: deps_depth_max** (INT, default: `0`) — Maximum dependency depth

### Matrix Columns 21-30: Lockfile Analysis

- **Col 21: lock_type** (TEXT, default: `"none"`) — bun/npm/yarn/pnpm/none
- **Col 22: lock_format** (TEXT, default: `"none"`) — text/binary/none
- **Col 23: lock_size_bytes** (INT, default: `0`) — Lockfile size in bytes
- **Col 24: lock_integrity** (TEXT, default: `NULL`) — SHA-512 integrity hash
- **Col 25: lock_age_days** (INT, default: `NULL`) — Days since last modified
- **Col 26: has_bun_lock** (BOOL, default: `false`) — bun.lock present
- **Col 27: has_bun_lockb** (BOOL, default: `false`) — bun.lockb present
- **Col 28: has_npm_lock** (BOOL, default: `false`) — package-lock.json present
- **Col 29: has_yarn_lock** (BOOL, default: `false`) — yarn.lock present
- **Col 30: has_pnpm_lock** (BOOL, default: `false`) — pnpm-lock.yaml present

### Matrix Columns 31-40: Security & Audit

- **Col 31: vuln_critical** (INT, default: `0`) — Critical vulnerabilities
- **Col 32: vuln_high** (INT, default: `0`) — High vulnerabilities
- **Col 33: vuln_medium** (INT, default: `0`) — Medium vulnerabilities
- **Col 34: vuln_low** (INT, default: `0`) — Low vulnerabilities
- **Col 35: vuln_total** (INT, default: `0`) — Total vulnerabilities
- **Col 36: audit_score** (INT, default: `100`) — Security audit score (0-100)
- **Col 37: last_audit** (INT, default: `NULL`) — Last audit timestamp
- **Col 38: csp_compatible** (BOOL, default: `true`) — CSP-compatible URLs
- **Col 39: has_env_file** (BOOL, default: `false`) — .env file detected
- **Col 40: secrets_exposed** (INT, default: `0`) — Potential secrets count

### Matrix Columns 41-50: Performance & DNS

- **Col 41: disk_usage_bytes** (INT, default: `0`) — Total disk usage
- **Col 42: node_modules_size** (INT, default: `0`) — node_modules size
- **Col 43: install_time_ms** (INT, default: `NULL`) — Last install duration
- **Col 44: dns_hostname_count** (INT, default: `0`) — Registry hostnames
- **Col 45: dns_prefetch_count** (INT, default: `0`) — Prefetched hostnames
- **Col 46: dns_avg_latency_ms** (INT, default: `NULL`) — Average DNS latency
- **Col 47: dns_cache_hit_rate** (INT, default: `0`) — DNS cache hit %
- **Col 48: primary_registry** (TEXT, default: `"npm"`) — npm/yarn/github/private
- **Col 49: has_git** (BOOL, default: `false`) — Git repository flag
- **Col 50: git_branch** (TEXT, default: `NULL`) — Current git branch

### Matrix Columns 51-60: Hardware & Temporal

- **Col 51: crc32** (INT, default: `NULL`) — Hardware CRC32 checksum
- **Col 52: hardware_accel** (TEXT, default: `"none"`) — Acceleration type
- **Col 53: integrity_verified** (BOOL, default: `false`) — Verification flag
- **Col 54: simd_json_time** (INT, default: `NULL`) — SIMD parse time (ms)
- **Col 55: json_throughput** (INT, default: `NULL`) — JSON ops/sec
- **Col 56: stringifier_ops** (INT, default: `NULL`) — String op count
- **Col 57: idle_start** (INT, default: `Date.now()`) — Idle timestamp
- **Col 58: timer_state** (TEXT, default: `"TZ:UTC|OFF:0"`) — TZ:xxx|OFF:n format
- **Col 59: arm64_ccmp** (BOOL, default: `NULL`) — ARM64 CCMP support
- **Col 60: compiler_opt** (TEXT, default: `"O2"`) — Optimization level

### New Bun APIs (Tier-1380)

- **`Bun.Cookie.from()`** — Create sync state cookie
- **`Bun.Cookie.parse()`** — Parse incoming cookie string
- **`cookie.isExpired()`** — Check sync validity
- **`Bun.CookieMap`** — Request cookie management
- **`process.env.TZ`** — Dynamic timezone pivot
- **`ReadableStreamDefaultController.desiredSize`** — Streaming backpressure control

### v1.3.7 Stability Fixes

- **Hypothetical crash with optimization error** — JSC compiler stability
- **`desiredSize` returns correct backpressure** — Streaming flow control

> **Refs:** [bun.sh/blog/bun-v1.3.7](https://bun.sh/blog/bun-v1.3.7)

### Cookie-Based Sync State (v1.3.7)

```typescript
// Create sync state cookie
const syncCookie = Bun.Cookie.from("tier1380_sync", JSON.stringify({
  tz: process.env.TZ,
  lastSync: Date.now(),
  status: "NYC_SYNCED"
}), {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 86400  // 24h
});

// Parse incoming cookie
const cookie = Bun.Cookie.parse("tier1380_sync=...; Secure");
if (cookie.isExpired()) {
  status = "SYNC_REQUIRED";
}

// Drift detection
const stored = JSON.parse(req.cookies.get("tier1380_sync") || "{}");
const drift = Date.now() - stored.lastSync;
if (drift > 3600000) status = "DRIFT_DETECTED";
```

## Related Commands

- `/diagnose painpoints` - Detailed painpoint analysis
- `/diagnose deps` - Dependency health
- `/pm audit` - Security audit
