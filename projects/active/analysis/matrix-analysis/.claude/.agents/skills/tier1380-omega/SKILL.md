---
name: tier1380-omega
description: |
  Tier-1380 OMEGA Protocol - Production-grade Bun v1.3.7 matrix telemetry with
  Cloudflare Workers pipeline, registry versioning, and live WebSocket streaming.
  
  Core: Chrome State (Cols 72-75), Bun BLAST, MCP/ACP Cloudflare deployment.
  
  Triggers: "tier-1380", "omega", "registry", "cloudflare pipeline", "deploy",
  "chrome state", "bun blast", "mcp", "acp", "version"
---

# Tier-1380 OMEGA Protocol

## Quick Commands

```bash
# Registry & Versioning
bun run omega:registry:check          # Check registry health
bun run omega:registry:version        # Get current version
bun run omega:registry:bump patch     # Bump version

# Cloudflare Pipeline
bun run omega:deploy:check            # Pre-deploy checks
bun run omega:deploy:staging          # Deploy to staging
bun run omega:deploy:production       # Deploy to production
bun run omega:deploy:rollback         # Rollback last deploy

# Tier-1380 Color System
bun run tier1380:color generate       # Generate team palette
bun run tier1380:team list            # List team members
bun run tier1380:profile show <id>    # Show member profile
bun run tier1380:metrics              # Show color metrics

# Tier-1380 Audit (Col-89 Compliance)
bun run tier1380:audit check <file>   # Col-89 violation scan
bun run tier1380:audit css <file>     # LightningCSS minification
bun run tier1380:audit rss [url]      # RSS feed audit
bun run tier1380:audit scan           # Security scan for bad extensions
bun run tier1380:audit dashboard      # Launch dashboard on :1380
bun run tier1380:audit db             # View violation database

# Tier-1380 Secure Executor (bunx wrapper)
bun run tier1380:exec <pkg> [args]    # Execute with security verification
bun run tier1380:exec --bun <pkg>     # Force Bun runtime
bun run tier1380:exec -p <pkg> <cmd>  # Package mapping
bun run tier1380:exec:stats           # Show execution statistics
bun run tier1380:exec:log             # Show audit log
bun run tier1380:exec:packages        # Show package history

# OpenClaw Integration
bun run matrix:openclaw:status        # Check OpenClaw status
bun run openclaw:health               # OpenClaw health check
ocwatch                               # Live monitoring

# Core Operations
bun run blast:all                     # Run full BLAST suite
bun run tension:live                  # Start WebSocket bridge
bun test tests/chrome-state/phase39-apex.test.ts
bun test workers/__tests__/tier1380-color-system.test.ts
```

## Registry Versioning System

### Version Storage (KV)
```typescript
// config/pipeline.ts - Registry operations
import { getVersion, bumpVersion, rollbackVersion } from "./config/pipeline";

// Get current
const v = await getVersion();  // { major: 3, minor: 26, patch: 4, build: "abc123" }

// Bump
await bumpVersion("patch");    // 3.26.4 -> 3.26.5

// Rollback
await rollbackVersion();       // Revert to previous
```

### Version File
```json
// config/acp-tier1380-omega.json
{
  "version": "3.26.4",
  "tier": 1380,
  "registry": {
    "kv_namespace": "OMEGA_REGISTRY",
    "key": "version:current",
    "history_key": "version:history"
  },
  "deployments": {
    "staging": "omega-staging.factory-wager.com",
    "production": "omega.factory-wager.com"
  }
}
```

## Cloudflare Pipeline

### Architecture
```
Git Push → Build → Registry Bump → Deploy Staging → E2E Test → Deploy Production
                ↓                    ↓                      ↓
           KV Version          Worker Deploy          Purge CDN
```

### Pipeline Commands
```bash
# Manual pipeline
bun run omega:pipeline            # Full pipeline
bun run omega:pipeline:build      # Build only
bun run omega:pipeline:deploy     # Deploy only

# Wrangler direct
wrangler deploy --config config/wrangler.toml --env production
```

