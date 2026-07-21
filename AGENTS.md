# AGENTS.md

AI agent entrypoint for the FactoryWager monorepo (`~/Projects`).

**Git remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score) (this monorepo). `cascade` → [cascade-mover-v3](https://github.com/brendadeeznuts1111/cascade-mover-v3) (separate project — do not use as default push target).

## Canonical docs

| Role | Doc |
|------|-----|
| This file (agent entry) | [`AGENTS.md`](AGENTS.md) |
| Full agent guide | [`docs/AGENTS.md`](docs/AGENTS.md) (aligned to this entry + UNIFIED / WIRE_BOUNDARY) |
| Harness JIT index | [`docs/harness/README.md`](docs/harness/README.md) (when NFR unresolved → one owner) |
| Authority / lanes | [`docs/harness/AUTHORITY.md`](docs/harness/AUTHORITY.md) |
| Repository review (JIT) | [`docs/harness/REVIEW.md`](docs/harness/REVIEW.md) |
| Proof / install journey | [`docs/harness/PROOF.md`](docs/harness/PROOF.md) · `bun run proof:install` |
| Docs index | [`docs/README.md`](docs/README.md) |
| Human hub | [`README.md`](README.md) |
| Workspace map | [`STRUCTURE.md`](STRUCTURE.md) |
| Coding standards | [`.custom-instructions.md`](.custom-instructions.md) · [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md) |
| Bun install policy | [`docs/UNIFIED.md`](docs/UNIFIED.md) |
| Import boundaries | [`docs/IMPORT_BOUNDARIES.md`](docs/IMPORT_BOUNDARIES.md) |
| Wire boundary (parse once) | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) |
| Bun native capabilities | [`docs/BUN_NATIVE_CAPABILITIES.md`](docs/BUN_NATIVE_CAPABILITIES.md) (WebView, markdown.ansi, cron, UDP) |
| Bun token/catalog operate | [`docs/BUN_DOCS_OPERATE.md`](docs/BUN_DOCS_OPERATE.md) (`bun run docs:refresh`) |
| TokenRef (interior) / BunToken (export) | [`lib/docs/token-ref.ts`](lib/docs/token-ref.ts) · [`lib/docs/bun-token.ts`](lib/docs/bun-token.ts) |
| Projects triage | [`projects/README.md`](projects/README.md) |
| Path SSOT (code) | [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts) |
| Harness thesis | [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) |

## Communication precision

Do not append an unrequested caveat, counterargument, or moralizing endcap to a sharp claim merely to demonstrate balance. If a boundary condition changes the truth of the claim, put it in the mechanism or scope the claim correctly. If it does not, cut it. Accuracy belongs in the argument; model self-protection does not.

**Terminology (harness):** prefer **artifact** over **codebase** for what is maintained, delivered, or proven; use **repository** / **source tree** for the git tree. Domain-valued strings use **brands**, not bare `string`, after the boundary — see [`.custom-instructions.md`](.custom-instructions.md) and [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering).

## Branded IDs are mandatory (agents)

**Do not declare domain IDs as bare `string`.** This is enforced by pre-commit (`--staged --strict` has **no** baseline — new code always fails). Bare `id: string` / `_id: string` is also flagged; suppress only with an explicit `// brand-ok` decision — the detector no longer auto-suppresses opaque primary keys.

| Wrong | Right |
|-------|--------|
| `sessionId: string` | `sessionId: SessionId` + `asSessionId` / `trySessionId` / `parseSessionId` |
| `userId?: string` | `userId?: UserId` |
| `function f(accountId: string)` | `function f(accountId: AccountId)` |
| `id: string` (opaque DTO PK) | `id: string; // brand-ok — opaque entity primary key` |
| `'' as AccountId` | never — use `try*` or throw |

```bash
bun tools/brand-catalog.ts SessionId   # which constructor + mint authority
bun run check:brands                   # repo-wide (baseline may grandfather legacy only)
bun tools/branded-id-check.ts --staged --strict   # what pre-commit runs on your diff
```

Import brands from [`lib/types/branded.ts`](lib/types/branded.ts). Map: [`lib/types/branded/README.md`](lib/types/branded/README.md). Manifest: [`lib/types/brand-manifest.json`](lib/types/brand-manifest.json). Skill: [`.agents/skills/branded-ids/`](.agents/skills/branded-ids/). Intentional opaque passthrough only: `// brand-ok` on that line.

