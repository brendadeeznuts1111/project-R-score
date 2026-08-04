---
name: bun-v139-playground
description: |
  Bun v1.3.9 feature demos and interactive CLI playground. Covers parallel scripts,
  process/spawn, HTTP/2, NO_PROXY, profiling, and mock auto-cleanup.

  Use when: testing Bun v1.3.9+ features, running demos, or benchmarking.
---

# Bun v1.3.9 Playground

## Quick Start

```bash
# Canonical tracked demos (agent-facing)
bun run examples/bun-v139-features/runner.ts

# Optional CLI playground (scratch allowlist)
bun run scratch/bun-v1.3.9-examples/playground/playground.ts
bun run scratch/bun-v1.3.9-examples/playground/playground.ts all
```

## Locations

| Path | Role |
|------|------|
| `examples/bun-v139-features/` | Tracked feature demos + runner |
| `scratch/bun-v1.3.9-examples/playground/` | Interactive CLI menu |

`playground-web/` is retired (not in git). Do not start a web server from scratch for demos.

## Bun Native

Prefer Bun APIs in demos:

- `Bun.spawn` / `Bun.spawnSync` — process management
- `Bun.file` / `Bun.write` — file I/O
- `Bun.argv` / `Bun.env` — CLI and env
- `import.meta.dir` — path anchoring

Intentional Node surfaces for API demos: `node:net`, `node:http2`.

## Agent tooling

| Tool | Use when |
|------|----------|
| `ast_grep_bun` | Inventory Bun.spawn/signal patterns vs demos |
| `/precommit` | Before committing playground or example changes |

```bash
cd .agents/skills/ast-grep && bun run skill-loop:matrix -- --phases doctor,rate --only bun-v139
```

Shared reference: [agent-tooling.md](../references/agent-tooling.md)
