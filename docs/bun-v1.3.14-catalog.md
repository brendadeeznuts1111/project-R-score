# Bun v1.3.14 integration catalog

This catalog records Project R's adoption state for the official Bun v1.3.14
release. It is an integration decision artifact, not a second copy of the
release post or its code blocks.

## Authority

- Official release: [Bun v1.3.14](https://bun.com/blog/bun-v1.3.14), published
  `2026-05-13T03:19:35.000Z` according to the committed RSS feed.
- Exact extracted examples:
  [`packages/bun-release-contracts/knowledge/bun-v1.3.14.json`](../packages/bun-release-contracts/knowledge/bun-v1.3.14.json).
- Schema, semantic, provenance, and source-consistency validator:
  [`packages/bun-release-contracts/src/knowledge-validation.ts`](../packages/bun-release-contracts/src/knowledge-validation.ts).
- Executable release probes:
  [`tests/regression/bun-1.3.14.test.ts`](../tests/regression/bun-1.3.14.test.ts).

The normalized artifact contains 32 code examples across 19 feature groups: 14
stable, 4 experimental, 5 highly experimental, and 9 whose stability is
deliberately `unknown`. Three examples are statically setup-free and 22 have
catalog documentation links. These counts are derived data and are gated by
`bun run bun:release-knowledge:check`.

## Knowledge boundary

- Keep exact release facts in the normalized artifact. Keep Project R rollout
  decisions in this catalog. Do not maintain a second personal-memory copy of
  either contract.
- Treat `1.3.14` as the repository's pinned stable runtime, not as proof that
  every API in current Bun documentation was introduced by that release.
- The release proves that Bun-targeted `using` and `await using` are no longer
  lowered. The pinned type inventory and runtime probes own which concrete Bun
  resources implement `Symbol.dispose` or `Symbol.asyncDispose`; do not infer a
  built-in disposable list from the syntax change.
- Exclude undated Bun 1.4 rewrite timelines, prescribed adoption of a future
  `1.4.1`, and other release predictions until exact official publication
  evidence exists.
- Use repository scripts for benchmarks and CI. `bun bench --save` and
  `bun bench --compare` are not repository commands and are not Bun 1.3.14
  release facts.

## Project R disposition

| Feature group                                  | Release classification          | Project R disposition                                                                                                                                     | Owning proof or artifact                                                                       |
| ---------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Install and upgrade commands                   | Mixed/unknown                   | Runtime is already pinned to 1.3.14; no bootstrap change                                                                                                  | `.bun-version` · `package.json` · `bun run bun:channel:check`                                  |
| `Bun.Image`                                    | Stable                          | Adopted for image generation, metadata, thumbnails, and evidence processing; no `sharp` package dependency is present                                     | `scripts/images-generate.ts` · `lib/image-metadata.ts` · `tests/regression/bun-1.3.14.test.ts` |
| Global Virtual Store                           | Experimental                    | Adopted at the machine install-policy layer with the isolated linker; intentionally absent from project `bunfig.toml`                                     | `config/machine.bunfig.toml.template` · `docs/UNIFIED.md` · `bun run install:verify`           |
| HTTP/3 server                                  | Highly experimental             | Not enabled in production or root defaults; retain as a release example only                                                                              | normalized knowledge artifact · skipped environment probe                                      |
| HTTP/2 fetch client                            | Experimental                    | Product-local evaluation only, with HTTP/1.1 fallback; not a repository-wide fetch default                                                                | `projects/active/sports-terminal-os/src/utils/h2-fetch.ts` and its owning tests                |
| HTTP/3 fetch client                            | Highly experimental             | Not adopted. The pinned `RequestInit` type exposes HTTP/2/1.1 selection but not HTTP/3                                                                    | normalized knowledge artifact · `bun-types` type check                                         |
| Rewritten `fs.watch`                           | Stable                          | Consumed through existing watcher code; regression verifies rewrite events                                                                                | `tests/regression/bun-1.3.14.test.ts`                                                          |
| `--no-orphans`                                 | Stable                          | Enabled workspace-wide through `[run].noOrphans = true`                                                                                                   | `bunfig.toml` · `docs/BUN_NATIVE_CAPABILITIES.md`                                              |
| `process.execve`                               | Stable API with runtime warning | Available for explicit process replacement, but not used as a generic restart primitive; CI performs a type-presence probe only                           | `tests/regression/bun-1.3.14.test.ts`                                                          |
| `Bun.Terminal` on Windows                      | Stable, platform-specific       | API adopted elsewhere; ConPTY behavior remains Windows-gated                                                                                              | release regression suite · terminal capability documentation                                   |
| Native `using` / `await using`                 | Stable transform behavior       | Accepted for resources whose pinned type and runtime contracts expose the matching disposal symbol; the release does not define a universal built-in list | `tests/regression/bun-1.3.14.test.ts` · `docs/design/bun-types-inventory.md`                   |
| Windows `SIGHUP` / `SIGBREAK`                  | Unclassified by catalog         | No global behavior change; validate only on Windows-owned process surfaces                                                                                | normalized knowledge artifact                                                                  |
| WebSocket `perMessageDeflate: false`           | Stable fix                      | Behavior is proven with a local WebSocket handshake; no repository-wide compression default is changed                                                    | `tests/regression/bun-1.3.14.test.ts` · `tests/bun-1.3.14-web-api-fixes.test.ts`               |
| `Bun.connect` fixes                            | Stable API                      | Existing callers inherit fixes; no migration required                                                                                                     | normalized knowledge artifact · Bun docs provenance                                            |
| Shared TLS context / database memory reduction | Release evidence                | Treat as an upstream runtime improvement, not an application configuration knob                                                                           | official release post · regression smoke boundaries                                            |
| `bun publish` README metadata                  | Stable                          | Native publication path inherits the behavior; Factory archive publication remains separate                                                               | `docs/design/bun-publish-alignment.md`                                                         |
| `tls.getCACertificates("system")`              | Stable fix                      | Verified without `--use-system-ca`                                                                                                                        | `tests/regression/bun-1.3.14.test.ts`                                                          |
| SQLite 3.53.0                                  | Stable bundled update           | In-memory load/query smoke retained; no schema migration inferred from the runtime update                                                                 | `tests/regression/bun-1.3.14.test.ts`                                                          |
| Remaining bugfix examples                      | Mixed/unknown                   | Covered by release-stamped Web API, Node compatibility, server, stream, and bundler probes where deterministic                                            | release regression suite                                                                       |

`stable` above is the release-knowledge/catalog classification. It does not
override product rollout gates, platform constraints, or explicit experimental
warnings.

## Configuration outcome

The blueprint's two safe configuration recommendations were already applied:

1. Machine `~/.bunfig.toml` owns `linker = "isolated"` and `globalStore = true`;
   the repository template and install doctor enforce the pairing. Duplicating
   either key in project `bunfig.toml` would violate the machine/project
   ownership contract.
2. Root `bunfig.toml` already sets `[run].noOrphans = true`, covering CI, Husky,
   and ordinary `bun run` process chains.

No HTTP/2, HTTP/3, TLS, or image option is enabled globally by this catalog.
Those behaviors remain at their owning application boundary.

## Validation commands

```bash
# Comprehensive release behavior suite; experimental/platform cases remain explicit skips
bun run test:bun:1.3.14

# Exact normalized examples, provenance, semantic rules, and warning budget
bun run bun:release-knowledge:check

# Machine isolated-linker/global-store policy and workspace no-orphans policy
bun run install:verify
bun run portal:doctor --group bunfig

# API release history and exact RSS publication evidence
bun run docs:provenance:check
```

JSON and JUnit validation reports are available without creating another code
block export:

```bash
bun run bun:release-knowledge -- validate --version 1.3.14 --report=json
bun run bun:release-knowledge -- validate-all --report=junit
```

## Deferred evaluation

- HTTP/3 server/client behavior remains outside production until its upstream
  classification and local platform proofs change.
- HTTP/2 remains an opt-in product-local path; fallback correctness must be
  proven by its owning product before broader adoption.
- Global-store and image performance numbers remain release evidence or manual
  benchmarks. CI gates correctness, never wall-clock claims from the release
  post.
- ConPTY and Windows signal handling require Windows execution evidence.
