# AGENTS.md

AI agent entrypoint for the FactoryWager monorepo (`~/Projects`).

**Git remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score) (this monorepo). `cascade` → [cascade-mover-v3](https://github.com/brendadeeznuts1111/cascade-mover-v3) (separate project — do not use as default push target).

**Full agent guide:** [`docs/AGENTS.md`](docs/AGENTS.md)

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

Rules:

- When you use a `Bun.*` API in code, add `// @see <canonical-url>` from the `url`/`suggest` output to the file header (or run `bun tools/bun-doc-refs.ts annotate --write <files>` to do it automatically).
- The pre-commit harness **blocks commits** whose staged files use Bun APIs without canonical refs — run the annotator and re-stage.
- Only trust options verified against the runtime (see `lib/console-depth.ts` header for the pattern); Bun silently ignores several Node `util.inspect`-style options.
- Ground truth order: [llms.txt](https://bun.com/docs/llms.txt) index → `tools/bun-docs-index.json` (317 pages, verified anchors) → `tools/bun-doc-refs.ts` map. Regenerate + verify: `bun tools/bun-docs-index-gen.ts && bun tools/bun-doc-refs.ts integrity`.

## Branded ID types

All new code must use branded string types for IDs (never bare `id: string` fields). Foundation: `lib/types/branded.ts` (`Brand`, domain brands, `asXId()` boundary constructors). Pattern: brand at system boundaries, pass branded values inside, `unbrand()` at serialization edges. Exemplar: `lib/core/r2-session-manager.ts`.

- Detect violations: `bun tools/branded-id-check.ts [paths]` (report) · `--strict` (fail) · `--staged`
- **Pre-commit enforced** (harness "Branded IDs" step): `--staged --strict` judges **only added lines** — new violations block the commit; editing legacy files with existing violations elsewhere does not
- Suppress intentional passthroughs with `// brand-ok`
- TODO(brand-rollout): 278 pre-existing declarations tracked in `lib/types/branded.ts` header — migrate by density (security → core → mcp → registry). New code has zero excuse.

## Console depth (output verbosity)

Object-inspection depth is controlled project-wide via `lib/console-depth.ts` (SSOT). Precedence: `--console-depth=N` flag > `BUN_CONSOLE_DEPTH` env (set in root `.env`) > default `4`. Use `inspect()` / `logDepth()` from that module instead of raw `console.log(obj)` in tools; forward to children with `depthArgs()` / `withConsoleDepth()`. Note: Bun's runtime does **not** read `BUN_CONSOLE_DEPTH` itself and `util.inspect.defaultOptions.depth` is a no-op in Bun — only `bun --console-depth=N` and `Bun.inspect({depth})` work. Refs: [runtime/console](https://bun.com/docs/runtime/console) · [runtime/utils#bun-stringwidth](https://bun.com/docs/runtime/utils#bun-stringwidth) · [bun-types (pinned)](https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types) · correctness suite `tests/console-depth.test.ts` · bench `tools/benchmarks/console-depth-perf.ts`.
