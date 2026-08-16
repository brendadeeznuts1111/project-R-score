# Project R targets and navigation

`repo-map.json` is the executable source of truth for optional cross-target
navigation. This reference explains how to use it without copying target counts,
anchors, or the package script catalog.

Direct `outline`, `files`, `search`, `scan`, and `replace` commands accept paths
and do not require the map or symbol index.

## Choose the smallest route

| Need                             | Route                                     |
| -------------------------------- | ----------------------------------------- |
| One file or directory            | `outline <path>`                          |
| Files containing a syntax shape  | `files <pattern> --path <path>`           |
| Matched lines and context        | `search <pattern> --path <path>`          |
| Curated target inventory         | `map --list`                              |
| Guided read order for one domain | `nav --zone <zone>`                       |
| Cross-target symbol lookup       | `index --refresh`, then `jump` or `index` |
| Imports and declared edges       | `graph --zone <zone>`                     |
| Stale map entries                | `discover --zone <zone>`                  |

Run examples from the repository root:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py map --list
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py zones --stats
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py nav --zone agents --digest
```

## Zones

The current map groups targets by ownership rather than filesystem depth:

| Zone              | Scope                                              |
| ----------------- | -------------------------------------------------- |
| `sports-terminal` | Runtime entrypoints and connected active products  |
| `kimi`            | Sports plugin scripts, shared code, and MCP server |
| `packages`        | Shared packages and selected `lib/` foundations    |
| `agents`          | Repository-owned agent skills                      |
| `toolchain`       | Explicit adjacent toolchain repositories           |

List the live targets instead of relying on a copied count:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py zones --zone agents
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py discover --zone agents
```

`discover` reports candidates that are not mapped. A missing target and an
unmapped target are different conditions; inspect both before editing
`repo-map.json`.

## Navigation cache

The symbol index is a disposable cache for cross-target operations only. Build
it immediately before index-backed work:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py index --refresh
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py index --status
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py jump --name resolveBinary --zone agents
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py anchors --zone agents --fail-on
```

Use:

- `index --name <symbol>` for occurrences across targets.
- `exports` for exported declarations.
- `collisions` for names appearing in multiple targets.
- `anchors --fail-on` to validate curated navigation anchors.
- `graph` for imports plus explicit `depends_on` edges.

Refresh the cache after source or map changes. A clean index is navigation
evidence, not type resolution or project proof.

## Bun-aware outlines and scans

`outline-rules/bun-monorepo.yml` adds Bun API and repository-specific extractors
to ordinary structure output:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py outline scripts/rate-removal-candidates.ts --bun-rules --view digest
```

The bundled scan configuration and rules are repository-local:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py rules
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py scan --path scripts
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py audit --only agents --fail-on
```

Preview autofixes before applying them. YAML rule snapshots prove rule matching;
the affected project still owns formatting, types, tests, and merge proof.

## Package-owned specialized lanes

The ast-grep package also contains supply-chain, workflow, network, benchmark,
and test-profile experiments. They are not general AST-navigation prerequisites.
When a task explicitly names one of those lanes, inspect the current package
scripts instead of using a copied command list:

```bash
cd .agents/skills/ast-grep
bun run
```

Keep specialized fixture failures attributed to that lane. Do not weaken the
core doctor, smoke, rule snapshots, or repository merge proof to accommodate an
absent generated artifact.

## Map maintenance

When adding or changing a target:

1. Confirm the path and owner.
2. Prefer a narrow entry file or directory.
3. Put it in one primary zone.
4. Add anchors only for stable, useful symbols.
5. Declare `depends_on` only for an intentional target edge.
6. Refresh the index and run `anchors --fail-on`.
7. Run `bun run skills:validate` and the owning repository proof.

See [pattern guidance](patterns.md) for structural queries and safe rewrites.