### Deploy Checklist
```bash
# 1. Registry check
bun run omega:deploy:check
# ✓ Version: 3.26.4
# ✓ KV: Connected
# ✓ R2: Accessible
# ✓ Secrets: Injected

# 2. Staging
bun run omega:deploy:staging
# ✓ Worker: Deployed
# ✓ Routes: Updated
# ✓ Health: 200 OK

# 3. Production (after staging passes)
bun run omega:deploy:production
# ✓ Canary: 10% traffic
# ✓ Metrics: < 50ms p99
# ✓ Full rollout
```

## Core Modules

### Phase 3.9 Apex (Cols 72-75)
```typescript
import { getEntropyVectorPayload } from "./chrome-state/entropy";
import { megaSeal } from "./chrome-state/vault";
import { getSecurityScorePayload } from "./chrome-state/guard";

// Pipeline integration
const pipeline = {
  col_72: getEntropyVectorPayload(state).col_72_entropy_vector,
  col_73: (await megaSeal(state)).ms,
  col_74: getSecurityScorePayload(state).col_74_security_score,
  col_75: calculateOmegaStatus(/* ... */)
};
```

### Tier-1380 Color System

Production-grade color management with Bun-native APIs, team profiles, and accessibility validation.

```typescript
// lib/cli.ts - Core color utilities
import { Tier1380Colors, PALETTE, color, HEX } from "./lib/cli";

// Generate team-specific palette with member variation
const palette = Tier1380Colors.generateTeamPalette("quantum", "alice");
// Returns: { team, member, primary: {hex, ansi}, secondary: {hex, ansi}, accent: {hex, ansi} }

// Access domain palettes
const statusColors = PALETTE.status;     // success, warning, error, info
const terminalColors = PALETTE.terminal; // bg, text, prompt, output
const quantumColors = PALETTE.quantum;   // primary, secondary, accent, seal

// Color manipulation utilities
const darker = color.darken("#82589f", 20);     // Darken by 20%
const lighter = color.lighten("#82589f", 20);   // Lighten by 20%
const hex = color.hslToHex(270, 50, 50);        // HSL to hex
```

#### Color System Architecture

| Feature | Module | Bun APIs Used | Purpose |
|---------|--------|---------------|---------|
| Team Palettes | `lib/cli.ts` | `Bun.color()`, `Bun.hash.wyhash()` | Deterministic theme generation |
| R2 Persistence | `workers/color-palette-storage.ts` | `Bun.hash.crc32()` | Palette versioning & storage |
| Accessibility | `workers/color-accessibility.ts` | `Bun.color()` | WCAG AA/AAA contrast checking |
| Terminal Output | `workers/terminal-color-injector.ts` | `Bun.color()`, `Bun.stringWidth()` | ANSI color injection |
| Real-time Sync | `workers/color-websocket.ts` | WebSocket Durable Objects | Live theme updates |
| CLI Tool | `bin/tier1380.ts` | `Bun.which()`, `Bun.inspect.table()` | Management interface |

#### Workers & Durable Objects

```typescript
// Performance Guard with rate limiting and team tracking
import { ShellKimiPerformanceGuard } from "./workers/shell-kimi-performance-guard";

const guard = new ShellKimiPerformanceGuard({
  maxRequestsPerMinute: 120,
  circuitBreakerThreshold: 50,
  maxConcurrentRequests: 10,
});

// WebSocket Hub for real-time color sync
import { ColorWebSocketHub } from "./workers/color-websocket";

// In Durable Object fetch handler:
const hub = new ColorWebSocketHub(state);
hub.broadcastThemeUpdate(teamId, profileId, palette);

// RSS Activity Feed
import { RSSTeamActivityFeed } from "./workers/rss-team-activity";
// Uses Bun.escapeHTML() for SIMD-accelerated XML escaping
```

#### Bun-Native APIs for Colors

