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

## Console depth (output verbosity)

Object-inspection depth is controlled project-wide via `lib/console-depth.ts` (SSOT). Precedence: `--console-depth=N` flag > `BUN_CONSOLE_DEPTH` env (set in root `.env`) > default `4`. Use `inspect()` / `logDepth()` from that module instead of raw `console.log(obj)` in tools; forward to children with `depthArgs()` / `withConsoleDepth()`. Note: Bun's runtime does **not** read `BUN_CONSOLE_DEPTH` itself and `util.inspect.defaultOptions.depth` is a no-op in Bun — only `bun --console-depth=N` and `Bun.inspect({depth})` work.
