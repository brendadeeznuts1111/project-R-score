# AGENTS — full guide

Extended agent guide for the FactoryWager monorepo. **Start at root** [`AGENTS.md`](../AGENTS.md) for remotes, branded IDs, wire-boundary rules, and delivery. This file adds layout, install, docs map, and Bun API discipline without duplicating root policy.

| | |
| --- | --- |
| **Thin entry (read first)** | [`../AGENTS.md`](../AGENTS.md) |
| **Last aligned** | 2026-07-20 |

---

## Policy SSOT (do not fork)

| Concern | Document |
|---------|----------|
| Operating rules, brands, wire boundary (summary) | [`../AGENTS.md`](../AGENTS.md) |
| Coding standards | [`../.custom-instructions.md`](../.custom-instructions.md) · [DEVELOPMENT-STANDARDS.md](./DEVELOPMENT-STANDARDS.md) |
| Bun install / bunfig / CI cache | [UNIFIED.md](./UNIFIED.md) |
| Wire boundary (parse once, full map) | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |
| Package import graph | [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md) |
| Workspace map | [`../STRUCTURE.md`](../STRUCTURE.md) |
| Path SSOT in code | [`../lib/docs/repo-docs.ts`](../lib/docs/repo-docs.ts) |
| Harness thesis | [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) |

If this file disagrees with root `AGENTS.md` or `UNIFIED.md` / `WIRE_BOUNDARY.md`, **those win**.

---

## What this monorepo is

- **Name:** FactoryWager Enterprise Platform (Bun-native monorepo)
- **Runtime:** Bun 1.4.x (see root `packageManager` / `bun --version`)
- **Language:** TypeScript, ESM (`"type": "module"`)
- **Spine:** `lib/`, `packages/`, `scripts/`, `tools/`, `docs/`, selected `projects/active/*` workspaces
- **Not the spine:** nested own-repos under `projects/active/` (often gitignored), `archive/`, experimental parks — see [`STRUCTURE.md`](../STRUCTURE.md)

---

## Layout agents should load

```text
Projects/
├── AGENTS.md                 # thin entry
├── README.md · STRUCTURE.md · .custom-instructions.md
├── docs/
│   ├── AGENTS.md             # this file
│   ├── UNIFIED.md            # install policy
│   ├── WIRE_BOUNDARY.md      # parse-once / unknown
│   ├── DEVELOPMENT-STANDARDS.md
│   └── IMPORT_BOUNDARIES.md
├── lib/                      # shared harness
│   ├── types/branded/        # brands (boundary)
│   ├── docs/repo-docs.ts     # CANONICAL_* paths
│   ├── console-depth.ts
│   └── security/r2-credentials.ts
├── config/eslint/plugin-harness/  # boundary ESLint
├── tools/                    # bun-doc-refs, brand-*, harness-violations
├── scripts/                  # CI, hygiene, pre-commit
└── package.json · bunfig.toml
```

Prefer root `package.json` scripts over inventing paths.

---

## Bun install (summary)

Full detail: [UNIFIED.md](./UNIFIED.md).

- Machine SSOT: `~/.bunfig.toml` — `linker = "isolated"`, `globalStore = true`, absolute `[install.cache].dir`
- Shell: `BUN_INSTALL` only for day-to-day — **no** `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` in IDE
- Root `bunfig.toml`: `frozenLockfile = false`, scopes, `[console]` / `[test]` — not machine linker/cache
- Verify: `bun run install:verify` · `bverify` · `bun run install:machine:health`

---

## Wire boundary + brands (summary)

Full detail: [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) · brands: [`lib/types/branded/README.md`](../lib/types/branded/README.md).

1. Parse **once** at the edge (`parse*`, `lib/types/branded/**`, type guards).
2. Interior uses **brands / domain types** — not bare `sessionId: string`, not `unknown` fun args.
3. No `decodeUnknownSync` outside the boundary.
4. Pre-commit: `branded-id-check --staged --strict` (no baseline) + harness ESLint.

```bash
bun tools/brand-catalog.ts SessionId
bun tools/branded-id-check.ts --staged --strict
bun tools/harness-violations.ts --path lib/types --rule unknown
bun run lint:harness
```

---

## Bun API references

Before using an unfamiliar `Bun.*` API:

```bash
bun tools/bun-doc-refs.ts suggest "Bun.secrets"
bun tools/bun-doc-refs.ts url "Bun.stringWidth"
```

Add `// @see <canonical-url>` near the usage. Pre-commit blocks staged Bun API use without refs.

Ground truth: [llms.txt](https://bun.com/docs/llms.txt) → `tools/bun-docs-index.json` → `tools/bun-doc-refs.ts`.

Console / inspect depth: [`lib/console-depth.ts`](../lib/console-depth.ts) (not raw deep `console.log`).

Editor jumps for violations: root `bunfig.toml` `[debug].editor` + `Bun.openInEditor` via:

```bash
bun tools/harness-violations.ts --path lib --rule unknown --open=3
```

---

## Documentation map (lib + docs + root)

| Doc | Role |
|-----|------|
| [`../README.md`](../README.md) | Human hub |
| [`../STRUCTURE.md`](../STRUCTURE.md) | Workspace tree |
| [`../AGENTS.md`](../AGENTS.md) | Agent entry |
| This file | Expanded agent guide |
| [UNIFIED.md](./UNIFIED.md) | Install / bunfig / CI |
| [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) | Parse-once types |
| [DEVELOPMENT-STANDARDS.md](./DEVELOPMENT-STANDARDS.md) | Standards quick ref |
| [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md) | Package import graph |
| [`../lib/README.md`](../lib/README.md) | Lib overview |
| [`../lib/docs/repo-docs.ts`](../lib/docs/repo-docs.ts) | `CANONICAL_REPO_DOCS` / `HARNESS` / `TOOLS` / `EXTERNAL` |
| [README.md](./README.md) | Docs index |

Historical / archive material under `docs/archives/` and long reports under `docs/` are **not** agent SSOT unless linked from the table above.

---

## Delivery

- Conventional commits; pre-commit: hygiene, harness lint, brands, Bun doc-refs, ast-grep when staged
- Parallel lanes: claim disjoint paths; do not stage other sessions’ dirty trees
- Push to `origin` ([project-R-score](https://github.com/brendadeeznuts1111/project-R-score)); do not default-push to `cascade`

---

## Related Bun guides (optional depth)

Pattern guides may live under `docs/guides/` or `docs/*GUIDE*` — use when implementing a specific API. Prefer `bun tools/bun-doc-refs.ts` for canonical URLs over outdated guide numbers.