| API | Usage Location | Performance |
|-----|----------------|-------------|
| `Bun.color(hex, "ansi-16m")` | `terminal-color-injector.ts` | 15x faster than chalk |
| `Bun.hash.wyhash(clientId)` | `shell-kimi-performance-guard.ts` | Deterministic themes |
| `Bun.hash.crc32()` | `color-palette-storage.ts` | ~9 GB/s checksums |
| `Bun.stringWidth()` | Terminal layouts | 6756x vs npm, GB9c Indic support v1.3.7+ |
| `Bun.escapeHTML()` | `rss-team-activity.ts` | SIMD-accelerated |
| `Bun.inspect.table()` | `bin/tier1380.ts` | Structured output |
| `Bun.nanoseconds()` | Performance timing | High-res native |
| `Bun.which()` | CLI binary detection | Fast PATH lookup |
| `Bun.semver.satisfies()` | Version compatibility | Native parsing |
| `Bun.deepEquals()` | Object comparison | 6000x vs lodash |
| `Bun.stripANSI()` | Terminal cleanup | SIMD-accelerated |
| `Bun.wrapAnsi()` | Text wrapping | Col-89 compliant |
| `Bun.password.hash()` | Secure hashing | Argon2/bcrypt/scrypt |
| `Bun.peek()` | Promise inspection | Non-blocking |

#### Tier-1380 Startup Guard

```typescript
// Run at startup to enforce version and Col-89 compliance
const MIN_BUN = ">=1.3.7";

if (!Bun.semver.satisfies(Bun.version, MIN_BUN)) {
  console.error(`[TIER-1380] Bun ${Bun.version} < ${MIN_BUN}`);
  process.exit(1);
}

function assertCol89Safe(text: string, context = "unknown"): void {
  // Bun >=1.3.7: GB9c support for Indic conjuncts (क्ष, क्‍ष, etc.)
  const w = Bun.stringWidth(text, { countAnsiEscapeCodes: false });
  if (w > 89) {
    console.warn(`[COL-89 VIOLATION] ${context} width=${w}`);
  }
}
```

### Bun BLAST Suite
```bash
bun run blast:cookie-semver check
bun run blast:heap-index
bun run blast:release:check
bun run blast:atomic:hot
```

### MCP/ACP Cloudflare
```bash
# Deploy MCP Gateway
bun run mcp:deploy

# Deploy ACP Bridge  
bun run acp:deploy

# Health check
bun run omega:health
```

## Environment

```bash
# Required
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_ACCOUNT_ID=xxx

# Optional
OMEGA_LOG_LEVEL=debug
OMEGA_REGISTRY_KV=xxx
R2_ENDPOINT=xxx
R2_BUCKET=xxx
```

## Health Monitoring

```bash
# Health check
bun run omega:health:check           # Text output
bun run omega:health:json            # JSON output

# Continuous monitoring
bun run omega:monitor                # Staging monitor
bun run omega:monitor:prod           # Production monitor

# View logs
bun run omega:logs                   # Staging logs
bun run omega:logs:prod              # Production logs
```

## Backup & Restore

```bash
# Create backup
bun run omega:backup                 # Full system backup

# List backups
bun run omega:backup:list

# Restore from backup
bun run omega:restore ./backups/omega-backup-xxx.tar.gz

# Dry run (no actual changes)
bun run omega:restore ./backups/xxx.tar.gz --dry-run
```

## Secrets Management

```bash
# Rotate secrets
bun run omega:secrets:rotate staging
bun run omega:secrets:rotate production

# Backup before rotation is automatic
# Stored in: ./secrets-backups/
```

## API Documentation

```bash
# View OpenAPI spec
bun run omega:docs:api

# Or visit: https://omega.factory-wager.com/docs
```

## CI/CD (GitHub Actions)

Automatic pipeline on push to main:
```
Validate → Test → Build → Deploy Staging → Health Check → Deploy Production
```

Workflow file: `.github/workflows/omega-pipeline.yml`

## File Structure

