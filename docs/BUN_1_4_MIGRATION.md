# Bun 1.4 migration boundary

Use three upstream sources for three different questions:

| Question                              | Canonical source                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| What shipped and how Bun presents it  | [Bun 1.4 release notes](https://bun.com/blog/bun-v1.4)                          |
| Which breaking behaviors were merged  | [Breaking-change tracker #28792](https://github.com/oven-sh/bun/issues/28792)   |
| How to move a Bun 1.3 project forward | [Bun 1.3 → 1.4 upgrade guide #36463](https://github.com/oven-sh/bun/pull/36463) |

The tracker was reconciled against `bun-v1.4.0`. Its **Merged** section is
shipped behavior. Its **Under consideration** section explicitly did not ship in
Bun 1.4 and must never be used as a local contract, workaround-removal trigger,
or capability claim.

## Repository-impacting changes

| Boundary          | Bun 1.4 behavior                                                                                                                                              | Repository action                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime identity  | `process.versions.node` is `26.3.0`; `NODE_MODULE_VERSION` is `147`.                                                                                          | Rebuild Node 24 native addons; assert the reported ABI in the stable release lane.                                                                                         |
| Existing lockfile | New lockfiles default to v2, while existing v0/v1 lockfiles remain readable. `configVersion` preserves an existing monorepo's linker layout.                  | Do not rewrite this repository's v1 lockfile merely to imitate a fresh project. Review any one-time lock or linker churn.                                                  |
| New monorepo      | Fresh workspace projects default to the isolated linker.                                                                                                      | Treat the committed lockfile and `configVersion` as the migration boundary, not a global `linker` assumption.                                                              |
| Node invocation   | When Bun is invoked as `node`, automatic `.env*` loading is disabled; explicit `--env-file` still works. `bun file.js` is unchanged.                          | Keep explicit environment loading at shims and CI boundaries. Do not generalize this change to ordinary `bun` execution.                                                   |
| Parsers/loaders   | TOML follows 1.1, JSONC failures are `SyntaxError`, YAML uses 1.2 booleans, and `.xml` imports parse by default.                                              | Parse external input once, preserve parser-specific value shapes, and use `.xml:file` only when the old path-string loader is intentional.                                 |
| Temporal          | `Temporal` is enabled by default; TOML date/time literals produce Temporal values.                                                                            | Do not coerce TOML dates to `Date` or strings inside the wire boundary. `BUN_JSC_useTemporal=0` is a diagnostic opt-out, not repository policy.                            |
| FFI               | Engine-native FFI is the default. `CString` is a plain string and old wrapper fields are gone.                                                                | Remove `.ptr`, `.byteLength`, `.arrayBuffer()`, callback `viewSource()`, and wrapper-object assumptions before adopting FFI. Keep FFI out of XML/feed code.                |
| Fetch             | Option-conversion failures reject, clone-after-consume throws, failed reads set `bodyUsed`, duplicate headers combine, and network failures are `TypeError`.  | Keep deadlines, redirect policy, bounded reads, and fresh-request retries in the feed/media boundary. Do not depend on a proposed exact `TypeError("fetch failed")` shape. |
| `Bun.serve`       | Invalid ports throw, GET method routes answer HEAD, invalid responses enter `error()`, and static/file preconditions are enforced.                            | Preserve explicit response semantics in shared helpers and verify local media Range behavior separately from Pages.                                                        |
| Node 26 parity    | `response.writeHeader()` and recursive `fs.rmdir()` are removed; `process.title`, warnings, `reallyExit`, streams, TLS, and strict equality behavior changed. | Prefer `writeHead`, `fs.rm`, and exact child-process contract tests. Rebuild native addons for ABI 147.                                                                    |
| `bun:test`        | `resetAllMocks()` resets implementations; `toContain` uses `===`; skipped `node:test` suites do not execute callbacks.                                        | Keep matcher expectations explicit for `NaN`, `-0`, and `0`; do not use skipped suites for setup.                                                                          |

## Non-shipped guardrail

The following tracker proposals were still under consideration and did **not**
ship in Bun 1.4:

- rejecting CommonJS `require()` of ESM or top-level-await modules;
- changing top-level `this` to `undefined` or removing the `__esModule` interop
  workaround;
- forcing exit code 13 for unsettled top-level await;
- coercing every `process.env` assignment path to strings;
- standardizing fetch failures on the exact message `TypeError("fetch failed")`
  with a cause;
- removing matcher aliases or other deprecated type surfaces;
- making `--bun` the default or adding a general `--node` mode.

If a future Bun release ships one of these, add the new release source and a
version-gated contract. Do not backdate it to 1.4.

## Proof

```bash
bun run bun:runtime:check
bun run test:bun:release-contracts
bun run docs:blog-assets:check
bun run channels:bun-1.4:check
```

The capability registry stores the migration-source object once. Individual
capabilities continue to point to their release-note anchor, avoiding repeated
GitHub URLs and keeping release presentation separate from migration evidence.
