# Development Standards — Quick Reference

> Full: [`.custom-instructions.md`](../.custom-instructions.md) · Agents: [`AGENTS.md`](../AGENTS.md) · Wire: [`WIRE_BOUNDARY.md`](./WIRE_BOUNDARY.md) · Install: [`UNIFIED.md`](./UNIFIED.md)

## Terminology

| Prefer | Avoid |
|--------|--------|
| **artifact** | “codebase” (for delivered/proven things) |
| **repository** / **source tree** | “codebase” (for location) |
| **brand** | bare `string` domain IDs |

## Domain IDs (mandatory)

Parse once at the boundary. No `sessionId: string` / bare `id: string` without `// brand-ok`.

| Boundary | Constructor |
|----------|-------------|
| Wire | `parseXId(unknown)` |
| Optional | `tryXId(...)` |
| Trusted | `asXId(string)` |

```bash
bun tools/brand-catalog.ts
bun run check:brands:all
```

## TypeScript + Bun types (TS 6 / 7)

Canonical: [TypeScript 6 and 7](https://bun.com/docs/typescript-6) · [Suggested compilerOptions](https://bun.com/docs/typescript#suggested-compileroptions)

- Install `@types/bun`. On **TypeScript 6+**, omitting `compilerOptions.types` loads **nothing** — always set `"types": ["bun"]` (add `"react"` / `"node"` when needed; the array is an allowlist).
- Prefer `"bun"` over `"bun-types"` (same defs via `@types/bun` → `bun-types`).
- Bun-runtime island (full recommended options): [`tsconfig.bun.json`](../tsconfig.bun.json). Harness check extends it with full Bun best-practice flags (`strict`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, fallthrough/override) — [`tsconfig.check.json`](../tsconfig.check.json). Check keeps `lib: ["ESNext","DOM"]` for fetch/Response completeness and now covers `lib/{mcp,ai,factory,performance,r2,theme,…}` plus curated `config/eslint/harness/*`. Probe expansion: `bun tools/rank-check-includes.ts`.
- `@types/bun` / `bun-types` catalog pin is **1.3.14** (latest on npm as of 2026-07-22); runtime Bun ~1.4.0 — use narrow casts for lag APIs (`Bun.TOML.stringify`, `Bun.isStandaloneExecutable`) until 1.4 types publish.
- DOM / Pages surfaces keep [`tsconfig.base.json`](../tsconfig.base.json) (`lib` includes DOM). Do not paste Bun-init onto base.
- Catalog / peer / root `devDependencies` pin **TypeScript 6.0.3**. Spine configs set `"ignoreDeprecations": "6.0"` for `baseUrl` until the TS7 path migration.
- Audit: `bun run check:tsconfig-types` (`tools/tsconfig-types-audit.ts`) → `.tmp/tsconfig-types-audit.json` (walks `extends` for inherited `"types"`). Also in `ci:harness` cheap steps.
- Tools island (full ratchet under Bun recommended options): `bun run type-check:tools` → [`tools/tsconfig.json`](../tools/tsconfig.json) globs `*.ts` · `cli/*.ts` · `benchmarks/*.ts`. Probe candidates with `bun tools/expand-tools-tsconfig.ts`. Also in `ci:harness` cheap steps.
- Nested workspace **sports-terminal-os**: TypeScript `catalog:` (6.0.3) including frontend; day-loop `bun run typecheck` → [`tsconfig.check.json`](../projects/active/sports-terminal-os/tsconfig.check.json) (`allowImportingTsExtensions` + widened `rootDir` for monorepo `lib/` re-exports).
- Same `types: ["bun"]` rule applies to **TypeScript 7**.

## Everyday

```bash
bun run install:verify
bun run type-check
bun run type-check:tools
bun run check:tsconfig-types
bun run test:changed
bun run lint:harness
bun run harness:status
bun tools/bun-doc-refs.ts suggest "Bun.secrets"
```

## Before merge

- Tests / type-check clean on touched surface
- Harness eslint on staged paths (`--max-warnings 0`)
- Bun APIs have `// @see` when required
- Domain IDs branded; prose uses **artifact** not **codebase**

Map: [docs/README.md](./README.md) · brands: [`lib/types/branded/README.md`](../lib/types/branded/README.md).
