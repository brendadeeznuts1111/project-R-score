# security-scanner-api

Multi-project scanner for Bun monorepos. Scans `$BUN_PLATFORM_HOME` for all projects and reports on dependencies,
configuration, security posture, and infrastructure consistency.

Built with [Bun](https://bun.sh). Based on Bun's [Documentation](https://bun.com/docs).

## Quick start

```bash
bun run scan.ts              # table of all projects
bun run scan.ts --audit      # full security + infra audit
bun run scan.ts --inspect <name>  # deep view of a single project
```

## Modes

| Flag                                  | Description                                                  |
| ------------------------------------- | ------------------------------------------------------------ |
| `(default)`                           | Table of all projects with deps, engine, lock, bunfig status |
| `--detail`                            | Extended table (author, license, description)                |
| `--inspect <name>`                    | Deep view of a single project                                |
| `--json`                              | JSON output                                                  |
| `--audit`                             | Metadata, infra, lifecycle security report with snapshots    |
| `--fix [--dry-run]`                   | Patch missing author/license, init missing package.json      |
| `--fix-engine [--dry-run]`            | Unify `engines.bun` across all projects                      |
| `--fix-registry <url> [--dry-run]`    | Unify registry (bunfig + pkg + .npmrc)                       |
| `--fix-scopes <url> @s.. [--dry-run]` | Inject `[install.scopes]` into bunfig.toml                   |
| `--fix-npmrc <url> @s.. [--dry-run]`  | Rewrite .npmrc with scoped template                          |
| `--fix-trusted [--dry-run]`           | Auto-detect native deps and add to trustedDependencies       |
| `--fix-dns [--dry-run]`               | Set DNS TTL + generate prefetch snippets                     |
| `--why <pkg> [--top] [--depth N]`     | `bun why` across all projects                                |
| `--outdated [-r] [--wf] [-p]`         | `bun outdated` across all projects                           |
| `--update [--dry-run]`                | `bun update` across all projects                             |
| `--verify`                            | `bun install --frozen-lockfile` across all projects          |
| `--info <pkg> [--json]`               | Registry metadata + local cross-reference                    |
| `--snapshot`                          | Save cross-reference snapshot                                |
| `--compare`                           | Compare against previous snapshot                            |

## Cookie Sessions

Manage cookie sessions with Bun.secrets storage:

```bash
# Create session
bun run scan.ts --session-create <project-id> --domain <domain> [--ttl <ms>] [--interactive]

# List sessions (uses PROJECT_ID env var or 'default' if omitted)
PROJECT_ID=myproj bun run scan.ts --session-list [project-id]

# Show session details
bun run scan.ts --session-show <session-id> [project-id]

# Add cookies
bun run scan.ts --cookie-add <session-id> [project-id] <cookie-string>

# Remove cookie
bun run scan.ts --cookie-remove <session-id> [project-id] <cookie-name>

# Monitor session
bun run scan.ts --session-monitor <session-id> [project-id]

# Cleanup expired
bun run scan.ts --session-cleanup [project-id]
```

**Environment variables:**

- `PROJECT_ID` or `FW_PROJECT_ID` — default project ID when not specified as positional
- `R2_BUCKET` or `R2_BUCKET_NAME` — R2 bucket for cookie storage (optional)

## Filters

| Flag                    | Description                              |
| ----------------------- | ---------------------------------------- |
| `--filter <glob\|bool>` | Filter by name, folder, or boolean field |
| `--with-bunfig`         | Only projects with bunfig.toml           |
| `--workspaces`          | Only workspace roots                     |
| `--without-pkg`         | Only dirs missing package.json           |
| `--sort <key>`          | Sort by name, deps, version, lock        |
| `-p, --production`      | Exclude devDependencies                  |
| `-r, --catalog`         | Catalog dependencies (workspace roots)   |
| `--wf <workspace>`      | Filter by workspace name (repeatable)    |

## Architecture

```text
scanner/
├── src/
│   ├── scan.ts                    Main scanner — CLI, scanning, audit, fix commands
│   ├── scan-worker.ts             IPC worker for parallel project scanning
│   ├── scan-columns.ts            Column definitions for table output
│   ├── cookie-sessions.ts         Cookie session management with Bun.secrets
│   ├── cookie-terminal.ts         Terminal UI for cookie sessions
│   ├── project-utils.ts           Project context utilities
│   └── profiles.ts                 Bun.secrets integration
├── lib/
│   ├── r2-cookie-stream.ts        R2-backed cookie persistence with zstd
│   ├── r2-cookie-view.ts          Tier-1380 Uint8Array view + projectId + R2
│   └── packument-zero-trust.ts    Zero-trust npm registry resolver
├── optimizations/
│   ├── runtime-optimizations.ts   JSC/Bun runtime patterns (lazy stats, batched ops, generators)
│   └── bun-optimizations.ts       Bun-native optimizations (monomorphic shapes, concurrency)
├── cli/renderers/
│   ├── status-glyphs.ts           Unicode status glyph registry with per-project HSL colors
│   ├── bun-api-matrix.ts          Bun API catalog (~155 entries) with doc links
│   └── stream-converters.ts       Native stream converter catalog
└── benchmarks/
    └── bun-api-snapshot.ts         Dynamic API surface scanner
```

### Key Features

- **IPC worker pool**: Uses `availableParallelism()` workers via `Bun.spawn` for concurrent scanning
- **Bun.secrets**: Cookie sessions stored in OS keychain (macOS Keychain, Linux libsecret, Windows Credential Manager)
- **Runtime optimizations**: Lazy stats, batched operations, monomorphic shapes, generator backpressure
- **R2 integration**: Optional R2 storage for cookies with zstd compression and Uint8Array views
- **Visual analytics dashboard**: Interactive HTML dashboard with filtering, sorting, charts, and export (JSON/CSV) for
  BUN constants tracking
- **Type safety**: Full TypeScript types, no `as any` casts
- **lockHash**: `Bun.hash.wyhash()` of lockfile content for drift detection

## Tests

```bash
bun test                    # all tests
bun test scan.test.ts       # main scanner tests
bun test cli/renderers/     # renderer tests
bun test optimizations/     # runtime optimization tests
```

## Code Style

- No external dependencies; uses Bun built-ins (`Bun.file`, `Bun.spawn`, `Bun.hash`, `Bun.secrets`)
- Type safety: use `createProjectContext()` for typed `ProjectInfo`, avoid `as any`
- Runtime patterns: lazy stats, batched ops, monomorphic shapes (see `.cursor/rules/`)
- `--dry-run` support for every `--fix-*` command
- Automated linting and formatting via pre-commit hooks

## Profiling

The scanner includes built-in profiling capabilities using Bun's native profiling:

```bash
# CPU profiling (markdown format)
bun run profile:cpu:md

# Heap profiling (markdown format)
bun run profile:heap:md

# Example profiling script
bun run profile:example
```

See [Profiling Quick Reference](./docs/PROFILING_QUICK_REFERENCE.md) for details.

## Debugging network requests

Bun supports printing `fetch()` and `node:http` network requests by setting `BUN_CONFIG_VERBOSE_FETCH`:

- **`curl`** — Prints each request as a single-line curl command for copy-paste replication
- **`true`** — Prints request/response without the curl command

Lines prefixed with `[fetch] >` are the request from your code; `[fetch] <` are the response from the remote server.

```bash
BUN_CONFIG_VERBOSE_FETCH=curl bun run scan.ts --audit
```

## Bun v1.3.7+ Features

The scanner leverages new Bun features:

- **`Bun.wrapAnsi()`**: ANSI-aware text wrapping (33-88x faster than wrap-ansi)
- **`--cpu-prof-md`**: Markdown CPU profiling output
- **`--heap-prof-md`**: Markdown heap profiling output

See [Bun v1.3.7 Features](./docs/BUN_V1.3.7_FEATURES.md) for documentation and examples.

## Bun Utilities Used

The scanner leverages many Bun utility functions for optimal performance:

### R-Score Framework

The scanner uses an **Enhanced R-Score Framework** to evaluate optimization efficiency:

$$
R_Score = (P*{ratio} \times 0.35) + (M*{impact} \times 0.30) + (E*{elimination} \times 0.20) + (S*{hardening} \times
0.10) + (D\_{ergonomics} \times 0.05)
$$

This unified metric evaluates native vs. userland implementations. For high-throughput applications, maintaining an
**R-Score > 0.95** is critical for sub-millisecond response times.

See [Enhanced R-Score Framework](./docs/ENHANCED_R_SCORE_FRAMEWORK.md) for complete documentation.

### Text & Formatting

- **`Bun.escapeHTML()`**: XSS protection for HTML generation (480 MB/s - 20 GB/s)
- **`Bun.wrapAnsi()`**: ANSI-aware text wrapping (33-88x faster than wrap-ansi)
- **`Bun.stringWidth()`**: Unicode-aware string width calculation (~6,756x faster than string-width)
- **`Bun.stripANSI()`**: Remove ANSI escape codes (~6-57x faster than strip-ansi)
- **`Bun.inspect.table()`**: Formatted table output with ANSI color support

### Timing & Performance

- **`Bun.nanoseconds()`**: High-precision timing for profiling and benchmarks
- **`Bun.sleep()`**: Async sleep for testing and async operations

### Environment & Runtime

- **`Bun.env`**: Environment variable access (alias for `process.env`)
- **`Bun.version`**: Runtime version string
- **`Bun.revision`**: Git commit hash of Bun build
- **`Bun.main`**: Entrypoint path resolution

### File & Path Operations

- **`Bun.fileURLToPath()`**: Convert `file://` URLs to absolute paths
- **`Bun.file()`**: File handle creation for reading/writing
- **`Bun.write()`**: File writing operations

### Process & System

- **`Bun.which()`**: Binary resolution (alternative to `which` npm package)
- **`Bun.openInEditor()`**: Open files in default editor

### Utilities

- **`Bun.deepEquals()`**: Deep object comparison (used by test runner). See
  [Bun.deepEquals docs](https://bun.com/docs/runtime/utils#bun-deepequals)
- **`Bun.peek()`**: Read promise results without await (advanced API)

See the [Bun Utils documentation](https://bun.com/docs/runtime/utils) for complete API reference.

## Visual Analytics

The scanner includes a visual dashboard for BUN constants tracking and analytics:

```bash
# Generate visual dashboard
bun scripts/generate-visual-docs.ts

# Generate and serve dashboard
bun scripts/generate-visual-docs.ts --serve

# Generate badges only
bun scripts/generate-visual-docs.ts --badges-only
```

**Current Statistics:**

- **73 BUN constants** across 2 projects
- **7 categories**: api, cli, runtime, bundler, network, storage, config
- **4 types**: string, url, number, boolean
- **4 security levels**: low, medium, high, critical
- **73 MCP-exposed constants** from mcp-bun-docs project

The dashboard provides:

- Interactive filtering and search
- Sortable table with pagination
- Category, type, and security distribution charts
- Project breakdown visualization
- JSON/CSV export functionality
- Theme-aware dark/light mode
- XSS protection via `Bun.escapeHTML()`

The dashboard is generated at `docs/visual/dashboard.html` and can be opened directly in a browser or served via HTTP.

## References

- [Bun Documentation](https://bun.com/docs)
- [Bun API Reference](https://bun.com/docs/runtime/bun-apis)
- [Bun.secrets](https://bun.com/docs/runtime/bun-apis#secrets)

## License

[MIT](LICENSE)
