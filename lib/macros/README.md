# macros

Bundle-time Bun macros (`bun build` + `with { type: "macro" }`).

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API surface.

| Entry | Purpose |
|-------|---------|
| [`git-commit.ts`](./git-commit.ts) | `getGitCommitHash` / `getGitBranch` via `git rev-parse` |
| [`github-repository.ts`](./github-repository.ts) | `getGitHubRepositoryParts` — serializable owner/name/host/remote |
| [`index.ts`](./index.ts) | Re-exports |

*Ratchet* → [`docs/harness/AUTHORITY.md`](../../docs/harness/AUTHORITY.md) (bundle-time vs runtime) · [Bun macros](https://bun.com/docs/bundler/macros) · `bun test tests/macros/embed-commit.test.ts` · `bun test tests/bundler-nav.test.ts`

Runtime scripts (`bun scripts/*.ts`) keep [`../github-repository-ref.ts`](../github-repository-ref.ts) — macros do not substitute outside `bun build`.

## Bundler docs nav (token map)

SSOT: [`../docs/bundler-nav.ts`](../docs/bundler-nav.ts) · gaps: [`../docs/bundler-gaps.ts`](../docs/bundler-gaps.ts) · CLI: `bun tools/bun-doc-refs.ts bundler` · `bundler --anchors` · `bundler --gaps [--json]` · `bundler --tokens` · suggest: `bun tools/bun-doc-refs.ts suggest "<label>"` · catalog: `bun tools/bun-docs-catalog.ts list -s bundler`.

### Core

| Nav | Doc |
|-----|-----|
| Bundler | [bundler/index](https://bun.com/docs/bundler/index) |

### Development Server

| Nav | Doc |
|-----|-----|
| Fullstack dev server | [bundler/fullstack](https://bun.com/docs/bundler/fullstack) |
| Hot reloading | [bundler/hot-reloading](https://bun.com/docs/bundler/hot-reloading) |

### Asset Processing

| Nav | Doc |
|-----|-----|
| HTML & static sites | [bundler/html-static](https://bun.com/docs/bundler/html-static) |
| Standalone HTML | [bundler/standalone-html](https://bun.com/docs/bundler/standalone-html) |
| CSS | [bundler/css](https://bun.com/docs/bundler/css) |
| Loaders | [bundler/loaders](https://bun.com/docs/bundler/loaders) |

### Single File Executable

| Nav | Doc |
|-----|-----|
| Single-file executable | [bundler/executables](https://bun.com/docs/bundler/executables) |

### Extensions

| Nav | Doc |
|-----|-----|
| Plugins | [bundler/plugins](https://bun.com/docs/bundler/plugins) |
| Macros | [bundler/macros](https://bun.com/docs/bundler/macros) |

### Optimization

| Nav | Doc |
|-----|-----|
| Bytecode Caching | [bundler/bytecode](https://bun.com/docs/bundler/bytecode) |
| Minifier | [bundler/minifier](https://bun.com/docs/bundler/minifier) |

### Migration

| Nav | Doc |
|-----|-----|
| esbuild | [bundler/esbuild](https://bun.com/docs/bundler/esbuild) |

Harness macros cover **Extensions → Macros** only. No `Bun.plugin` hooks or bundle-time `fetch` in this kit.
