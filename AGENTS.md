# AGENTS.md

AI agent entrypoint for the FactoryWager monorepo (`~/Projects`).

**Git remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score) (this monorepo). `cascade` → [cascade-mover-v3](https://github.com/brendadeeznuts1111/cascade-mover-v3) (separate project — do not use as default push target).

## Canonical docs

| Role | Doc |
|------|-----|
| This file (agent entry) | [`AGENTS.md`](AGENTS.md) |
| Full agent guide | [`docs/AGENTS.md`](docs/AGENTS.md) |
| Human hub | [`README.md`](README.md) |
| Workspace map | [`STRUCTURE.md`](STRUCTURE.md) |
| Coding standards | [`.custom-instructions.md`](.custom-instructions.md) · [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md) |
| Bun install policy | [`docs/UNIFIED.md`](docs/UNIFIED.md) |
| Import boundaries | [`docs/IMPORT_BOUNDARIES.md`](docs/IMPORT_BOUNDARIES.md) |
| Projects triage | [`projects/README.md`](projects/README.md) |
| Path SSOT (code) | [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts) |

## Communication precision

Do not append an unrequested caveat, counterargument, or moralizing endcap to a sharp claim merely to demonstrate balance. If a boundary condition changes the truth of the claim, put it in the mechanism or scope the claim correctly. If it does not, cut it. Accuracy belongs in the argument; model self-protection does not.

## Operating rules

- **Parallel lanes:** before editing, `git status` for files dirty from other sessions. Claim disjoint lanes (files/directories nobody else is touching), name the lane split in commit messages, never sweep another session's dirty files into your commit (hook-generated formatting re-wraps excepted).
- **Delivery default:** close every batch with a conventional commit + push; the pre-commit gates (doc-refs, branded IDs staged + smart) must pass. Do not leave verified work uncommitted.
- **Task routing:**
  - Brands → [`lib/types/branded/README.md`](lib/types/branded/README.md) + [`lib/types/branded.ts`](lib/types/branded.ts) + `bun run check:brands`
  - Bun APIs → `bun tools/bun-doc-refs.ts suggest "<api>"` ([`tools/bun-doc-refs.ts`](tools/bun-doc-refs.ts))
  - Coding standards → [`.custom-instructions.md`](.custom-instructions.md)
  - Testing → nearest `*.test.ts` / [`tests/`](tests/) exemplar (e.g. [`tests/console-depth.test.ts`](tests/console-depth.test.ts))

**Bun install policy (machine + workspace):** [`docs/UNIFIED.md`](docs/UNIFIED.md)

## Machine Bun policy (summary)

Machine SSOT is `~/.bunfig.toml` (`linker = "isolated"`, `globalStore = true`, `frozenLockfile = true`, `minimumReleaseAge = 259200`, absolute `[install.cache].dir`); env in `~/.config/shell/bun.sh` (`BUN_INSTALL`, `NO_PROXY` — **no** `BUN_INSTALL_GLOBAL_STORE`); PATH in `~/.config/shell/path.sh`. Full component table: [`docs/UNIFIED.md`](docs/UNIFIED.md).

- Workspace `bunfig.toml` holds **project-specific** overrides only (`frozenLockfile`, scopes, `[test]`, etc.) — do **not** duplicate `linker`, `globalStore`, or `cache.dir` unless intentionally overriding.
- Do **not** set `BUN_INSTALL_CACHE_DIR` or `BUN_INSTALL_GLOBAL_STORE` in shell or IDE — fails `bunfig-policy` / `bun_verify`.
- Verify: `bun run install:verify` · `bun run audit:bunfig` · `kimi-doctor --gate bunfig-policy` · `bhealth` / `bmachine`.

## Bun API references (required for agents)

Before using an **unfamiliar Bun API**, resolve its canonical doc instead of guessing the signature:

```bash
bun tools/bun-doc-refs.ts suggest "Bun.secrets"   # → page + verified anchors
bun tools/bun-doc-refs.ts url "Bun.stringWidth"   # → canonical URL
```

Commands: `url` `list` `suggest` (index lookup) · `check`/`annotate` (find/insert `@see` refs) · `audit` (map anchors vs index) · `deepcheck` (repo links vs index) · `validate` (HTTP links) · `integrity` (4-layer proof; `--fix` self-heals taxonomy aliases, `--fix-dry` previews) · `status` · `schedule` (Bun.cron daemon; `--once` for single runs) · `export` (hierarchical llms-full.txt)

Rules:

- When you use a `Bun.*` API in code, add `// @see <canonical-url>` from the `url`/`suggest` output to the file header (or run `bun tools/bun-doc-refs.ts annotate --write <files>` to do it automatically).
- The pre-commit harness **blocks commits** whose staged files use Bun APIs without canonical refs — run the annotator and re-stage.
- Only trust options verified against the runtime (see [`lib/console-depth.ts`](lib/console-depth.ts) header for the pattern); Bun silently ignores several Node `util.inspect`-style options.
- Ground truth order: [llms.txt](https://bun.com/docs/llms.txt) index → [`tools/bun-docs-index.json`](tools/bun-docs-index.json) (317 pages, verified anchors) → [`tools/bun-doc-refs.ts`](tools/bun-doc-refs.ts) map. Regenerate + verify: `bun tools/bun-docs-index-gen.ts && bun tools/bun-doc-refs.ts integrity`.

## Branded ID types (harness)

**Stable import:** [`lib/types/branded.ts`](lib/types/branded.ts) · **Domains:** `lib/types/branded/{session,identity,documents,security,deployment,audit,operations}.ts` · **Manifest:** [`lib/types/brand-manifest.json`](lib/types/brand-manifest.json) · **Agent map:** [`lib/types/branded/README.md`](lib/types/branded/README.md)

Each domain module repeats the same pattern: `type` + `as*` + `try*` + `parse*` + `*_BRAND_SPECS`. Agents learn the invariant from structure.

| Tier | Use |
|------|-----|
| `asXId` | Required string → brand or throw |
| `tryXId` | Optional → brand or `undefined` (never empty forge) |
| `parseXId` | Wire `unknown` → brand or throw |

Mint authority is documented per brand in the manifest (`system-internal` · `user-input` · `wire-input`). Optional audit: `BRAND_PROVENANCE=1`.

```bash
bun tools/brand-catalog.ts                       # JIT brand discovery (domain|BrandName)
bun run check:brands                             # actionable unbranded IDs (manifest-driven)
bun run check:brands:types                       # tsc proof: SessionId ≠ UserId
bun run check:brands:all                         # manifest + smart + types
bun tools/brand-manifest.ts                      # regenerate institutional record
bun tools/brand-manifest.ts --check              # fail if manifest stale (pre-commit)
```

Skill: [`.agents/skills/branded-ids/`](.agents/skills/branded-ids/) · Type proof: [`tests/branded-types.test-d.ts`](tests/branded-types.test-d.ts)

- Pre-commit: `--staged --strict` on added lines + optional smart baseline
- Suppress intentional dual ports / opaque wire with detector rules or `// brand-ok`
- Credential normalize: [`lib/security/r2-credentials.ts`](lib/security/r2-credentials.ts) (soft try* merge)

## Console depth (output verbosity)

Object-inspection depth is controlled project-wide via [`lib/console-depth.ts`](lib/console-depth.ts) (SSOT). Precedence: `--console-depth=N` flag > `BUN_CONSOLE_DEPTH` env (set in root `.env`) > default `4`. Use `inspect()` / `logDepth()` from that module instead of raw `console.log(obj)` in tools; forward to children with `depthArgs()` / `withConsoleDepth()`. Note: Bun's runtime does **not** read `BUN_CONSOLE_DEPTH` itself and `util.inspect.defaultOptions.depth` is a no-op in Bun — only `bun --console-depth=N` and `Bun.inspect({depth})` work. Refs: [runtime/console](https://bun.com/docs/runtime/console) · [runtime/utils#bun-stringwidth](https://bun.com/docs/runtime/utils#bun-stringwidth) · [bun-types (pinned)](https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types) · correctness suite [`tests/console-depth.test.ts`](tests/console-depth.test.ts) · bench [`tools/benchmarks/console-depth-perf.ts`](tools/benchmarks/console-depth-perf.ts).
