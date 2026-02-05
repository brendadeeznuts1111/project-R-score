# Tier-1380 OMEGA Governance Rules

**Version**: 3.29.0  
**Applies to**: All Tier-1380 OMEGA project contributions

---

## Table of Contents

1. [Code Quality Standards](#code-quality-standards)
2. [Security Standards](#security-standards)
3. [Matrix Compliance](#matrix-compliance)
4. [Performance Standards](#performance-standards)
5. [Documentation Standards](#documentation-standards)
6. [Commit Standards](#commit-standards)
7. [Enforcement](#enforcement)

## Code Quality Standards

### Biome Configuration

- Use project `biome.json` configuration
- Indent: Tabs
- Line width: 100 characters
- Quote style: Double
- Semicolons: Always

### TypeScript Standards

- Strict mode enabled
- No `any` types (use `unknown` with type guards)
- Explicit return types on exported functions
- No unused variables

### Test Requirements

- Minimum 80% coverage for new code
- All tests must pass before commit
- Use `bun:test` with `it()` not `test()`

## Security Standards

### Secrets Management

- No hardcoded secrets in code
- Use `.env` files (gitignored)
- Use `Bun.env` for runtime access
- Validate all inputs

### Safe Operations

- No `rm -rf /` or equivalent
- No fork bombs
- Validate file paths before operations
- Use atomic writes for critical files

## Matrix Compliance

### Column Standards (0-96)

- All columns must have proper metadata
- Zone assignments must be correct
- Profile links must be HTTPS
- Required fields must be populated

### Skills Compliance (89-95)

- **Col 89**: No markdown tables outside code blocks
- **Col 90**: Use `it()` not `test()`
- **Col 91**: `Bun.deepEquals()` with 2+ params
- **Col 92**: `import.meta.hot.decline()` with parens
- **Col 93**: Balanced braces in code blocks
- **Col 94**: Use `Response.json()` not `new Response(JSON.stringify())`
- **Col 95**: Aggregate score must be 100/100

### Color System Standards (96-100)

- **Col 96**: Use `Bun.color()` for all color conversions
- **Col 97**: WCAG AA contrast ratio ≥ 4.5:1 for normal text
- **Col 98**: WCAG AAA contrast ratio ≥ 7:1 for enhanced text
- **Col 99**: Team palettes must be deterministic per member
- **Col 100**: Terminal output must use Bun-native ANSI generation

## Performance Standards

### Bun Optimizations

- Use `Bun.hash.crc32()` for integrity
- Use `Bun.hash.wyhash()` for fast hashing
- Use `Bun.nanoseconds()` for timing
- Use `Bun.inspect.table()` for output
- Use `Bun.color()` for color conversion
- Use `Bun.stringWidth()` for terminal width
- Use `Bun.escapeHTML()` for XML/HTML escaping
- Use `Bun.stripANSI()` for ANSI code removal
- Use `Bun.wrapAnsi()` for text wrapping
- Use `Bun.which()` for binary detection
- Use `Bun.semver.satisfies()` for version checks
- Use `Bun.deepEquals()` for object comparison
- Use `Buffer.from()` for binary data

### Agent Workflow Standards

#### Semver Awareness

- **Minimum Bun version:** `>=1.3.7` (for GB9c Indic support)
- **Check on startup:** Use `checkSemver()` from agent-workflow.ts
- **Auto-warn:** Log warnings for version mismatches
- **Feature gates:** Check `Bun.semver.satisfies()` before using new APIs

#### Unicode Awareness

- **GB9c support:** Verify Indic conjunct handling (Bun >=1.3.7)
- **Col-89 enforcement:** Use `Bun.stringWidth({countAnsiEscapeCodes: false})`
- **String wrapping:** Use `Bun.wrapAnsi(text, 89, {wordWrap: true, trim: true})`
- **Indic scripts:** Test with क्ष, क्‍ष, क्क्क for Devanagari

#### Agent Initialization

```typescript
// Required at agent startup
import { initAgent } from "./scripts/agent-workflow";

const { semver, unicode } = await initAgent();
// Exits with error if semver check fails
// Warns if Unicode support incomplete
```

### Memory Management

- No memory leaks in long-running processes
- Proper cleanup of resources
- Use `Bun.gc()` only in development

### Tier-1380 Hardened Defaults

| Context | Recommended Preset / Guardrail | Tier Compliance |
|---------|-------------------------------|-----------------|
| **Audit log rendering** | `{ depth: 5, colors: false, compact: 3 }` + manual array truncate at 50 items | Col-89, DoS prevention |
| **Col-89 enforcement** | `Bun.stringWidth(…, {countAnsiEscapeCodes: false}) ≤ 89`<br>`Bun.wrapAnsi(…, 89, {wordWrap:true, trim:true})` | Core invariant |
| **deepEquals mode** | `strict: true` for security/exact matches<br>`strict: false` for config/schema drift | Zero-trust exact match |
| **semver gate** | `Bun.semver.satisfies(Bun.version, ">=1.3.7")` at startup | GB9c Indic support, stringWidth accuracy |
| **table() row limit** | Slice input to ≤ 30–50 rows before `Bun.inspect.table` | Terminal readability |
| **Bun.inspect depth** | Always check `if (depth === 0) return "…"` in custom inspectors | Prevent blow-up |
| **Bun.TOML.parse** | Always wrap in try/catch, validate shape with deepEquals | Error resilience |

### Bun.inspect Known Divergences (Audit Summary)

**Verified Jan 30, 2026 against Bun ~1.3.x:**

| Option | Bun Behavior | Node.js `util.inspect` | Tier-1380 Recommendation |
|--------|--------------|------------------------|--------------------------|
| `maxArrayLength` | **Ignored** — no truncation | Respected | Implement manual array limits |
| `maxStringLength` | **Ignored** — full strings shown | Respected | Implement manual string limits |
| `depth` | Respected correctly | Respected | Safe to use |
| `compact` | Respected correctly | Respected | Safe to use |
| `showHidden` | Respected correctly | Respected | Safe to use |
| `colors` | Respected correctly | Respected | Safe to use |

**Key Takeaway:** Never rely on `maxArrayLength` or `maxStringLength` for output control in Bun — implement manual truncation.

### Startup Guard Block (Tier-1380)

```typescript
// tier1380-guard.ts - Run at startup
const MIN_BUN = ">=1.3.7";

if (!Bun.semver.satisfies(Bun.version, MIN_BUN)) {
  console.error(`[TIER-1380] Bun ${Bun.version} < ${MIN_BUN}`);
  process.exit(1);
}

function assertCol89Safe(text: string, context = "unknown"): void {
  const w = Bun.stringWidth(text, { countAnsiEscapeCodes: false });
  if (w > 89) {
    console.warn(`[COL-89 VIOLATION] ${context} width=${w}`);
  }
}
```

## Documentation Standards

### AGENTS.md Updates

- Update when workflow changes
- Document new tools/skills
- Keep configuration current

### Code Comments

- JSDoc for exported functions
- Inline comments for complex logic
- No commented-out code

## Commit Standards

### Message Format

```
[DOMAIN][COMPONENT][TIER:XXXX] Brief description (50 chars)

Detailed explanation (if needed):
- Point 1
- Point 2

Refs: #issue
```

### Domains

| Domain | Description |
|--------|-------------|
| RUNTIME | Bun runtime features |
| PLATFORM | Infrastructure, deployment |
| SECURITY | Security-related |
| API | API endpoints |
| UI | User interface |
| DOCS | Documentation |
| CONFIG | Configuration |
| TEST | Testing |
| BENCH | Benchmarking |
| STYLE | Code style |

### Components

| Component | Description |
|-----------|-------------|
| CHROME | Chrome State |
| MATRIX | Matrix columns |
| BLAST | Bun BLAST |
| TELEMETRY | Live telemetry |
| SKILLS | Skills standards |
| KIMI | Kimi CLI |
| BUILD | Build system |
| DEPLOY | Deployment |

## Enforcement

### Pre-Commit Hooks

Bun-Pure hooks run automatically:
1. TypeScript syntax check
2. Biome lint/format
3. Test validation (if configured)

### CI/CD Checks

- All tests must pass
- Skills compliance 100%
- No security vulnerabilities
- Performance benchmarks within threshold
