# Bun-First Guards & Linting

Global Bun harness for root paths (`lib/`, `scripts/`, `packages/`, `server/`, `config/`, `tools/`). Project-specific rules live in [`eslint.project.config.ts`](../eslint.project.config.ts).

## Quick Start

```bash
# Full harness gate (lint rollout + format + guard on strict inventory)
bun run check:harness

# Strict inventory lint (reads STRICT_INVENTORY from rollout.ts)
bun run lint:bun-native

# Files ready to promote to strict tier
bun run harness:promote

# Lightweight bun-native lint (no type-check OOM)
bun run lint:bun-native:rollout

# Browse one-liners and doc links
bun run dx:catalog
bun run dx:catalog tip
bun run dx:catalog search spawn

# Guard strict inventory files
bun run guard:bun-first:harness

# Grouped report — worst offenders, easy fixes, promotion candidates
bun run harness:report
bun run harness:report --easy-only
bun run harness:report --promote
bun run harness:report --json-out reports/harness/latest.json --md-out reports/harness/latest.md

# Background (non-blocking)
bun run harness:report --quiet --json-out reports/harness/latest.json --md-out reports/harness/latest.md &
```

## Config Map

| Layer | File | Purpose |
|-------|------|---------|
| DX catalog | [`config/bun-dx-catalog.ts`](../config/bun-dx-catalog.ts) | One-liners, doc URLs, guard patterns |
| Harness ESLint | [`eslint.harness.config.ts`](../eslint.harness.config.ts) | Global Bun-first rules (lightweight) |
| Bun-native gate | [`eslint.bun-native.config.ts`](../eslint.bun-native.config.ts) | Alias of harness config |
| Project overlay | [`eslint.project.config.ts`](../eslint.project.config.ts) | BUN_ naming, lib/ai overrides, Bun.color |
| Root compose | [`eslint.config.ts`](../eslint.config.ts) | Harness + project + type-checked TS |

## Rollout (warn → error)

- **Strict inventory** (`error`): files in [`config/eslint/harness/rollout.ts`](../config/eslint/harness/rollout.ts) `STRICT_INVENTORY`
- **Rollout** (`warn`): all other root harness paths
- Promote a file to strict when `bun run harness:promote` lists it (0 rollout warnings)

## Fix tiers (standard catches)

| Tier | Examples | Effort |
|------|----------|--------|
| **easy** | `env.read`, `cli.main`, `runtime.sleep`, `runtime.inspect` | Mechanical replace / wrap |
| **medium** | `file.read`, `spawn.exec`, `http.fetch`, `test.bun` | Localized async/API swap |
| **hard** | `http.serve`, `crypto.hash`, `file.stream` | Structural / security-sensitive |

See tiers on each entry in [`config/bun-dx-catalog.ts`](../config/bun-dx-catalog.ts).

## Grouped report (`harness:report`)

When rollout lint shows hundreds of flat warnings, use the grouped report:

```bash
bun run harness:report
```

Sections:

1. **Summary** — error/warning/file counts
2. **Worst offenders** — top files ranked by issue count with catalog breakdown
3. **By directory** — `lib/`, `scripts/`, etc.
4. **Standard catches (easy)** — sorted by count with `bun run dx:catalog <id>`
5. **By catalog** — rule families with sample `file:line` locations
6. **Promotion candidates** — files ready for `STRICT_INVENTORY`

Artifacts (gitignored under `reports/`):

```bash
bun run harness:report --json-out reports/harness/latest.json --md-out reports/harness/latest.md
```

Example digest:

```text
Harness Report — 775 warnings, 0 errors, 118 files with issues

Worst offenders
    42  lib/ai/example.ts  (env.read×28, file.read×9)

Standard catches (easy)
   200  env.read  Read environment variables
         → const apiKey = Bun.env.API_KEY;
         bun run dx:catalog env.read
```

## ESLint Plugin Rules

| Rule | Severity | Catalog ID |
|------|----------|------------|
| `bun/prefer-import-meta-main` | warn | `cli.main` |
| `bun/prefer-bun-env` | warn | `env.read` |
| `bun/prefer-bun-test` | warn | `test.bun` |
| `bun/prefer-bun-sqlite` | warn | `sqlite.bun` |

Every restricted-import message includes a one-liner and `https://bun.sh/docs/...` link from the catalog.

## Guard System

[`packages/guards/src/bun-first-guard.ts`](../packages/guards/src/bun-first-guard.ts) reads the same catalog as ESLint.

```bash
bun run packages/guards/src/bun-first-guard.ts scripts/dx-catalog-cli.ts
```

Example output:

```text
❌ tools/example.ts
  🔴 Line 22: Node.js module "child_process" should not be used
     💡 One-liner: const proc = Bun.spawn([...]);
     📖 https://bun.sh/docs/api/spawn
```

## Migration Patterns

### File System (fs → Bun)

```typescript
// BEFORE
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('config.json', 'utf8'));

// AFTER
const data = await Bun.file('config.json').json();
```

Docs: https://bun.sh/docs/api/file-io

### Child Process → Bun.spawn

```typescript
const proc = Bun.spawn(['bun', 'script.ts'], { stdio: ['inherit', 'inherit', 'inherit'] });
const exitCode = await proc.exited;
```

Docs: https://bun.sh/docs/api/spawn

### Environment → Bun.env

```typescript
const apiKey = Bun.env.API_KEY;
```

Docs: https://bun.sh/docs/runtime/env

## CI & Pre-commit

Pre-commit (`.husky/pre-commit`):

1. `repo-hygiene --staged`
2. `scripts/pre-commit-harness.ts` — fast bun-native ESLint + Prettier on staged harness files

CI (`ci:parallel`):

- Includes `check:harness` alongside build, test, and lint

Full type-checked ESLint remains on `bun run lint` (heavy; not in pre-commit).

## Related Documentation

- [Bun File I/O](https://bun.sh/docs/api/file-io)
- [Bun Spawn](https://bun.sh/docs/api/spawn)
- [Bun Test](https://bun.sh/docs/cli/test)
- [import.meta.main](https://bun.sh/docs/runtime/modules#import-meta-main)
- [QUICK_WINS_BUN_NATIVE.md](./QUICK_WINS_BUN_NATIVE.md)