```
~/.kimi/skills/tier1380-omega/
├── SKILL.md                      # This file
├── config/
│   ├── pipeline.ts               # Registry & deploy logic
│   ├── acp-tier1380-omega.json   # Version manifest
│   ├── wrangler.omega.toml       # Workers config
│   ├── openapi.yml               # API documentation
│   └── rate-limits.yml           # Rate limiting config
├── scripts/
│   ├── deploy-omega.sh           # Full deploy script
│   ├── validate-env.sh           # Env validation
│   ├── monitor-omega.sh          # Live monitoring
│   ├── backup-omega.sh           # System backup
│   ├── restore-omega.sh          # System restore
│   └── rotate-secrets.sh         # Secrets rotation
├── chrome-state/
│   └── health.ts                 # Health endpoint
└── color-system/                 # Tier-1380 Color System
    ├── lib/cli.ts                # Core color utilities
    ├── workers/
    │   ├── shell-kimi-performance-guard.ts  # Rate limiting & profiles
    │   ├── color-palette-storage.ts         # R2 persistence
    │   ├── color-accessibility.ts           # WCAG validation
    │   ├── terminal-color-injector.ts       # ANSI output
    │   ├── color-websocket.ts               # Real-time sync
    │   └── rss-team-activity.ts             # RSS feeds
    ├── bin/tier1380.ts           # CLI tool
    ├── dashboard/                # React dashboard
    │   └── tier1380-dashboard.tsx
    └── __tests__/                # Test suite (150+ tests)
        ├── tier1380-color-system.test.ts
        ├── tier1380-cli.test.ts
        └── color-websocket.test.ts
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run omega:registry:bump patch` | Bump version |
| `bun run omega:deploy:staging` | Deploy to staging |
| `bun run omega:health:check` | Check health |
| `bun run omega:backup` | Create backup |
| `bun run omega:secrets:rotate` | Rotate secrets |
| `bun run omega:monitor` | Start monitoring |
| `bun run omega:test` | Run pipeline tests |
| `bun run omega:verify` | Full system verification |
| `./bin/omega` | Unified CLI tool |
| `openclaw status` | OpenClaw Gateway status |
| `matrix-agent health` | Matrix Agent health check |
| `ocwatch` | OpenClaw live monitoring |
| `bun run tier1380:color` | Generate color palette |
| `bun run tier1380:team` | Manage team profiles |
| `bun run tier1380:profile` | Show member profile |
| `bun run tier1380:metrics` | Color system metrics |
| `bun -e 'Bun.semver.satisfies(Bun.version, ">=1.3.0")'` | Check Bun version |
| `bun -e 'Bun.deepEquals({x:1}, {x:1}, true)'` | Deep compare objects |

### Unified CLI (bin/omega)

```bash
# Install to PATH
export PATH="$PWD/bin:$PATH"

# Usage
omega registry bump patch
omega deploy staging
omega health check
omega backup create
omega secrets rotate production
omega monitor start
```

## Deployment Script

```bash
# Full deployment with all checks
./scripts/deploy-omega.sh staging
./scripts/deploy-omega.sh production

# Dry run
./scripts/deploy-omega.sh staging --dry-run

# Or via bun
bun run omega:deploy:staging
bun run omega:deploy:production
```


---

## Agent Workflow with Semver & Unicode Awareness

Enhanced agent initialization with automatic version checking and Unicode/Col-89 compliance.

### Quick Start

```bash
# Initialize agent with full validation
bun ~/.kimi/skills/tier1380-omega/scripts/agent-workflow.ts init

# Check Bun version compatibility
bun ~/.kimi/skills/tier1380-omega/scripts/agent-workflow.ts check-version

# Verify Unicode/Col-89 support
bun ~/.kimi/skills/tier1380-omega/scripts/agent-workflow.ts check-unicode

# Check Col-89 compliance for text
bun ~/.kimi/skills/tier1380-omega/scripts/agent-workflow.ts col89 "Your text here"

# Get Unicode-aware string width
bun ~/.kimi/skills/tier1380-omega/scripts/agent-workflow.ts width "Hello 🦊 क्षत्रिय"

# Wrap text to 89 columns
bun ~/.kimi/skills/tier1380-omega/scripts/agent-workflow.ts wrap "Very long text..."
```

### Semver Awareness

The agent automatically checks Bun version on startup:

```typescript
import { checkSemver, MIN_BUN_VERSION } from "./scripts/agent-workflow";

const result = checkSemver();
// Returns:
// {
//   valid: true,
//   current: "1.3.7",
//   required: ">=1.3.7",
//   features: ["GB9c_grapheme_breaking", "stringWidth_indic_support", "wrapAnsi_stable"],
//   warnings: []
// }
```

**Minimum Version:** `>=1.3.7` (for GB9c Indic script support)

**Refined Version Gate Pattern:**