### Wire boundary (parse once)

**Full map:** [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) — what is edge vs interior, path/name allowlists, suppressions.

| Interior (default) | Boundary only |
|--------------------|---------------|
| Domain types / brands | `unknown` fun args |
| No re-decode | `decodeUnknownSync` / `decodeUnknown*` |
| Trusted `SessionId`, structs | `parse*` / `is*` / type guards |

- ESLint: `harness/no-decode-unknown-outside-boundary` (**error**), `harness/no-unknown-function-param` (**error** on harness paths)
- Code: [`config/eslint/plugin-harness/boundary.ts`](config/eslint/plugin-harness/boundary.ts) (`BOUNDARY_POLICY`)
- Config: [`eslint.harness.config.ts`](eslint.harness.config.ts)
- Thesis: [domain-modeling](https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md) · [parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
- Authority / lanes: [`docs/harness/AUTHORITY.md`](docs/harness/AUTHORITY.md) · status: `bun run harness:status`

## Operating rules

- **Parallel lanes:** before editing, `git status` for files dirty from other sessions. Claim disjoint lanes (files/directories nobody else is touching), name the lane split in commit messages, never sweep another session's dirty files into your commit (hook-generated formatting re-wraps excepted).
- **Delivery default:** close every batch with a conventional commit + push; the pre-commit gates (doc-map when SSOT docs staged, doc-refs, branded IDs staged + smart) must pass. Do not leave verified work uncommitted.
- **Task routing:**
  - Brands → [`lib/types/branded/README.md`](lib/types/branded/README.md) + [`lib/types/branded.ts`](lib/types/branded.ts) + `bun run check:brands` (**mandatory** for any `*Id` field)
  - Wire / `unknown` / decode → [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md)
  - Harness JIT / proof / authority / review → [`docs/harness/README.md`](docs/harness/README.md) · [`docs/harness/REVIEW.md`](docs/harness/REVIEW.md) · `bun run harness:status` · `bun run proof:install`
  - Bun APIs → `bun tools/bun-doc-refs.ts suggest "<api>"` ([`tools/bun-doc-refs.ts`](tools/bun-doc-refs.ts))
  - Doc map integrity → `bun run docs:map:check` (also pre-commit when SSOT docs staged)
  - Coding standards → [`.custom-instructions.md`](.custom-instructions.md)
  - Testing → nearest `*.test.ts` / [`tests/`](tests/) exemplar (e.g. [`tests/console-depth.test.ts`](tests/console-depth.test.ts), [`tests/wire-boundary-policy.test.ts`](tests/wire-boundary-policy.test.ts))

**Bun install policy (machine + workspace):** [`docs/UNIFIED.md`](docs/UNIFIED.md)

## Machine Bun policy (summary)

Machine SSOT is `~/.bunfig.toml` (`linker = "isolated"`, `globalStore = true`, `frozenLockfile = true`, `minimumReleaseAge = 259200`, absolute `[install.cache].dir`); env in `~/.config/shell/bun.sh` (`BUN_INSTALL`, `NO_PROXY` — **no** `BUN_INSTALL_GLOBAL_STORE`); PATH in `~/.config/shell/path.sh`. Full component table: [`docs/UNIFIED.md`](docs/UNIFIED.md).

- Workspace `bunfig.toml` holds **project-specific** overrides only (`frozenLockfile`, scopes, `[test]`, etc.) — do **not** duplicate `linker`, `globalStore`, or `cache.dir` unless intentionally overriding.
- Do **not** set `BUN_INSTALL_CACHE_DIR` or `BUN_INSTALL_GLOBAL_STORE` in shell or IDE — fails `bunfig-policy` / `bun_verify`.
- Verify: `bun run install:verify` · `bun run audit:bunfig` · `kimi-doctor --gate bunfig-policy` · `bhealth` / `bmachine`.

## Bun API references (required for agents)

Before using an **unfamiliar Bun API**, resolve its canonical doc instead of guessing the signature:

```bash
bun tools/bun-doc-refs.ts suggest "Bun.secrets"   # → catalog DOC + SHIP/FIX/BLOG/NOTE when known
bun tools/bun-doc-refs.ts url "Bun.stringWidth"   # → canonical URL
bun tools/bun-docs-catalog.ts get Bun.WebView     # full catalog entry
bun run docs:catalog:export                       # compact TSV for agents
```

Commands: `url` `list` `suggest` (catalog → canonical map → index) · `catalog` · `check`/`annotate` (find/insert `@see` refs) · `audit` (map anchors vs index) · `deepcheck` (repo links vs index) · `validate` (HTTP links) · `integrity` (4-layer proof; `--fix` self-heals taxonomy aliases, `--fix-dry` previews) · `status` (includes tier-A coverage) · `schedule` (Bun.cron daemon; `--once` for single runs) · `export` (hierarchical llms-full.txt)

Operate loop (RSS → scrape → catalog → integrity): [`docs/BUN_DOCS_OPERATE.md`](docs/BUN_DOCS_OPERATE.md) · `bun run docs:refresh`

Rules:

- When you use a `Bun.*` API in code, add `// @see <canonical-url>` from the `url`/`suggest` output to the file header (or run `bun tools/bun-doc-refs.ts annotate --write <files>` to do it automatically).
- The pre-commit harness **blocks commits** whose staged files use Bun APIs without canonical refs — run the annotator and re-stage.
- Only trust options verified against the runtime (see [`lib/console-depth.ts`](lib/console-depth.ts) header for the pattern); Bun silently ignores several Node `util.inspect`-style options.
- Ground truth order: [llms.txt](https://bun.com/docs/llms.txt) → [`tools/bun-docs-index.json`](tools/bun-docs-index.json) → [`tools/bun-docs-catalog.json`](tools/bun-docs-catalog.json) (NOTE/SHIP/FIX/BLOG) → [`tools/bun-doc-refs.ts`](tools/bun-doc-refs.ts) `CANONICAL_REFS`. Refresh: `bun run docs:refresh` (or `bun tools/bun-docs-index-gen.ts && bun tools/bun-doc-refs.ts integrity`).

## Branded ID types (harness)

**Mandatory for agents.** Domain `*Id` values are never bare `string` after the boundary (see section above).

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
bun run check:brands                             # actionable unbranded IDs (manifest-driven + baseline)
bun run check:brands:types                       # tsc proof: SessionId ≠ UserId
bun run check:brands:all                         # manifest + smart + types
bun tools/brand-manifest.ts                      # regenerate institutional record
bun tools/brand-manifest.ts --check              # fail if manifest stale (pre-commit)
bun tools/branded-id-check.ts --write-baseline   # only when expanding detector (owners)
```

Skill: [`.agents/skills/branded-ids/`](.agents/skills/branded-ids/) · Type proof: [`tests/branded-types.test-d.ts`](tests/branded-types.test-d.ts)

- Pre-commit: `--staged --strict` on **added** lines (**no** baseline — mid-line params included) + repo-wide `--smart --strict`
- Suppress intentional dual ports / opaque wire with detector rules or `// brand-ok`
- Credential normalize: [`lib/security/r2-credentials.ts`](lib/security/r2-credentials.ts) (soft try* merge)

## Console depth (output verbosity)

Object-inspection depth is controlled project-wide via [`lib/console-depth.ts`](lib/console-depth.ts) (SSOT). Precedence: `--console-depth=N` flag > `BUN_CONSOLE_DEPTH` env (set in root `.env`) > default `4`. Use `inspect()` / `logDepth()` from that module instead of raw `console.log(obj)` in tools; forward to children with `depthArgs()` / `withConsoleDepth()`. Note: Bun's runtime does **not** read `BUN_CONSOLE_DEPTH` itself and `util.inspect.defaultOptions.depth` is a no-op in Bun — only `bun --console-depth=N` and `Bun.inspect({depth})` work. Refs: [runtime/console](https://bun.com/docs/runtime/console) · [runtime/utils#bun-stringwidth](https://bun.com/docs/runtime/utils#bun-stringwidth) · [bun-types (pinned)](https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types) · correctness suite [`tests/console-depth.test.ts`](tests/console-depth.test.ts) · bench [`tools/benchmarks/console-depth-perf.ts`](tools/benchmarks/console-depth-perf.ts).
