---
name: cascade-mover-v3
description:
  Cascade Mover v3 — sports intelligence, confidence engine, multi-market
  cascading. Use cascade-mover MCP tools. Bun-native, zero npm deps.
---

# Cascade Mover v3

Real-time trading intelligence terminal at
`projects/active/enterprise/cascade-mover-v3/` (gitignored, own repo). **Prefer
MCP tools** over reading this skill. Resolve the current tool catalog from the
server at runtime; do not copy its count into this skill.

## When to use

- Sportsbook line movement, cascade confidence, or multi-market risk queries
- Operating or debugging the cascade-mover MCP server
- Bun.sqlite / WebSocket dashboard work inside
  `projects/active/enterprise/cascade-mover-v3/`

## MCP

The workspace MCP authority is [`.mcp.json`](../../../.mcp.json); generated
client files are not configuration owners. The server requires its product-local
environment.

## Code location

`projects/active/enterprise/cascade-mover-v3/src/server/cascade-mover-mcp.ts` —
MCP entry. See project README for full architecture.

## Agent tooling

Prefer **cascade-mover MCP** for runtime ops. For repo-wide gates:

| Tool              | Use when                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `ast_grep_search` | Find cascade wire-ups across monorepo                                 |
| `ast_grep_audit`  | Scan `projects/active/enterprise/cascade-mover-v3/src` before release |
| `/precommit`      | Before committing skill or integration changes                        |

Shared reference: [agent-tooling.md](../references/agent-tooling.md)