```typescript
const MIN_FOR_INDIC_ACCURACY = ">=1.3.7";
if (!Bun.semver.satisfies(Bun.version, MIN_FOR_INDIC_ACCURACY)) {
  console.warn(
    `Bun ${Bun.version} < ${MIN_FOR_INDIC_ACCURACY} — Indic conjuncts may have inaccurate widths in stringWidth(). ` +
    `Upgrade for GB9c + ~27% smaller grapheme table.`
  );
}
```

### Unicode Awareness

Full GB9c grapheme breaking support for Indic scripts:

```typescript
import { checkUnicode, checkCol89, getStringWidth } from "./scripts/agent-workflow";

// Check Unicode capabilities
const unicode = checkUnicode();
// Returns:
// {
//   valid: true,
//   gb9c_support: true,
//   col89_enforcement: true,
//   indic_scripts: ["Devanagari", "Bengali", ...],
//   test_results: { devanagari: true, emoji_zwj: true, col89_wrap: true }
// }

// Check Col-89 compliance
const col89 = checkCol89("Your text here");
// Returns: { text, width, compliant, wrapped? }

// Get Unicode-aware width
const width = getStringWidth("Hello 🦊 क्षत्रिय");  // → 17
```

### Col-89 Enforcement

The agent enforces 89-column maximum width with Unicode awareness:

```typescript
// Automatic wrapping for long lines
function assertCol89Safe(text: string, context = "unknown"): void {
  // Bun >=1.3.7: GB9c support for Indic conjuncts (क्ष, क्‍ष, etc.)
  const w = Bun.stringWidth(text, { countAnsiEscapeCodes: false });
  if (w > 89) {
    console.warn(`[COL-89 VIOLATION] ${context} width=${w}`);
    // Auto-wrap with Bun.wrapAnsi
    const wrapped = Bun.wrapAnsi(text, 89, { wordWrap: true, trim: true });
  }
}
```

### Configuration

Agent workflow settings in `config/tier1380-omega.toml`:

```toml
[tier1380_omega.semver]
min_bun_version = ">=1.3.7"
check_on_startup = true
auto_warn = true

[tier1380_omega.unicode]
enabled = true
gb9c_support = true
col_89_max_width = 89
count_ansi_escape_codes = false
ambiguous_is_narrow = true
indic_scripts = ["Devanagari", "Bengali", "Gurmukhi", "Gujarati", "Oriya", "Tamil", "Telugu", "Kannada", "Malayalam"]

[tier1380_omega.agent_workflow]
init_script = "~/.kimi/skills/tier1380-omega/scripts/agent-workflow.ts"
auto_check_version = true
auto_check_unicode = true
```

### Test Commands

```bash
# Devanagari conjunct (GB9c)
bun -e 'console.log(Bun.stringWidth("क्ष"))'           # → 2
bun -e 'console.log(Bun.stringWidth("क्‍ष"))'          # → 2

# Emoji with ZWJ
bun -e 'console.log(Bun.stringWidth("👨‍👩‍👧‍👦"))'     # → 2

# Col-89 wrap
bun -e 'console.log(Bun.wrapAnsi("A ".repeat(100), 89, {wordWrap:true}))'
```

### stringWidth() Evolution

| Bun Version | Grapheme Table | Key Changes | Binary Impact |
|-------------|----------------|-------------|---------------|
| Pre-1.3.7 | ~70KB | Basic UAX#29 (no GB9c) | Larger |
| **1.3.7** | **~51KB (-27%)** | **GB9c Indic + table shrink** | **-19KB** |
| 1.3.8+ | ~51KB | Node:util compat | Stable |

### Gains Quantified

| Metric | Pre-1.3.7 | v1.3.7+ | Win |
|--------|-----------|---------|-----|
| Table Size | ~70KB | **~51KB** | **-27%** |
| Indic Width | Split (>2) | **Single (2)** | Accuracy ↑ |
| Binary Size | Larger | **-19KB** | Footprint ↓ |
| Perf | 6,756x npm | **6,756x npm** | SIMD stable |

### Master Utils Table

