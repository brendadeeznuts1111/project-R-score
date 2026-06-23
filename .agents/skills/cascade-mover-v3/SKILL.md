---
name: cascade-mover-v3
description: Cascade Mover v3 — sports intelligence, confidence engine, multi-market cascading. Use cascade-mover MCP tools. Bun-native, zero npm deps.
---

# Cascade Mover v3

Real-time trading intelligence terminal at `cascade-mover-v3/` (root, gitignored). **Prefer MCP tools** over reading this skill — the `cascade-mover` server exposes 43 tools for lines, sources, confidence, and dashboard state.

## When to use

- Sportsbook line movement, cascade confidence, or multi-market risk queries
- Operating or debugging the cascade-mover MCP server
- Bun.sqlite / WebSocket dashboard work inside `cascade-mover-v3/`

## MCP

Enable the `cascade-mover` server in [`.cursor/mcp.json`](../../.cursor/mcp.json). Requires `cascade-mover-v3/.env`.

## Code location

`cascade-mover-v3/src/server/cascade-mover-mcp.ts` — MCP entry. See project README for full architecture.

## Agent tooling

Prefer **cascade-mover MCP** (43 tools) for runtime ops. For repo-wide gates:

| Tool | Use when |
|------|----------|
| `ast_grep_search` | Find cascade wire-ups across monorepo |
| `ast_grep_audit` | Scan `cascade-mover-v3/src` before release |
| `/precommit` | Before committing skill or integration changes |

Shared reference: [agent-tooling.md](../references/agent-tooling.md)
