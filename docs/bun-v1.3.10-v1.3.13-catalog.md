# Bun v1.3.10–v1.3.13 integration catalog

This catalog records Project R's disposition for the cited capabilities from the
four stable releases immediately before the pinned Bun v1.3.14 runtime. It does
not duplicate the release posts. The generated inventories retain the complete
official announcements.

## Authority

| Release                                    | Official publication       | Generated inventory                                                                |
| ------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------- |
| [1.3.10](https://bun.com/blog/bun-v1.3.10) | `2026-02-26T06:31:59.000Z` | [`bun-v1.3.10.json`](../packages/bun-release-contracts/contracts/bun-v1.3.10.json) |
| [1.3.11](https://bun.com/blog/bun-v1.3.11) | `2026-03-18T04:16:10.000Z` | [`bun-v1.3.11.json`](../packages/bun-release-contracts/contracts/bun-v1.3.11.json) |
| [1.3.12](https://bun.com/blog/bun-v1.3.12) | `2026-04-09T00:00:00.000Z` | [`bun-v1.3.12.json`](../packages/bun-release-contracts/contracts/bun-v1.3.12.json) |
| [1.3.13](https://bun.com/blog/bun-v1.3.13) | `2026-04-20T07:33:26.000Z` | [`bun-v1.3.13.json`](../packages/bun-release-contracts/contracts/bun-v1.3.13.json) |

`bun run bun:release-contracts -- --all --since v1.3.10 --limit 5 --check`
re-fetches the official posts and fails if an inventory or the aggregate index
drifts. Repository tests are separate executable adoption evidence.

## Project R disposition

| Capability                   | Release | Exact boundary                                                                                                                                                                        | Project R owner and proof                                                                                                                                                                      |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native REPL                  | 1.3.10  | `bun repl` is implemented in Zig and starts without downloading the former package. Terminal-only UI behavior remains an operator surface.                                            | Basic native start/evaluation probe in [`bun-1.3.10.test.ts`](../tests/regression/bun-1.3.10.test.ts); no wrapper.                                                                             |
| Self-contained browser HTML  | 1.3.10  | `bun build --compile --target=browser` inlines JavaScript and CSS. Entrypoints must be HTML and cannot use splitting.                                                                 | Build/output probe in [`bun-1.3.10.test.ts`](../tests/regression/bun-1.3.10.test.ts); opt-in distribution path, not a root build default.                                                      |
| Windows ARM64                | 1.3.10  | Native Windows ARM64 runtime plus `bun-windows-arm64` standalone cross-target.                                                                                                        | Platform-gated compile probe in [`bun-1.3.10.test.ts`](../tests/regression/bun-1.3.10.test.ts); no deployment target is inferred on macOS/Linux.                                               |
| `Bun.sliceAnsi`              | 1.3.11  | Slices by terminal columns while preserving ANSI and grapheme boundaries.                                                                                                             | Used by [`lib/console/layout.ts`](../lib/console/layout.ts) and proven against ANSI, emoji, and ellipsis in [`bun-1.3.11.test.ts`](../tests/regression/bun-1.3.11.test.ts).                    |
| Test discovery ignores       | 1.3.11  | `--path-ignore-patterns` and `[test].pathIgnorePatterns` prune matching paths. CLI values replace, rather than merge with, bunfig values.                                             | Root [`bunfig.toml`](../bunfig.toml), workflow documentation, and an override-semantics subprocess probe in [`bun-1.3.11.test.ts`](../tests/regression/bun-1.3.11.test.ts).                    |
| Terminal Markdown            | 1.3.12  | `bun ./file.md` writes ANSI-rendered Markdown without starting the JavaScript VM; `Bun.markdown.ansi` is the programmatic surface.                                                    | Documentation preview scripts plus CLI/API assertions in [`bun-1.3.12.test.ts`](../tests/regression/bun-1.3.12.test.ts) and [`bun-markdown-ansi.test.ts`](../tests/bun-markdown-ansi.test.ts). |
| Cgroup-aware CPU concurrency | 1.3.12  | On Linux, `availableParallelism`, `hardwareConcurrency`, thread-pool sizing, and JIT threads respect CPU quotas. This is runtime behavior, not an application setting.                | Positive runtime checks everywhere and a finite-cgroup-v2 quota assertion when available in [`bun-1.3.12.test.ts`](../tests/regression/bun-1.3.12.test.ts).                                    |
| File-backed HTTP ranges      | 1.3.13  | `Bun.serve` handles single byte ranges on whole-file 200 responses in static and dynamic handlers. Invalid ranges return 416; multi-ranges fall through to the complete 200 response. | Static/dynamic, suffix, open-ended, invalid, and multi-range assertions in [`bun-file-response-contract.test.ts`](../tests/bun-file-response-contract.test.ts).                                |

## Corrections to the proposed memory patch

- Do not add a generic “HTTP Range headers” claim. The native behavior is
  limited to file-backed responses and the response modes above.
- Do not describe cgroup support as a configurable production feature. Bun
  applies it internally on Linux.
- Do not label every release-note item `stable` unless Bun publishes that
  classification. These are shipped release capabilities; Project R's rollout
  status is recorded separately.
- Do not create a second personal-memory copy. Official posts own release
  claims, generated inventories materialize them, and tests own adoption proof.

## Validation

```bash
bun run bun:release-contracts -- --all --since v1.3.10 --limit 5 --check
bun test tests/regression/bun-1.3.10.test.ts tests/regression/bun-1.3.11.test.ts tests/regression/bun-1.3.12.test.ts tests/bun-file-response-contract.test.ts
bun run docs:provenance:check
```