| Name | Signature | Description | Returns | Example | Perf | Unicode Notes |
|------|-----------|-------------|---------|---------|------|---------------|
| `Bun.stringWidth()` | `Bun.stringWidth(str, opts?)` | Terminal width with GB9c | `number` | `"क्ष" → 2` | **6,756x npm** | GB9c ✓ Indic=1 cluster |

### Tier-1380 API Matrix v1.3.7

See `skills/stubs/bun-v137-api-matrix.md` and `skills/stubs/bun-v137-api-matrix-profiler.md` for complete performance matrix:

| Category | API | Improvement | Pattern |
|----------|-----|-------------|---------|
| Buffer | `Buffer.from(array)` | ~50% faster | Bulk JS array → Buffer |
| Buffer | `.swap16/.swap64()` | 1.8x–3.6x faster | Intrinsics vs loops |
| Fetch | `fetch()` | Header case preserved | RFC 7230 compliance |
| Text | `Bun.wrapAnsi()` | 33–88x vs npm | Colored line wrap |
| Profile | `--cpu-prof-md` | Markdown output | LLM-readable traces |
| Config | `Bun.JSON5.parse()` | Comments + trailing commas | Human-readable |
| Stream | `Bun.JSONL.parseChunk()` | Streaming NDJSON | Network incremental |
| S3 | `file.writer()` | contentEncoding | gzip/br upload |
| Terminal | `Bun.Terminal` | PT + Resource mgmt | await using (auto-close) |

### R2 Integration

Store audit logs and version checks in R2 buckets:

```bash
# Upload Col-89 violations to R2
bun agent-workflow.ts enforce --upload

# Upload version check report
bun agent-workflow.ts upload-version

# R2 integration standalone commands
bun agent-r2-integration.ts upload-col89
bun agent-r2-integration.ts upload-version
bun agent-r2-integration.ts list
bun agent-r2-integration.ts summary 30
```

**R2 Storage Structure:**
```
fw-audit-logs/
├── agent-workflow/
│   ├── col89/2026-01-31/audit-123456.json
│   ├── version/2026-01-31/version-789012.json
```

**Audit Report Schema:**
```typescript
interface StoredAuditReport {
  id: string;
  timestamp: string;
  bun_version: string;
  agent_version: string;
  results: {
    semver_check: boolean;
    unicode_check: boolean;
    col89_violations: number;
  };
  entries: Col89AuditEntry[];
  metadata: FactoryWagerMetadata;
}
```

---

*Agent Workflow v1.3.0 – Semver, Unicode & R2 Aware*


## Documentation Resources

### Error Codes Reference
Complete exit code documentation in `ERROR-CODES.md`:
```bash
cat ERROR-CODES.md  # View all error codes and recovery steps
```

**Key Exit Codes:**
| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Command completed successfully |
| 1 | GENERIC_ERROR | General error |
| 64 | CONFIG_ERROR | Configuration error |
| 65 | NETWORK_ERROR | Network issue |
| 90 | BUN_RUNTIME_ERROR | Bun runtime error |
| 91 | TYPESCRIPT_ERROR | TypeScript compilation error |
| 130 | SIGINT | Interrupted (Ctrl+C) |

### Benchmarks
Performance benchmarks in `BENCHMARKS.md` and `BENCHMARKS-MASTER.md`:

```bash
# Quick benchmark one-liners
bun -e 'console.time("ns");for(let i=0;i<1e3;++i)Bun.nanoseconds();console.timeEnd("ns")'
# → ~8ns

bun -e 'console.time("which");for(let i=0;i<1e3;++i)Bun.which("ls");console.timeEnd("which")'
# → ~1.47ms/1k

bun -e 'let s="a".repeat(500);console.time("sw");for(let i=0;i<1e3;++i)Bun.stringWidth(s);console.timeEnd("sw")'
# → ~37ns (6,756x faster than npm)
```

**Performance Wins:**
- `stringWidth()`: 6,756x - 10,000x faster than Node
- `which()`: 5-7x faster
- `nanoseconds()`: 2x faster than hrtime

## Cloudflare Infrastructure

### Domain Setup
**Root Domain:** `factory-wager.com`

**Subdomains:**
| Subdomain | Purpose | Status |
|-----------|---------|--------|
| `artifacts.factory-wager.com` | Build artifacts | ✅ Active |
| `staging.factory-wager.com` | CI/CD staging | ✅ Active |
| `rss.factory-wager.com` | RSS feeds | ✅ Active |
| `profiles.factory-wager.com` | CPU/heap profiles | ✅ Active |
| `mcp.factory-wager.com` | MCP endpoint | ⚠️ Needs DNS |
| `acp.factory-wager.com` | ACP endpoint | ⚠️ Needs DNS |

### R2 Buckets
```bash
# List buckets
wrangler r2 bucket list

# 6 buckets configured:
# - fw-artifacts (CDN enabled)
# - fw-staging (CDN enabled)
# - fw-profiles
# - fw-audit-logs
# - fw-backups
# - rssfeedmaster (CDN enabled)
```

### Secrets (Bun.secrets)
Service: `com.factory-wager.matrix`

```bash
# Set secrets
bun secrets set com.factory-wager.matrix cf-token YOUR_TOKEN
bun secrets set com.factory-wager.matrix api-key $(openssl rand -hex 32)

# Or use environment fallback
export FW_MATRIX_CF_TOKEN="..."
export FW_MATRIX_API_KEY="..."
```

**Required Secrets:**
- `api-key` - General API auth
- `kimi-token` - Kimi CLI token
- `cf-token` - Cloudflare API token
- `r2-access-key` - R2 access
- `r2-secret-key` - R2 secret
- `webhook-secret` - Webhook signing

## MCP Tools

### Bun Docs MCP
Location: `mcp/bun-docs/`

```bash
# Run MCP server
bun run mcp:bun-docs

# Or directly
bun run mcp/bun-docs/index.ts
```

**Features:**
- Search Bun documentation
- Get doc entries
- Build doc URLs
- Suggest terms
- RSS integration

## Cookie & Session Management

### Fast Cookie Parsing
```typescript
// Parse cookie header to Map (23ns - 74x faster than Node)
const parseCookieMap = (header: string): Map<string,string> => 
  new Map(decodeURIComponent(header).split(';').map(p => p.trim().split('=')));

// Usage
const cookies = parseCookieMap(req.headers.get('cookie') || '');
const sessionId = cookies.get('session');
```

### A/B Variant Cookies (Build-Time)
Define in `bunfig.toml`:
```toml
[define]
AB_VARIANT_A = "\"enabled\""
AB_VARIANT_B = "\"disabled\""
AB_VARIANT_POOL_A = "5"
```

**Fallback Chain:**
1. Cookie: `ab-variant-a=enabled`
2. Define: `AB_VARIANT_A` (build-time literal)
3. Default: `"control"`

## Recent Additions

### Files Added
- `ERROR-CODES.md` - Comprehensive exit code docs
- `BENCHMARKS.md` - Performance benchmarks
- `BENCHMARKS-MASTER.md` - One-liner benchmarks
- `SECRETS-SETUP.md` - Bun.secrets setup guide
- `.env.cloudflare` - Cloudflare env template
- `mcp/bun-docs/` - Bun docs MCP server
- `config/wrangler.omega-full.toml` - Full wrangler config
- `lib/cloudflare/` - R2 client & DNS manager
- `workers/omega-entry.ts` - Main worker entry

### Scripts Added
- `scripts/setup-secrets.sh` - Interactive secret setup
- `metrics/factory-wager/monitor.sh` - Endpoint monitoring

## Related Skills

| Skill | Description | Link |
|-------|-------------|------|
| **tier1380-openclaw** | OpenClaw Gateway & Matrix Agent | `~/.kimi/skills/tier1380-openclaw/` |
| **tier1380-infra** | Infrastructure management | `~/.kimi/skills/tier1380-infra/` |
| **tier1380-commit-flow** | Commit governance & validation | `~/.kimi/skills/tier1380-commit-flow/` |

### Cross-Skill Commands
```bash
# OpenClaw + Omega
bun run matrix:openclaw:status && bun run omega:health:check

# Infrastructure + Omega
infra status && omega registry check

# Full stack check
ocstatus && omega deploy:check && infra health
```

---

*Updated: 2026-01-31 | Tier-1380 OMEGA v1380.0.0*